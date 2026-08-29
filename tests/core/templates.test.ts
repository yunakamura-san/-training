import { describe, expect, it } from "vitest";
import { STEP_TEMPLATES } from "../../src/core/templates";
import { stepKeys } from "../../src/core/types";

describe("step guidance", () => {
  it("provides a clear format and a separate example for all seven steps", () => {
    expect(STEP_TEMPLATES).toHaveLength(stepKeys.length);
    for (const [index, step] of STEP_TEMPLATES.entries()) {
      expect(step.key).toBe(stepKeys[index]);
      expect(step.instruction.length).toBeGreaterThan(25);
      expect(step.answerFormat.length).toBeGreaterThan(10);
      expect(step.example.length).toBeGreaterThan(10);
    }
  });
});
