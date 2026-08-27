import postgres, { type Sql } from "postgres";
import type { Repository } from "../core/repository";
import {
  CaseSchema,
  DifficultyStateSchema,
  EvaluationSchema,
  TrainingSessionSchema,
  type Benchmark,
  type DifficultySnapshot,
  type DifficultyState,
  type Evaluation,
  type NotificationClaim,
  type NotificationKind,
  type PendingBenchmark,
  type TrainingCase,
  type TrainingSession,
} from "../core/types";

export class PostgresRepository implements Repository {
  constructor(private readonly sql: Sql) {}

  async listCases(): Promise<TrainingCase[]> {
    const rows = await this.sql`SELECT * FROM training_cases ORDER BY diagnostic DESC, difficulty`;
    return rows.map(mapCase);
  }

  async getCase(id: string): Promise<TrainingCase | null> {
    const rows = await this.sql`SELECT * FROM training_cases WHERE id = ${id} LIMIT 1`;
    return rows[0] ? mapCase(rows[0]) : null;
  }

  async upsertCase(trainingCase: TrainingCase): Promise<void> {
    const value = CaseSchema.parse(trainingCase);
    await this.sql`
      INSERT INTO training_cases (id, title, prompt, difficulty, tags, diagnostic)
      VALUES (
        ${value.id}, ${value.title}, ${value.prompt}, ${value.difficulty},
        ${this.sql.json(value.tags)}, ${value.diagnostic}
      )
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title, prompt = EXCLUDED.prompt,
        difficulty = EXCLUDED.difficulty, tags = EXCLUDED.tags,
        diagnostic = EXCLUDED.diagnostic, updated_at = now()
    `;
  }

  async saveSession(session: TrainingSession): Promise<void> {
    const value = TrainingSessionSchema.parse(session);
    await this.sql`
      INSERT INTO training_sessions (
        id, user_id, channel_id, case_id, status, current_step, answers,
        started_at, updated_at, completed_at
      ) VALUES (
        ${value.id}, ${value.userId}, ${value.channelId}, ${value.caseId},
        ${value.status}, ${value.currentStep}, ${this.sql.json(value.answers)},
        ${value.startedAt}, ${value.updatedAt}, ${value.completedAt ?? null}
      )
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status, current_step = EXCLUDED.current_step,
        answers = EXCLUDED.answers, updated_at = EXCLUDED.updated_at,
        completed_at = EXCLUDED.completed_at
    `;
  }

  async getSession(id: string): Promise<TrainingSession | null> {
    const rows = await this.sql`SELECT * FROM training_sessions WHERE id = ${id} LIMIT 1`;
    return rows[0] ? mapSession(rows[0]) : null;
  }

  async getOpenSession(userId: string): Promise<TrainingSession | null> {
    const rows = await this.sql`
      SELECT * FROM training_sessions
      WHERE user_id = ${userId} AND status IN ('active', 'interrupted')
      ORDER BY updated_at DESC LIMIT 1
    `;
    return rows[0] ? mapSession(rows[0]) : null;
  }

  async getLatestSession(userId: string): Promise<TrainingSession | null> {
    const rows = await this.sql`
      SELECT * FROM training_sessions
      WHERE user_id = ${userId}
      ORDER BY updated_at DESC LIMIT 1
    `;
    return rows[0] ? mapSession(rows[0]) : null;
  }

  async listSessions(userId: string, limit = 100): Promise<TrainingSession[]> {
    assertLimit(limit);
    const rows = await this.sql`
      SELECT * FROM training_sessions
      WHERE user_id = ${userId}
      ORDER BY started_at DESC LIMIT ${limit}
    `;
    return rows.map(mapSession);
  }

  async countCompletedSessions(userId: string): Promise<number> {
    const rows = await this.sql`
      SELECT count(*)::integer AS count FROM training_sessions
      WHERE user_id = ${userId} AND status = 'completed'
    `;
    return Number(rows[0]?.count ?? 0);
  }

  async saveEvaluation(evaluation: Evaluation): Promise<void> {
    const value = EvaluationSchema.parse(evaluation);
    await this.sql`
      INSERT INTO evaluations (
        id, session_id, categories, overall_score, strength, improvements,
        provider, raw_feedback, created_at
      ) VALUES (
        ${value.id}, ${value.sessionId}, ${this.sql.json(value.categories)},
        ${value.overallScore}, ${value.strength}, ${this.sql.json(value.improvements)},
        ${value.provider}, ${value.rawFeedback ?? null}, ${value.createdAt}
      )
      ON CONFLICT (id) DO UPDATE SET
        categories = EXCLUDED.categories, overall_score = EXCLUDED.overall_score,
        strength = EXCLUDED.strength,
        improvements = EXCLUDED.improvements, provider = EXCLUDED.provider,
        raw_feedback = EXCLUDED.raw_feedback
    `;
  }

  async listEvaluations(userId: string, limit = 100): Promise<Evaluation[]> {
    assertLimit(limit);
    const rows = await this.sql`
      SELECT e.* FROM evaluations e
      JOIN training_sessions s ON s.id = e.session_id
      WHERE s.user_id = ${userId}
      ORDER BY e.created_at DESC LIMIT ${limit}
    `;
    return rows.map(mapEvaluation);
  }

  async getDifficultyState(userId: string): Promise<DifficultyState | null> {
    const rows = await this.sql`
      SELECT * FROM difficulty_states WHERE user_id = ${userId} LIMIT 1
    `;
    if (!rows[0]) return null;
    return DifficultyStateSchema.parse({
      current: Number(rows[0].current),
      ability: Number(rows[0].ability),
      recentScores: rows[0].recent_scores,
      weakCategories: rows[0].weak_categories,
    });
  }

  async saveDifficultyState(userId: string, state: DifficultyState): Promise<void> {
    const value = DifficultyStateSchema.parse(state);
    await this.sql.begin(async (tx) => {
      await tx`
        INSERT INTO difficulty_states (
          user_id, current, ability, recent_scores, weak_categories, updated_at
        ) VALUES (
          ${userId}, ${value.current}, ${value.ability}, ${tx.json(value.recentScores)},
          ${tx.json(value.weakCategories)}, now()
        )
        ON CONFLICT (user_id) DO UPDATE SET
          current = EXCLUDED.current, ability = EXCLUDED.ability,
          recent_scores = EXCLUDED.recent_scores,
          weak_categories = EXCLUDED.weak_categories, updated_at = now()
      `;
      await tx`
        INSERT INTO difficulty_history (
          user_id, ability, difficulty, score, created_at
        ) VALUES (
          ${userId}, ${value.ability}, ${value.current},
          ${value.recentScores.at(-1) ?? 0}, now()
        )
      `;
    });
  }

  async listDifficultyHistory(userId: string, limit = 100): Promise<DifficultySnapshot[]> {
    assertLimit(limit);
    const rows = await this.sql`
      SELECT ability, difficulty, score, created_at
      FROM difficulty_history
      WHERE user_id = ${userId}
      ORDER BY created_at DESC LIMIT ${limit}
    `;
    return rows.map((row) => ({
      ability: Number(row.ability),
      difficulty: Number(row.difficulty),
      score: Number(row.score),
      createdAt: new Date(String(row.created_at)),
    }));
  }

  async saveBenchmark(benchmark: Benchmark): Promise<void> {
    if (!benchmark.response.trim() || benchmark.response.length > 20_000) {
      throw new RangeError("Invalid benchmark response");
    }
    await this.sql.begin(async (tx) => {
      await tx`
        INSERT INTO benchmarks (
          id, session_id, ordinal, response, categories,
          overall_score, strength, provider, created_at
        )
        VALUES (
          ${benchmark.id}, ${benchmark.sessionId}, ${benchmark.ordinal},
          ${benchmark.response}, ${tx.json(benchmark.categories)},
          ${benchmark.overallScore}, ${benchmark.strength},
          ${benchmark.provider}, ${benchmark.createdAt}
        )
        ON CONFLICT (session_id, ordinal) DO UPDATE SET
          response = EXCLUDED.response, categories = EXCLUDED.categories,
          overall_score = EXCLUDED.overall_score, strength = EXCLUDED.strength,
          provider = EXCLUDED.provider
      `;
      await tx`
        DELETE FROM pending_benchmarks
        WHERE session_id = ${benchmark.sessionId} AND ordinal = ${benchmark.ordinal}
      `;
    });
  }

  async beginBenchmark(benchmark: PendingBenchmark): Promise<void> {
    await this.sql`
      INSERT INTO pending_benchmarks (user_id, session_id, ordinal, created_at)
      VALUES (
        ${benchmark.userId}, ${benchmark.sessionId},
        ${benchmark.ordinal}, ${benchmark.createdAt}
      )
      ON CONFLICT (user_id) DO UPDATE SET
        session_id = EXCLUDED.session_id, ordinal = EXCLUDED.ordinal,
        created_at = EXCLUDED.created_at
    `;
  }

  async getPendingBenchmark(userId: string): Promise<PendingBenchmark | null> {
    const rows = await this.sql`
      SELECT * FROM pending_benchmarks WHERE user_id = ${userId} LIMIT 1
    `;
    if (!rows[0]) return null;
    return {
      userId: String(rows[0].user_id),
      sessionId: String(rows[0].session_id),
      ordinal: Number(rows[0].ordinal),
      createdAt: new Date(String(rows[0].created_at)),
    };
  }

  async claimNotification(
    date: string,
    kind: NotificationKind,
    claimedAt = new Date(),
  ): Promise<boolean> {
    const rows = await this.sql`
      INSERT INTO notification_claims (local_date, kind, claimed_at)
      VALUES (${date}, ${kind}, ${claimedAt})
      ON CONFLICT DO NOTHING RETURNING local_date
    `;
    return rows.length === 1;
  }

  async releaseNotification(date: string, kind: NotificationKind): Promise<void> {
    await this.sql`
      DELETE FROM notification_claims
      WHERE local_date = ${date} AND kind = ${kind}
    `;
  }

  async getNotificationClaims(date: string): Promise<NotificationClaim[]> {
    const rows = await this.sql`
      SELECT local_date, kind, claimed_at FROM notification_claims
      WHERE local_date = ${date}
    `;
    return rows.map((row) => ({
      date: asDateOnly(row.local_date),
      kind: row.kind as NotificationKind,
      claimedAt: new Date(row.claimed_at),
    }));
  }
}

export function createPostgresClient(databaseUrl: string): Sql {
  if (!databaseUrl.startsWith("postgres://") && !databaseUrl.startsWith("postgresql://")) {
    throw new Error("DATABASE_URL must be a PostgreSQL URL");
  }
  return postgres(databaseUrl, {
    max: 5,
    connect_timeout: 10,
    idle_timeout: 20,
    max_lifetime: 60 * 30,
  });
}

function mapCase(row: Record<string, unknown>): TrainingCase {
  return CaseSchema.parse({
    id: row.id,
    title: row.title,
    prompt: row.prompt,
    difficulty: Number(row.difficulty),
    tags: row.tags,
    diagnostic: row.diagnostic,
  });
}

function mapSession(row: Record<string, unknown>): TrainingSession {
  const answers = (row.answers as Array<Record<string, unknown>>).map((answer) => ({
    ...answer,
    confirmedAt: answer.confirmedAt ? new Date(String(answer.confirmedAt)) : undefined,
  }));
  return TrainingSessionSchema.parse({
    id: row.id,
    userId: row.user_id,
    channelId: row.channel_id,
    caseId: row.case_id,
    status: row.status,
    currentStep: row.current_step,
    answers,
    startedAt: new Date(String(row.started_at)),
    updatedAt: new Date(String(row.updated_at)),
    completedAt: row.completed_at ? new Date(String(row.completed_at)) : undefined,
  });
}

function mapEvaluation(row: Record<string, unknown>): Evaluation {
  return EvaluationSchema.parse({
    id: row.id,
    sessionId: row.session_id,
    categories: row.categories,
    overallScore: Number(row.overall_score),
    strength: row.strength,
    improvements: row.improvements,
    provider: row.provider,
    rawFeedback: row.raw_feedback ?? undefined,
    createdAt: new Date(String(row.created_at)),
  });
}

function asDateOnly(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function assertLimit(limit: number): void {
  if (!Number.isInteger(limit) || limit < 1 || limit > 1_000) {
    throw new RangeError("limit must be between 1 and 1000");
  }
}
