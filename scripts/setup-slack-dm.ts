import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { WebClient } from "@slack/web-api";

async function main(): Promise<void> {
  const botToken = process.env.SLACK_BOT_TOKEN;
  const userId = process.env.SLACK_USER_ID;
  if (!botToken?.startsWith("xoxb-")) {
    throw new Error("SLACK_BOT_TOKEN is missing or invalid");
  }
  if (!userId || !/^U[A-Z0-9]+$/.test(userId)) {
    throw new Error("SLACK_USER_ID is missing or invalid");
  }

  const result = await new WebClient(botToken).conversations.open({ users: userId });
  const channelId = result.channel?.id;
  if (!channelId || !/^D[A-Z0-9]+$/.test(channelId)) {
    throw new Error("Slack did not return a direct-message channel");
  }

  const envPath = resolve(process.cwd(), ".env.local");
  const current = await readFile(envPath, "utf8");
  const next = /^SLACK_CHANNEL_ID=.*$/m.test(current)
    ? current.replace(/^SLACK_CHANNEL_ID=.*$/m, `SLACK_CHANNEL_ID=${channelId}`)
    : `${current.trimEnd()}\nSLACK_CHANNEL_ID=${channelId}\n`;
  await writeFile(envPath, next, { encoding: "utf8", mode: 0o600 });
  console.log(`DM IDを.env.localへ保存しました: ${channelId}`);
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error
      ? `DM IDの設定に失敗しました: ${error.message}`
      : "DM IDの設定に失敗しました",
  );
  process.exitCode = 1;
});
