import {
  EvaluationSchema,
  evaluationCategoryLabels,
  evaluationCategories,
  type CategoryScore,
  type Evaluation,
  type EvaluationCategory,
} from "./types";

const CATEGORY_WEIGHTS: Record<EvaluationCategory, number> = {
  issue_definition: 0.12,
  coverage: 0.14,
  exclusivity: 0.1,
  axis_consistency: 0.14,
  hierarchy_granularity: 0.14,
  causality: 0.12,
  prioritization: 0.08,
  conclusion_evidence: 0.1,
  clarity: 0.06,
};

export function calculateOverallScore(scores: readonly CategoryScore[]): number {
  assertCompleteScores(scores);
  const weighted = scores.reduce(
    (sum, item) => sum + item.score * CATEGORY_WEIGHTS[item.category],
    0,
  );
  return Math.round(weighted * 10) / 10;
}

export function selectImprovements(
  scores: readonly CategoryScore[],
  maximum = 2,
): string[] {
  if (!Number.isInteger(maximum) || maximum < 0 || maximum > 2) {
    throw new RangeError("maximum must be an integer from 0 to 2");
  }
  return [...scores]
    .sort((a, b) => a.score - b.score)
    .slice(0, maximum)
    .map(({ category, feedback }) => `${evaluationCategoryLabels[category]}: ${feedback}`);
}

export function weakCategories(
  scores: readonly CategoryScore[],
  maximum = 3,
): EvaluationCategory[] {
  return [...scores]
    .sort((a, b) => a.score - b.score)
    .slice(0, maximum)
    .map(({ category }) => category);
}

export function buildEvaluation(
  input: Omit<Evaluation, "overallScore" | "improvements">,
): Evaluation {
  return EvaluationSchema.parse({
    ...input,
    overallScore: calculateOverallScore(input.categories),
    improvements: selectImprovements(input.categories),
  });
}

function assertCompleteScores(
  scores: readonly CategoryScore[],
): asserts scores is readonly CategoryScore[] {
  const actual = new Set(scores.map(({ category }) => category));
  if (
    scores.length !== evaluationCategories.length ||
    evaluationCategories.some((category) => !actual.has(category))
  ) {
    throw new Error("All nine evaluation categories are required");
  }
}
