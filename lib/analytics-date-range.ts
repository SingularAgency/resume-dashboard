export interface DateRangeInput {
  from: Date | undefined
  to: Date | undefined
}

export interface AnalyticsDateRangeResult {
  startDate: Date
  endDate: Date
  startDateParam: string
  endDateParam: string
  daysInclusive: number
}

const MAX_ANALYTICS_RANGE_DAYS = 365

const PRESET_DAYS: Record<string, number> = {
  "7d": 7,
  "14d": 14,
  "30d": 30,
  "90d": 90,
}

function formatDateParam(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0)
}

function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
}

function countDaysInclusive(startDate: Date, endDate: Date): number {
  const start = startOfDay(startDate).getTime()
  const end = startOfDay(endDate).getTime()
  const diffDays = Math.floor((end - start) / (1000 * 60 * 60 * 24))
  return diffDays + 1
}

export function resolveAnalyticsDateRange(
  rangeKey: string,
  customRange: DateRangeInput,
  now: Date = new Date(),
): AnalyticsDateRangeResult {
  if (rangeKey === "custom") {
    if (!customRange.from || !customRange.to) {
      throw new Error("Custom range requires both start and end dates.")
    }
    const startDate = startOfDay(customRange.from)
    const endDate = endOfDay(customRange.to)
    if (startDate.getTime() > endDate.getTime()) {
      throw new Error("Custom range start date cannot be after end date.")
    }
    const daysInclusive = countDaysInclusive(startDate, endDate)
    if (daysInclusive > MAX_ANALYTICS_RANGE_DAYS) {
      throw new Error("Date range cannot exceed 365 days.")
    }
    return {
      startDate,
      endDate,
      startDateParam: formatDateParam(startDate),
      endDateParam: formatDateParam(endDate),
      daysInclusive,
    }
  }

  const days = PRESET_DAYS[rangeKey] ?? PRESET_DAYS["30d"]
  const endDate = endOfDay(now)
  const startDate = startOfDay(new Date(endDate.getTime() - (days - 1) * 24 * 60 * 60 * 1000))
  return {
    startDate,
    endDate,
    startDateParam: formatDateParam(startDate),
    endDateParam: formatDateParam(endDate),
    daysInclusive: days,
  }
}
