import { cn } from "@/lib/utils"

export function ScoreRing({
  value,
  label,
  size = "lg",
}: {
  value: number
  label: string
  size?: "sm" | "lg"
}) {
  const radius = 43
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference

  return (
    <div className={cn("relative", size === "lg" ? "size-36" : "size-24")}>
      <svg className="size-full -rotate-90" viewBox="0 0 100 100" aria-hidden>
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="var(--muted)"
          strokeWidth="7"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="var(--primary)"
          strokeLinecap="round"
          strokeWidth="7"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("font-serif font-semibold", size === "lg" ? "text-4xl" : "text-2xl")}>
          {value}
        </span>
        <span className="mt-0.5 text-[10px] font-medium tracking-wide text-muted-foreground">
          {label}
        </span>
      </div>
    </div>
  )
}
