import { randomUUID } from "node:crypto";
import { App, LogLevel } from "@slack/bolt";
import type { KnownBlock } from "@slack/types";
import { buildEvaluation, calculateOverallScore } from "../core/evaluation";
import { selectNextCase, updateDifficulty } from "../core/difficulty";
import { createSession, transition } from "../core/session-machine";
import { isBenchmarkOrdinal, STEP_TEMPLATES } from "../core/templates";
import type { Repository } from "../core/repository";
import type { DifficultyState, TrainingSession } from "../core/types";
import type { AiProvider } from "./ai/provider";
import type { AppConfig } from "./config";
import { safeLog } from "./config";
import type { SchedulerMessenger } from "./scheduler";

const START_ACTION = "thinktrain_start";
const CONFIRM_ACTION = "thinktrain_confirm";
const INTERRUPT_ACTION = "thinktrain_interrupt";
const RESUME_ACTION = "thinktrain_resume";
const ABANDON_ACTION = "thinktrain_abandon";
const SKIP_ACTION = "thinktrain_skip";

export interface SlackRuntime {
  app: App;
  messenger: SchedulerMessenger;
}

export function createSlackRuntime(
  config: AppConfig,
  repository: Repository,
  ai: AiProvider,
): SlackRuntime {
  const app = new App({
    token: config.SLACK_BOT_TOKEN,
    appToken: config.SLACK_APP_TOKEN,
    signingSecret: config.SLACK_SIGNING_SECRET,
    socketMode: true,
    logLevel: LogLevel.ERROR,
  });
  const queue = new SerialQueue();

  app.message(async ({ message, client }) => {
    const event = message as {
      user?: string;
      channel?: string;
      text?: string;
      subtype?: string;
    };
    if (
      event.user !== config.SLACK_USER_ID ||
      event.channel !== config.SLACK_CHANNEL_ID ||
      event.subtype ||
      typeof event.text !== "string"
    ) {
      return;
    }
    await queue.run(event.user, async () => {
      try {
        const pending = await repository.getPendingBenchmark(event.user!);
        if (pending) {
          const response = event.text!.trim();
          if (!response) return;
          const session = await repository.getSession(pending.sessionId);
          const trainingCase = session ? await repository.getCase(session.caseId) : null;
          if (!session || !trainingCase) throw new Error("Benchmark context not found");
          const evaluatedAt = new Date();
          const result = await ai.evaluate({
            trainingCase,
            session: {
              ...session,
              status: "completed",
              currentStep: 7,
              answers: [
                {
                  step: "priority_validation_conclusion",
                  messages: [response],
                  confirmedAt: evaluatedAt,
                },
              ],
              updatedAt: evaluatedAt,
              completedAt: evaluatedAt,
            },
          });
          const overallScore = calculateOverallScore(result.categories);
          await repository.saveBenchmark({
            id: randomUUID(),
            sessionId: pending.sessionId,
            ordinal: pending.ordinal,
            response,
            categories: result.categories,
            overallScore,
            strength: result.strength,
            provider: result.provider,
            createdAt: new Date(),
          });
          await client.chat.postMessage({
            channel: config.SLACK_CHANNEL_ID,
            text: [
              `ベンチマーク評価: ${overallScore}/100`,
              `良かった点: ${result.strength}`,
              `<${config.DASHBOARD_URL}/history/${session.id}|詳細な分析を見る>`,
            ].join("\n"),
          });
          return;
        }

        const session = await repository.getOpenSession(event.user!);
        if (!session || session.status !== "active") return;
        const next = transition(session, { type: "APPEND", text: event.text! });
        await repository.saveSession(next);
        await client.reactions.add({
          channel: config.SLACK_CHANNEL_ID,
          timestamp: (message as { ts: string }).ts,
          name: "memo",
        });
      } catch (error) {
        safeLog("error", "Failed to store Slack message", {
          errorType: error instanceof Error ? error.name : "unknown",
        });
      }
    });
  });

  app.action(START_ACTION, async ({ ack, body, client }) => {
    await ack();
    if (!isAuthorized(body.user.id, config)) return;
    await queue.run(body.user.id, async () => {
      try {
        const existing = await repository.getOpenSession(body.user.id);
        if (existing) {
          await client.chat.postMessage({
            channel: config.SLACK_CHANNEL_ID,
            text: "前回のトレーニングが途中です。",
            blocks: unfinishedSessionBlocks(),
          });
          return;
        }
        const completedCount = await repository.countCompletedSessions(body.user.id);
        const state =
          (await repository.getDifficultyState(body.user.id)) ?? defaultDifficulty();
        const selected = selectNextCase(
          await repository.listCases(),
          completedCount,
          state,
        );
        const session = createSession({
          userId: body.user.id,
          channelId: config.SLACK_CHANNEL_ID,
          caseId: selected.id,
        });
        await repository.saveSession(session);
        await client.chat.postMessage({
          channel: config.SLACK_CHANNEL_ID,
          text: `${selected.title}\n${selected.prompt}`,
          blocks: caseBlocks(selected.title, selected.prompt),
        });
        await postCurrentStep(client, config, session);
      } catch (error) {
        await reportInteractionFailure(client, config, error);
      }
    });
  });

  app.action(CONFIRM_ACTION, async ({ ack, body, client }) => {
    await ack();
    if (!isAuthorized(body.user.id, config)) return;
    await queue.run(body.user.id, async () => {
      try {
        const current = await requireOpenSession(repository, body.user.id);
        const next = transition(current, { type: "CONFIRM" });
        await repository.saveSession(next);
        if (next.status === "completed") {
          await finishSession(repository, ai, next, client, config);
        } else {
          await postCurrentStep(client, config, next);
        }
      } catch (error) {
        await reportInteractionFailure(client, config, error);
      }
    });
  });

  app.action(INTERRUPT_ACTION, async ({ ack, body, client }) => {
    await ack();
    if (!isAuthorized(body.user.id, config)) return;
    await queue.run(body.user.id, async () => {
      try {
        const session = await requireOpenSession(repository, body.user.id);
        await repository.saveSession(transition(session, { type: "INTERRUPT" }));
        await client.chat.postMessage({
          channel: config.SLACK_CHANNEL_ID,
          text: "中断しました。いつでも再開できます。",
          blocks: actionBlocks("中断しました。", RESUME_ACTION, "再開"),
        });
      } catch (error) {
        await reportInteractionFailure(client, config, error);
      }
    });
  });

  app.action(RESUME_ACTION, async ({ ack, body, client }) => {
    await ack();
    if (!isAuthorized(body.user.id, config)) return;
    await queue.run(body.user.id, async () => {
      try {
        const session = await requireOpenSession(repository, body.user.id);
        const resumed =
          session.status === "interrupted" ? transition(session, { type: "RESUME" }) : session;
        await repository.saveSession(resumed);
        await postCurrentStep(client, config, resumed);
      } catch (error) {
        await reportInteractionFailure(client, config, error);
      }
    });
  });

  app.action(ABANDON_ACTION, async ({ ack, body, client }) => {
    await ack();
    if (!isAuthorized(body.user.id, config)) return;
    await queue.run(body.user.id, async () => {
      try {
        const session = await requireOpenSession(repository, body.user.id);
        await repository.saveSession(transition(session, { type: "ABANDON" }));
        await client.chat.postMessage({
          channel: config.SLACK_CHANNEL_ID,
          text: "前回分を終了しました。今日の問題を開始できます。",
          blocks: actionBlocks("準備ができたら始めましょう。", START_ACTION, "今日の問題を開始"),
        });
      } catch (error) {
        await reportInteractionFailure(client, config, error);
      }
    });
  });

  app.action(SKIP_ACTION, async ({ ack, body, client }) => {
    await ack();
    if (!isAuthorized(body.user.id, config)) return;
    const date = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    await repository.claimNotification(date, "reminder");
    await client.chat.postMessage({
      channel: config.SLACK_CHANNEL_ID,
      text: "今日は休みにしました。再通知は送りません。",
    });
  });

  const messenger: SchedulerMessenger = {
    async sendQuestionPrompt() {
      await app.client.chat.postMessage({
        channel: config.SLACK_CHANNEL_ID,
        text: "今日の思考トレーニングを始めましょう。",
        blocks: dailyPromptBlocks(),
      });
    },
    async sendUnstartedReminder() {
      await app.client.chat.postMessage({
        channel: config.SLACK_CHANNEL_ID,
        text: "まだ回答が始まっていません。10分だけでも取り組みましょう。",
      });
    },
  };
  return { app, messenger };
}

async function finishSession(
  repository: Repository,
  ai: AiProvider,
  session: TrainingSession,
  client: App["client"],
  config: AppConfig,
): Promise<void> {
  const trainingCase = await repository.getCase(session.caseId);
  if (!trainingCase) throw new Error("Case not found");
  const result = await ai.evaluate({ trainingCase, session });
  const evaluation = buildEvaluation({
    id: randomUUID(),
    sessionId: session.id,
    categories: result.categories,
    strength: result.strength,
    provider: result.provider,
    rawFeedback: result.rawFeedback,
    createdAt: new Date(),
  });
  await repository.saveEvaluation(evaluation);

  const previous =
    (await repository.getDifficultyState(session.userId)) ?? defaultDifficulty();
  const next = updateDifficulty(
    previous,
    evaluation.overallScore,
    [...evaluation.categories]
      .sort((a, b) => a.score - b.score)
      .slice(0, 3)
      .map(({ category }) => category),
  );
  await repository.saveDifficultyState(session.userId, next.nextState);

  await client.chat.postMessage({
    channel: config.SLACK_CHANNEL_ID,
    text: [
      `評価: ${evaluation.overallScore}/100（難易度 ${next.nextState.current}）`,
      `良かった点: ${evaluation.strength}`,
      ...evaluation.improvements.map((item, index) => `改善${index + 1}: ${item}`),
      `<${config.DASHBOARD_URL}/history/${session.id}|詳細な分析を見る>`,
    ].join("\n"),
  });

  const completedCount = await repository.countCompletedSessions(session.userId);
  if (isBenchmarkOrdinal(completedCount)) {
    await repository.beginBenchmark({
      userId: session.userId,
      sessionId: session.id,
      ordinal: completedCount,
      createdAt: new Date(),
    });
    await client.chat.postMessage({
      channel: config.SLACK_CHANNEL_ID,
      text:
        `${completedCount}回目のベンチマークです。` +
        "7ステップを使わず、この問題への最終回答を自由記述で1メッセージ送ってください。",
    });
  }
}

async function postCurrentStep(
  client: App["client"],
  config: AppConfig,
  session: TrainingSession,
): Promise<void> {
  const step = STEP_TEMPLATES[session.currentStep];
  if (!step) return;
  await client.chat.postMessage({
    channel: config.SLACK_CHANNEL_ID,
    text: `${step.title}: ${step.instruction}`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: [
            `*${step.title}*`,
            step.instruction,
            "",
            "*回答の型*",
            `\`\`\`${step.answerFormat}\`\`\``,
            "*書き方の例（別テーマ）*",
            step.example
              .split("\n")
              .map((line) => `> ${line}`)
              .join("\n"),
          ].join("\n"),
        },
      },
      {
        type: "actions",
        elements: [
          { type: "button", action_id: CONFIRM_ACTION, text: { type: "plain_text", text: "確定" }, style: "primary" },
          { type: "button", action_id: INTERRUPT_ACTION, text: { type: "plain_text", text: "中断" } },
        ],
      },
    ],
  });
}

function caseBlocks(title: string, prompt: string): KnownBlock[] {
  return [
    { type: "header", text: { type: "plain_text", text: title.slice(0, 150) } },
    { type: "section", text: { type: "mrkdwn", text: prompt.slice(0, 3_000) } },
  ];
}

function actionBlocks(text: string, actionId: string, label: string): KnownBlock[] {
  return [
    { type: "section", text: { type: "mrkdwn", text } },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          action_id: actionId,
          text: { type: "plain_text", text: label },
          style: "primary",
        },
      ],
    },
  ];
}

function dailyPromptBlocks(): KnownBlock[] {
  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "*今日の15分*\n構造化思考のトレーニングを始めましょう。",
      },
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          action_id: START_ACTION,
          text: { type: "plain_text", text: "開始する" },
          style: "primary",
        },
        {
          type: "button",
          action_id: SKIP_ACTION,
          text: { type: "plain_text", text: "今日は休む" },
        },
      ],
    },
  ];
}

function unfinishedSessionBlocks(): KnownBlock[] {
  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "*前回のトレーニングが途中です。*\n続きから再開するか、終了して今日の問題へ進めます。",
      },
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          action_id: RESUME_ACTION,
          text: { type: "plain_text", text: "続きから" },
          style: "primary",
        },
        {
          type: "button",
          action_id: ABANDON_ACTION,
          text: { type: "plain_text", text: "前回を終了" },
          style: "danger",
          confirm: {
            title: { type: "plain_text", text: "前回分を終了しますか？" },
            text: { type: "mrkdwn", text: "途中回答は履歴に残りますが、採点は行いません。" },
            confirm: { type: "plain_text", text: "終了する" },
            deny: { type: "plain_text", text: "戻る" },
          },
        },
      ],
    },
  ];
}

function isAuthorized(userId: string, config: AppConfig): boolean {
  return userId === config.SLACK_USER_ID;
}

async function requireOpenSession(
  repository: Repository,
  userId: string,
): Promise<TrainingSession> {
  const session = await repository.getOpenSession(userId);
  if (!session) throw new Error("Open session not found");
  return session;
}

function defaultDifficulty(): DifficultyState {
  return { current: 50, ability: 50, recentScores: [], weakCategories: [] };
}

async function postEphemeral(
  client: App["client"],
  config: AppConfig,
  text: string,
): Promise<void> {
  await client.chat.postEphemeral({
    channel: config.SLACK_CHANNEL_ID,
    user: config.SLACK_USER_ID,
    text,
  });
}

async function reportInteractionFailure(
  client: App["client"],
  config: AppConfig,
  error: unknown,
): Promise<void> {
  safeLog("error", "Slack interaction failed", {
    errorType: error instanceof Error ? error.name : "unknown",
  });
  await postEphemeral(client, config, "処理できませんでした。状態を確認して再試行してください。");
}

class SerialQueue {
  private readonly queues = new Map<string, Promise<void>>();

  async run(key: string, task: () => Promise<void>): Promise<void> {
    const previous = this.queues.get(key) ?? Promise.resolve();
    const current = previous.catch(() => undefined).then(task);
    this.queues.set(key, current);
    try {
      await current;
    } finally {
      if (this.queues.get(key) === current) this.queues.delete(key);
    }
  }
}
