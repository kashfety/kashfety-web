"use client"

import { useEffect } from "react"
import MainLayout from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  ClipboardList,
  Search,
  Filter,
  MoreHorizontal,
  Calendar,
  User,
  Clock,
  LogIn,
  Plus,
  Edit,
  Trash2,
} from "lucide-react"
import LogActivityChart from "@/components/dashboard/log-activity-chart"
import LogTypesChart from "@/components/dashboard/log-types-chart"

// Sample data for audit logs
const logs = [
  {
    id: "log-001",
    action: "login",
    user: "admin@eduhub.com",
    resource: "Admin Portal",
    timestamp: "2023-05-14T14:32:15Z",
    ip: "192.168.1.1",
    details: "Successful login from Chrome on Windows",
  },
  {
    id: "log-002",
    action: "create",
    user: "john.smith@eduhub.com",
    resource: "Center",
    timestamp: "2023-05-14T12:15:30Z",
    ip: "192.168.1.2",
    details: "Created new center 'Westside Education Hub'",
  },
  {
    id: "log-003",
    action: "update",
    user: "sarah.johnson@eduhub.com",
    resource: "Course",
    timestamp: "2023-05-14T10:45:22Z",
    ip: "192.168.1.3",
    details: "Updated course 'Advanced Mathematics'",
  },
  {
    id: "log-004",
    action: "delete",
    user: "admin@eduhub.com",
    resource: "User",
    timestamp: "2023-05-13T16:20:45Z",
    ip: "192.168.1.1",
    details: "Deleted user 'test.user@eduhub.com'",
  },
  {
    id: "log-005",
    action: "login",
    user: "michael.brown@eduhub.com",
    resource: "Admin Portal",
    timestamp: "2023-05-13T09:10:18Z",
    ip: "192.168.1.4",
    details: "Failed login attempt from Firefox on MacOS",
  },
]

// Helper function to format date
function formatDate(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleString()
}

// Helper function to get action badge variant
function getActionBadgeVariant(action: string) {
  switch (action) {
    case "login":
      return "default"
    case "create":
      return "success"
    case "update":
      return "warning"
    case "delete":
      return "destructive"
    default:
      return "outline"
  }
}

// Helper function to get action icon with improved colors
function getActionIcon(action: string) {
  switch (action) {
    case "login":
      return <LogIn className="h-4 w-4 text-gray-700 dark:text-gray-300" />
    case "create":
      return <Plus className="h-4 w-4 text-gray-700 dark:text-gray-300" />
    case "update":
      return <Edit className="h-4 w-4 text-gray-700 dark:text-gray-300" />
    case "delete":
      return <Trash2 className="h-4 w-4 text-gray-700 dark:text-gray-300" />
    default:
      return <ClipboardList className="h-4 w-4 text-gray-700 dark:text-gray-300" />
  }
}

export default function AuditLogsPage() {
  // Set up intersection observer for scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-slide-up")
            observer.unobserve(entry.target)
          }
        })
      },
      {
        root: null,
        rootMargin: "0px",
        threshold: 0.1,
      },
    )

    // Get all elements with animation classes
    const animatedElements = document.querySelectorAll(".scroll-animation")
    animatedElements.forEach((el) => observer.observe(el))

    return () => {
      animatedElements.forEach((el) => observer.unobserve(el))
    }
  }, [])

  return (
    <MainLayout breadcrumbs={[{ label: "Audit Logs" }]}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 scroll-animation">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Audit Logs</h1>
          <Button variant="outline">
            <Calendar className="h-4 w-4 mr-2" />
            Export Logs
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="scroll-animation animation-delay-100">
            <LogActivityChart />
          </div>
          <div className="scroll-animation animation-delay-200">
            <LogTypesChart />
          </div>
        </div>

        <Card className="scroll-animation animation-delay-300 bg-white dark:bg-[#0F0F12] border border-white dark:border-[#1F1F23]">
          <CardHeader className="pb-3">
            <CardTitle>All Logs</CardTitle>
            <CardDescription>View and search system audit logs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
                <Input type="search" placeholder="Search logs..." className="pl-9 w-full" />
              </div>
              <Button variant="outline" size="icon" className="h-10 w-10">
                <Filter className="h-4 w-4" />
              </Button>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log, index) => (
                    <TableRow
                      key={log.id}
                      className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors scroll-animation animation-delay-${(index + 4) * 100}`}
                      onClick={() => (window.location.href = `/audit-logs/${log.id}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getActionIcon(log.action)}
                          <Badge variant={getActionBadgeVariant(log.action) as any}>{log.action}</Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <User className="h-3.5 w-3.5 mr-1.5 text-gray-500 dark:text-gray-400" />
                          <span className="text-sm">{log.user}</span>
                        </div>
                      </TableCell>
                      <TableCell>{log.resource}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Clock className="h-3.5 w-3.5 mr-1.5 text-gray-500 dark:text-gray-400" />
                          <span className="text-sm">{formatDate(log.timestamp)}</span>
                        </div>
                      </TableCell>
                      <TableCell>{log.ip}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation()
                            window.location.href = `/audit-logs/${log.id}`
                          }}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">View details</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
