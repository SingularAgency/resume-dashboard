"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown } from "lucide-react"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts"

interface MetricCardProps {
  title: string
  value: string | number
  trend: "up" | "down"
  trendValue: string
  sparklineData: number[]
  prefix?: string
}

export function MetricCard({
  title,
  value,
  trend,
  trendValue,
  sparklineData,
  prefix = "",
}: MetricCardProps) {
  const chartData = sparklineData.map((val, index) => ({
    value: val,
    index,
  }))

  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-2xl font-bold text-foreground">
              {prefix}
              {typeof value === "number" ? value.toLocaleString() : value}
            </span>
            <div
              className={`flex items-center gap-1 text-sm ${
                trend === "up" ? "text-emerald-600" : "text-red-500"
              }`}
            >
              {trend === "up" ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span>{trendValue}</span>
            </div>
          </div>
          <div className="h-12 w-20">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id={`gradient-${title.replace(/\s/g, "")}`} x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor={trend === "up" ? "#10b981" : "#ef4444"}
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="100%"
                      stopColor={trend === "up" ? "#10b981" : "#ef4444"}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={trend === "up" ? "#10b981" : "#ef4444"}
                  strokeWidth={2}
                  fill={`url(#gradient-${title.replace(/\s/g, "")})`}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
