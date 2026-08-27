"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BarChart3,
  BrainCircuit,
  Clock3,
  History,
  Home,
  Settings,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const navigation = [
  { href: "/", label: "ホーム", icon: Home },
  { href: "/analysis", label: "分析", icon: BarChart3 },
  { href: "/history", label: "履歴", icon: History },
  { href: "/settings", label: "設定", icon: Settings },
]

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border/80 bg-sidebar px-5 py-7 lg:flex">
        <Link href="/" className="flex items-center gap-3 px-2">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <BrainCircuit className="size-5" />
          </span>
          <span>
            <span className="block font-serif text-xl font-semibold tracking-tight">Thinktrain</span>
            <span className="block text-[11px] font-medium tracking-[0.16em] text-muted-foreground">
              STRUCTURE DAILY
            </span>
          </span>
        </Link>

        <nav className="mt-10 space-y-1.5">
          {navigation.map((item) => {
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="mt-auto rounded-2xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">次の出題</span>
            <Badge variant="secondary">平日</Badge>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Clock3 className="size-4 text-primary" />
            <p className="font-serif text-lg font-semibold">明日 9:00</p>
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Slack DMへ送信。未着手時は10:00に一度だけお知らせします。
          </p>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border/70 bg-background/90 px-5 backdrop-blur-lg lg:hidden">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <BrainCircuit className="size-4" />
            </span>
            <span className="font-serif text-lg font-semibold">Thinktrain</span>
          </Link>
          <Badge variant="outline">Demo mode</Badge>
        </header>

        <main className="mx-auto w-full max-w-7xl px-5 pb-28 pt-7 sm:px-8 lg:px-10 lg:pb-12 lg:pt-10">
          {children}
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-background/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl lg:hidden">
        {navigation.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-medium",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className={cn("size-5", active && "fill-primary/10")} />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
