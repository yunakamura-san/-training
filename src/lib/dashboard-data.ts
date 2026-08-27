export type Skill = {
  key: string
  label: string
  score: number
  delta: number
}

export type SessionSummary = {
  id: string
  date: string
  title: string
  category: string
  score: number
  difficulty: number
  status: "completed" | "paused"
  focus: string
}

export const skills: Skill[] = [
  { key: "issue", label: "論点設定", score: 72, delta: 4 },
  { key: "coverage", label: "網羅性", score: 68, delta: 2 },
  { key: "exclusive", label: "重複・排他性", score: 61, delta: -1 },
  { key: "axis", label: "分類軸", score: 54, delta: 1 },
  { key: "hierarchy", label: "階層・粒度", score: 59, delta: 3 },
  { key: "causality", label: "因果関係", score: 70, delta: 5 },
  { key: "priority", label: "優先順位", score: 63, delta: 2 },
  { key: "conclusion", label: "結論接続", score: 74, delta: 4 },
  { key: "clarity", label: "簡潔さ", score: 77, delta: 1 },
]

export const sessions: SessionSummary[] = [
  {
    id: "sales-win-rate",
    date: "8月27日",
    title: "新規商談の受注率低下",
    category: "BtoB新規営業",
    score: 78,
    difficulty: 52,
    status: "completed",
    focus: "分類軸",
  },
  {
    id: "support-cost",
    date: "8月26日",
    title: "顧客サポート費の増加",
    category: "業務改善",
    score: 74,
    difficulty: 49,
    status: "completed",
    focus: "階層・粒度",
  },
  {
    id: "market-entry",
    date: "8月25日",
    title: "中小企業市場への参入",
    category: "新規事業",
    score: 81,
    difficulty: 47,
    status: "completed",
    focus: "優先順位",
  },
  {
    id: "pipeline",
    date: "8月22日",
    title: "営業パイプラインの停滞",
    category: "BtoB新規営業",
    score: 70,
    difficulty: 45,
    status: "completed",
    focus: "網羅性",
  },
]

export const scoreTrend = [
  { label: "8/18", score: 62, ability: 44, difficulty: 40 },
  { label: "8/19", score: 68, ability: 47, difficulty: 42 },
  { label: "8/20", score: 66, ability: 49, difficulty: 44 },
  { label: "8/21", score: 72, ability: 52, difficulty: 45 },
  { label: "8/22", score: 70, ability: 54, difficulty: 45 },
  { label: "8/25", score: 81, ability: 58, difficulty: 47 },
  { label: "8/26", score: 74, ability: 60, difficulty: 49 },
  { label: "8/27", score: 78, ability: 64, difficulty: 52 },
]

export const recurringFindings = [
  {
    category: "分類軸の一貫性",
    count: 4,
    trend: "改善中",
    description: "顧客・営業活動・商品という異なる軸が、同じ階層に混在する傾向があります。",
    nextAction: "分解前に「何を基準に切るか」を一文で宣言する",
  },
  {
    category: "階層・粒度",
    count: 3,
    trend: "要注意",
    description: "原因と具体施策が同じ階層に並び、論理の深さが揃わないことがあります。",
    nextAction: "各項目を「原因」か「施策」のどちらかに統一する",
  },
]

export const categoryHistory = skills.map((skill, index) => ({
  category: skill.label,
  current: skill.score,
  previous: Math.max(38, skill.score - skill.delta - (index % 3)),
}))
