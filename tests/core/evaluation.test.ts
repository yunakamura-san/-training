import { describe, expect, it } from "vitest";
import {
  calculateOverallScore,
  selectImprovements,
} from "../../src/core/evaluation";
import {
  evaluationCategories,
  type CategoryScore,
} from "../../src/core/types";

const scores: CategoryScore[] = evaluationCategories.map((category, index) => ({
  category,
  score: 50 + index,
  feedback: `feedback-${index}`,
}));

describe("evaluation aggregation", () => {
  it("calculates a weighted overall score", () => {
    expect(calculateOverallScore(scores)).toBe(53.6);
  });

  it("shows at most two lowest-scoring improvements", () => {
    expect(selectImprovements(scores)).toEqual([
      "論点設定: feedback-0",
      "網羅性: feedback-1",
    ]);
    expect(() => selectImprovements(scores, 3)).toThrow();
  });

  it("requires all nine categories", () => {
    expect(() => calculateOverallScore(scores.slice(0, 8))).toThrow(
      "All nine evaluation categories are required",
    );
  });
});
