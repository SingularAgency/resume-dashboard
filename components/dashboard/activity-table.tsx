"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Check, X, Download, Printer, FileText, ExternalLink, Package, Truck, PackageCheck, Clock, AlertCircle } from "lucide-react"
import type { RecentActivity } from "@/lib/mock-data"

interface ActivityTableProps {
  data: RecentActivity[]
}

export function ActivityTable({ data }: ActivityTableProps) {
  const getStatusBadge = (status: RecentActivity["paymentStatus"]) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
            Completed
          </Badge>
        )
      case "pending":
        return (
          <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
            Pending
          </Badge>
        )
      case "failed":
        return (
          <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
            Failed
          </Badge>
        )
      default:
        return null
    }
  }

  const getResumeTypeBadge = (type: RecentActivity["resumeType"]) => {
    switch (type) {
      case "downloaded":
        return (
          <Badge variant="outline" className="gap-1 border-primary text-primary">
            <Download className="h-3 w-3" />
            Downloaded
          </Badge>
        )
      case "printed_shipped":
        return (
          <Badge variant="outline" className="gap-1 border-accent text-accent">
            <Printer className="h-3 w-3" />
            Printed & Shipped
          </Badge>
        )
      case "both":
        return (
          <div className="flex flex-col gap-1">
            <Badge variant="outline" className="gap-1 border-primary text-primary">
              <Download className="h-3 w-3" />
              Downloaded
            </Badge>
            <Badge variant="outline" className="gap-1 border-accent text-accent">
              <Printer className="h-3 w-3" />
              Printed & Shipped
            </Badge>
          </div>
        )
      default:
        return null
    }
  }

  const getBooleanIcon = (value: boolean) => {
    return value ? (
      <div className="flex items-center justify-center">
        <Check className="h-5 w-5 text-emerald-600" />
      </div>
    ) : (
      <div className="flex items-center justify-center">
        <X className="h-5 w-5 text-muted-foreground" />
      </div>
    )
  }

  const getShipmentStatusBadge = (
    status: RecentActivity["shipmentStatus"],
    trackingNumber: string | null
  ) => {
    switch (status) {
      case "not_applicable":
        return (
          <span className="text-muted-foreground text-sm">N/A</span>
        )
      case "processing":
        return (
          <Badge className="gap-1 bg-blue-100 text-blue-700 hover:bg-blue-100">
            <Clock className="h-3 w-3" />
            Processing
          </Badge>
        )
      case "shipped":
        return (
          <div className="flex flex-col gap-1">
            <Badge className="gap-1 bg-indigo-100 text-indigo-700 hover:bg-indigo-100">
              <Package className="h-3 w-3" />
              Shipped
            </Badge>
            {trackingNumber && (
              <span className="text-xs text-muted-foreground truncate max-w-[120px]" title={trackingNumber}>
                {trackingNumber}
              </span>
            )}
          </div>
        )
      case "in_transit":
        return (
          <div className="flex flex-col gap-1">
            <Badge className="gap-1 bg-amber-100 text-amber-700 hover:bg-amber-100">
              <Truck className="h-3 w-3" />
              In Transit
            </Badge>
            {trackingNumber && (
              <span className="text-xs text-muted-foreground truncate max-w-[120px]" title={trackingNumber}>
                {trackingNumber}
              </span>
            )}
          </div>
        )
      case "delivered":
        return (
          <div className="flex flex-col gap-1">
            <Badge className="gap-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
              <PackageCheck className="h-3 w-3" />
              Delivered
            </Badge>
            {trackingNumber && (
              <span className="text-xs text-muted-foreground truncate max-w-[120px]" title={trackingNumber}>
                {trackingNumber}
              </span>
            )}
          </div>
        )
      case "failed":
        return (
          <Badge className="gap-1 bg-red-100 text-red-700 hover:bg-red-100">
            <AlertCircle className="h-3 w-3" />
            Failed
          </Badge>
        )
      default:
        return null
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Resume ID</TableHead>
                <TableHead>User ID</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Resume Type</TableHead>
                <TableHead>Payment Status</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead className="text-center">PDF Generated</TableHead>
                <TableHead className="text-center">Print & Ship</TableHead>
                <TableHead>Shipment Status</TableHead>
                <TableHead>Resume Result PDF</TableHead>
                <TableHead>Created Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((activity) => (
                <TableRow key={activity.resumeId}>
                  <TableCell className="font-medium">
                    {activity.resumeId}
                  </TableCell>
                  <TableCell>{activity.userId}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{activity.templateUsed}</Badge>
                  </TableCell>
                  <TableCell>{getResumeTypeBadge(activity.resumeType)}</TableCell>
                  <TableCell>{getStatusBadge(activity.paymentStatus)}</TableCell>
                  <TableCell>{activity.paymentMethod}</TableCell>
                  <TableCell>{getBooleanIcon(activity.pdfGenerated)}</TableCell>
                  <TableCell>{getBooleanIcon(activity.printAndShip)}</TableCell>
                  <TableCell>
                    {getShipmentStatusBadge(activity.shipmentStatus, activity.trackingNumber)}
                  </TableCell>
                  <TableCell>
                    {activity.resumeResultPdf ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 text-primary hover:text-primary/80"
                        asChild
                      >
                        <a
                          href={activity.resumeResultPdf}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <FileText className="h-4 w-4" />
                          View PDF
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    ) : (
                      <span className="text-muted-foreground">Not generated</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(activity.createdDate).toLocaleDateString(
                      "en-US",
                      {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      }
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
