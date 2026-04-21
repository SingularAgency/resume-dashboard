"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import type { DashboardData } from "@/lib/mock-data"
import { analyticsGet } from "@/lib/analytics-api"
import {
  resolveAnalyticsDateRange,
  type AnalyticsDateRangeResult,
} from "@/lib/analytics-date-range"

export interface DateRange {
  from: Date | undefined
  to: Date | undefined
}

interface UseAnalyticsDataReturn {
  data: DashboardData | null
  isLoading: boolean
  error: string | null
  analyticsQuery: { start_date: string; end_date: string } | null
  kpiChangePct: Record<string, number> | null
  dateRange: string
  customDateRange: DateRange
  setDateRange: (range: string) => void
  setCustomDateRange: (range: DateRange) => void
  refresh: () => void
}

interface ResolvedRangeState {
  value: AnalyticsDateRangeResult | null
  error: string | null
}

interface UseAnalyticsDataOptions {
  enabled?: boolean
}

/** KPI field from analytics/kpis: flat number or `{ value, change_pct }`. */
interface KpisApiMetricObject {
  value?: unknown
  change_pct?: unknown
}

type KpisApiMetricField = number | string | KpisApiMetricObject | null | undefined

interface KpisApiResponse {
  resumesCreated?: KpisApiMetricField
  resumes_created?: KpisApiMetricField
  resumesPaid?: KpisApiMetricField
  resumes_paid?: KpisApiMetricField
  resumePdfsGenerated?: KpisApiMetricField
  resume_pdfs_generated?: KpisApiMetricField
  pdfs_generated?: KpisApiMetricField
  resumePrintShipQty?: KpisApiMetricField
  resume_print_ship_qty?: KpisApiMetricField
  print_ship_qty?: KpisApiMetricField
  paymentsGenerated?: KpisApiMetricField
  payments_generated?: KpisApiMetricField
  paymentsPending?: KpisApiMetricField
  payments_pending?: KpisApiMetricField
  paymentsCompleted?: KpisApiMetricField
  payments_completed?: KpisApiMetricField
}

interface TrendPoint {
  date?: string
  day?: string
  value?: number | string
  users?: number | string
  users_count?: number | string
  resumes?: number | string
  resumes_created?: number | string
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function generateDateRange(startDate: Date, daysInclusive: number): string[] {
  return Array.from({ length: daysInclusive }, (_, index) => {
    const date = new Date(startDate.getTime() + index * MS_PER_DAY)
    return date.toISOString().split("T")[0]
  })
}

function toIsoDate(value: string): string | null {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString().split("T")[0]
}

function previousValueFromChangePct(current: number, changePct: number): number {
  if (changePct <= -100) return 0
  const denominator = 1 + changePct / 100
  if (denominator <= 0) return current
  return current / denominator
}

function interpolateSeries(total: number, daysInclusive: number, baselineTotal: number): number[] {
  if (daysInclusive <= 0) return []
  const targetTotal = Math.max(0, Math.round(total))
  const start = Math.max(0, baselineTotal / daysInclusive)
  const end = Math.max(0, total / daysInclusive)
  if (daysInclusive === 1) return [targetTotal]

  const floatingSeries = Array.from({ length: daysInclusive }, (_, index) => {
    const progress = index / (daysInclusive - 1)
    return Math.max(0, start + (end - start) * progress)
  })

  const floatingSum = floatingSeries.reduce((sum, value) => sum + value, 0)
  if (floatingSum === 0) {
    if (targetTotal === 0) return Array.from({ length: daysInclusive }, () => 0)
    const zeros = Array.from({ length: daysInclusive }, () => 0)
    zeros[daysInclusive - 1] = targetTotal
    return zeros
  }

  const scaleFactor = targetTotal / floatingSum
  const scaledRounded = floatingSeries.map((value) => Math.max(0, Math.round(value * scaleFactor)))
  let discrepancy = targetTotal - scaledRounded.reduce((sum, value) => sum + value, 0)

  if (discrepancy > 0) {
    for (let index = scaledRounded.length - 1; index >= 0 && discrepancy > 0; index--) {
      scaledRounded[index] += 1
      discrepancy -= 1
      if (index === 0 && discrepancy > 0) index = scaledRounded.length
    }
  } else if (discrepancy < 0) {
    while (discrepancy < 0) {
      let adjusted = false
      for (let index = scaledRounded.length - 1; index >= 0 && discrepancy < 0; index--) {
        if (scaledRounded[index] > 0) {
          scaledRounded[index] -= 1
          discrepancy += 1
          adjusted = true
        }
      }
      if (!adjusted) break
    }
  }

  return scaledRounded
}

/** Accepts API shapes: raw number/string or `{ value }` from analytics/kpis. */
function kpiMetricValue(field: unknown): number | null {
  const direct = toNumber(field)
  if (direct !== null) return direct
  if (field !== null && typeof field === "object" && "value" in field) {
    return toNumber((field as KpisApiMetricObject).value)
  }
  return null
}

function requireKpiMetricValue(fieldName: string, ...candidates: unknown[]): number {
  for (const candidate of candidates) {
    const value = kpiMetricValue(candidate)
    if (value !== null) return value
  }
  throw new Error(`Analytics KPI '${fieldName}' is missing or invalid in API response.`)
}

function kpiMetricChangePct(...candidates: unknown[]): number | null {
  for (const candidate of candidates) {
    if (candidate !== null && typeof candidate === "object" && "change_pct" in candidate) {
      const pct = toNumber((candidate as KpisApiMetricObject).change_pct)
      if (pct !== null) return pct
    }
  }
  return null
}

function mapKpisToMetrics(kpis: KpisApiResponse) {
  return {
    resumesCreated: requireKpiMetricValue("resumes_created", kpis.resumesCreated, kpis.resumes_created),
    resumesPaid: requireKpiMetricValue("resumes_paid", kpis.resumesPaid, kpis.resumes_paid),
    resumePdfsGenerated: requireKpiMetricValue(
      "pdfs_generated",
      kpis.resumePdfsGenerated,
      kpis.resume_pdfs_generated,
      kpis.pdfs_generated,
    ),
    resumePrintShipQty: requireKpiMetricValue(
      "print_ship_qty",
      kpis.resumePrintShipQty,
      kpis.resume_print_ship_qty,
      kpis.print_ship_qty,
    ),
    paymentsGenerated: requireKpiMetricValue(
      "payments_generated",
      kpis.paymentsGenerated,
      kpis.payments_generated,
    ),
    paymentsPending: requireKpiMetricValue(
      "payments_pending",
      kpis.paymentsPending,
      kpis.payments_pending,
    ),
    paymentsCompleted: requireKpiMetricValue(
      "payments_completed",
      kpis.paymentsCompleted,
      kpis.payments_completed,
    ),
  }
}

function mapKpisChangePct(kpis: KpisApiResponse): Record<string, number> {
  return {
    resumesCreated: kpiMetricChangePct(kpis.resumesCreated, kpis.resumes_created) ?? 0,
    resumesPaid: kpiMetricChangePct(kpis.resumesPaid, kpis.resumes_paid) ?? 0,
    resumePdfsGenerated:
      kpiMetricChangePct(kpis.resumePdfsGenerated, kpis.resume_pdfs_generated, kpis.pdfs_generated) ?? 0,
    resumePrintShipQty:
      kpiMetricChangePct(kpis.resumePrintShipQty, kpis.resume_print_ship_qty, kpis.print_ship_qty) ?? 0,
    paymentsGenerated: kpiMetricChangePct(kpis.paymentsGenerated, kpis.payments_generated) ?? 0,
    paymentsPending: kpiMetricChangePct(kpis.paymentsPending, kpis.payments_pending) ?? 0,
    paymentsCompleted: kpiMetricChangePct(kpis.paymentsCompleted, kpis.payments_completed) ?? 0,
  }
}

function buildSeriesFromTrendPoints(
  points: TrendPoint[],
  dates: string[],
  valueSelector: (point: TrendPoint) => number | null,
): number[] {
  const aggregatedByDate = new Map<string, number>()

  for (const point of points) {
    const dateValue = point.date ?? point.day
    if (!dateValue) continue
    const isoDate = toIsoDate(dateValue)
    if (!isoDate) continue
    const value = valueSelector(point)
    if (value === null) continue
    aggregatedByDate.set(isoDate, (aggregatedByDate.get(isoDate) ?? 0) + Math.max(0, value))
  }

  return dates.map((date) => Math.round(aggregatedByDate.get(date) ?? 0))
}

function extractTrendPoints(payload: unknown, keys: string[]): TrendPoint[] {
  if (Array.isArray(payload)) return payload as TrendPoint[]
  if (!payload || typeof payload !== "object") return []
  const record = payload as Record<string, unknown>

  for (const key of keys) {
    const candidate = record[key]
    if (Array.isArray(candidate)) return candidate as TrendPoint[]
  }

  const nestedData = record.data
  if (nestedData && typeof nestedData === "object") {
    const nestedRecord = nestedData as Record<string, unknown>
    for (const key of keys) {
      const candidate = nestedRecord[key]
      if (Array.isArray(candidate)) return candidate as TrendPoint[]
    }
  }
  return []
}

function mapTrendsToDashboardSeries(
  usersTrendPayload: unknown,
  resumesTrendPayload: unknown,
  dates: string[],
): { usersTrend: DashboardData["usersTrend"]; resumeTrend: DashboardData["resumeTrend"] } {
  const usersPoints = extractTrendPoints(usersTrendPayload, [
    "usersTrend",
    "users_trend",
    "userTrend",
    "user_trend",
    "trend",
    "items",
  ])
  const resumesPoints = extractTrendPoints(resumesTrendPayload, [
    "resumeTrend",
    "resume_trend",
    "resumesTrend",
    "resumes_trend",
    "trend",
    "items",
  ])

  const usersSeries = buildSeriesFromTrendPoints(usersPoints, dates, (point) =>
    toNumber(point.users) ?? toNumber(point.users_count) ?? toNumber(point.value),
  )
  const resumesSeries = buildSeriesFromTrendPoints(resumesPoints, dates, (point) =>
    toNumber(point.resumes) ?? toNumber(point.resumes_created) ?? toNumber(point.value),
  )

  return {
    usersTrend: dates.map((date, index) => ({ date, users: usersSeries[index] ?? 0 })),
    resumeTrend: dates.map((date, index) => ({ date, resumes: resumesSeries[index] ?? 0 })),
  }
}

function buildDashboardDataFromKpis(
  metrics: ReturnType<typeof mapKpisToMetrics>,
  changePct: Record<string, number>,
  usersTrendPayload: unknown,
  resumesTrendPayload: unknown,
  range: AnalyticsDateRangeResult,
): DashboardData {
  const dates = generateDateRange(range.startDate, range.daysInclusive)
  const { usersTrend, resumeTrend } = mapTrendsToDashboardSeries(
    usersTrendPayload,
    resumesTrendPayload,
    dates,
  )

  const resumesPrevious = previousValueFromChangePct(metrics.resumesCreated, changePct.resumesCreated)
  const resumesDaily = interpolateSeries(metrics.resumesCreated, range.daysInclusive, resumesPrevious)
  const pdfsPrevious = previousValueFromChangePct(
    metrics.resumePdfsGenerated,
    changePct.resumePdfsGenerated,
  )
  const pdfsDaily = interpolateSeries(metrics.resumePdfsGenerated, range.daysInclusive, pdfsPrevious)
  const printPrevious = previousValueFromChangePct(
    metrics.resumePrintShipQty,
    changePct.resumePrintShipQty,
  )
  const printDaily = interpolateSeries(metrics.resumePrintShipQty, range.daysInclusive, printPrevious)

  const resumeDelivery = dates.map((date, index) => {
    const printedShipped = printDaily[index] ?? 0
    const resumes = resumesDaily[index] ?? 0
    return {
      date,
      downloaded: Math.max(0, resumes - printedShipped),
      printedShipped,
    }
  })

  return {
    metrics,
    usersTrend,
    resumeTrend,
    resumeDelivery,
    payments: {
      generated: metrics.paymentsGenerated,
      pending: metrics.paymentsPending,
      completed: metrics.paymentsCompleted,
    },
    paymentMethods: [],
    pdfsGenerated: dates.map((date, index) => ({ date, pdfs: pdfsDaily[index] ?? 0 })),
    recentActivity: [],
    users: [],
  }
}

export function useAnalyticsData(
  options: UseAnalyticsDataOptions = {},
): UseAnalyticsDataReturn {
  const { enabled = true } = options
  const [data, setData] = useState<DashboardData | null>(null)
  const [kpiChangePct, setKpiChangePct] = useState<Record<string, number> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRangeState] = useState("30d")
  const [customDateRange, setCustomDateRangeState] = useState<DateRange>({
    from: undefined,
    to: undefined,
  })

  const resolvedDateRange = useMemo<ResolvedRangeState>(() => {
    try {
      return {
        value: resolveAnalyticsDateRange(dateRange, customDateRange),
        error: null,
      }
    } catch (err) {
      return {
        value: null,
        error:
          err instanceof Error
            ? err.message
            : "Invalid date range. Custom ranges must be up to 365 days.",
      }
    }
  }, [dateRange, customDateRange.from?.getTime(), customDateRange.to?.getTime()])

  // Fetch/generate data
  const fetchData = useCallback(async () => {
    if (!enabled) {
      setIsLoading(false)
      setError(null)
      return
    }

    setIsLoading(true)
    setError(null)

    // Simulate API loading time (300-800ms)
    const loadingTime = 300 + Math.random() * 500

    try {
      await new Promise((resolve) => setTimeout(resolve, loadingTime))

      if (!resolvedDateRange.value) {
        throw new Error(
          resolvedDateRange.error ??
            "Invalid date range. Custom ranges must be up to 365 days.",
        )
      }

      const kpis = await analyticsGet<KpisApiResponse>("analytics/kpis", {
        start_date: resolvedDateRange.value.startDateParam,
        end_date: resolvedDateRange.value.endDateParam,
      })
      const usersTrendPayload = await analyticsGet<unknown>("analytics/users-trend", {
        start_date: resolvedDateRange.value.startDateParam,
        end_date: resolvedDateRange.value.endDateParam,
        interval: "day",
      })
      const resumesTrendPayload = await analyticsGet<unknown>("analytics/resumes-trend", {
        start_date: resolvedDateRange.value.startDateParam,
        end_date: resolvedDateRange.value.endDateParam,
      })

      const metrics = mapKpisToMetrics(kpis)
      const changePct = mapKpisChangePct(kpis)
      setKpiChangePct(changePct)
      setData(
        buildDashboardDataFromKpis(
          metrics,
          changePct,
          usersTrendPayload,
          resumesTrendPayload,
          resolvedDateRange.value,
        ),
      )
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load dashboard data. Please try again."
      setError(message)
      console.error("Dashboard data fetch error:", err)
    } finally {
      setIsLoading(false)
    }
  }, [enabled, resolvedDateRange])

  // Initial data load
  useEffect(() => {
    if (!enabled) {
      return
    }
    fetchData()
  }, [enabled]) // Only run when enabled

  // Handle date range changes
  const setDateRange = useCallback((range: string) => {
    setDateRangeState(range)
    if (range !== "custom") {
      setCustomDateRangeState({ from: undefined, to: undefined })
    }
  }, [])

  // Handle custom date range changes
  const setCustomDateRange = useCallback((range: DateRange) => {
    setCustomDateRangeState(range)
  }, [])

  // Fetch data when range changes (excluding initial mount)
  useEffect(() => {
    if (!enabled) {
      return
    }
    // Skip if custom range without both dates selected
    if (dateRange === "custom" && (!customDateRange.from || !customDateRange.to)) {
      return
    }

    fetchData()
  }, [enabled, dateRange, customDateRange.from?.getTime(), customDateRange.to?.getTime()])

  // Refresh function
  const refresh = useCallback(() => {
    if (!enabled) return
    fetchData()
  }, [enabled, fetchData])

  return {
    data,
    isLoading,
    error,
    analyticsQuery: resolvedDateRange.value
      ? {
          start_date: resolvedDateRange.value.startDateParam,
          end_date: resolvedDateRange.value.endDateParam,
        }
      : null,
    kpiChangePct,
    dateRange,
    customDateRange,
    setDateRange,
    setCustomDateRange,
    refresh,
  }
}
