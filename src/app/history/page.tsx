import type { Metadata } from "next"
import Link from "next/link"
import { CalendarDays, CheckCircle2, ChevronRight, Filter, Search } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { sessions } from "@/lib/dashboard-data"
import { loadDashboardSnapshot } from "@/server/dashboard-data"

export const metadata: Metadata = {
  title: "履歴",
}

export const dynamic = "force-dynamic"

export default async function HistoryPage() {
  const snapshot = await loadDashboardSnapshot()
  const displayedSessions =
    snapshot
      ? snapshot.sessions.map(({ session, trainingCase, evaluation }) => ({
          id: session.id,
          date: new Intl.DateTimeFormat("ja-JP", {
            month: "long",
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

  return (
    <div className="space-y-7">
      <header>
        <p className="text-sm font-medium text-muted-foreground">回答と改善の記録</p>
        <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">履歴</h1>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="h-10 bg-card pl-9" placeholder="問題やカテゴリを検索" />
        </label>
        <button className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border bg-card px-4 text-sm font-medium">
          <Filter className="size-4" />
          絞り込み
        </button>
      </div>

      <section className="grid gap-4">
        {displayedSessions.map((session, index) => (
          <Link key={session.id} href={`/history/${session.id}`}>
            <Card className="transition-all hover:border-primary/30 hover:shadow-md">
              <CardContent className="grid gap-5 p-5 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:p-6">
                <div className="flex size-16 flex-col items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                  <span className="font-serif text-2xl font-semibold">{session.score}</span>
                  <span className="text-[9px] tracking-wider text-white/65">SCORE</span>
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CalendarDays className="size-3.5" />
                      {session.date}
                    </span>
                    <Badge variant="secondary">{session.category}</Badge>
                    {index === 0 && <Badge variant="outline">最新</Badge>}
                  </div>
                  <h2 className="mt-2 font-serif text-xl font-semibold">{session.title}</h2>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>重点：{session.focus}</span>
                    <span>難易度：{session.difficulty}</span>
                    <span className="flex items-center gap-1 text-emerald-700">
                      <CheckCircle2 className="size-3.5" />
                      完了
                    </span>
                  </div>
                </div>
                <ChevronRight className="hidden size-5 text-muted-foreground sm:block" />
              </CardContent>
            </Card>
          </Link>
        ))}
        {displayedSessions.length === 0 && (
          <Card className="border-dashed bg-transparent">
            <CardContent className="p-10 text-center">
              <p className="font-semibold">まだトレーニング履歴がありません</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Slackで初回診断を完了すると、回答と評価がここに表示されます。
              </p>
            </CardContent>
          </Card>
        )}
      </section>

      <div className="flex items-center justify-center py-5 text-sm text-muted-foreground">
        {displayedSessions.length}件のトレーニングを表示しています
      </div>
    </div>
  )
}
