"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import type { DashboardData } from "@/lib/mock-data"
import { analyticsGet, isAbortError, type AnalyticsGetOptions } from "@/lib/analytics-api"
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
  dataWarning: string | null
  analyticsQuery: { start_date: string; end_date: string } | null
  kpiChangePct: Record<string, number> | null
  dateRange: string
  customDateRange: DateRange
  usersPagination: PaginationState
  recentActivityPagination: PaginationState
  setDateRange: (range: string) => void
  setCustomDateRange: (range: DateRange) => void
  setUsersPage: (page: number) => void
  setRecentActivityPage: (page: number) => void
  refresh: () => void
}

interface ResolvedRangeState {
  value: AnalyticsDateRangeResult | null
  error: string | null
}

interface UseAnalyticsDataOptions {
  enabled?: boolean
}

interface PaginationState {
  page: number
  pageSize: number
  total: number
  totalPages: number
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

interface PaymentMethodApiItem {
  method?: unknown
  count?: unknown
}

interface PaymentsOverviewApiResponse {
  totalRevenue?: unknown
  total_revenue?: unknown
  generated?: unknown
  paymentsGenerated?: unknown
  payments_generated?: unknown
  pending?: unknown
  completed?: unknown
  paymentMethods?: unknown
  payment_methods?: unknown
  methods?: unknown
  distribution?: unknown
  data?: unknown
}

interface ResumeDeliveryPoint {
  date?: unknown
  day?: unknown
  downloaded?: unknown
  downloads?: unknown
  printedShipped?: unknown
  printed_shipped?: unknown
  printed?: unknown
  print?: unknown
}

interface PdfTrendPoint {
  date?: unknown
  day?: unknown
  pdfs?: unknown
  generated?: unknown
  count?: unknown
  value?: unknown
}

interface ResumesApiItem {
  resume_id?: unknown
  user_id?: unknown
  user_name?: unknown
  payment_status?: unknown
  payment_method?: unknown
  pdf_generated?: unknown
  print_ship_status?: unknown
  created_at?: unknown
  resume_pdf_url?: unknown
}

interface ResumesApiResponse {
  items?: unknown
}

interface UsersApiItem {
  user_id?: unknown
  name?: unknown
  email?: unknown
  phone?: unknown
  purchase_status?: unknown
  signup_date?: unknown
  last_active?: unknown
}

interface UsersApiResponse {
  items?: unknown
}

interface DashboardApiResponse {
  kpis?: unknown
  users_trend?: unknown
  resume_trend?: unknown
  pdfs_trend?: unknown
  delivery_trend?: unknown
  payments_overview?: unknown
  payment_methods?: unknown
}

const MS_PER_DAY = 24 * 60 * 60 * 1000
const DEFAULT_PAGINATION: PaginationState = {
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 1,
}
const ANALYTICS_REQUEST_TIMEOUT_MS = 5000

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function extractPaginationState(payload: unknown): PaginationState {
  if (!payload || typeof payload !== "object") return DEFAULT_PAGINATION

  const record = payload as {
    page?: unknown
    page_size?: unknown
    total?: unknown
    total_pages?: unknown
  }

  const page = Math.max(1, Math.round(toNumber(record.page) ?? DEFAULT_PAGINATION.page))
  const pageSize = Math.max(1, Math.round(toNumber(record.page_size) ?? DEFAULT_PAGINATION.pageSize))
  const total = Math.max(0, Math.round(toNumber(record.total) ?? 0))
  const fallbackTotalPages = Math.max(1, Math.ceil(total / pageSize))
  const totalPages = Math.max(1, Math.round(toNumber(record.total_pages) ?? fallbackTotalPages))

  return { page, pageSize, total, totalPages }
}

function readCachedDashboardData(cacheKey: string): DashboardData | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.sessionStorage.getItem(cacheKey)
    if (!raw) return null
    return JSON.parse(raw) as DashboardData
  } catch {
    return null
  }
}

function writeCachedDashboardData(cacheKey: string, value: DashboardData): void {
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.setItem(cacheKey, JSON.stringify(value))
  } catch {
    // Ignore cache write failures (quota/private mode).
  }
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

function parsePaymentsOverviewPayload(
  payload: unknown,
  fallbackPayments: DashboardData["payments"],
): {
  payments: DashboardData["payments"]
  paymentMethods: DashboardData["paymentMethods"]
} {
  if (!payload || typeof payload !== "object") {
    return { payments: fallbackPayments, paymentMethods: [] }
  }

  const record = payload as PaymentsOverviewApiResponse
  const nestedRecord =
    record.data && typeof record.data === "object" ? (record.data as PaymentsOverviewApiResponse) : null

  const totalRevenue = [
    record.totalRevenue,
    record.total_revenue,
    record.generated,
    record.paymentsGenerated,
    record.payments_generated,
    nestedRecord?.totalRevenue,
    nestedRecord?.total_revenue,
    nestedRecord?.generated,
    nestedRecord?.paymentsGenerated,
    nestedRecord?.payments_generated,
  ]
    .map((value) => toNumber(value))
    .find((value) => value !== null)

  const resolvedGenerated =
    totalRevenue !== undefined && totalRevenue !== null && totalRevenue >= 0
      ? totalRevenue
      : fallbackPayments.generated
  const pendingValue = toNumber(record.pending) ?? toNumber(nestedRecord?.pending)
  const completedValue = toNumber(record.completed) ?? toNumber(nestedRecord?.completed)
  const resolvedPending =
    pendingValue !== null && pendingValue >= 0 ? pendingValue : fallbackPayments.pending
  const resolvedCompleted =
    completedValue !== null && completedValue >= 0 ? completedValue : fallbackPayments.completed

  const paymentMethodsRaw =
    record.paymentMethods ??
    record.payment_methods ??
    record.methods ??
    record.distribution ??
    nestedRecord?.paymentMethods ??
    nestedRecord?.payment_methods ??
    nestedRecord?.methods ??
    nestedRecord?.distribution

  if (!Array.isArray(paymentMethodsRaw)) {
    return {
      payments: {
        generated: resolvedGenerated,
        pending: resolvedPending,
        completed: resolvedCompleted,
      },
      paymentMethods: [],
    }
  }

  const paymentMethods = paymentMethodsRaw
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null

      const entryRecord = entry as PaymentMethodApiItem & {
        name?: unknown
        value?: unknown
      }
      const method = typeof entryRecord.method === "string" ? entryRecord.method : entryRecord.name
      const count = toNumber(entryRecord.count) ?? toNumber(entryRecord.value)

      if (typeof method !== "string" || method.trim().length === 0 || count === null || count < 0) {
        return null
      }

      return {
        method: method.trim(),
        value: count,
      }
    })
    .filter((item): item is { method: string; value: number } => item !== null)

  return {
    payments: {
      generated: resolvedGenerated,
      pending: resolvedPending,
      completed: resolvedCompleted,
    },
    paymentMethods,
  }
}

function parseResumeDeliveryPayload(
  payload: unknown,
  dates: string[],
): DashboardData["resumeDelivery"] | null {
  const points = extractTrendPoints(payload, [
    "resumeDelivery",
    "resume_delivery",
    "resumeDeliveryTrend",
    "resume_delivery_trend",
    "deliveryTrend",
    "delivery_trend",
    "trend",
    "items",
  ])

  if (points.length === 0) return null

  const aggregatedByDate = new Map<string, { downloaded: number; printedShipped: number }>()

  for (const rawPoint of points as ResumeDeliveryPoint[]) {
    const dateValue = typeof rawPoint.date === "string" ? rawPoint.date : rawPoint.day
    if (typeof dateValue !== "string") continue

    const isoDate = toIsoDate(dateValue)
    if (!isoDate) continue

    const downloaded = Math.max(
      0,
      toNumber(rawPoint.downloaded) ?? toNumber(rawPoint.downloads) ?? 0,
    )
    const printedShipped = Math.max(
      0,
      toNumber(rawPoint.printedShipped) ??
        toNumber(rawPoint.printed_shipped) ??
        toNumber(rawPoint.printed) ??
        toNumber(rawPoint.print) ??
        0,
    )

    const current = aggregatedByDate.get(isoDate) ?? { downloaded: 0, printedShipped: 0 }
    aggregatedByDate.set(isoDate, {
      downloaded: current.downloaded + downloaded,
      printedShipped: current.printedShipped + printedShipped,
    })
  }

  if (aggregatedByDate.size === 0) return null

  return dates.map((date) => {
    const point = aggregatedByDate.get(date)
    return {
      date,
      downloaded: point?.downloaded ?? 0,
      printedShipped: point?.printedShipped ?? 0,
    }
  })
}

function parsePdfTrendPayload(payload: unknown, dates: string[]): DashboardData["pdfsGenerated"] | null {
  const points = extractTrendPoints(payload, [
    "pdfTrend",
    "pdf_trend",
    "pdfsTrend",
    "pdfs_trend",
    "trend",
    "items",
  ])

  if (points.length === 0) return null

  const aggregatedByDate = new Map<string, number>()

  for (const rawPoint of points as PdfTrendPoint[]) {
    const dateValue = typeof rawPoint.date === "string" ? rawPoint.date : rawPoint.day
    if (typeof dateValue !== "string") continue

    const isoDate = toIsoDate(dateValue)
    if (!isoDate) continue

    const value =
      toNumber(rawPoint.pdfs) ??
      toNumber(rawPoint.generated) ??
      toNumber(rawPoint.count) ??
      toNumber(rawPoint.value)
    if (value === null) continue

    aggregatedByDate.set(isoDate, (aggregatedByDate.get(isoDate) ?? 0) + Math.max(0, value))
  }

  if (aggregatedByDate.size === 0) return null

  return dates.map((date) => ({
    date,
    pdfs: Math.round(aggregatedByDate.get(date) ?? 0),
  }))
}

function mapShipmentStatus(status: unknown): DashboardData["recentActivity"][number]["shipmentStatus"] {
  if (typeof status !== "string") return "not_applicable"
  const normalized = status.trim().toLowerCase()
  if (normalized === "processing") return "processing"
  if (normalized === "shipped") return "shipped"
  if (normalized === "in_transit" || normalized === "in transit") return "in_transit"
  if (normalized === "delivered") return "delivered"
  if (normalized === "failed") return "failed"
  return "not_applicable"
}

function mapPaymentStatus(status: unknown): DashboardData["recentActivity"][number]["paymentStatus"] {
  if (typeof status !== "string") return "pending"
  const normalized = status.trim().toLowerCase()
  if (normalized === "completed" || normalized === "paid") return "completed"
  if (normalized === "failed") return "failed"
  return "pending"
}

function mapResumesPayload(
  payload: unknown,
): Pick<DashboardData, "recentActivity"> {
  if (!payload || typeof payload !== "object") {
    return { recentActivity: [] }
  }

  const items = (payload as ResumesApiResponse).items
  if (!Array.isArray(items)) {
    return { recentActivity: [] }
  }

  const recentActivity: DashboardData["recentActivity"] = []
  for (const entry of items as ResumesApiItem[]) {
    const resumeId = toNumber(entry.resume_id)
    const userId = typeof entry.user_id === "string" && entry.user_id.trim().length > 0 ? entry.user_id : null
    const createdAt =
      typeof entry.created_at === "string" && !Number.isNaN(new Date(entry.created_at).getTime())
        ? entry.created_at
        : null

    if (!resumeId || !userId || !createdAt) continue

    const paymentStatus = mapPaymentStatus(entry.payment_status)
    const paymentMethod =
      typeof entry.payment_method === "string" && entry.payment_method.trim().length > 0
        ? entry.payment_method.trim()
        : "N/A"
    const pdfGenerated = entry.pdf_generated === true
    const shipmentStatus = mapShipmentStatus(entry.print_ship_status)
    const printAndShip = shipmentStatus !== "not_applicable"
    const resumeType: DashboardData["recentActivity"][number]["resumeType"] = printAndShip
      ? pdfGenerated
        ? "both"
        : "printed_shipped"
      : "downloaded"
    const resumeResultPdf =
      typeof entry.resume_pdf_url === "string" && entry.resume_pdf_url.trim().length > 0
        ? entry.resume_pdf_url
        : null

    recentActivity.push({
      resumeId: String(Math.round(resumeId)),
      userId,
      paymentStatus,
      paymentMethod,
      pdfGenerated,
      printAndShip,
      resumeType,
      resumeResultPdf,
      templateUsed: "N/A",
      shipmentStatus,
      trackingNumber: null,
      createdDate: createdAt,
    })
  }

  return { recentActivity }
}

function mapUsersPayload(payload: unknown): DashboardData["users"] | null {
  // "All users" should come from `analytics/users` (paginated). This returns null when
  // the users endpoint is unavailable/invalid, so the UI can avoid misleading fallbacks
  // derived from `analytics/resumes` page slices.
  if (!payload || typeof payload !== "object") return null
  const items = (payload as UsersApiResponse).items
  if (!Array.isArray(items)) return null

  const users = items
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null
      const item = entry as UsersApiItem
      const userId = typeof item.user_id === "string" && item.user_id.trim().length > 0 ? item.user_id : null
      if (!userId) return null

      const signupDateRaw = typeof item.signup_date === "string" ? item.signup_date : null
      const lastActiveRaw = typeof item.last_active === "string" ? item.last_active : null
      const signupDate =
        signupDateRaw && !Number.isNaN(new Date(signupDateRaw).getTime())
          ? signupDateRaw
          : "1970-01-01T00:00:00.000Z"
      const lastActive =
        lastActiveRaw && !Number.isNaN(new Date(lastActiveRaw).getTime()) ? lastActiveRaw : signupDate

      const purchaseStatus =
        typeof item.purchase_status === "string" ? item.purchase_status.trim().toLowerCase() : null
      // "Purchased" should reflect a completed / confirmed purchase, not a pending checkout.
      const hasPurchased =
        purchaseStatus === "purchased" || purchaseStatus === "completed" || purchaseStatus === "paid"

      return {
        id: userId,
        name:
          typeof item.name === "string" && item.name.trim().length > 0
            ? item.name.trim()
            : `User ${userId.slice(0, 8)}`,
        email:
          typeof item.email === "string" && item.email.trim().length > 0 ? item.email.trim() : "N/A",
        phone:
          typeof item.phone === "string" && item.phone.trim().length > 0 ? item.phone.trim() : "N/A",
        hasPurchased,
        signupDate,
        lastActive,
      }
    })
    .filter((user): user is DashboardData["users"][number] => user !== null)
    .sort((a, b) => (a.lastActive < b.lastActive ? 1 : -1))

  return users
}

function parsePaymentMethodsPayload(payload: unknown): DashboardData["paymentMethods"] {
  if (!payload) return []

  if (Array.isArray(payload)) {
    return payload
      .map((entry) => {
        if (!entry || typeof entry !== "object") return null
        const record = entry as { method?: unknown; name?: unknown; value?: unknown; count?: unknown }
        const method = typeof record.method === "string" ? record.method : record.name
        const value = toNumber(record.value) ?? toNumber(record.count)
        if (typeof method !== "string" || method.trim().length === 0 || value === null || value < 0) {
          return null
        }
        return { method: method.trim(), value }
      })
      .filter((item): item is DashboardData["paymentMethods"][number] => item !== null)
  }

  if (typeof payload === "object") {
    const record = payload as Record<string, unknown>
    const mapped: DashboardData["paymentMethods"] = []
    const candidates = [
      { key: "card", label: "Card" },
      { key: "paypal", label: "PayPal" },
      { key: "other", label: "Other" },
    ]
    for (const candidate of candidates) {
      const value = toNumber(record[candidate.key])
      if (value === null || value < 0) continue
      mapped.push({ method: candidate.label, value })
    }
    return mapped
  }

  return []
}

function sleepWithAbortSignal(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) {
    return Promise.reject(new DOMException("The operation was aborted.", "AbortError"))
  }
  if (!signal) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
  return new Promise((resolve, reject) => {
    let settled = false
    const timeoutId = setTimeout(() => {
      if (settled) return
      settled = true
      signal.removeEventListener("abort", onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      if (settled) return
      settled = true
      clearTimeout(timeoutId)
      reject(new DOMException("The operation was aborted.", "AbortError"))
    }
    signal.addEventListener("abort", onAbort, { once: true })
  })
}

async function analyticsGetWithRetry<T>(
  path: string,
  query: Record<string, string | number | undefined>,
  attempts: number,
  options?: AnalyticsGetOptions,
): Promise<T> {
  let lastError: unknown = null
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const signal = options?.signal
    if (signal?.aborted) {
      throw new DOMException("The operation was aborted.", "AbortError")
    }
    try {
      return await analyticsGet<T>(path, query, options)
    } catch (error) {
      if (isAbortError(error)) {
        throw error
      }
      lastError = error
      if (attempt === attempts) break
      await sleepWithAbortSignal(attempt * 250, signal)
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Failed after retry attempts.")
}

function buildDashboardDataFromKpis(
  metrics: ReturnType<typeof mapKpisToMetrics>,
  changePct: Record<string, number>,
  usersTrendPayload: unknown,
  resumesTrendPayload: unknown,
  paymentsOverviewPayload: unknown,
  resumeDeliveryPayload: unknown,
  pdfTrendPayload: unknown,
  paymentMethodsPayload: unknown,
  resumesPayload: unknown,
  usersPayload: unknown,
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
  const paymentsOverview = parsePaymentsOverviewPayload(paymentsOverviewPayload, {
    generated: metrics.paymentsGenerated,
    pending: metrics.paymentsPending,
    completed: metrics.paymentsCompleted,
  })

  const resumeDeliveryFromApi = parseResumeDeliveryPayload(resumeDeliveryPayload, dates)
  const pdfTrendFromApi = parsePdfTrendPayload(pdfTrendPayload, dates)
  const paymentMethodsFromApi = parsePaymentMethodsPayload(paymentMethodsPayload)
  const { recentActivity } = mapResumesPayload(resumesPayload)
  // Only use `mapUsersPayload` for the "All users" table. Do not derive users from
  // `analytics/resumes` because it's paginated and would be misleading.
  const usersFromUsersEndpoint = mapUsersPayload(usersPayload)
  const resumeDelivery =
    resumeDeliveryFromApi ??
    dates.map((date, index) => {
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
    payments: paymentsOverview.payments,
    paymentMethods:
      paymentMethodsFromApi.length > 0 ? paymentMethodsFromApi : paymentsOverview.paymentMethods,
    pdfsGenerated: pdfTrendFromApi ?? dates.map((date, index) => ({ date, pdfs: pdfsDaily[index] ?? 0 })),
    recentActivity,
    users: usersFromUsersEndpoint ?? [],
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
  const [dataWarning, setDataWarning] = useState<string | null>(null)
  const [dateRange, setDateRangeState] = useState("30d")
  const [customDateRange, setCustomDateRangeState] = useState<DateRange>({
    from: undefined,
    to: undefined,
  })
  const [usersPage, setUsersPageState] = useState(1)
  const [recentActivityPage, setRecentActivityPageState] = useState(1)
  const [usersPagination, setUsersPagination] = useState<PaginationState>(DEFAULT_PAGINATION)
  const [recentActivityPagination, setRecentActivityPagination] =
    useState<PaginationState>(DEFAULT_PAGINATION)
  const hasHandledInitialRangeEffect = useRef(false)
  const inFlightIdRef = useRef(0)
  const inFlightFetchAbortRef = useRef<AbortController | null>(null)
  const lastSuccessfulDataRef = useRef<DashboardData | null>(null)

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
      setDataWarning(null)
      inFlightIdRef.current += 1
      inFlightFetchAbortRef.current?.abort()
      inFlightFetchAbortRef.current = null
      return
    }

    inFlightIdRef.current += 1
    const thisFetchId = inFlightIdRef.current
    inFlightFetchAbortRef.current?.abort()
    const controller = new AbortController()
    inFlightFetchAbortRef.current = controller
    const requestOptions: AnalyticsGetOptions = {
      signal: controller.signal,
      timeoutMs: ANALYTICS_REQUEST_TIMEOUT_MS,
    }

    const isStale = () => thisFetchId !== inFlightIdRef.current
    if (isStale()) return

    setIsLoading(true)
    setError(null)
    setDataWarning(null)

    // Simulate API loading time (300-800ms)
    const loadingTime = 300 + Math.random() * 500
    let cachedDataForRequest: DashboardData | null = null

    try {
      await sleepWithAbortSignal(loadingTime, requestOptions.signal)
      if (isStale() || requestOptions.signal?.aborted) return

      if (!resolvedDateRange.value) {
        throw new Error(
          resolvedDateRange.error ??
            "Invalid date range. Custom ranges must be up to 365 days.",
        )
      }
      if (isStale() || requestOptions.signal?.aborted) return

      const cacheKey = [
        "analytics-dashboard-cache",
        resolvedDateRange.value.startDateParam,
        resolvedDateRange.value.endDateParam,
        `u${usersPage}`,
        `r${recentActivityPage}`,
      ].join("|")
      cachedDataForRequest = readCachedDashboardData(cacheKey)
      if (!data && cachedDataForRequest) {
        setData(cachedDataForRequest)
        setDataWarning("Showing cached dashboard data while refreshing.")
      }

      const dashboardPayload = await analyticsGet<DashboardApiResponse>(
        "analytics/dashboard",
        {
          start_date: resolvedDateRange.value.startDateParam,
          end_date: resolvedDateRange.value.endDateParam,
        },
        requestOptions,
      )
      if (isStale() || requestOptions.signal?.aborted) return
      const kpis = (dashboardPayload.kpis ?? {}) as KpisApiResponse
      const usersTrendPayload = dashboardPayload.users_trend ?? null
      const resumesTrendPayload = dashboardPayload.resume_trend ?? null
      const paymentsOverviewPayload = dashboardPayload.payments_overview ?? null
      const resumeDeliveryPayload = dashboardPayload.delivery_trend ?? null
      const pdfTrendPayload = dashboardPayload.pdfs_trend ?? null
      const paymentMethodsPayload = dashboardPayload.payment_methods ?? null
      let partialDataUnavailable = false
      let resumesPayload: unknown = null
      try {
        resumesPayload = await analyticsGetWithRetry<unknown>(
          "analytics/resumes",
          {
            page: recentActivityPage,
            page_size: 20,
            start_date: resolvedDateRange.value.startDateParam,
            end_date: resolvedDateRange.value.endDateParam,
          },
          3,
          requestOptions,
        )
      } catch (resumesError) {
        if (isAbortError(resumesError)) {
          throw resumesError
        }
        partialDataUnavailable = true
        console.warn("Resumes endpoint unavailable, keeping users/activity empty.", resumesError)
      }
      if (isStale() || requestOptions.signal?.aborted) return
      let usersPayload: unknown = null
      try {
        usersPayload = await analyticsGetWithRetry<unknown>(
          "analytics/users",
          {
            page: usersPage,
            page_size: 20,
            start_date: resolvedDateRange.value.startDateParam,
            end_date: resolvedDateRange.value.endDateParam,
          },
          3,
          requestOptions,
        )
      } catch (usersError) {
        if (isAbortError(usersError)) {
          throw usersError
        }
        partialDataUnavailable = true
        console.warn("Users endpoint unavailable, keeping all-users table empty (users come from /analytics/users only).", usersError)
      }
      if (isStale() || requestOptions.signal?.aborted) return

      const metrics = mapKpisToMetrics(kpis)
      const changePct = mapKpisChangePct(kpis)
      if (isStale() || requestOptions.signal?.aborted) return
      // Don't reset table pagination to defaults if a paginated endpoint request failed
      // and the payload is still null (keeps the last good pagination on transient errors).
      setRecentActivityPagination((prev) => (resumesPayload == null ? prev : extractPaginationState(resumesPayload)))
      setUsersPagination((prev) => (usersPayload == null ? prev : extractPaginationState(usersPayload)))
      setKpiChangePct(changePct)
      const nextData = buildDashboardDataFromKpis(
        metrics,
        changePct,
        usersTrendPayload,
        resumesTrendPayload,
        paymentsOverviewPayload,
        resumeDeliveryPayload,
        pdfTrendPayload,
        paymentMethodsPayload,
        resumesPayload,
        usersPayload,
        resolvedDateRange.value,
      )
      setData(nextData)
      lastSuccessfulDataRef.current = nextData
      writeCachedDashboardData(cacheKey, nextData)
      setDataWarning(
        partialDataUnavailable
          ? "Some sections are temporarily unavailable. Showing available data."
          : null,
      )
    } catch (err) {
      if (isAbortError(err) || isStale()) {
        return
      }
      const fallbackData = lastSuccessfulDataRef.current ?? cachedDataForRequest
      if (fallbackData) {
        setData(fallbackData)
        setError(null)
        setDataWarning("Some data sources failed. Showing last successful dashboard snapshot.")
        console.warn("Dashboard data fetch failed, using cached snapshot.", err)
      } else {
        const message =
          err instanceof Error ? err.message : "Failed to load dashboard data. Please try again."
        setError(message)
        setDataWarning(null)
        console.error("Dashboard data fetch error:", err)
      }
    } finally {
      if (thisFetchId === inFlightIdRef.current) {
        setIsLoading(false)
      }
    }
  }, [enabled, resolvedDateRange, recentActivityPage, usersPage])

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
    setUsersPageState(1)
    setRecentActivityPageState(1)
    if (range !== "custom") {
      setCustomDateRangeState({ from: undefined, to: undefined })
    }
  }, [])

  // Handle custom date range changes
  const setCustomDateRange = useCallback((range: DateRange) => {
    setUsersPageState(1)
    setRecentActivityPageState(1)
    setCustomDateRangeState(range)
  }, [])

  const setUsersPage = useCallback((page: number) => {
    setUsersPageState(Math.max(1, page))
  }, [])

  const setRecentActivityPage = useCallback((page: number) => {
    setRecentActivityPageState(Math.max(1, page))
  }, [])

  // Fetch data when range changes (excluding initial mount)
  useEffect(() => {
    if (!hasHandledInitialRangeEffect.current) {
      hasHandledInitialRangeEffect.current = true
      return
    }
    if (!enabled) {
      return
    }
    // Skip if custom range without both dates selected
    if (dateRange === "custom" && (!customDateRange.from || !customDateRange.to)) {
      return
    }

    fetchData()
  }, [
    enabled,
    dateRange,
    customDateRange.from?.getTime(),
    customDateRange.to?.getTime(),
    recentActivityPage,
    usersPage,
  ])

  // Refresh function
  const refresh = useCallback(() => {
    if (!enabled) return
    fetchData()
  }, [enabled, fetchData])

  return {
    data,
    isLoading,
    error,
    dataWarning,
    analyticsQuery: resolvedDateRange.value
      ? {
          start_date: resolvedDateRange.value.startDateParam,
          end_date: resolvedDateRange.value.endDateParam,
        }
      : null,
    kpiChangePct,
    dateRange,
    customDateRange,
    usersPagination,
    recentActivityPagination,
    setDateRange,
    setCustomDateRange,
    setUsersPage,
    setRecentActivityPage,
    refresh,
  }
}
