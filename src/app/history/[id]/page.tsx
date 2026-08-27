import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, CheckCircle2, GitBranch, Lightbulb, Quote, Target } from "lucide-react"
import { notFound } from "next/navigation"

import { ScoreRing } from "@/components/score-ring"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { sessions, skills } from "@/lib/dashboard-data"
import { evaluationCategoryLabels } from "@/core/types"
import { loadStoredSessionDetail } from "@/server/dashboard-data"

type PageProps = {
  params: Promise<{ id: string }>
}

export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const session = sessions.find((item) => item.id === id)
  if (session) return { title: session.title }
  const stored = await loadStoredSessionDetail(id)
  return { title: stored?.trainingCase.title ?? "トレーニング詳細" }
}

export default async function SessionDetailPage({ params }: PageProps) {
  const { id } = await params
  const demoSession = sessions.find((item) => item.id === id)
  const stored = demoSession ? null : await loadStoredSessionDetail(id)
  if (!demoSession && !stored) notFound()
  const summary = demoSession ?? {
    id,
    date: new Intl.DateTimeFormat("ja-JP", {
      month: "long",
      day: "numeric",
      timeZone: "Asia/Tokyo",
    }).format(stored!.session.startedAt),
    title: stored!.trainingCase.title,
    category: stored!.trainingCase.tags.includes("b2b_sales") ? "BtoB新規営業" : "汎用ビジネス",
    score: stored!.evaluation?.overallScore ?? 0,
    difficulty: stored!.trainingCase.difficulty,
    status: "completed" as const,
    focus: "構造化",
  }
  const casePrompt =
    stored?.trainingCase.prompt ??
    "あるBtoB SaaS企業では、商談数は前四半期比10%増加しましたが、受注件数は25%減少しました。提案件数は横ばいで、平均値引率は上昇しています。原因を構造化し、優先して検証すべき仮説を示してください。"
  const categoryScores = stored?.evaluation?.categories
  const displayedScores =
    categoryScores?.map(({ category, score }) => ({
      key: category,
      label: evaluationCategoryLabels[category],
      score,
    })) ??
    skills.map((skill, index) => ({
      key: skill.key,
      label: skill.label,
      score: index === 3 ? 54 : Math.min(90, skill.score + (index % 2) * 4),
    }))

  return (
    <div className="space-y-7">
      <Link
        href="/history"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        履歴へ戻る
      </Link>

      <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{summary.category}</Badge>
            <span className="text-xs text-muted-foreground">{summary.date}</span>
          </div>
          <h1 className="mt-3 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
            {summary.title}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-right text-xs leading-5 text-muted-foreground">
            難易度
            <strong className="block text-base text-foreground">{summary.difficulty} / 100</strong>
          </span>
          <ScoreRing value={summary.score} label="SCORE" size="sm" />
        </div>
      </header>

      <Card className="border-0 bg-primary text-primary-foreground">
        <CardHeader>
          <CardDescription className="text-white/60">CASE</CardDescription>
          <CardTitle className="font-serif text-xl text-white">{summary.title}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-7 text-white/75">
          {casePrompt}
        </CardContent>
      </Card>

      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <GitBranch className="size-5 text-primary" />
              <CardTitle className="font-serif text-xl">あなたの構造</CardTitle>
            </div>
            <CardDescription>7ステップの回答から再構成</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-2xl border bg-muted/35 p-4 sm:p-5">
              <div className="rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground">
                受注率低下の主因はどこにあるか
              </div>
              <div className="ml-4 border-l-2 border-primary/20 pl-4 pt-4 sm:ml-8 sm:pl-6">
                {[
                  ["顧客要因", "予算縮小／決裁者の変化"],
                  ["営業活動要因", "課題把握／提案品質／フォロー"],
                  ["商品・競合要因", "価格競争力／機能差／値引き"],
                ].map(([branch, detail], index) => (
                  <div key={branch} className={index > 0 ? "mt-3" : ""}>
                    <div className="rounded-lg border bg-card px-3 py-2 text-sm font-semibold">{branch}</div>
                    <div className="ml-5 mt-1.5 border-l pl-4 text-xs leading-6 text-muted-foreground">
                      {detail}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-amber-950">
              <div className="flex gap-2">
                <Lightbulb className="mt-0.5 size-4 shrink-0" />
                <div>
                  <p className="text-sm font-semibold">構造上のポイント</p>
                  <p className="mt-1 text-xs leading-5 text-amber-900/75">
                    「営業活動」はプロセス軸、「顧客」「商品」は主体軸です。同じ階層では軸を統一すると比較しやすくなります。
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-xl">カテゴリ別採点</CardTitle>
            <CardDescription>内部では全9カテゴリを記録</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3.5">
            {displayedScores.map((skill) => {
              return (
                <div key={skill.key}>
                  <div className="mb-1.5 flex justify-between text-xs">
                    <span className="font-medium">{skill.label}</span>
                    <span className="tabular-nums text-muted-foreground">{skill.score}</span>
                  </div>
                  <Progress value={skill.score} className="h-1.5" />
                </div>
              )
            })}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-emerald-700" />
              <CardTitle className="font-serif text-lg">良かった点</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-sm leading-7 text-emerald-950/80">
            {stored?.evaluation?.strength ??
              "商談から受注までの論点に集中し、施策へ飛びつく前に原因仮説を整理できています。特に、値引率上昇を競争力低下の兆候として扱った点は妥当です。"}
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Target className="size-5 text-amber-700" />
              <CardTitle className="font-serif text-lg">次に直す2点</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {(stored?.evaluation?.improvements ?? [
              "分類軸: 大項目を主体軸かプロセス軸のどちらかに統一する。",
              "優先順位: 影響度だけでなく、検証コストと速度を理由に含める。",
            ]).map((improvement, index) => {
              const [category, ...detail] = improvement.split(":")
              return (
                <div key={improvement}>
                  {index > 0 && <Separator className="mb-4" />}
                  <Badge variant="outline">{category}</Badge>
                  <p className="mt-2 text-sm leading-6">
                    {detail.join(":").trim() || improvement}
                  </p>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Quote className="size-5 text-primary" />
            <CardTitle className="font-serif text-xl">模範構造の一例</CardTitle>
          </div>
          <CardDescription>唯一の正解ではなく、意思決定に使いやすい切り方の例です</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm leading-6 sm:grid-cols-3">
          {[
            ["案件の質", "対象企業の適合度、案件化基準、予算・時期"],
            ["営業プロセス", "発見、提案、決裁者接触、クロージング"],
            ["提供価値", "課題との適合、競合差、価格妥当性"],
          ].map(([title, detail]) => (
            <div key={title} className="rounded-2xl border bg-muted/30 p-4">
              <p className="font-semibold">{title}</p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{detail}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
