"use client"

import { useState, useMemo } from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Mail, Phone, ArrowUpDown, CheckCircle2, XCircle, Users } from "lucide-react"
import type { User } from "@/lib/mock-data"

type PurchaseFilter = "all" | "purchased" | "not_purchased"
type SortOrder = "none" | "purchased_first" | "not_purchased_first"

interface UsersTableProps {
  data: User[]
}

export function UsersTable({ data }: UsersTableProps) {
  const [purchaseFilter, setPurchaseFilter] = useState<PurchaseFilter>("all")
  const [sortOrder, setSortOrder] = useState<SortOrder>("none")

  const filteredAndSortedUsers = useMemo(() => {
    let result = [...data]

    // Apply filter
    if (purchaseFilter === "purchased") {
      result = result.filter((user) => user.hasPurchased)
    } else if (purchaseFilter === "not_purchased") {
      result = result.filter((user) => !user.hasPurchased)
    }

    // Apply sort
    if (sortOrder === "purchased_first") {
      result.sort((a, b) => {
        if (a.hasPurchased === b.hasPurchased) return 0
        return a.hasPurchased ? -1 : 1
      })
    } else if (sortOrder === "not_purchased_first") {
      result.sort((a, b) => {
        if (a.hasPurchased === b.hasPurchased) return 0
        return a.hasPurchased ? 1 : -1
      })
    }

    return result
  }, [data, purchaseFilter, sortOrder])

  const stats = useMemo(() => {
    const purchased = data.filter((u) => u.hasPurchased).length
    const notPurchased = data.length - purchased
    return { total: data.length, purchased, notPurchased }
  }, [data])

  const toggleSort = () => {
    if (sortOrder === "none") {
      setSortOrder("purchased_first")
    } else if (sortOrder === "purchased_first") {
      setSortOrder("not_purchased_first")
    } else {
      setSortOrder("none")
    }
  }

  const getPurchaseStatusBadge = (hasPurchased: boolean) => {
    return hasPurchased ? (
      <Badge className="gap-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
        <CheckCircle2 className="h-3 w-3" />
        Purchased
      </Badge>
    ) : (
      <Badge className="gap-1 bg-slate-100 text-slate-600 hover:bg-slate-100">
        <XCircle className="h-3 w-3" />
        Not Purchased
      </Badge>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Users className="h-5 w-5" />
              All Users
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {stats.total} total users - {stats.purchased} purchased, {stats.notPurchased} not purchased
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={purchaseFilter}
              onValueChange={(value) => setPurchaseFilter(value as PurchaseFilter)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="purchased">Purchased Only</SelectItem>
                <SelectItem value="not_purchased">Non-Purchasers Only</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleSort}
              className="gap-2"
            >
              <ArrowUpDown className="h-4 w-4" />
              {sortOrder === "none" && "Sort by Status"}
              {sortOrder === "purchased_first" && "Purchased First"}
              {sortOrder === "not_purchased_first" && "Non-Purchasers First"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Purchase Status</TableHead>
                <TableHead>Signup Date</TableHead>
                <TableHead>Last Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    <p className="text-muted-foreground">No users found matching the filter.</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.id}</TableCell>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>
                      <a
                        href={`mailto:${user.email}`}
                        className="flex items-center gap-1.5 text-primary hover:underline"
                      >
                        <Mail className="h-4 w-4" />
                        {user.email}
                      </a>
                    </TableCell>
                    <TableCell>
                      <a
                        href={`tel:${user.phone.replace(/\D/g, "")}`}
                        className="flex items-center gap-1.5 text-primary hover:underline"
                      >
                        <Phone className="h-4 w-4" />
                        {user.phone}
                      </a>
                    </TableCell>
                    <TableCell>{getPurchaseStatusBadge(user.hasPurchased)}</TableCell>
                    <TableCell>
                      {new Date(user.signupDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell>
                      {new Date(user.lastActive).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {filteredAndSortedUsers.length > 0 && (
          <div className="mt-4 text-sm text-muted-foreground">
            Showing {filteredAndSortedUsers.length} of {data.length} users
          </div>
        )}
      </CardContent>
    </Card>
  )
}
