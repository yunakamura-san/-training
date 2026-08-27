import cron, { type ScheduledTask } from "node-cron";
import Holidays from "date-holidays";
import type { Repository } from "../core/repository";

const JST = "Asia/Tokyo";

export interface SchedulerMessenger {
  sendQuestionPrompt(): Promise<void>;
  sendUnstartedReminder(): Promise<void>;
}

export class TrainingScheduler {
  private readonly holidays = new Holidays("JP");
  private tasks: ScheduledTask[] = [];

  constructor(
    private readonly repository: Repository,
    private readonly messenger: SchedulerMessenger,
    private readonly userId: string,
    private readonly now: () => Date = () => new Date(),
  ) {}

  start(): void {
    if (this.tasks.length > 0) return;
    this.tasks = [
      cron.schedule("*/5 * * * 1-5", () => void this.runDue().catch(() => undefined), {
        timezone: JST,
        noOverlap: true,
      }),
    ];
    void this.runDue().catch(() => undefined);
  }

  stop(): void {
    for (const task of this.tasks) task.stop();
    this.tasks = [];
  }

  async runQuestion(at = this.now()): Promise<boolean> {
    if (!this.isJapaneseBusinessDay(at)) return false;
    const date = japaneseDate(at);
    if (!(await this.repository.claimNotification(date, "question", at))) return false;
    try {
      await this.messenger.sendQuestionPrompt();
      return true;
    } catch (error) {
      await this.repository.releaseNotification(date, "question");
      throw error;
    }
  }

  async runReminder(at = this.now()): Promise<boolean> {
    if (!this.isJapaneseBusinessDay(at)) return false;
    const date = japaneseDate(at);
    const claims = await this.repository.getNotificationClaims(date);
    const question = claims.find(({ kind }) => kind === "question");
    if (!question || at.getTime() - question.claimedAt.getTime() < 60 * 60 * 1_000) return false;
    const latest = await this.repository.getLatestSession(this.userId);
    if (latest && japaneseDate(latest.startedAt) === date) return false;
    if (!(await this.repository.claimNotification(date, "reminder", at))) return false;
    try {
      await this.messenger.sendUnstartedReminder();
      return true;
    } catch (error) {
      await this.repository.releaseNotification(date, "reminder");
      throw error;
    }
  }

  isJapaneseBusinessDay(at: Date): boolean {
    const parts = japaneseParts(at);
    if (parts.weekday === "Sat" || parts.weekday === "Sun") return false;
    // Noon avoids date changes around timezone offsets in the holiday library.
    const jstCalendarDate = new Date(`${parts.date}T12:00:00+09:00`);
    return !this.holidays.isHoliday(jstCalendarDate);
  }

  private async runDue(at = this.now()): Promise<void> {
    if (!this.isJapaneseBusinessDay(at)) return;
    const minutes = japaneseMinutes(at);
    if (minutes >= 9 * 60) await this.runQuestion(at);
    if (minutes >= 10 * 60) await this.runReminder(at);
  }
}

function japaneseDate(at: Date): string {
  return japaneseParts(at).date;
}

function japaneseParts(at: Date): { date: string; weekday: string } {
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: JST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: JST,
    weekday: "short",
  }).format(at);
  return { date, weekday };
}

function japaneseMinutes(at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: JST,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const hour = Number(parts.find(({ type }) => type === "hour")?.value ?? 0);
  const minute = Number(parts.find(({ type }) => type === "minute")?.value ?? 0);
  return hour * 60 + minute;
}
