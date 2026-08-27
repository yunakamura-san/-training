import {
  CategoryScoreSchema,
  CaseSchema,
  DifficultyStateSchema,
  EvaluationSchema,
  TrainingSessionSchema,
  evaluationCategories,
  type Benchmark,
  type DifficultySnapshot,
  type DifficultyState,
  type Evaluation,
  type NotificationClaim,
  type NotificationKind,
  type PendingBenchmark,
  type TrainingCase,
  type TrainingSession,
} from "./types";
import type { Repository } from "./repository";

export class InMemoryRepository implements Repository {
  private readonly cases = new Map<string, TrainingCase>();
  private readonly sessions = new Map<string, TrainingSession>();
  private readonly evaluations = new Map<string, Evaluation>();
  private readonly difficulty = new Map<string, DifficultyState>();
  private readonly difficultyHistory = new Map<string, DifficultySnapshot[]>();
  private readonly benchmarks = new Map<string, Benchmark>();
  private readonly pendingBenchmarks = new Map<string, PendingBenchmark>();
  private readonly notifications = new Map<string, NotificationClaim>();

  constructor(seedCases: readonly TrainingCase[] = []) {
    for (const trainingCase of seedCases) {
      const parsed = CaseSchema.parse(trainingCase);
      this.cases.set(parsed.id, structuredClone(parsed));
    }
  }

  async listCases(): Promise<TrainingCase[]> {
    return structuredClone([...this.cases.values()]);
  }

  async getCase(id: string): Promise<TrainingCase | null> {
    return structuredClone(this.cases.get(id) ?? null);
  }

  async upsertCase(trainingCase: TrainingCase): Promise<void> {
    const parsed = CaseSchema.parse(trainingCase);
    this.cases.set(parsed.id, structuredClone(parsed));
  }

  async saveSession(session: TrainingSession): Promise<void> {
    const parsed = TrainingSessionSchema.parse(session);
    this.sessions.set(parsed.id, structuredClone(parsed));
  }

  async getSession(id: string): Promise<TrainingSession | null> {
    return structuredClone(this.sessions.get(id) ?? null);
  }

  async getOpenSession(userId: string): Promise<TrainingSession | null> {
    const open = [...this.sessions.values()]
      .filter(
        ({ userId: owner, status }) =>
          owner === userId && (status === "active" || status === "interrupted"),
      )
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0];
    return structuredClone(open ?? null);
  }

  async getLatestSession(userId: string): Promise<TrainingSession | null> {
    const latest = [...this.sessions.values()]
      .filter(({ userId: owner }) => owner === userId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0];
    return structuredClone(latest ?? null);
  }

  async listSessions(userId: string, limit = 100): Promise<TrainingSession[]> {
    return structuredClone(
      [...this.sessions.values()]
        .filter(({ userId: owner }) => owner === userId)
        .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
        .slice(0, validateLimit(limit)),
    );
  }

  async countCompletedSessions(userId: string): Promise<number> {
    return [...this.sessions.values()].filter(
      ({ userId: owner, status }) => owner === userId && status === "completed",
    ).length;
  }

  async saveEvaluation(evaluation: Evaluation): Promise<void> {
    const parsed = EvaluationSchema.parse(evaluation);
    this.evaluations.set(parsed.id, structuredClone(parsed));
  }

  async listEvaluations(userId: string, limit = 100): Promise<Evaluation[]> {
    return structuredClone(
      [...this.evaluations.values()]
        .filter((evaluation) => this.sessions.get(evaluation.sessionId)?.userId === userId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, validateLimit(limit)),
    );
  }

  async getDifficultyState(userId: string): Promise<DifficultyState | null> {
    return structuredClone(this.difficulty.get(userId) ?? null);
  }

  async saveDifficultyState(userId: string, state: DifficultyState): Promise<void> {
    const parsed = DifficultyStateSchema.parse(state);
    this.difficulty.set(userId, structuredClone(parsed));
    const history = this.difficultyHistory.get(userId) ?? [];
    history.push({
      ability: parsed.ability,
      difficulty: parsed.current,
      score: parsed.recentScores.at(-1) ?? 0,
      createdAt: new Date(),
    });
    this.difficultyHistory.set(userId, history);
  }

  async listDifficultyHistory(userId: string, limit = 100): Promise<DifficultySnapshot[]> {
    return structuredClone(
      [...(this.difficultyHistory.get(userId) ?? [])]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, validateLimit(limit)),
    );
  }

  async saveBenchmark(benchmark: Benchmark): Promise<void> {
    if (!benchmark.response.trim() || benchmark.response.length > 20_000) {
      throw new RangeError("Invalid benchmark response");
    }
    const categories = benchmark.categories.map((category) => CategoryScoreSchema.parse(category));
    if (
      categories.length !== evaluationCategories.length ||
      new Set(categories.map(({ category }) => category)).size !== evaluationCategories.length ||
      benchmark.overallScore < 0 ||
      benchmark.overallScore > 100 ||
      !benchmark.strength.trim() ||
      !benchmark.provider.trim()
    ) {
      throw new RangeError("Invalid benchmark evaluation");
    }
    this.benchmarks.set(benchmark.id, structuredClone({ ...benchmark, categories }));
    for (const [userId, pending] of this.pendingBenchmarks) {
      if (pending.sessionId === benchmark.sessionId && pending.ordinal === benchmark.ordinal) {
        this.pendingBenchmarks.delete(userId);
      }
    }
  }

  async beginBenchmark(benchmark: PendingBenchmark): Promise<void> {
    this.pendingBenchmarks.set(benchmark.userId, structuredClone(benchmark));
  }

  async getPendingBenchmark(userId: string): Promise<PendingBenchmark | null> {
    return structuredClone(this.pendingBenchmarks.get(userId) ?? null);
  }

  async claimNotification(
    date: string,
    kind: NotificationKind,
    claimedAt = new Date(),
  ): Promise<boolean> {
    const key = `${date}:${kind}`;
    if (this.notifications.has(key)) return false;
    this.notifications.set(key, { date, kind, claimedAt });
    return true;
  }

  async releaseNotification(date: string, kind: NotificationKind): Promise<void> {
    this.notifications.delete(`${date}:${kind}`);
  }

  async getNotificationClaims(date: string): Promise<NotificationClaim[]> {
    return structuredClone(
      [...this.notifications.values()].filter((claim) => claim.date === date),
    );
  }
}

function validateLimit(limit: number): number {
  if (!Number.isInteger(limit) || limit < 1 || limit > 1_000) {
    throw new RangeError("limit must be between 1 and 1000");
  }
  return limit;
}
