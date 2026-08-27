import type { Metadata } from "next"

import { SettingsPanel } from "@/components/settings-panel"

export const metadata: Metadata = {
  title: "設定",
}

export default function SettingsPage() {
  return (
    <div className="space-y-7">
      <header>
        <p className="text-sm font-medium text-muted-foreground">自分に合う習慣へ</p>
        <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">設定</h1>
      </header>
      <SettingsPanel />
    </div>
  )
}
