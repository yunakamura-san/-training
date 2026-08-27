import { z } from "zod";
import {
  CategoryScoreSchema,
  evaluationCategories,
  type CategoryScore,
  type TrainingCase,
  type TrainingSession,
} from "../../core/types";

export interface EvaluationRequest {
  trainingCase: TrainingCase;
  session: TrainingSession;
}

export interface ProviderEvaluation {
  provider: string;
  categories: CategoryScore[];
  strength: string;
  rawFeedback?: string;
}

export interface AiProvider {
  readonly name: string;
  evaluate(request: EvaluationRequest): Promise<ProviderEvaluation>;
}

const ProviderResponseSchema = z.object({
  categories: z.array(CategoryScoreSchema).length(9),
  strength: z.string().min(1).max(2_000),
});

const CATEGORY_GUIDE = [
  "issue_definition: 問いに正面から答える論点を明確に定義できているか",
  "coverage: 意思決定に重要な要素の抜けが少ないか",
  "exclusivity: 大項目の意味が重複していないか",
  "axis_consistency: 同じ階層で分類基準が混在していないか",
  "hierarchy_granularity: 親子関係と項目の粒度が揃っているか",
  "causality: 原因、根拠、結論のつながりに飛躍がないか",
  "prioritization: 影響度・検証速度・コストを踏まえて優先できているか",
  "conclusion_evidence: 結論が回答内の根拠によって支えられているか",
  "clarity: 簡潔で、第三者が構造を再現できる表現か",
] as const;

export function buildEvaluationPrompt(request: EvaluationRequest): string {
  const answers = request.session.answers.map((answer) => ({
    step: answer.step,
    response: answer.messages.join("\n"),
  }));
  return [
    "あなたは論理思考トレーニングの厳格な評価者です。",
    "甘い採点を避け、根拠のない主張、飛躍、漏れを減点してください。",
    "業界知識の豊富さではなく、回答の構造を評価してください。模範構造は唯一の正解ではありません。",
    "以下の9カテゴリを各0〜100点で評価し、各feedbackを日本語で具体的に書いてください。",
    CATEGORY_GUIDE.join("\n"),
    "feedbackには、回答中の根拠となる短い引用と、次回の具体的な改善行動を含めてください。",
    "strengthには、回答中の引用を含む最も良かった点を1つ書いてください。",
    "JSONのみを返してください。形式: {\"strength\":\"...\",\"categories\":[{\"category\":\"...\",\"score\":0,\"feedback\":\"...\"}]}",
    `課題: ${request.trainingCase.title}\n${request.trainingCase.prompt}`,
    `回答: ${JSON.stringify(answers)}`,
  ].join("\n\n");
}

export function parseProviderResponse(text: string): ProviderEvaluation {
  if (text.length > 200_000) throw new Error("AI response is too large");
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace < 0 || lastBrace <= firstBrace) {
    throw new Error("AI response did not contain JSON");
  }
  const parsed = ProviderResponseSchema.parse(
    JSON.parse(text.slice(firstBrace, lastBrace + 1)),
  );
  const unique = new Set(parsed.categories.map(({ category }) => category));
  if (
    unique.size !== evaluationCategories.length ||
    evaluationCategories.some((category) => !unique.has(category))
  ) {
    throw new Error("AI response omitted evaluation categories");
  }
  return {
    provider: "unknown",
    categories: parsed.categories,
    strength: parsed.strength,
    rawFeedback: text,
  };
}

export class FallbackAiProvider implements AiProvider {
  readonly name = "fallback";

  constructor(private readonly providers: readonly AiProvider[]) {
    if (providers.length === 0) throw new Error("At least one AI provider is required");
  }

  async evaluate(request: EvaluationRequest): Promise<ProviderEvaluation> {
    const failures: string[] = [];
    for (const provider of this.providers) {
      try {
        const result = await provider.evaluate(request);
        return { ...result, provider: provider.name };
      } catch (error) {
        failures.push(`${provider.name}: ${safeErrorMessage(error)}`);
      }
    }
    throw new Error(`All AI providers failed: ${failures.join("; ")}`);
  }
}

function safeErrorMessage(error: unknown): string {
  // Provider errors can contain prompts or credentials; expose only the error class.
  return error instanceof Error ? error.name : "unknown error";
}
