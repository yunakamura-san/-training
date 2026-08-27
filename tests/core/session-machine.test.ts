import { describe, expect, it } from "vitest";
import { createSession, transition } from "../../src/core/session-machine";
import { stepKeys } from "../../src/core/types";

describe("session state machine", () => {
  it("buffers multiple messages and advances all seven steps", () => {
    let session = createSession({
      id: "11111111-1111-4111-8111-111111111111",
      userId: "U1",
      channelId: "D1",
      caseId: "case-1",
      at: new Date("2026-01-01T00:00:00Z"),
    });
    session = transition(session, { type: "APPEND", text: "first" });
    session = transition(session, { type: "APPEND", text: "second" });
    expect(session.answers[0]?.messages).toEqual(["first", "second"]);

    session = transition(session, { type: "CONFIRM" });
    for (let index = 1; index < stepKeys.length; index += 1) {
      session = transition(session, { type: "APPEND", text: `answer ${index}` });
      session = transition(session, { type: "CONFIRM" });
    }
    expect(session.status).toBe("completed");
    expect(session.currentStep).toBe(7);
  });

  it("supports interrupt and resume and rejects empty confirmation", () => {
    const session = createSession({
      id: "11111111-1111-4111-8111-111111111111",
      userId: "U1",
      channelId: "D1",
      caseId: "case-1",
    });
    const interrupted = transition(session, { type: "INTERRUPT" });
    expect(interrupted.status).toBe("interrupted");
    expect(() => transition(interrupted, { type: "APPEND", text: "no" })).toThrow();
    const resumed = transition(interrupted, { type: "RESUME" });
    expect(resumed.status).toBe("active");
    expect(() => transition(resumed, { type: "CONFIRM" })).toThrow(
      "Cannot confirm an empty step",
    );
  });

  it("rejects blank and oversized messages", () => {
    const session = createSession({
      id: "11111111-1111-4111-8111-111111111111",
      userId: "U1",
      channelId: "D1",
      caseId: "case-1",
    });
    expect(() => transition(session, { type: "APPEND", text: " " })).toThrow();
    expect(() =>
      transition(session, { type: "APPEND", text: "a".repeat(4_001) }),
    ).toThrow();
  });

  it("can abandon an active or interrupted session without counting it complete", () => {
    const session = createSession({
      id: "11111111-1111-4111-8111-111111111111",
      userId: "U1",
      channelId: "D1",
      caseId: "case-1",
    });
    const abandoned = transition(session, { type: "ABANDON" });
    expect(abandoned.status).toBe("abandoned");
    expect(abandoned.completedAt).toBeInstanceOf(Date);
    expect(() => transition(abandoned, { type: "RESUME" })).toThrow();
  });
});
