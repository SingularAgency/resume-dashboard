"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { AlertTriangle, RefreshCw } from "lucide-react"

interface ErrorStateProps {
  message?: string
  onRetry?: () => void
}

export function ErrorState({
  message = "Failed to load dashboard data",
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex min-h-[400px] items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-4 pt-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">
            Something went wrong
          </h3>
          <p className="text-sm text-muted-foreground">{message}</p>
          {onRetry && (
            <Button onClick={onRetry} variant="outline" className="mt-2">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try again
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export function EmptyState({ message = "No data available" }) {
  return (
    <div className="flex min-h-[200px] items-center justify-center p-6">
      <p className="text-muted-foreground">{message}</p>
    </div>
  )
}
