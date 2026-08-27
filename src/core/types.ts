import { z } from "zod";

export const stepKeys = [
  "facts_and_interpretations",
  "question_definition",
  "decomposition_axis",
  "major_items",
  "deep_dive",
  "self_check",
  "priority_validation_conclusion",
] as const;

export const StepKeySchema = z.enum(stepKeys);
export type StepKey = z.infer<typeof StepKeySchema>;

export const evaluationCategories = [
  "issue_definition",
  "coverage",
  "exclusivity",
  "axis_consistency",
  "hierarchy_granularity",
  "causality",
  "prioritization",
  "conclusion_evidence",
  "clarity",
] as const;

export const EvaluationCategorySchema = z.enum(evaluationCategories);
export type EvaluationCategory = z.infer<typeof EvaluationCategorySchema>;

export const evaluationCategoryLabels: Record<EvaluationCategory, string> = {
  issue_definition: "論点設定",
  coverage: "網羅性",
  exclusivity: "重複・排他性",
  axis_consistency: "分類軸",
  hierarchy_granularity: "階層・粒度",
  causality: "因果関係",
  prioritization: "優先順位",
  conclusion_evidence: "結論と根拠",
  clarity: "簡潔さ",
};

export const SessionStatusSchema = z.enum([
  "active",
  "interrupted",
  "completed",
  "abandoned",
]);
export type SessionStatus = z.infer<typeof SessionStatusSchema>;

export const CaseSchema = z.object({
  id: z.string().min(1).max(100),
  title: z.string().min(1).max(200),
  prompt: z.string().min(1).max(10_000),
  difficulty: z.number().min(0).max(100),
  tags: z.array(z.string().min(1).max(50)).max(20),
  diagnostic: z.boolean().default(false),
});
export type TrainingCase = z.infer<typeof CaseSchema>;

export const StepAnswerSchema = z.object({
  step: StepKeySchema,
  messages: z.array(z.string().min(1).max(4_000)).min(1).max(100),
  confirmedAt: z.date().optional(),
});
export type StepAnswer = z.infer<typeof StepAnswerSchema>;

export const TrainingSessionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().min(1).max(100),
  channelId: z.string().min(1).max(100),
  caseId: z.string().min(1).max(100),
  status: SessionStatusSchema,
  currentStep: z.number().int().min(0).max(stepKeys.length),
  answers: z.array(StepAnswerSchema).max(stepKeys.length),
  startedAt: z.date(),
  updatedAt: z.date(),
  completedAt: z.date().optional(),
});
export type TrainingSession = z.infer<typeof TrainingSessionSchema>;

export const CategoryScoreSchema = z.object({
  category: EvaluationCategorySchema,
  score: z.number().min(0).max(100),
  feedback: z.string().min(1).max(2_000),
});
export type CategoryScore = z.infer<typeof CategoryScoreSchema>;

export const EvaluationSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  categories: z
    .array(CategoryScoreSchema)
    .length(evaluationCategories.length)
    .refine(
      (scores) =>
        new Set(scores.map(({ category }) => category)).size ===
        evaluationCategories.length,
      "All evaluation categories must be present exactly once",
    ),
  overallScore: z.number().min(0).max(100),
  strength: z.string().min(1).max(2_000),
  improvements: z.array(z.string().min(1).max(2_000)).max(2),
  provider: z.string().min(1).max(50),
  rawFeedback: z.string().max(20_000).optional(),
  createdAt: z.date(),
});
export type Evaluation = z.infer<typeof EvaluationSchema>;

export const DifficultyStateSchema = z.object({
  current: z.number().min(0).max(100),
  ability: z.number().min(0).max(100),
  recentScores: z.array(z.number().min(0).max(100)).max(5),
  weakCategories: z.array(EvaluationCategorySchema).max(3),
});
export type DifficultyState = z.infer<typeof DifficultyStateSchema>;

export interface DifficultySnapshot {
  ability: number;
  difficulty: number;
  score: number;
  createdAt: Date;
}

export type NotificationKind = "question" | "reminder";

export interface NotificationClaim {
  date: string;
  kind: NotificationKind;
  claimedAt: Date;
}

export interface Benchmark {
  id: string;
  sessionId: string;
  ordinal: number;
  response: string;
  categories: CategoryScore[];
  overallScore: number;
  strength: string;
  provider: string;
  createdAt: Date;
}

export interface PendingBenchmark {
  userId: string;
  sessionId: string;
  ordinal: number;
  createdAt: Date;
}
