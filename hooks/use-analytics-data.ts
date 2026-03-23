"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import type { DashboardData } from "@/lib/mock-data"
import {
  generateMockAnalytics,
  getGeneratedSparklineData,
  parseRangeToDays,
  calculateDaysBetween,
} from "@/lib/analytics-mock-generator"

export interface DateRange {
  from: Date | undefined
  to: Date | undefined
}

interface UseAnalyticsDataReturn {
  data: DashboardData | null
  isLoading: boolean
  error: string | null
  dateRange: string
  customDateRange: DateRange
  setDateRange: (range: string) => void
  setCustomDateRange: (range: DateRange) => void
  refresh: () => void
  getSparklineData: (metricType: string) => number[]
}

export function useAnalyticsData(): UseAnalyticsDataReturn {
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRangeState] = useState("30d")
  const [customDateRange, setCustomDateRangeState] = useState<DateRange>({
    from: undefined,
    to: undefined,
  })

  // Calculate the number of days based on selected range
  const getDays = useCallback((): number => {
    if (dateRange === "custom" && customDateRange.from && customDateRange.to) {
      return calculateDaysBetween(customDateRange.from, customDateRange.to)
    }
    return parseRangeToDays(dateRange)
  }, [dateRange, customDateRange])

  // Fetch/generate data
  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    // Simulate API loading time (300-800ms)
    const loadingTime = 300 + Math.random() * 500

    try {
      await new Promise((resolve) => setTimeout(resolve, loadingTime))

      const days = getDays()
      const endDate = dateRange === "custom" && customDateRange.to 
        ? customDateRange.to 
        : new Date()

      const generatedData = generateMockAnalytics(
        days,
        dateRange === "custom" ? customDateRange.from : undefined,
        endDate
      )

      setData(generatedData)
    } catch (err) {
      setError("Failed to load dashboard data. Please try again.")
      console.error("Dashboard data fetch error:", err)
    } finally {
      setIsLoading(false)
    }
  }, [getDays, dateRange, customDateRange])

  // Initial data load
  useEffect(() => {
    fetchData()
  }, []) // Only run on mount

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
    // Skip if custom range without both dates selected
    if (dateRange === "custom" && (!customDateRange.from || !customDateRange.to)) {
      return
    }

    fetchData()
  }, [dateRange, customDateRange.from?.getTime(), customDateRange.to?.getTime()])

  // Refresh function
  const refresh = useCallback(() => {
    fetchData()
  }, [fetchData])

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
    dateRange,
    customDateRange,
    setDateRange,
    setCustomDateRange,
    refresh,
    getSparklineData,
  }
}
