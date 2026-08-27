import type {
  DifficultyState,
  EvaluationCategory,
  TrainingCase,
} from "./types";

export const DIAGNOSTIC_ATTEMPTS = 5;
export const MAX_DAILY_CHANGE = 8;

export interface DifficultyUpdate {
  previousDifficulty: number;
  targetDifficulty: number;
  nextState: DifficultyState;
}

export function updateDifficulty(
  state: DifficultyState,
  latestScore: number,
  latestWeakCategories: readonly EvaluationCategory[],
): DifficultyUpdate {
  assertScore(latestScore);
  const recentScores = [...state.recentScores, latestScore].slice(-5);
  const smoothed = mean(recentScores);

  // A strict 70-point target: exceeding it raises difficulty, falling below lowers it.
  const performanceDelta = (smoothed - 70) * 0.4;
  // Persisting weaknesses modestly temper the next exercise without hiding poor results.
  const repeatedWeaknesses = latestWeakCategories.filter((category) =>
    state.weakCategories.includes(category),
  ).length;
  const weaknessAdjustment = -Math.min(2, repeatedWeaknesses);
  const targetDifficulty = clamp(
    state.current + performanceDelta + weaknessAdjustment,
    0,
    100,
  );
  const nextDifficulty = clamp(
    targetDifficulty,
    state.current - MAX_DAILY_CHANGE,
    state.current + MAX_DAILY_CHANGE,
  );
  const nextAbility = clamp(
    state.ability + clamp((smoothed - 70) * 0.2, -5, 5),
    0,
    100,
  );

  return {
    previousDifficulty: state.current,
    targetDifficulty: round(targetDifficulty),
    nextState: {
      current: round(nextDifficulty),
      ability: round(nextAbility),
      recentScores,
      weakCategories: [...new Set(latestWeakCategories)].slice(0, 3),
    },
  };
}

export function selectNextCase(
  cases: readonly TrainingCase[],
  completedCount: number,
  state: DifficultyState,
): TrainingCase {
  if (cases.length === 0) throw new Error("At least one case is required");
  if (!Number.isInteger(completedCount) || completedCount < 0) {
    throw new RangeError("completedCount must be a non-negative integer");
  }

  if (completedCount < DIAGNOSTIC_ATTEMPTS) {
    const diagnostic = cases.filter((candidate) => candidate.diagnostic);
    if (diagnostic.length < DIAGNOSTIC_ATTEMPTS) {
      throw new Error("Five diagnostic cases are required");
    }
    return diagnostic[completedCount]!;
  }

  const regular = cases.filter((candidate) => !candidate.diagnostic);
  const pool = regular.length > 0 ? regular : cases;
  const regularIndex = completedCount - DIAGNOSTIC_ATTEMPTS;
  const preferSales = regularIndex % 10 >= 7;
  const rolePool = pool.filter((candidate) =>
    candidate.tags.includes(preferSales ? "b2b_sales" : "general_business"),
  );
  const candidates = rolePool.length > 0 ? rolePool : pool;
  const weakMatches = candidates.filter((candidate) =>
    candidate.tags.some((tag) => state.weakCategories.includes(tag as EvaluationCategory)),
  );
  const ranked = [...(weakMatches.length > 0 ? weakMatches : candidates)].sort((a, b) => {
    const aWeak = a.tags.some((tag) => state.weakCategories.includes(tag as EvaluationCategory));
    const bWeak = b.tags.some((tag) => state.weakCategories.includes(tag as EvaluationCategory));
    if (aWeak !== bWeak) return aWeak ? -1 : 1;
    return (
      Math.abs(a.difficulty - state.current) -
      Math.abs(b.difficulty - state.current)
    );
  });
  const shortlist = ranked.slice(0, Math.min(3, ranked.length));
  return shortlist[regularIndex % shortlist.length]!;
}

function mean(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function assertScore(score: number): void {
  if (!Number.isFinite(score) || score < 0 || score > 100) {
    throw new RangeError("score must be between 0 and 100");
  }
}
