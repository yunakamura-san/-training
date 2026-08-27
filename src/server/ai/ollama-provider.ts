import { z } from "zod";
import {
  buildEvaluationPrompt,
  parseProviderResponse,
  type AiProvider,
  type EvaluationRequest,
  type ProviderEvaluation,
} from "./provider";

const OllamaResponseSchema = z.object({
  response: z.string().max(200_000),
});

export class OllamaProvider implements AiProvider {
  readonly name = "ollama";

  constructor(
    private readonly baseUrl = "http://127.0.0.1:11434",
    private readonly model = "gemma3",
    private readonly timeoutMs = 60_000,
  ) {
    const url = new URL(baseUrl);
    if (!["127.0.0.1", "localhost", "::1"].includes(url.hostname)) {
      throw new Error("Ollama URL must point to the local machine");
    }
    if (!/^[a-zA-Z0-9._:/-]{1,100}$/.test(model)) {
      throw new Error("Invalid Ollama model name");
    }
  }

  async evaluate(request: EvaluationRequest): Promise<ProviderEvaluation> {
    const signal = AbortSignal.timeout(this.timeoutMs);
    const response = await fetch(new URL("/api/generate", this.baseUrl), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        prompt: buildEvaluationPrompt(request),
        stream: false,
        format: "json",
      }),
      signal,
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error(`Ollama returned HTTP ${response.status}`);
    }
    const result = OllamaResponseSchema.parse(await response.json());
    return { ...parseProviderResponse(result.response), provider: this.name };
  }
}
