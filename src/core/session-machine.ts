import { randomUUID } from "node:crypto";
import {
  TrainingSessionSchema,
  stepKeys,
  type TrainingSession,
} from "./types";

export type SessionEvent =
  | { type: "APPEND"; text: string; at?: Date }
  | { type: "CONFIRM"; at?: Date }
  | { type: "INTERRUPT"; at?: Date }
  | { type: "RESUME"; at?: Date };

export function createSession(input: {
  userId: string;
  channelId: string;
  caseId: string;
  at?: Date;
  id?: string;
}): TrainingSession {
  const at = input.at ?? new Date();
  return TrainingSessionSchema.parse({
    id: input.id ?? randomUUID(),
    userId: input.userId,
    channelId: input.channelId,
    caseId: input.caseId,
    status: "active",
    currentStep: 0,
    answers: [],
    startedAt: at,
    updatedAt: at,
  });
}

export function transition(
  current: TrainingSession,
  event: SessionEvent,
): TrainingSession {
  const session = TrainingSessionSchema.parse(current);
  const at = event.at ?? new Date();

  if (event.type === "INTERRUPT") {
    requireStatus(session, "active");
    return { ...session, status: "interrupted", updatedAt: at };
  }
  if (event.type === "RESUME") {
    requireStatus(session, "interrupted");
    return { ...session, status: "active", updatedAt: at };
  }

  requireStatus(session, "active");
  if (session.currentStep >= stepKeys.length) {
    throw new Error("Session is already complete");
  }

  if (event.type === "APPEND") {
    const text = event.text.trim();
    if (text.length === 0 || text.length > 4_000) {
      throw new RangeError("Message must contain 1 to 4000 characters");
    }
    const answers = [...session.answers];
    const answer = answers[session.currentStep];
    if (answer?.confirmedAt) throw new Error("Current step is already confirmed");
    if (answer) {
      if (answer.messages.length >= 100) {
        throw new RangeError("A step cannot contain more than 100 messages");
      }
      answers[session.currentStep] = {
        ...answer,
        messages: [...answer.messages, text],
      };
    } else {
      answers[session.currentStep] = {
        step: stepKeys[session.currentStep]!,
        messages: [text],
      };
    }
    return TrainingSessionSchema.parse({ ...session, answers, updatedAt: at });
  }

  const answer = session.answers[session.currentStep];
  if (!answer || answer.messages.length === 0) {
    throw new Error("Cannot confirm an empty step");
  }
  const answers = [...session.answers];
  answers[session.currentStep] = { ...answer, confirmedAt: at };
  const nextStep = session.currentStep + 1;
  const completed = nextStep === stepKeys.length;
  return TrainingSessionSchema.parse({
    ...session,
    answers,
    currentStep: nextStep,
    status: completed ? "completed" : "active",
    completedAt: completed ? at : undefined,
    updatedAt: at,
  });
}

function requireStatus(
  session: TrainingSession,
  expected: TrainingSession["status"],
): void {
  if (session.status !== expected) {
    throw new Error(`Expected ${expected} session, got ${session.status}`);
  }
}
