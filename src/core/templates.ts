import type { StepKey, TrainingCase } from "./types";

export interface StepTemplate {
  key: StepKey;
  title: string;
  instruction: string;
}

export const STEP_TEMPLATES: readonly StepTemplate[] = [
  {
    key: "facts_and_interpretations",
    title: "1. 事実と解釈",
    instruction: "観測できる事実と、そこからの解釈・仮説を分けてください。",
  },
  {
    key: "question_definition",
    title: "2. 問い定義",
    instruction: "今回答えるべき問いを、判断可能な一文で定義してください。",
  },
  {
    key: "decomposition_axis",
    title: "3. 分解軸",
    instruction: "問いを分解する軸と、その軸を選んだ理由を示してください。",
  },
  {
    key: "major_items",
    title: "4. 大項目",
    instruction: "分解軸に沿った大項目を、重複と漏れを意識して列挙してください。",
  },
  {
    key: "deep_dive",
    title: "5. 深掘り",
    instruction: "重要な大項目を根拠・因果・反証可能性まで掘り下げてください。",
  },
  {
    key: "self_check",
    title: "6. 自己点検",
    instruction: "前提、飛躍、見落とし、反対意見を厳しく点検してください。",
  },
  {
    key: "priority_validation_conclusion",
    title: "7. 優先順位・検証・結論",
    instruction: "優先順位、検証方法、現時点の結論をまとめてください。",
  },
] as const;

export const DEMO_CASES: readonly TrainingCase[] = [
  {
    id: "diagnostic-retention",
    title: "解約率の上昇",
    prompt:
      "SaaSの月次解約率が3か月で2%から5%に上昇しました。限られた情報から、最初に何を判断し何を調べるべきか整理してください。",
    difficulty: 35,
    tags: ["general_business", "coverage", "causality", "diagnostic"],
    diagnostic: true,
  },
  {
    id: "diagnostic-delivery",
    title: "配送遅延",
    prompt:
      "定時配送率が92%から81%へ低下しました。原因特定と短期対策の考え方を整理してください。",
    difficulty: 42,
    tags: ["general_business", "hierarchy_granularity", "causality", "diagnostic"],
    diagnostic: true,
  },
  {
    id: "diagnostic-hiring",
    title: "採用計画",
    prompt:
      "半年でエンジニアを10人採用する目標に対し、現在2人しか採用できていません。計画を再評価してください。",
    difficulty: 48,
    tags: ["general_business", "prioritization", "coverage", "diagnostic"],
    diagnostic: true,
  },
  {
    id: "diagnostic-pricing",
    title: "価格改定",
    prompt:
      "原価上昇を受けた価格改定を検討しています。値上げの可否と進め方を整理してください。",
    difficulty: 54,
    tags: ["general_business", "axis_consistency", "conclusion_evidence", "diagnostic"],
    diagnostic: true,
  },
  {
    id: "diagnostic-ai",
    title: "AI導入判断",
    prompt:
      "問い合わせ対応への生成AI導入を提案されました。投資判断に必要な論点を整理してください。",
    difficulty: 60,
    tags: ["general_business", "issue_definition", "exclusivity", "diagnostic"],
    diagnostic: true,
  },
  {
    id: "demo-expansion",
    title: "新市場への展開",
    prompt:
      "国内で成長が鈍化したサービスについて、海外市場への展開可否を判断してください。",
    difficulty: 65,
    tags: ["general_business", "coverage", "prioritization"],
    diagnostic: false,
  },
  {
    id: "general-support-cost",
    title: "顧客サポート費の増加",
    prompt:
      "問い合わせ件数は横ばいですが、顧客サポート費が半年で30%増加しました。原因を構造化し、最初に検証する論点を示してください。",
    difficulty: 48,
    tags: ["general_business", "axis_consistency", "causality"],
    diagnostic: false,
  },
  {
    id: "general-project-delay",
    title: "新規プロジェクトの遅延",
    prompt:
      "全社横断プロジェクトが当初計画から2か月遅延しています。責任者を決めつけずに原因を分解し、立て直しの優先順位を示してください。",
    difficulty: 56,
    tags: ["general_business", "exclusivity", "hierarchy_granularity"],
    diagnostic: false,
  },
  {
    id: "general-profit-decline",
    title: "売上成長下での利益率低下",
    prompt:
      "売上は前年比15%成長しましたが、営業利益率が12%から7%へ低下しました。経営会議で確認すべき原因仮説を構造化してください。",
    difficulty: 62,
    tags: ["general_business", "coverage", "causality"],
    diagnostic: false,
  },
  {
    id: "general-product-priority",
    title: "開発施策の優先順位",
    prompt:
      "顧客要望、障害対応、新機能開発のすべてが逼迫しています。限られた開発余力をどう配分するか、評価軸と結論を示してください。",
    difficulty: 68,
    tags: ["general_business", "prioritization", "conclusion_evidence"],
    diagnostic: false,
  },
  {
    id: "general-branch-performance",
    title: "拠点間の生産性格差",
    prompt:
      "同じ業務を担う5拠点で、一人当たり生産性に最大2倍の差があります。差の原因を構造化し、調査設計を示してください。",
    difficulty: 72,
    tags: ["general_business", "axis_consistency", "hierarchy_granularity"],
    diagnostic: false,
  },
  {
    id: "general-partner-decision",
    title: "提携先候補の比較",
    prompt:
      "異なる強みを持つ3社から業務提携の提案を受けました。提携目的を定義し、比較の構造と推奨判断を示してください。",
    difficulty: 76,
    tags: ["general_business", "issue_definition", "clarity"],
    diagnostic: false,
  },
  {
    id: "sales-win-rate",
    title: "新規商談の受注率低下",
    prompt:
      "BtoB SaaS企業で商談数は前四半期比10%増えましたが、受注件数は25%減少しました。提案件数は横ばいで、平均値引率は上昇しています。原因を構造化し、優先して検証する仮説を示してください。",
    difficulty: 52,
    tags: ["b2b_sales", "axis_consistency", "causality"],
    diagnostic: false,
  },
  {
    id: "sales-targeting",
    title: "新規開拓先の選定",
    prompt:
      "来四半期の商談創出目標を達成するため、従業員規模も業界も異なる見込み企業200社から優先対象を選ぶ必要があります。選定軸と実行順序を示してください。",
    difficulty: 64,
    tags: ["b2b_sales", "exclusivity", "prioritization"],
    diagnostic: false,
  },
  {
    id: "sales-stalled-pipeline",
    title: "商談パイプラインの停滞",
    prompt:
      "初回商談は増えていますが、提案段階へ進む案件が減っています。顧客規模や担当者別の明確な差はまだ確認できません。原因仮説と検証方法を構造化してください。",
    difficulty: 70,
    tags: ["b2b_sales", "coverage", "conclusion_evidence"],
    diagnostic: false,
  },
] as const;

export const BENCHMARK_INTERVAL = 10;

export function isBenchmarkOrdinal(completedCount: number): boolean {
  return completedCount > 0 && completedCount % BENCHMARK_INTERVAL === 0;
}
