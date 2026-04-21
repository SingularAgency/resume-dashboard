"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { RefreshCw, FileText, CalendarIcon, LogOut, User } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { format } from "date-fns"

interface DateRange {
  from: Date | undefined
  to: Date | undefined
}

interface TopNavProps {
  onRefresh: () => void
  isLoading: boolean
  dateRange: string
  onDateRangeChange: (value: string) => void
  customDateRange: DateRange
  onCustomDateRangeChange: (range: DateRange) => void
}

export function TopNav({
  onRefresh,
  isLoading,
  dateRange,
  onDateRangeChange,
  customDateRange,
  onCustomDateRangeChange,
}: TopNavProps) {
  const { user, logout } = useAuth()
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [draftCustomRange, setDraftCustomRange] = useState<DateRange>({
    from: undefined,
    to: undefined,
  })

  const handleDateRangeSelect = (value: string) => {
    onDateRangeChange(value)
    if (value !== "custom") {
      onCustomDateRangeChange({ from: undefined, to: undefined })
    }
  }

  const formatCustomRange = () => {
    if (customDateRange.from && customDateRange.to) {
      return `${format(customDateRange.from, "MMM d, yyyy")} - ${format(customDateRange.to, "MMM d, yyyy")}`
    }
    if (customDateRange.from) {
      return `${format(customDateRange.from, "MMM d, yyyy")} - Select end date`
    }
    return "Select date range"
  }

  const calendarSelectedRange = calendarOpen ? draftCustomRange : customDateRange
  const canApplyCustomRange = Boolean(draftCustomRange.from && draftCustomRange.to)

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-backdrop-filter:bg-card/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <FileText className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">
            ResAI Dashboard
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <Select value={dateRange} onValueChange={handleDateRangeSelect} disabled={isLoading}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="14d">Last 14 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>

          {dateRange === "custom" && (
            <Popover
              open={calendarOpen}
              onOpenChange={(open) => {
                setCalendarOpen(open)
                if (open) {
                  // Start a fresh selection flow: first click = start, second = end.
                  setDraftCustomRange({ from: undefined, to: undefined })
                } else {
                  setDraftCustomRange(customDateRange)
                }
              }}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-[280px] justify-start text-left font-normal"
                  disabled={isLoading}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formatCustomRange()}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={{
                    from: calendarSelectedRange.from,
                    to: calendarSelectedRange.to,
                  }}
                  onSelect={(range) => {
                    const from = range?.from
                    const to = range?.to

                    if (from && !to) {
                      setDraftCustomRange({ from, to: undefined })
                      return
                    }

                    if (from && to) {
                      setDraftCustomRange({ from, to })
                      return
                    }

                    setDraftCustomRange({ from: undefined, to: undefined })
                  }}
                  numberOfMonths={2}
                  disabled={{ after: new Date() }}
                />
                <div className="flex items-center justify-end gap-2 border-t p-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDraftCustomRange({ from: undefined, to: undefined })
                    }}
                  >
                    Clear
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={!canApplyCustomRange}
                    onClick={() => {
                      if (!draftCustomRange.from || !draftCustomRange.to) return
                      onCustomDateRangeChange({
                        from: draftCustomRange.from,
                        to: draftCustomRange.to,
                      })
                      setCalendarOpen(false)
                    }}
                  >
                    Apply
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          )}

          <Button
            variant="outline"
            size="icon"
            onClick={onRefresh}
            disabled={isLoading}
            aria-label="Refresh data"
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {user?.email?.substring(0, 2).toUpperCase() || "AD"}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="flex items-center gap-2 p-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div className="flex flex-col space-y-0.5">
                  <p className="text-sm font-medium">Account</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user?.email || "admin@example.com"}
                  </p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  void logout()
                }}
                className="text-destructive focus:text-destructive cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
