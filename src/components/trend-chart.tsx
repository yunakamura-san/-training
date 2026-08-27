"use client"

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { scoreTrend } from "@/lib/dashboard-data"

export type TrendPoint = {
  label: string
  score: number
  ability: number
  difficulty: number
}

export function TrendChart({ data = scoreTrend }: { data?: TrendPoint[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 8, left: -24, bottom: 0 }}>
          <defs>
            <linearGradient id="ability-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.25} />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 4" />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            dy={8}
          />
          <YAxis
            domain={[30, 90]}
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          />
          <Tooltip
            cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              boxShadow: "0 12px 30px rgb(0 0 0 / 0.08)",
              fontSize: 12,
            }}
            formatter={(value, name) => [
              value,
              name === "ability" ? "能力値" : name === "difficulty" ? "難易度" : "スコア",
            ]}
          />
          <Area
            type="monotone"
            dataKey="ability"
            stroke="var(--chart-1)"
            strokeWidth={2.5}
            fill="url(#ability-fill)"
            dot={{ r: 3, fill: "var(--chart-1)", strokeWidth: 0 }}
          />
          <Area
            type="monotone"
            dataKey="difficulty"
            stroke="var(--chart-2)"
            strokeWidth={2}
            fill="transparent"
            strokeDasharray="5 5"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
