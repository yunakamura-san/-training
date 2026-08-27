import { spawn } from "node:child_process";
import {
  buildEvaluationPrompt,
  parseProviderResponse,
  type AiProvider,
  type EvaluationRequest,
  type ProviderEvaluation,
} from "./provider";

const MAX_OUTPUT_BYTES = 200_000;

export class GeminiCliProvider implements AiProvider {
  readonly name = "gemini-cli";

  constructor(
    private readonly executable = "gemini",
    private readonly timeoutMs = 45_000,
  ) {
    if (!Number.isInteger(timeoutMs) || timeoutMs < 1_000) {
      throw new RangeError("timeoutMs must be at least 1000");
    }
  }

  async evaluate(request: EvaluationRequest): Promise<ProviderEvaluation> {
    const prompt = buildEvaluationPrompt(request);
    const output = await runProcess(
      this.executable,
      ["--prompt", prompt, "--output-format", "text"],
      this.timeoutMs,
    );
    return { ...parseProviderResponse(output), provider: this.name };
  }
}

function runProcess(
  executable: string,
  args: readonly string[],
  timeoutMs: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    // shell=false and an explicit argv array prevent prompt-based shell injection.
    const child = spawn(executable, [...args], {
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
      env: sanitizedChildEnvironment(),
    });
    const chunks: Buffer[] = [];
    let bytes = 0;
    let settled = false;

    const finish = (error?: Error, value?: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) {
        reject(error);
      } else {
        resolve(value ?? "");
      }
    };
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      finish(new Error("Gemini CLI timed out"));
    }, timeoutMs);

    child.stdout.on("data", (chunk: Buffer) => {
      bytes += chunk.length;
      if (bytes > MAX_OUTPUT_BYTES) {
        child.kill("SIGKILL");
        finish(new Error("Gemini CLI output exceeded limit"));
        return;
      }
      chunks.push(chunk);
    });
    // Deliberately do not collect stderr: it may include prompt or credential details.
    child.stderr.resume();
    child.once("error", (error) => finish(error));
    child.once("close", (code) => {
      if (code !== 0) {
        finish(new Error(`Gemini CLI exited with status ${code ?? "unknown"}`));
        return;
      }
      finish(undefined, Buffer.concat(chunks).toString("utf8"));
    });
  });
}

function sanitizedChildEnvironment(): NodeJS.ProcessEnv {
  const environment = { ...process.env };
  for (const key of Object.keys(environment)) {
    if (
      /^SLACK_/i.test(key) ||
      /^(DATABASE_URL|PGPASSWORD|POSTGRES_PASSWORD)$/i.test(key)
    ) {
      delete environment[key];
    }
  }
  return environment;
}
