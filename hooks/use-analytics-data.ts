"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import type { DashboardData, DashboardMetrics } from "@/lib/mock-data"
import {
  generateMockAnalytics,
  getGeneratedSparklineData,
} from "@/lib/analytics-mock-generator"
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
  dateRange: string
  customDateRange: DateRange
  setDateRange: (range: string) => void
  setCustomDateRange: (range: DateRange) => void
  refresh: () => void
  getSparklineData: (metricType: string) => number[]
}

interface ResolvedRangeState {
  value: AnalyticsDateRangeResult | null
  error: string | null
}

interface UseAnalyticsDataOptions {
  enabled?: boolean
}

interface KpisApiResponse {
  resumesCreated?: number
  resumes_created?: number
  resumesPaid?: number
  resumes_paid?: number
  resumePdfsGenerated?: number
  resume_pdfs_generated?: number
  resumePrintShipQty?: number
  resume_print_ship_qty?: number
  paymentsGenerated?: number
  payments_generated?: number
  paymentsPending?: number
  payments_pending?: number
  paymentsCompleted?: number
  payments_completed?: number
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function mapKpisToMetrics(kpis: KpisApiResponse, fallback: DashboardMetrics): DashboardMetrics {
  return {
    resumesCreated:
      toNumber(kpis.resumesCreated) ??
      toNumber(kpis.resumes_created) ??
      fallback.resumesCreated,
    resumesPaid:
      toNumber(kpis.resumesPaid) ??
      toNumber(kpis.resumes_paid) ??
      fallback.resumesPaid,
    resumePdfsGenerated:
      toNumber(kpis.resumePdfsGenerated) ??
      toNumber(kpis.resume_pdfs_generated) ??
      fallback.resumePdfsGenerated,
    resumePrintShipQty:
      toNumber(kpis.resumePrintShipQty) ??
      toNumber(kpis.resume_print_ship_qty) ??
      fallback.resumePrintShipQty,
    paymentsGenerated:
      toNumber(kpis.paymentsGenerated) ??
      toNumber(kpis.payments_generated) ??
      fallback.paymentsGenerated,
    paymentsPending:
      toNumber(kpis.paymentsPending) ??
      toNumber(kpis.payments_pending) ??
      fallback.paymentsPending,
    paymentsCompleted:
      toNumber(kpis.paymentsCompleted) ??
      toNumber(kpis.payments_completed) ??
      fallback.paymentsCompleted,
  }
}

export function useAnalyticsData(
  options: UseAnalyticsDataOptions = {},
): UseAnalyticsDataReturn {
  const { enabled = true } = options
  const [data, setData] = useState<DashboardData | null>(null)
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

      const generatedData = generateMockAnalytics(
        resolvedDateRange.value.daysInclusive,
        resolvedDateRange.value.startDate,
        resolvedDateRange.value.endDate,
      )

      const kpis = await analyticsGet<KpisApiResponse>("analytics/kpis", {
        start_date: resolvedDateRange.value.startDateParam,
        end_date: resolvedDateRange.value.endDateParam,
      })

      setData({
        ...generatedData,
        metrics: mapKpisToMetrics(kpis, generatedData.metrics),
      })
    } catch (err) {
      setError("Failed to load dashboard data. Please try again.")
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

  // Get sparkline data for metrics
  const getSparklineData = useCallback(
    (metricType: string): number[] => {
      if (!data) return [10, 15, 12, 18, 20, 22, 25]
      return getGeneratedSparklineData(metricType, data)
    },
    [data]
  )

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
    dateRange,
    customDateRange,
    setDateRange,
    setCustomDateRange,
    refresh,
    getSparklineData,
  }
}
