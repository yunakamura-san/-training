import { describe, expect, it } from "vitest";
import { evaluationCategories } from "../../src/core/types";
import { parseProviderResponse } from "../../src/server/ai/provider";

describe("AI provider response validation", () => {
  it("extracts and validates strict JSON with all categories", () => {
    const response = parseProviderResponse(
      `prefix ${JSON.stringify({
        strength: "問いを明確に定義できています",
        categories: evaluationCategories.map((category) => ({
          category,
          score: 60,
          feedback: "具体的な改善点",
        })),
      })} suffix`,
    );
    expect(response.categories).toHaveLength(9);
  });

  it("rejects duplicate or missing categories", () => {
    const categories = evaluationCategories.map(() => ({
      category: evaluationCategories[0],
      score: 60,
      feedback: "改善",
    }));
    expect(() =>
      parseProviderResponse(JSON.stringify({ strength: "良い点", categories })),
    ).toThrow("AI response omitted evaluation categories");
  });
});
