import type {
  Benchmark,
  DifficultySnapshot,
  DifficultyState,
  Evaluation,
  NotificationClaim,
  NotificationKind,
  PendingBenchmark,
  TrainingCase,
  TrainingSession,
} from "./types";

export interface Repository {
  listCases(): Promise<TrainingCase[]>;
  getCase(id: string): Promise<TrainingCase | null>;
  upsertCase(trainingCase: TrainingCase): Promise<void>;

  saveSession(session: TrainingSession): Promise<void>;
  getSession(id: string): Promise<TrainingSession | null>;
  getOpenSession(userId: string): Promise<TrainingSession | null>;
  getLatestSession(userId: string): Promise<TrainingSession | null>;
  listSessions(userId: string, limit?: number): Promise<TrainingSession[]>;
  countCompletedSessions(userId: string): Promise<number>;

  saveEvaluation(evaluation: Evaluation): Promise<void>;
  listEvaluations(userId: string, limit?: number): Promise<Evaluation[]>;

  getDifficultyState(userId: string): Promise<DifficultyState | null>;
  saveDifficultyState(userId: string, state: DifficultyState): Promise<void>;
  listDifficultyHistory(userId: string, limit?: number): Promise<DifficultySnapshot[]>;

  saveBenchmark(benchmark: Benchmark): Promise<void>;
  beginBenchmark(benchmark: PendingBenchmark): Promise<void>;
  getPendingBenchmark(userId: string): Promise<PendingBenchmark | null>;
  claimNotification(
    date: string,
    kind: NotificationKind,
    claimedAt?: Date,
  ): Promise<boolean>;
  releaseNotification(date: string, kind: NotificationKind): Promise<void>;
  getNotificationClaims(date: string): Promise<NotificationClaim[]>;
}
