import type { Metadata } from "next"
import { ArrowDownRight, ArrowUpRight, Brain, Gauge, Repeat2, Trophy } from "lucide-react"

import { TrendChart } from "@/components/trend-chart"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { categoryHistory, recurringFindings, skills } from "@/lib/dashboard-data"
import { evaluationCategoryLabels, evaluationCategories } from "@/core/types"
import { loadDashboardSnapshot } from "@/server/dashboard-data"

export const metadata: Metadata = {
  title: "分析",
}

export const dynamic = "force-dynamic"

export default async function AnalysisPage() {
  const snapshot = await loadDashboardSnapshot()
  const recentEvaluations = snapshot?.sessions
    .map(({ evaluation }) => evaluation)
    .filter((evaluation) => evaluation !== null)
    .slice(0, 30)
  const averageScore =
    recentEvaluations && recentEvaluations.length > 0
      ? recentEvaluations.reduce((sum, item) => sum + item.overallScore, 0) /
        recentEvaluations.length
      : 75.8
  const displayedCategories =
    recentEvaluations && recentEvaluations.length > 0
      ? evaluationCategories.map((category) => {
          const currentWindow = recentEvaluations.slice(0, 7)
          const previousWindow = recentEvaluations.slice(7, 14)
          const average = (items: typeof recentEvaluations) =>
            items.length === 0
              ? 0
              : items.reduce(
                  (sum, evaluation) =>
                    sum +
                    (evaluation.categories.find((item) => item.category === category)?.score ?? 0),
                  0,
                ) / items.length
          return {
            category: evaluationCategoryLabels[category],
            current: Math.round(average(currentWindow)),
            previous: Math.round(
              previousWindow.length > 0 ? average(previousWindow) : average(currentWindow),
            ),
          }
        })
      : categoryHistory
  const trendData =
    snapshot && snapshot.difficultyHistory.length > 0
      ? snapshot.difficultyHistory
          .slice(0, 8)
          .reverse()
          .map((item) => ({
            label: new Intl.DateTimeFormat("ja-JP", {
              month: "numeric",
              day: "numeric",
              timeZone: "Asia/Tokyo",
            }).format(item.createdAt),
            score: item.score,
            ability: item.ability,
            difficulty: item.difficulty,
          }))
      : undefined
  const ability = snapshot?.difficulty?.ability ?? 64
  const difficulty = snapshot?.difficulty?.current ?? 52

  return (
    <div className="space-y-7">
      <header>
        <p className="text-sm font-medium text-muted-foreground">成長の見える化</p>
        <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">分析</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          問題が難しくなっても成長を見失わないよう、素点と難易度補正済みの能力値を分けています。
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "能力値", value: String(ability), note: "直近5回で平滑化", icon: Brain, tone: "text-primary" },
          { label: "平均スコア", value: averageScore.toFixed(1), note: "直近30回", icon: Trophy, tone: "text-amber-700" },
          { label: "現在難易度", value: String(difficulty), note: "日次変動は最大8", icon: Gauge, tone: "text-sky-700" },
          { label: "改善点再発率", value: "31%", note: "前月比 -8pt", icon: Repeat2, tone: "text-emerald-700" },
        ].map((metric) => {
          const Icon = metric.icon
          return (
            <Card key={metric.label}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">{metric.label}</p>
                  <Icon className={`size-4 ${metric.tone}`} />
                </div>
                <p className="mt-3 font-serif text-3xl font-semibold">{metric.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{metric.note}</p>
              </CardContent>
            </Card>
          )
        })}
      </section>

      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="font-serif text-xl">能力値と難易度</CardTitle>
            <CardDescription className="mt-1">
              実線：能力値　破線：問題難易度
            </CardDescription>
          </div>
          <Badge variant="secondary">直近8回</Badge>
        </CardHeader>
        <CardContent>
          <TrendChart data={trendData} />
        </CardContent>
      </Card>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-xl">カテゴリ別プロフィール</CardTitle>
            <CardDescription>全カテゴリを採点し、表示上の改善点は2つに絞っています</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-x-7 gap-y-5 sm:grid-cols-2">
            {displayedCategories.map((item) => {
              const diff = item.current - item.previous
              return (
                <div key={item.category}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="text-sm font-medium">{item.category}</span>
                    <span className="flex items-center gap-1 text-xs font-semibold">
                      {item.current}
                      {diff >= 0 ? (
                        <ArrowUpRight className="size-3.5 text-emerald-600" />
                      ) : (
                        <ArrowDownRight className="size-3.5 text-rose-600" />
                      )}
                    </span>
                  </div>
                  <Progress value={item.current} className="h-2" />
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    直近7回で {diff >= 0 ? "+" : ""}
                    {diff}
                  </p>
                </div>
              )
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-xl">改善カテゴリの再発</CardTitle>
            <CardDescription>同じ指摘を減らせているか</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {recurringFindings.map((finding, index) => (
              <div key={finding.category} className="rounded-2xl border p-4">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{finding.category}</p>
                  <Badge variant={index === 0 ? "secondary" : "outline"}>{finding.count}回</Badge>
                </div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{finding.description}</p>
              </div>
            ))}
            <div className="rounded-2xl bg-primary/5 p-4">
              <p className="text-sm font-semibold text-primary">次のベンチマークまで</p>
              <div className="mt-3 flex items-center gap-3">
                <Progress value={80} className="h-2 flex-1" />
                <span className="text-xs font-medium">あと2回</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="border-dashed bg-transparent">
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">データが少ないため、一部は参考値です</p>
            <p className="mt-1 text-sm text-muted-foreground">
              20回以上の完了後から、傾向をより確かなものとして表示します。
            </p>
          </div>
          <Badge variant="outline">{skills.length}カテゴリを追跡中</Badge>
        </CardContent>
      </Card>
    </div>
  )
}
