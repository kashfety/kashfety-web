import MainLayout from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ClipboardList,
  ArrowLeft,
  User,
  Clock,
  Globe,
  Server,
  Shield,
  LogIn,
  Plus,
  Edit,
  Trash2,
  Download,
  Mail,
  Building,
  Hash,
  FileType,
  ChevronRight,
} from "lucide-react"
import Link from "next/link"

export default function AuditLogDetailsPage({ params }: { params: { id: string } }) {
  // In a real app, you would fetch the log data based on the ID
  const log = {
    id: params.id,
    action: "create",
    user: {
      id: "user-123",
      email: "john.smith@eduhub.com",
      name: "John Smith",
      role: "Center Administrator",
    },
    resource: {
      type: "Center",
      id: "center-456",
      name: "Westside Education Hub",
    },
    timestamp: "2023-05-14T12:15:30Z",
    ip: "192.168.1.2",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    details: "Created new center 'Westside Education Hub' with 18 classes and capacity for 210 students",
    changes: {
      before: null,
      after: {
        name: "Westside Education Hub",
        location: "456 West Ave, Los Angeles, CA",
        status: "active",
        classes: 18,
        capacity: 210,
      },
    },
    relatedLogs: ["log-007", "log-008", "log-009"],
  }

  // Helper function to format date
  function formatDate(dateString: string) {
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  // Helper function to get action icon with improved colors
  function getActionIcon(action: string) {
    switch (action) {
      case "login":
        return <LogIn className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
      case "create":
        return <Plus className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
      case "update":
        return <Edit className="h-5 w-5 text-amber-600 dark:text-amber-400" />
      case "delete":
        return <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
      default:
        return <ClipboardList className="h-5 w-5 text-gray-600 dark:text-gray-400" />
    }
  }

  // Helper function to get action badge variant with improved colors
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

  return (
    <MainLayout breadcrumbs={[{ label: "Audit Logs", href: "/audit-logs" }, { label: `Log ${params.id}` }]}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" asChild>
              <Link href="/audit-logs">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Audit Log Details</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">ID: {log.id}</p>
            </div>
          </div>

          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Log
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-3">
                {getActionIcon(log.action)}
                <CardTitle>
                  <Badge variant={getActionBadgeVariant(log.action) as any} className="text-sm">
                    {log.action.toUpperCase()}
                  </Badge>
                  <span className="ml-2">{log.resource.type}</span>
                </CardTitle>
              </div>
              <CardDescription>{log.details}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium mb-2">Event Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                      <span className="text-gray-500 dark:text-gray-400">Timestamp:</span>
                      <span>{formatDate(log.timestamp)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                      <span className="text-gray-500 dark:text-gray-400">IP Address:</span>
                      <span>{log.ip}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Server className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                      <span className="text-gray-500 dark:text-gray-400">Resource:</span>
                      <span>
                        {log.resource.type} ({log.resource.id})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                      <span className="text-gray-500 dark:text-gray-400">Action:</span>
                      <span>{log.action}</span>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="text-sm font-medium mb-2">User Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                      <span className="text-gray-500 dark:text-gray-400">User:</span>
                      <span>{log.user.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                      <span className="text-gray-500 dark:text-gray-400">Email:</span>
                      <span>{log.user.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                      <span className="text-gray-500 dark:text-gray-400">Role:</span>
                      <span>{log.user.role}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                      <span className="text-gray-500 dark:text-gray-400">User Agent:</span>
                      <span className="truncate">{log.userAgent}</span>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="text-sm font-medium mb-2">Changes</h3>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 overflow-auto">
                    <pre className="text-xs">{JSON.stringify(log.changes, null, 2)}</pre>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Related Resource</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Building className="h-4 w-4 mr-2 text-blue-600 dark:text-blue-400" />
                      <span className="text-sm">Name</span>
                    </div>
                    <span className="font-medium">{log.resource.name}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Hash className="h-4 w-4 mr-2 text-gray-600 dark:text-gray-400" />
                      <span className="text-sm">ID</span>
                    </div>
                    <span className="font-medium">{log.resource.id}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <FileType className="h-4 w-4 mr-2 text-gray-600 dark:text-gray-400" />
                      <span className="text-sm">Type</span>
                    </div>
                    <span className="font-medium">{log.resource.type}</span>
                  </div>

                  <Button variant="outline" size="sm" className="w-full" asChild>
                    <Link href={`/centers/${log.resource.id}`}>View Resource</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Related Logs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {log.relatedLogs.map((relatedLog) => (
                    <Link
                      key={relatedLog}
                      href={`/audit-logs/${relatedLog}`}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      <div className="flex items-center">
                        <ClipboardList className="h-4 w-4 mr-2 text-gray-600 dark:text-gray-400" />
                        <span className="text-sm">{relatedLog}</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
