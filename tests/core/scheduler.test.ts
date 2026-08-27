import { describe, expect, it, vi } from "vitest";
import { InMemoryRepository } from "../../src/core/in-memory-repository";
import { createSession } from "../../src/core/session-machine";
import { DEMO_CASES } from "../../src/core/templates";
import { TrainingScheduler } from "../../src/server/scheduler";

describe("Japanese business-day scheduler", () => {
  it("skips Japanese holidays and claims a daily notification once", async () => {
    const repository = new InMemoryRepository();
    const messenger = {
      sendQuestionPrompt: vi.fn(async () => undefined),
      sendUnstartedReminder: vi.fn(async () => undefined),
    };
    const scheduler = new TrainingScheduler(repository, messenger, "U1");

    expect(await scheduler.runQuestion(new Date("2026-01-01T00:00:00Z"))).toBe(false);
    expect(await scheduler.runQuestion(new Date("2026-01-05T00:00:00Z"))).toBe(true);
    expect(await scheduler.runQuestion(new Date("2026-01-05T01:00:00Z"))).toBe(false);
    expect(messenger.sendQuestionPrompt).toHaveBeenCalledTimes(1);
  });

  it("reminds only when today's session has not started", async () => {
    const repository = new InMemoryRepository(DEMO_CASES);
    const messenger = {
      sendQuestionPrompt: vi.fn(async () => undefined),
      sendUnstartedReminder: vi.fn(async () => undefined),
    };
    const scheduler = new TrainingScheduler(repository, messenger, "U1");
    await scheduler.runQuestion(new Date("2026-01-05T00:00:00Z"));
    expect(await scheduler.runReminder(new Date("2026-01-05T01:00:00Z"))).toBe(true);

    const session = createSession({
      id: "11111111-1111-4111-8111-111111111111",
      userId: "U1",
      channelId: "D1",
      caseId: DEMO_CASES[0]!.id,
      at: new Date("2026-01-06T00:00:00Z"),
    });
    await repository.saveSession(session);

    await scheduler.runQuestion(new Date("2026-01-06T00:00:00Z"));
    expect(await scheduler.runReminder(new Date("2026-01-06T01:00:00Z"))).toBe(false);

    await scheduler.runQuestion(new Date("2026-01-07T00:00:00Z"));
    expect(await scheduler.runReminder(new Date("2026-01-07T01:00:00Z"))).toBe(true);
    expect(messenger.sendUnstartedReminder).toHaveBeenCalledTimes(2);
  });

  it("releases a notification claim after a delivery failure", async () => {
    const repository = new InMemoryRepository();
    const messenger = {
      sendQuestionPrompt: vi
        .fn<() => Promise<void>>()
        .mockRejectedValueOnce(new Error("offline"))
        .mockResolvedValueOnce(undefined),
      sendUnstartedReminder: vi.fn(async () => undefined),
    };
    const scheduler = new TrainingScheduler(repository, messenger, "U1");
    const at = new Date("2026-01-05T00:00:00Z");

    await expect(scheduler.runQuestion(at)).rejects.toThrow("offline");
    await expect(scheduler.runQuestion(at)).resolves.toBe(true);
    expect(messenger.sendQuestionPrompt).toHaveBeenCalledTimes(2);
  });
});
