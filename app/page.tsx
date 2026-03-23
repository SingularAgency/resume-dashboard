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
  const {
    data,
    isLoading,
    error,
    dateRange,
    customDateRange,
    setDateRange,
    setCustomDateRange,
    refresh,
    getSparklineData,
  } = useAnalyticsData()

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

  const metrics = useMemo(() => {
    if (!data) return []
    
    // Calculate trend percentages based on data variance
    const calculateTrend = (current: number, baseline: number): { trend: "up" | "down"; value: string } => {
      const diff = ((current - baseline) / baseline) * 100
      return {
        trend: diff >= 0 ? "up" : "down",
        value: `${diff >= 0 ? "+" : ""}${diff.toFixed(1)}%`,
      }
    }
    
    // Generate trends based on sparkline data patterns
    const resumeSparkline = getSparklineData("resumesCreated")
    const paidSparkline = getSparklineData("resumesPaid")
    const pdfSparkline = getSparklineData("pdfGenerated")
    const printSparkline = getSparklineData("printShip")
    const genSparkline = getSparklineData("paymentsGenerated")
    const pendingSparkline = getSparklineData("paymentsPending")
    const completedSparkline = getSparklineData("paymentsCompleted")
    
    return [
      {
        title: "Resumes Created",
        value: data.metrics.resumesCreated,
        ...calculateTrend(resumeSparkline[6], resumeSparkline[0]),
        sparklineData: resumeSparkline,
      },
      {
        title: "Resumes Paid",
        value: data.metrics.resumesPaid,
        ...calculateTrend(paidSparkline[6], paidSparkline[0]),
        sparklineData: paidSparkline,
      },
      {
        title: "PDFs Generated",
        value: data.metrics.resumePdfsGenerated,
        ...calculateTrend(pdfSparkline[6], pdfSparkline[0]),
        sparklineData: pdfSparkline,
      },
      {
        title: "Print & Ship Qty",
        value: data.metrics.resumePrintShipQty,
        ...calculateTrend(printSparkline[6], printSparkline[0]),
        sparklineData: printSparkline,
      },
      {
        title: "Payments Generated",
        value: data.metrics.paymentsGenerated,
        ...calculateTrend(genSparkline[6], genSparkline[0]),
        sparklineData: genSparkline,
        prefix: "$",
      },
      {
        title: "Payments Pending",
        value: data.metrics.paymentsPending,
        ...calculateTrend(pendingSparkline[0], pendingSparkline[6]), // Inverted for pending
        sparklineData: pendingSparkline,
        prefix: "$",
      },
      {
        title: "Payments Completed",
        value: data.metrics.paymentsCompleted,
        ...calculateTrend(completedSparkline[6], completedSparkline[0]),
        sparklineData: completedSparkline,
        prefix: "$",
      },
    ]
  }, [data, getSparklineData])

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
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <UsersTrendChart data={data.usersTrend} />
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
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <PaymentsOverviewChart data={data.payments} />
              <PaymentMethodsChart data={data.paymentMethods} />
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
