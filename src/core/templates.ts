import type { StepKey, TrainingCase } from "./types";

export interface StepTemplate {
  key: StepKey;
  title: string;
  instruction: string;
  answerFormat: string;
  example: string;
}

export const STEP_TEMPLATES: readonly StepTemplate[] = [
  {
    key: "facts_and_interpretations",
    title: "1. 事実と解釈",
    instruction:
      "問題文に書かれている事実と、そこからあなたが考えた仮説を分けてください。事実を2〜4個、解釈を1〜3個書けば十分です。",
    answerFormat: "事実：①… ②…\n解釈・仮説：①… ②…",
    example:
      "事実：来店数は前年と同じ／売上は10%減少\n解釈・仮説：客単価が下がった可能性がある",
  },
  {
    key: "question_definition",
    title: "2. 問い定義",
    instruction:
      "このケースで最後に答えるべきことを、一文の質問にしてください。「分析する」だけで終わらず、何を判断するかまで書きます。",
    answerFormat: "問い：〇〇の原因を特定し、△△を決めるにはどうすべきか？",
    example: "問い：売上低下の主因を特定し、最初に打つ施策を決めるにはどうすべきか？",
  },
  {
    key: "decomposition_axis",
    title: "3. 分解軸",
    instruction:
      "原因や選択肢を、どんな基準で切り分けるか決めてください。時間・プロセス・主体などから、まず一つの軸を選びます。",
    answerFormat: "分解軸：〇〇\n選んだ理由：〇〇",
    example: "分解軸：購買プロセス（認知→来店→購入）\n理由：売上が落ちる場所を順番に特定できるため",
  },
  {
    key: "major_items",
    title: "4. 大項目",
    instruction:
      "先ほど決めた分解軸に沿って、同じ粒度の大項目を3〜5個並べてください。この段階では細かく説明しなくて構いません。",
    answerFormat: "大項目：①… ②… ③…",
    example: "大項目：①認知 ②来店 ③購入 ④再購入",
  },
  {
    key: "deep_dive",
    title: "5. 深掘り",
    instruction:
      "最も重要そうな大項目を一つ選び、さらに2〜4個の要因へ分けてください。なぜ結果につながるかも一言添えます。",
    answerFormat: "深掘りする項目：〇〇\n要因：①… ②…\nつながり：〇〇だから△△になる",
    example:
      "深掘りする項目：購入\n要因：①価格 ②品揃え ③接客\nつながり：価格への納得感が下がると購入率が下がる",
  },
  {
    key: "self_check",
    title: "6. 自己点検",
    instruction:
      "ここまでの構造を見直します。①重複 ②抜け ③粒度のばらつき、の3点を確認し、必要なら修正してください。",
    answerFormat: "重複：なし／〇〇\n抜け：なし／〇〇を追加\n粒度：揃っている／〇〇を修正",
    example: "重複：なし\n抜け：競合店の影響を追加\n粒度：『接客態度』を上位の『接客』へ修正",
  },
  {
    key: "priority_validation_conclusion",
    title: "7. 優先順位・検証・結論",
    instruction:
      "最初に確認する仮説を最大2つ選びます。影響の大きさと確かめやすさを理由にし、確認方法と現時点の結論を書いてください。",
    answerFormat:
      "優先①：仮説／理由／確認方法\n優先②：仮説／理由／確認方法\n結論：現時点では〇〇と考える",
    example:
      "優先①：客単価低下／影響が大きい／購買データを前年比較\n結論：まず価格と購入点数の変化を確認する",
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
