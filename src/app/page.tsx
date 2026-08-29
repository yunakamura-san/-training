import Link from "next/link"
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  Focus,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react"

import { ScoreRing } from "@/components/score-ring"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { recurringFindings, sessions, skills } from "@/lib/dashboard-data"
import { evaluationCategoryLabels } from "@/core/types"
import { loadDashboardSnapshot } from "@/server/dashboard-data"

export const dynamic = "force-dynamic"

export default async function Home() {
  const snapshot = await loadDashboardSnapshot()
  const latest = snapshot?.sessions.find(({ evaluation }) => evaluation !== null)
  const latestEvaluation = latest?.evaluation
  const displayedSkills =
    latestEvaluation?.categories.map(({ category, score }) => ({
      key: category,
      label: evaluationCategoryLabels[category],
      score,
    })) ?? skills
  const recentSessions =
    snapshot
      ? snapshot.sessions.slice(0, 4).map(({ session, trainingCase, evaluation }) => ({
          id: session.id,
          date: new Intl.DateTimeFormat("ja-JP", {
            month: "short",
            day: "numeric",
            timeZone: "Asia/Tokyo",
          }).format(session.startedAt),
          title: trainingCase.title,
          category: trainingCase.tags.includes("b2b_sales") ? "BtoB新規営業" : "汎用ビジネス",
          score: evaluation?.overallScore ?? 0,
          difficulty: trainingCase.difficulty,
          status: session.status === "completed" ? ("completed" as const) : ("paused" as const),
          focus: "構造化",
        }))
      : sessions
  const connectedWithoutData = snapshot !== null && snapshot.sessions.length === 0
  const ability = snapshot ? (snapshot.difficulty?.ability ?? 50) : 64
  const difficulty = snapshot ? (snapshot.difficulty?.current ?? 50) : 52
  const latestScore = connectedWithoutData ? 0 : (latestEvaluation?.overallScore ?? 78)
  const latestTitle = latest?.trainingCase.title ?? "新規商談の受注率低下"
  const latestLink = connectedWithoutData ? "/settings" : `/history/${latest?.session.id ?? "sales-win-rate"}`
  const latestStrength =
    latestEvaluation?.strength ??
    "営業工程の分解は明確でした。次は、同じ階層で使う分類軸をひとつに揃えましょう。"

  return (
    <div className="space-y-8">
      <header className="animate-rise flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-muted-foreground">2026年8月27日 木曜日</p>
          <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
            今日も、考え方を整える。
          </h1>
        </div>
        <Badge variant="outline" className="w-fit gap-1.5 bg-card px-3 py-1.5">
          <span className="size-1.5 rounded-full bg-emerald-600" />
          Slack 接続済み
        </Badge>
      </header>

      <section
        className="animate-rise grid gap-5 lg:grid-cols-[1.35fr_0.65fr]"
        style={{ animationDelay: "80ms" }}
      >
        <Card className="overflow-hidden border-0 bg-primary text-primary-foreground shadow-lg shadow-primary/10">
          <CardContent className="relative grid gap-7 p-6 sm:grid-cols-[1fr_auto] sm:p-8">
            <div className="absolute -right-16 -top-20 size-64 rounded-full border border-white/10" />
            <div className="absolute -right-6 -top-10 size-44 rounded-full border border-white/10" />
            <div className="relative">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="border-white/15 bg-white/10 text-white">
                  {connectedWithoutData ? "初回診断の準備完了" : "本日のトレーニング完了"}
                </Badge>
                {!connectedWithoutData && <span className="text-xs text-white/65">12分40秒</span>}
              </div>
              <h2 className="mt-5 max-w-xl font-serif text-2xl font-semibold leading-tight sm:text-3xl">
                {connectedWithoutData ? (
                  <>最初のトレーニングを<br className="hidden sm:block" />待っています</>
                ) : (
                  <>{latestTitle}を<br className="hidden sm:block" />構造化しました</>
                )}
              </h2>
              <p className="mt-3 max-w-lg text-sm leading-6 text-white/70">
                {connectedWithoutData
                  ? "平日9:00にSlackへ初回診断を送ります。回答後、ここに能力プロフィールが表示されます。"
                  : latestStrength}
              </p>
              <Link
                href={latestLink}
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-primary transition-transform hover:-translate-y-0.5"
              >
                {connectedWithoutData ? "設定を確認" : "詳細なフィードバック"}
                <ArrowUpRight className="size-4" />
              </Link>
            </div>
            <div className="relative flex items-center justify-center">
              <ScoreRing value={latestScore} label={connectedWithoutData ? "START" : "TODAY"} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div>
                <CardDescription>構造化能力値</CardDescription>
                <CardTitle className="mt-1 font-serif text-4xl">{ability}</CardTitle>
              </div>
              <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                <TrendingUp className="size-3.5" />
                +4
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <Progress value={ability} className="mt-2 h-2" />
            <div className="mt-5 flex items-center justify-between border-t pt-4">
              <div>
                <p className="text-xs text-muted-foreground">現在の難易度</p>
                <p className="mt-0.5 font-serif text-xl font-semibold">{difficulty} / 100</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">継続</p>
                <p className="mt-0.5 font-serif text-xl font-semibold">8回</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="animate-rise" style={{ animationDelay: "140ms" }}>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle className="font-serif text-xl">今、直すべき2つ</CardTitle>
              <CardDescription className="mt-1">点数より、次の行動を明確に</CardDescription>
            </div>
            <Focus className="size-5 text-primary" />
          </CardHeader>
          <CardContent className="space-y-3">
            {recurringFindings.map((finding, index) => (
              <div
                key={finding.category}
                className="rounded-2xl border bg-background/60 p-4 transition-colors hover:bg-muted/60"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex size-7 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
                      {index + 1}
                    </span>
                    <p className="font-semibold">{finding.category}</p>
                  </div>
                  <Badge variant={index === 0 ? "secondary" : "outline"}>{finding.trend}</Badge>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{finding.description}</p>
                <div className="mt-3 flex gap-2 rounded-xl bg-muted/70 px-3 py-2.5">
                  <Target className="mt-0.5 size-4 shrink-0 text-primary" />
                  <p className="text-sm font-medium leading-5">{finding.nextAction}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="animate-rise" style={{ animationDelay: "180ms" }}>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle className="font-serif text-xl">能力プロフィール</CardTitle>
              <CardDescription className="mt-1">直近5回・難易度補正済み</CardDescription>
            </div>
            <Link href="/analysis" className="text-sm font-semibold text-primary hover:underline">
              分析を見る
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            {displayedSkills.slice(0, 6).map((skill) => (
              <div key={skill.key}>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="font-medium">{skill.label}</span>
                  <span className="tabular-nums text-muted-foreground">{skill.score}</span>
                </div>
                <Progress value={skill.score} className="h-1.5" />
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="animate-rise" style={{ animationDelay: "240ms" }}>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="font-serif text-xl font-semibold">最近のトレーニング</h2>
            <p className="mt-1 text-sm text-muted-foreground">回答と改善の積み重ね</p>
          </div>
          <Link href="/history" className="flex items-center gap-1 text-sm font-semibold text-primary">
            すべて見る <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {recentSessions.map((session) => (
            <Link key={session.id} href={`/history/${session.id}`}>
              <Card className="h-full transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">{session.date}</span>
                    <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700">
                      <Check className="size-3.5" /> 完了
                    </span>
                  </div>
                  <p className="mt-4 min-h-12 font-serif text-lg font-semibold leading-6">
                    {session.title}
                  </p>
                  <div className="mt-5 flex items-end justify-between">
                    <div>
                      <p className="text-[10px] font-medium tracking-wide text-muted-foreground">SCORE</p>
                      <p className="font-serif text-2xl font-semibold">{session.score}</p>
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
          {recentSessions.length === 0 && (
            <Card className="border-dashed bg-transparent sm:col-span-2 xl:col-span-4">
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                初回トレーニングの完了後、ここに履歴が表示されます。
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {snapshot === null && (
        <div className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground">
          <Sparkles className="size-3.5" />
          デモデータを表示中。PostgreSQL接続後に実データへ切り替わります。
        </div>
      )}
    </div>
  )
}
