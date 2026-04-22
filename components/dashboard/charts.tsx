"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts"
import type {
  UserTrendData,
  ResumeTrendData,
  PaymentMethodData,
  PDFGeneratedData,
  ResumeDeliveryData,
} from "@/lib/mock-data"

const CHART_COLORS = {
  primary: "#1484EC",
  secondary: "#57E2E5",
  tertiary: "#0B4B86",
  highlight: "#FFC300",
  dark: "#00294E",
}

const PIE_COLORS = ["#1484EC", "#57E2E5", "#FFC300"]

function formatChartDate(dateValue: string): string {
  const strictDateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue)
  if (!strictDateMatch) return dateValue

  const year = Number(strictDateMatch[1])
  const month = Number(strictDateMatch[2])
  const day = Number(strictDateMatch[3])
  const constructedDate = new Date(year, month - 1, day)

  const isSameCalendarDate =
    constructedDate.getFullYear() === year &&
    constructedDate.getMonth() + 1 === month &&
    constructedDate.getDate() === day

  if (!isSameCalendarDate) return dateValue

  return constructedDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

interface UsersTrendChartProps {
  data: UserTrendData[]
}

export function UsersTrendChart({ data }: UsersTrendChartProps) {
  const formattedData = data.map((item) => ({
    ...item,
    date: formatChartDate(item.date),
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Users Trends</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={formattedData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                }}
              />
              <Line
                type="monotone"
                dataKey="users"
                stroke={CHART_COLORS.primary}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

interface ResumeTrendChartProps {
  data: ResumeTrendData[]
}

export function ResumeTrendChart({ data }: ResumeTrendChartProps) {
  const formattedData = data.map((item) => ({
    ...item,
    date: formatChartDate(item.date),
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Resume Trends</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={formattedData}>
              <defs>
                <linearGradient id="resumeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor={CHART_COLORS.secondary}
                    stopOpacity={0.4}
                  />
                  <stop
                    offset="100%"
                    stopColor={CHART_COLORS.secondary}
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                }}
              />
              <Area
                type="monotone"
                dataKey="resumes"
                stroke={CHART_COLORS.secondary}
                strokeWidth={2}
                fill="url(#resumeGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

interface PaymentsOverviewChartProps {
  data: {
    generated: number
    pending: number
    completed: number
  }
}

export function PaymentsOverviewChart({ data }: PaymentsOverviewChartProps) {
  const chartData = [
    { name: "Generated", value: data.generated },
    { name: "Pending", value: data.pending },
    { name: "Completed", value: data.completed },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          Payments Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-muted"
                horizontal={true}
                vertical={false}
              />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis
                dataKey="name"
                type="category"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                width={80}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {chartData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      [
                        CHART_COLORS.primary,
                        CHART_COLORS.highlight,
                        CHART_COLORS.secondary,
                      ][index]
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

interface PaymentMethodsChartProps {
  data: PaymentMethodData[]
}

export function PaymentMethodsChart({ data }: PaymentMethodsChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          Payment Methods
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={4}
                dataKey="value"
                nameKey="method"
                label={({ method, percent }) =>
                  `${method} ${(percent * 100).toFixed(0)}%`
                }
                labelLine={false}
              >
                {data.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={PIE_COLORS[index % PIE_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

interface PDFsGeneratedChartProps {
  data: PDFGeneratedData[]
}

export function PDFsGeneratedChart({ data }: PDFsGeneratedChartProps) {
  const formattedData = data.map((item) => ({
    ...item,
    date: formatChartDate(item.date),
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          PDFs Generated
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={formattedData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                }}
              />
              <Bar
                dataKey="pdfs"
                fill={CHART_COLORS.tertiary}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

interface ResumeDeliveryChartProps {
  data: ResumeDeliveryData[]
}

interface ResumeTypeDistributionProps {
  data: ResumeDeliveryData[]
}

export function ResumeTypeDistributionChart({ data }: ResumeTypeDistributionProps) {
  // Calculate totals from the data
  const totals = data.reduce(
    (acc, item) => ({
      downloaded: acc.downloaded + item.downloaded,
      printedShipped: acc.printedShipped + item.printedShipped,
    }),
    { downloaded: 0, printedShipped: 0 }
  )

  const chartData = [
    { name: "Downloaded", value: totals.downloaded },
    { name: "Printed & Shipped", value: totals.printedShipped },
  ]

  const COLORS = [CHART_COLORS.primary, CHART_COLORS.secondary]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          Resume Type Distribution
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Overall split between downloaded and printed/shipped
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={4}
                dataKey="value"
                nameKey="name"
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
                labelLine={false}
              >
                {chartData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                }}
                formatter={(value: number) => [value.toLocaleString(), "Resumes"]}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex justify-center gap-8">
          <div className="text-center">
            <p className="text-2xl font-bold" style={{ color: CHART_COLORS.primary }}>
              {totals.downloaded.toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground">Downloaded</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold" style={{ color: CHART_COLORS.secondary }}>
              {totals.printedShipped.toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground">Printed & Shipped</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function ResumeDeliveryChart({ data }: ResumeDeliveryChartProps) {
  const formattedData = data.map((item) => ({
    ...item,
    date: formatChartDate(item.date),
  }))

  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          Resume Delivery Type
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Downloaded vs Printed & Shipped resumes over time
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={formattedData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Bar
                dataKey="downloaded"
                name="Downloaded"
                fill={CHART_COLORS.primary}
                radius={[4, 4, 0, 0]}
                stackId="a"
              />
              <Bar
                dataKey="printedShipped"
                name="Printed & Shipped"
                fill={CHART_COLORS.secondary}
                radius={[4, 4, 0, 0]}
                stackId="a"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
