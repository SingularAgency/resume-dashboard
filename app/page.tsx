"use client"

import { useMemo } from "react"
import { useAuth } from "@/contexts/auth-context"
import { TopNav } from "@/components/dashboard/top-nav"
import { MetricCard } from "@/components/dashboard/metric-card"
import {
  UsersTrendChart,
  ResumeTrendChart,
  PaymentsOverviewChart,
  PaymentMethodsChart,
  PDFsGeneratedChart,
  ResumeDeliveryChart,
  ResumeTypeDistributionChart,
} from "@/components/dashboard/charts"
import { ActivityTable } from "@/components/dashboard/activity-table"
import { UsersTable } from "@/components/dashboard/users-table"
import { DashboardSkeleton } from "@/components/dashboard/loading-skeleton"
import { ErrorState } from "@/components/dashboard/error-state"
import { useAnalyticsData } from "@/hooks/use-analytics-data"

export default function DashboardPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const analyticsEnabled = isAuthenticated && !authLoading
  const {
    data,
    isLoading,
    error,
    kpiChangePct,
    dateRange,
    customDateRange,
    setDateRange,
    setCustomDateRange,
    refresh,
  } = useAnalyticsData({ enabled: analyticsEnabled })

  const metrics = useMemo(() => {
    if (!data) return []
    const pct = kpiChangePct ?? {}
    const metricTrend = (value: number): { trend: "up" | "down"; value: string } => ({
      trend: value >= 0 ? "up" : "down",
      value: `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`,
    })
    const sparkline = (value: number): number[] => [0, 0, value * 0.25, value * 0.5, value * 0.75, value, value]

    return [
      {
        title: "Resumes Created",
        value: data.metrics.resumesCreated,
        ...metricTrend(pct.resumesCreated ?? 0),
        sparklineData: sparkline(pct.resumesCreated ?? 0),
      },
      {
        title: "Resumes Paid",
        value: data.metrics.resumesPaid,
        ...metricTrend(pct.resumesPaid ?? 0),
        sparklineData: sparkline(pct.resumesPaid ?? 0),
      },
      {
        title: "PDFs Generated",
        value: data.metrics.resumePdfsGenerated,
        ...metricTrend(pct.resumePdfsGenerated ?? 0),
        sparklineData: sparkline(pct.resumePdfsGenerated ?? 0),
      },
      {
        title: "Print & Ship Qty",
        value: data.metrics.resumePrintShipQty,
        ...metricTrend(pct.resumePrintShipQty ?? 0),
        sparklineData: sparkline(pct.resumePrintShipQty ?? 0),
      },
      {
        title: "Payments Generated",
        value: data.metrics.paymentsGenerated,
        ...metricTrend(pct.paymentsGenerated ?? 0),
        sparklineData: sparkline(pct.paymentsGenerated ?? 0),
        prefix: "$",
      },
      {
        title: "Payments Pending",
        value: data.metrics.paymentsPending,
        ...metricTrend(pct.paymentsPending ?? 0),
        sparklineData: sparkline(pct.paymentsPending ?? 0),
        prefix: "$",
      },
      {
        title: "Payments Completed",
        value: data.metrics.paymentsCompleted,
        ...metricTrend(pct.paymentsCompleted ?? 0),
        sparklineData: sparkline(pct.paymentsCompleted ?? 0),
        prefix: "$",
      },
    ]
  }, [data, kpiChangePct])

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardSkeleton />
      </div>
    )
  }

  // Don't render if not authenticated (redirect will happen via context)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardSkeleton />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <TopNav
          onRefresh={refresh}
          isLoading={isLoading}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          customDateRange={customDateRange}
          onCustomDateRangeChange={setCustomDateRange}
        />
        <ErrorState message={error} onRetry={refresh} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <TopNav
        onRefresh={refresh}
        isLoading={isLoading}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        customDateRange={customDateRange}
        onCustomDateRangeChange={setCustomDateRange}
      />

      {isLoading ? (
        <DashboardSkeleton />
      ) : data ? (
        <main className="container mx-auto flex flex-col gap-8 p-4 md:p-6 lg:p-8">
          {/* Summary Metrics Section */}
          <section aria-label="Summary metrics">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
              {metrics.map((metric) => (
                <MetricCard key={metric.title} {...metric} />
              ))}
            </div>
          </section>

          {/* Analytics Charts Section - Row 1 */}
          <section aria-label="User and resume trends">
            <div className={`grid grid-cols-1 gap-6 ${data.usersTrend.length > 0 ? "lg:grid-cols-2" : ""}`}>
              {data.usersTrend.length > 0 ? <UsersTrendChart data={data.usersTrend} /> : null}
              <ResumeTrendChart data={data.resumeTrend} />
            </div>
          </section>

          {/* Resume Delivery Charts Section */}
          <section aria-label="Resume delivery analytics">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <ResumeDeliveryChart data={data.resumeDelivery} />
              <ResumeTypeDistributionChart data={data.resumeDelivery} />
            </div>
          </section>

          {/* PDFs Generated Section */}
          <section aria-label="PDF generation analytics">
            <PDFsGeneratedChart data={data.pdfsGenerated} />
          </section>

          {/* Analytics Charts Section - Row 2 */}
          <section aria-label="Payment analytics">
            <div className={`grid grid-cols-1 gap-6 ${data.paymentMethods.length > 0 ? "lg:grid-cols-2" : ""}`}>
              <PaymentsOverviewChart data={data.payments} />
              {data.paymentMethods.length > 0 ? (
                <PaymentMethodsChart data={data.paymentMethods} />
              ) : null}
            </div>
          </section>

          {/* Users Table Section */}
          <section aria-label="All users">
            <UsersTable data={data.users} />
          </section>

          {/* Data Table Section */}
          <section aria-label="Recent activity">
            <ActivityTable data={data.recentActivity} />
          </section>
        </main>
      ) : null}
    </div>
  )
}
