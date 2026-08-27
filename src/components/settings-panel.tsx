"use client"

import { useEffect, useState } from "react"
import { Check, Database, Pause, Save, ShieldCheck, Sparkles } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"

type LocalSettings = {
  notifications: boolean
  holidayPause: boolean
  sendHour: string
  reminderHour: string
  strictFeedback: boolean
}

const defaults: LocalSettings = {
  notifications: true,
  holidayPause: true,
  sendHour: "09:00",
  reminderHour: "10:00",
  strictFeedback: true,
}

export function SettingsPanel() {
  const [settings, setSettings] = useState(defaults)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const stored = window.localStorage.getItem("thinktrain-settings")
    if (stored) {
      try {
        const parsed = { ...defaults, ...JSON.parse(stored) }
        const timer = window.setTimeout(() => setSettings(parsed), 0)
        return () => window.clearTimeout(timer)
      } catch {
        window.localStorage.removeItem("thinktrain-settings")
      }
    }
  }, [])

  function update<K extends keyof LocalSettings>(key: K, value: LocalSettings[K]) {
    setSettings((current) => ({ ...current, [key]: value }))
    setSaved(false)
  }

  function save() {
    window.localStorage.setItem("thinktrain-settings", JSON.stringify(settings))
    setSaved(true)
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_0.75fr]">
      <div className="space-y-5">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-serif text-xl">出題スケジュール</CardTitle>
                <CardDescription className="mt-1">Asia/Tokyo タイムゾーン</CardDescription>
              </div>
              <Switch
                checked={settings.notifications}
                onCheckedChange={(checked) => update("notifications", checked)}
                aria-label="通知を有効にする"
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm font-medium">
                出題時刻
                <Input
                  type="time"
                  value={settings.sendHour}
                  onChange={(event) => update("sendHour", event.target.value)}
                  className="mt-2"
                />
              </label>
              <label className="space-y-2 text-sm font-medium">
                未着手リマインド
                <Input
                  type="time"
                  value={settings.reminderHour}
                  onChange={(event) => update("reminderHour", event.target.value)}
                  className="mt-2"
                />
              </label>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-2xl bg-muted/60 p-4">
              <div>
                <p className="text-sm font-medium">日本の祝日は休む</p>
                <p className="mt-1 text-xs text-muted-foreground">土日と祝日は出題しません</p>
              </div>
              <Switch
                checked={settings.holidayPause}
                onCheckedChange={(checked) => update("holidayPause", checked)}
                aria-label="祝日は休む"
              />
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Pause className="size-3.5" />
              PCが9時以降に起動した場合、その日の未送信を検知して送ります。
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-xl">トレーニング設定</CardTitle>
            <CardDescription>BtoB新規営業に30%、汎用ケースに70%を配分</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">厳しめのフィードバック</p>
                <p className="mt-1 text-xs text-muted-foreground">表示する改善点は最大2件です</p>
              </div>
              <Switch
                checked={settings.strictFeedback}
                onCheckedChange={(checked) => update("strictFeedback", checked)}
                aria-label="厳しめのフィードバック"
              />
            </div>
            <Separator />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border p-4">
                <p className="text-xs text-muted-foreground">職種</p>
                <p className="mt-1 font-semibold">営業</p>
              </div>
              <div className="rounded-2xl border p-4">
                <p className="text-xs text-muted-foreground">営業タイプ</p>
                <p className="mt-1 font-semibold">BtoB・新規</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button onClick={save} className="h-10 w-full sm:w-auto">
          {saved ? <Check data-icon="inline-start" /> : <Save data-icon="inline-start" />}
          {saved ? "保存しました" : "設定を保存"}
        </Button>
        {saved && (
          <p
            role="status"
            aria-live="polite"
            className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
          >
            <Check className="size-4" />
            この端末に設定を保存しました。
          </p>
        )}
      </div>

      <div className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-xl">接続状態</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              {
                icon: Database,
                label: "PostgreSQL",
                detail: "デモモード",
                status: "未接続",
              },
              { icon: Sparkles, label: "AIプロバイダー", detail: "Gemini CLI 優先", status: "未確認" },
              { icon: ShieldCheck, label: "Slack Socket Mode", detail: "ローカル接続", status: "設定待ち" },
            ].map((connection) => {
              const Icon = connection.icon
              return (
                <div key={connection.label} className="flex items-center gap-3 rounded-2xl border p-4">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-muted text-primary">
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{connection.label}</p>
                    <p className="text-xs text-muted-foreground">{connection.detail}</p>
                  </div>
                  <Badge variant="outline">{connection.status}</Badge>
                </div>
              )
            })}
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardHeader>
            <CardTitle className="font-serif text-lg text-emerald-950">データはローカルに保存</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-6 text-emerald-950/75">
            回答・採点・履歴はMac上のPostgreSQLへ保存します。Gemini CLIを利用する場合、採点対象だけが会社契約のGeminiへ送信されます。
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-lg">データ管理</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Button variant="outline" className="justify-start">JSONでエクスポート</Button>
            <Button variant="destructive" className="justify-start">全データを削除</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
