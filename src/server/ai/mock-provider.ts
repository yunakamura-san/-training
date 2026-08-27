import { evaluationCategories } from "../../core/types";
import type {
  AiProvider,
  EvaluationRequest,
  ProviderEvaluation,
} from "./provider";

export class MockAiProvider implements AiProvider {
  readonly name = "demo-mock";

  async evaluate(request: EvaluationRequest): Promise<ProviderEvaluation> {
    const answerLength = request.session.answers.reduce(
      (sum, answer) => sum + answer.messages.join("").length,
      0,
    );
    const base = Math.max(35, Math.min(72, 42 + Math.log2(answerLength + 1) * 3));
    return {
      provider: this.name,
      strength:
        "デモ評価: 問いに沿って7ステップを最後まで構成し、結論まで接続できています。",
      categories: evaluationCategories.map((category, index) => ({
        category,
        score: Math.round(Math.max(0, Math.min(100, base - (index % 3) * 4))),
        feedback: `デモ評価: ${category}の根拠と反証可能性をより具体化してください。`,
      })),
      rawFeedback: "Deterministic local demo evaluation",
    };
  }
}
