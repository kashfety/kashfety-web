"use client"

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
    History,
    Search,
    Filter,
    Eye,
    Calendar,
    Clock,
    User,
    Activity,
    AlertCircle,
    CheckCircle,
    XCircle,
    Info,
    Shield,
    Database,
    FileText,
    RefreshCw,
    Download,
    Trash2,
    UserCheck,
    Settings,
    Building2,
    Crown
} from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { DateRange } from 'react-day-picker';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface AdminActivityLog {
    id: string;
    adminId: string;
    adminName: string;
    adminRole: 'admin' | 'super_admin';
    actionType: string;
    targetType: string;
    targetId: string | null;
    actionDetails: {
        method?: string;
        path?: string;
        query?: Record<string, any>;
        body?: string[];
        oldValues?: Record<string, any>;
        newValues?: Record<string, any>;
        message?: string;
    };
    ipAddress: string | null;
    userAgent: string | null;
    sessionId: string | null;
    createdAt: string;
}

interface ActivityStats {
    totalActions: number;
    actionsByType: Record<string, number>;
    actionsByAdmin: Record<string, number>;
    actionsToday: number;
    actionsThisWeek: number;
    topAdmins: Array<{
        adminId: string;
        adminName: string;
        actionCount: number;
    }>;
    recentActions: number;
}

const getActionIcon = (actionType: string) => {
    switch (actionType) {
        case 'user_created':
        case 'user_updated':
        case 'user_deleted':
            return User;
        case 'admin_created':
        case 'admin_updated':
        case 'admin_deleted':
        case 'admin_locked':
        case 'admin_unlocked':
            return Shield;
        case 'center_created':
        case 'center_updated':
        case 'center_deleted':
            return Building2;
        case 'doctor_approved':
        case 'doctor_rejected':
            return UserCheck;
        case 'system_settings_updated':
            return Settings;
        case 'login':
        case 'logout':
            return Activity;
        default:
            return FileText;
    }
};

const getActionTypeColor = (actionType: string) => {
    if (actionType.includes('created') || actionType.includes('approved')) {
        return 'bg-green-100 text-green-800';
    }
    if (actionType.includes('deleted') || actionType.includes('rejected') || actionType.includes('locked')) {
        return 'bg-red-100 text-red-800';
    }
    if (actionType.includes('updated') || actionType.includes('unlocked')) {
        return 'bg-blue-100 text-blue-800';
    }
    return 'bg-gray-100 text-gray-800';
};

const getActionDescription = (activity: AdminActivityLog) => {
    const { actionType, targetType, actionDetails } = activity;
    const target = targetType ? targetType.replace('_', ' ') : 'item';

    switch (actionType) {
        case 'user_created':
            return `Created a new ${target}`;
        case 'user_updated':
            return `Updated ${target} information`;
        case 'user_deleted':
            return `Deleted a ${target}`;
        case 'admin_created':
            return `Created a new admin account`;
        case 'admin_updated':
            return `Updated admin account`;
        case 'admin_locked':
            return `Locked admin account`;
        case 'admin_unlocked':
            return `Unlocked admin account`;
        case 'center_created':
            return `Created a new medical center`;
        case 'center_updated':
            return `Updated medical center`;
        case 'doctor_approved':
            return `Approved doctor registration`;
        case 'doctor_rejected':
            return `Rejected doctor registration`;
        case 'certificate_approved':
            return `Approved doctor certificate`;
        case 'certificate_rejected':
            return `Rejected doctor certificate`;
        case 'system_settings_updated':
            return `Updated system settings`;
        case 'login':
            return `Logged into the system`;
        case 'logout':
            return `Logged out of the system`;
        default:
            return `Performed ${actionType.replace('_', ' ')} on ${target}`;
    }
};

export default function AdminActivity() {
    const { toast } = useToast();
    const [activities, setActivities] = useState<AdminActivityLog[]>([]);
    const [stats, setStats] = useState<ActivityStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [actionTypeFilter, setActionTypeFilter] = useState('all');
    const [adminFilter, setAdminFilter] = useState('all');
    const [dateRange, setDateRange] = useState<DateRange | undefined>();
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedActivity, setSelectedActivity] = useState<AdminActivityLog | null>(null);
    const [showActivityDetails, setShowActivityDetails] = useState(false);

    useEffect(() => {
        fetchActivities();
        fetchActivityStats();
    }, [currentPage, searchTerm, actionTypeFilter, adminFilter, dateRange]);

    const fetchActivities = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page: currentPage.toString(),
                limit: '50',
                ...(searchTerm && { search: searchTerm }),
                ...(actionTypeFilter && actionTypeFilter !== 'all' && { action_type: actionTypeFilter }),
                ...(adminFilter && adminFilter !== 'all' && { admin_id: adminFilter }),
                ...(dateRange?.from && { start_date: dateRange.from.toISOString() }),
                ...(dateRange?.to && { end_date: dateRange.to.toISOString() })
            });

            // Use the Next.js API route
            const response = await fetch(`/api/super-admin-activity?${params}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch admin activities');
            }

            const data = await response.json();
            
            // The API returns { success: true, data: { activities: [...], total: ... } }
            if (data.success && data.data && data.data.activities) {
                setActivities(data.data.activities);
                setTotalPages(Math.ceil(data.data.total / 50) || 1);
            } else {
                throw new Error('Invalid response format');
            }
        } catch (error) {
            setActivities([]);
            setTotalPages(1);

            toast({
                title: "Error Loading Data",
                description: "Failed to load admin activities. Please try again.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const fetchActivityStats = async () => {
        try {
            // Use the Next.js API route
            const response = await fetch('/api/super-admin-activity-stats', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch activity stats');
            }

            const data = await response.json();
            
            // The API returns { success: true, data: { totalActions, actionsByType, actionsByAdmin, ... } }
            if (data.success && data.data) {
                const statsData = data.data;
                const transformedStats = {
                    totalActions: statsData.totalActions || 0,
                    actionsByType: statsData.actionsByType || {},
                    actionsByAdmin: statsData.actionsByAdmin || {},
                    actionsToday: statsData.actionsToday || 0,
                    actionsThisWeek: statsData.actionsThisWeek || 0,
                    recentActions: statsData.recentActions || 0, // Change to number since that's what the type expects
                    topAdmins: Object.entries(statsData.actionsByAdmin || {}).map(([adminId, count]) => ({
                        adminId,
                        adminName: adminId, // Will be resolved from admin data later if needed
                        actionCount: count as number
                    })).slice(0, 5)
                };
                setStats(transformedStats);
            } else {
                throw new Error('Invalid response format');
            }
        } catch (error) {
            setStats(null);
            
            toast({
                title: "Error Loading Stats",
                description: "Failed to load activity statistics. Please try again.",
                variant: "destructive"
            });
        }
    };

    const exportActivities = async () => {
        try {
            const params = new URLSearchParams({
                ...(searchTerm && { search: searchTerm }),
                ...(actionTypeFilter && actionTypeFilter !== 'all' && { action_type: actionTypeFilter }),
                ...(adminFilter && adminFilter !== 'all' && { admin_id: adminFilter }),
                ...(dateRange?.from && { start_date: dateRange.from.toISOString() }),
                ...(dateRange?.to && { end_date: dateRange.to.toISOString() }),
                format: 'csv'
            });

            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
            const baseUrl = apiUrl.endsWith('/api') ? apiUrl : `${apiUrl.replace(/\/$/, '')}/api`
            const response = await fetch(`${baseUrl}/super-admin/activity/export?${params}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to export activities');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `admin-activity-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast({
                title: "Success",
                description: "Admin activity exported successfully",
            });
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to export admin activity",
                variant: "destructive"
            });
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString();
    };

    const formatTimeAgo = (dateString: string) => {
        const now = new Date();
        const date = new Date(dateString);
        const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

        if (diffInMinutes < 1) return 'Just now';
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
        if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
        return `${Math.floor(diffInMinutes / 1440)}d ago`;
    };

    if (loading) {
        return (
            <div className="space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Loading admin activity...</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="animate-pulse space-y-4">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="h-12 bg-gray-200 rounded"></div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold flex items-center">
                        <History className="h-6 w-6 mr-2 text-purple-600" />
                        Admin Activity
                    </h2>
                    <p className="text-muted-foreground">Monitor and audit all administrative actions</p>
                </div>
                <div className="flex space-x-2">
                    <Button onClick={fetchActivities}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                    <Button onClick={exportActivities} variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Export
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Actions</p>
                                    <p className="text-2xl font-bold">{stats.totalActions.toLocaleString()}</p>
                                </div>
                                <Activity className="h-8 w-8 text-blue-500" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Today</p>
                                    <p className="text-2xl font-bold">{stats.actionsToday}</p>
                                </div>
                                <Calendar className="h-8 w-8 text-green-500" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">This Week</p>
                                    <p className="text-2xl font-bold">{stats.actionsThisWeek}</p>
                                </div>
                                <Clock className="h-8 w-8 text-orange-500" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Active Admins</p>
                                    <p className="text-2xl font-bold">{stats.topAdmins.length}</p>
                                </div>
                                <Shield className="h-8 w-8 text-purple-500" />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                        <Filter className="h-5 w-5" />
                        <span>Filters</span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search activities..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Select value={actionTypeFilter} onValueChange={setActionTypeFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="Filter by action" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All actions</SelectItem>
                                <SelectItem value="user_created">User Created</SelectItem>
                                <SelectItem value="user_updated">User Updated</SelectItem>
                                <SelectItem value="admin_created">Admin Created</SelectItem>
                                <SelectItem value="doctor_approved">Doctor Approved</SelectItem>
                                <SelectItem value="center_created">Center Created</SelectItem>
                                <SelectItem value="login">Login</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={adminFilter} onValueChange={setAdminFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="Filter by admin" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All admins</SelectItem>
                                {stats?.topAdmins.map((admin) => (
                                    <SelectItem key={admin.adminId} value={admin.adminId}>
                                        {admin.adminName}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="justify-start text-left font-normal">
                                    <Calendar className="mr-2 h-4 w-4" />
                                    {dateRange?.from ? (
                                        dateRange.to ? (
                                            <>
                                                {dateRange.from.toLocaleDateString()} -{" "}
                                                {dateRange.to.toLocaleDateString()}
                                            </>
                                        ) : (
                                            dateRange.from.toLocaleDateString()
                                        )
                                    ) : (
                                        <span>Pick a date range</span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <CalendarComponent
                                    initialFocus
                                    mode="range"
                                    defaultMonth={dateRange?.from}
                                    selected={dateRange}
                                    onSelect={setDateRange}
                                    numberOfMonths={2}
                                />
                            </PopoverContent>
                        </Popover>
                        <Button variant="outline" onClick={() => {
                            setSearchTerm('');
                            setActionTypeFilter('all');
                            setAdminFilter('all');
                            setDateRange(undefined);
                        }}>
                            Clear Filters
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Activities Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Recent Activities ({activities.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Admin</TableHead>
                                <TableHead>Action</TableHead>
                                <TableHead>Target</TableHead>
                                <TableHead>Time</TableHead>
                                <TableHead>IP Address</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {activities.map((activity) => {
                                const ActionIcon = getActionIcon(activity.actionType);
                                return (
                                    <TableRow key={activity.id}>
                                        <TableCell>
                                            <div className="flex items-center space-x-2">
                                                {activity.adminRole === 'super_admin' && (
                                                    <Crown className="h-4 w-4 text-yellow-500" />
                                                )}
                                                <div>
                                                    <div className="font-medium">{activity.adminName}</div>
                                                    <div className="text-sm text-muted-foreground">
                                                        {activity.adminRole === 'super_admin' ? 'Super Admin' : 'Admin'}
                                                    </div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center space-x-2">
                                                <ActionIcon className="h-4 w-4" />
                                                <div>
                                                    <Badge className={getActionTypeColor(activity.actionType)}>
                                                        {activity.actionType.replace('_', ' ')}
                                                    </Badge>
                                                    <div className="text-sm text-muted-foreground mt-1">
                                                        {getActionDescription(activity)}
                                                    </div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm">
                                                <div className="font-medium capitalize">
                                                    {activity.targetType?.replace('_', ' ') || 'N/A'}
                                                </div>
                                                {activity.targetId && (
                                                    <div className="text-muted-foreground">
                                                        ID: {activity.targetId}
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm">
                                                <div className="font-medium">{formatTimeAgo(activity.createdAt)}</div>
                                                <div className="text-muted-foreground">
                                                    {formatDate(activity.createdAt)}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm text-muted-foreground">
                                                {activity.ipAddress || 'Unknown'}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setSelectedActivity(activity);
                                                    setShowActivityDetails(true);
                                                }}
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4">
                            <div className="text-sm text-muted-foreground">
                                Page {currentPage} of {totalPages}
                            </div>
                            <div className="flex space-x-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                    disabled={currentPage === 1}
                                >
                                    Previous
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                    disabled={currentPage === totalPages}
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Activity Details Dialog */}
            <Dialog open={showActivityDetails} onOpenChange={setShowActivityDetails}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Activity Details</DialogTitle>
                    </DialogHeader>
                    {selectedActivity && (
                        <div className="space-y-6">
                            {/* Basic Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <h3 className="font-semibold mb-2">Basic Information</h3>
                                    <div className="space-y-2 text-sm">
                                        <div><strong>Admin:</strong> {selectedActivity.adminName}</div>
                                        <div><strong>Role:</strong>
                                            <Badge className="ml-2" variant={selectedActivity.adminRole === 'super_admin' ? 'default' : 'secondary'}>
                                                {selectedActivity.adminRole === 'super_admin' ? 'Super Admin' : 'Admin'}
                                            </Badge>
                                        </div>
                                        <div><strong>Action:</strong>
                                            <Badge className={`ml-2 ${getActionTypeColor(selectedActivity.actionType)}`}>
                                                {selectedActivity.actionType.replace('_', ' ')}
                                            </Badge>
                                        </div>
                                        <div><strong>Time:</strong> {formatDate(selectedActivity.createdAt)}</div>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="font-semibold mb-2">Target Information</h3>
                                    <div className="space-y-2 text-sm">
                                        <div><strong>Type:</strong> {selectedActivity.targetType?.replace('_', ' ') || 'N/A'}</div>
                                        <div><strong>ID:</strong> {selectedActivity.targetId || 'N/A'}</div>
                                        <div><strong>Description:</strong> {getActionDescription(selectedActivity)}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Technical Details */}
                            <div>
                                <h3 className="font-semibold mb-2">Technical Details</h3>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div><strong>IP Address:</strong> {selectedActivity.ipAddress || 'Unknown'}</div>
                                    <div><strong>Session ID:</strong> {selectedActivity.sessionId || 'N/A'}</div>
                                    <div className="col-span-2">
                                        <strong>User Agent:</strong>
                                        <div className="text-muted-foreground mt-1 break-all">
                                            {selectedActivity.userAgent || 'Unknown'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Action Details */}
                            <div>
                                <h3 className="font-semibold mb-2">Action Details</h3>
                                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                                    <pre className="text-sm overflow-auto">
                                        {JSON.stringify(selectedActivity.actionDetails, null, 2)}
                                    </pre>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
