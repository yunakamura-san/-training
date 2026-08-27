import { describe, expect, it } from "vitest";
import { selectNextCase, updateDifficulty } from "../../src/core/difficulty";
import { DEMO_CASES } from "../../src/core/templates";

describe("difficulty", () => {
  it("smooths the latest five scores and limits daily change to eight", () => {
    const result = updateDifficulty(
      {
        current: 50,
        ability: 50,
        recentScores: [95, 95, 95, 95],
        weakCategories: [],
      },
      95,
      [],
    );
    expect(result.nextState.recentScores).toEqual([95, 95, 95, 95, 95]);
    expect(result.targetDifficulty).toBe(60);
    expect(result.nextState.current).toBe(58);
    expect(result.nextState.ability).toBe(55);
  });

  it("reflects repeated previous-day weaknesses", () => {
    const repeated = updateDifficulty(
      {
        current: 60,
        ability: 60,
        recentScores: [70, 70, 70, 70],
        weakCategories: ["axis_consistency"],
      },
      70,
      ["axis_consistency"],
    );
    expect(repeated.nextState.current).toBe(59);
    expect(repeated.nextState.weakCategories).toEqual(["axis_consistency"]);
  });

  it("uses the first five diagnostic cases in fixed order", () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const selected = selectNextCase(DEMO_CASES, attempt, {
        current: 100,
        ability: 50,
        recentScores: [],
        weakCategories: [],
      });
      expect(selected.diagnostic).toBe(true);
      expect(selected.id).toBe(DEMO_CASES[attempt]?.id);
    }
    expect(
      selectNextCase(DEMO_CASES, 5, {
        current: 65,
        ability: 50,
        recentScores: [],
        weakCategories: [],
      }).diagnostic,
    ).toBe(false);
  });

  it("keeps a seven-to-three general and B2B sales case mix", () => {
    const selected = Array.from({ length: 10 }, (_, index) =>
      selectNextCase(DEMO_CASES, index + 5, {
        current: 60,
        ability: 50,
        recentScores: [],
        weakCategories: [],
      }),
    );
    expect(selected.filter(({ tags }) => tags.includes("general_business"))).toHaveLength(7);
    expect(selected.filter(({ tags }) => tags.includes("b2b_sales"))).toHaveLength(3);
  });
});
