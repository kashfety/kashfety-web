"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/components/providers/locale-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Crown,
    Users,
    UserCheck,
    Building2,
    Calendar,
    DollarSign,
    TrendingUp,
    Activity,
    AlertCircle,
    CheckCircle,
    Clock,
    RefreshCw,
    Shield,
    Database,
    Zap,
    Server,
    Eye,
    History,
    Settings
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';

interface SuperAdminStats {
    overview: {
        totalUsers: number;
        totalPatients: number;
        totalDoctors: number;
        totalAdmins: number;
        totalSuperAdmins: number;
        totalCenters: number;
        totalAppointments: number;
        recentAppointments: number;
        totalRevenue: number;
        averageRevenue: number;
    };
    adminActivity: {
        totalActions: number;
        actionsByType: Record<string, number>;
        activeAdmins: number;
        recentLogins: number;
    };
    systemHealth: {
        uptime: number;
        performance: number;
        errorRate: number;
        activeConnections: number;
    };
    period: {
        days: number;
        startDate?: string;
        endDate?: string;
    };
}

interface SuperAdminOverviewProps {
    stats: SuperAdminStats | null;
    loading: boolean;
    onRefresh: () => void;
    setActiveTab?: (tab: string) => void;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

export default function SuperAdminOverview({ stats, loading, onRefresh, setActiveTab }: SuperAdminOverviewProps) {
    const [selectedPeriod, setSelectedPeriod] = useState('30');
    const router = useRouter();
    const { t, locale } = useLocale();

    const formatCurrency = (amount: number) => {
        const localeCode = locale === 'ar' ? 'ar-SY' : 'en-US';
        return new Intl.NumberFormat(localeCode, {
            style: 'currency',
            currency: 'SYP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>{t("loading_super_admin")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="animate-pulse space-y-4">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="h-20 bg-gray-200 rounded"></div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>{t("no_data_available")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>{t("unable_to_load_stats")}</p>
                        <Button onClick={onRefresh} className="mt-4">
                            <RefreshCw className="h-4 w-4 mr-2" />
                            {t("retry")}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const { overview, adminActivity, systemHealth } = stats || {};

    // Add null checks for all properties
    if (!overview || !adminActivity || !systemHealth) {
        return (
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <Crown className="h-5 w-5 mr-2" />
                            {t("super_admin_overview_title")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>{t("loading_super_admin_stats")}</p>
                        <Button onClick={onRefresh} className="mt-4">
                            <RefreshCw className="h-4 w-4 mr-2" />
                            {t("refresh")}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Prepare chart data
    const userTypeData = [
        { name: t('patients') || 'Patients', value: overview.totalPatients || 0, color: '#3B82F6' },
        { name: t('doctors') || 'Doctors', value: overview.totalDoctors || 0, color: '#10B981' },
        { name: t('admins') || 'Admins', value: overview.totalAdmins || 0, color: '#F59E0B' },
        { name: t('super_admins') || 'Super Admins', value: overview.totalSuperAdmins || 0, color: '#EF4444' }
    ];

    const adminActivityData = Object.entries(adminActivity.actionsByType || {}).map(([action, count]) => ({
        action: action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        count: count as number
    }));

    const systemMetricsData = [
        { metric: t('uptime') || 'Uptime', value: systemHealth.uptime || 0, target: 99.9 },
        { metric: t('performance') || 'Performance', value: systemHealth.performance || 0, target: 95 },
        { metric: t('error_rate') || 'Error Rate', value: systemHealth.errorRate || 0, target: 1, inverted: true }
    ];

    const getHealthColor = (value: number, target: number, inverted = false) => {
        const threshold = inverted ? target * 2 : target * 0.9;
        if (inverted) {
            return value <= target ? 'text-green-600' : value <= threshold ? 'text-yellow-600' : 'text-red-600';
        } else {
            return value >= target ? 'text-green-600' : value >= threshold ? 'text-yellow-600' : 'text-red-600';
        }
    };

    const getHealthBadge = (value: number, target: number, inverted = false) => {
        const threshold = inverted ? target * 2 : target * 0.9;
        if (inverted) {
            return value <= target ? 'bg-green-100 text-green-800' : value <= threshold ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800';
        } else {
            return value >= target ? 'bg-green-100 text-green-800' : value >= threshold ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800';
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold flex items-center">
                        <Crown className="h-6 w-6 mr-2 text-yellow-500" />
                        {t("super_admin_overview_title")}
                    </h2>
                    <p className="text-muted-foreground">{t("comprehensive_system_overview")}</p>
                </div>
                <div className="flex items-center space-x-2">
                    <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                        <SelectTrigger className="w-32">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="7">Last 7 days</SelectItem>
                            <SelectItem value="30">Last 30 days</SelectItem>
                            <SelectItem value="90">Last 90 days</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button onClick={onRefresh}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        {t("refresh")}
                    </Button>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Users</p>
                                <p className="text-2xl font-bold">{overview.totalUsers.toLocaleString()}</p>
                                <p className="text-xs text-green-600">{t("all_system_users")}</p>
                            </div>
                            <Users className="h-8 w-8 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Admins</p>
                                <p className="text-2xl font-bold">{overview.totalAdmins + overview.totalSuperAdmins}</p>
                                <p className="text-xs text-blue-600">{overview.totalAdmins} + {overview.totalSuperAdmins} super</p>
                            </div>
                            <Shield className="h-8 w-8 text-purple-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Revenue</p>
                                <p className="text-2xl font-bold">{formatCurrency(overview.totalRevenue)}</p>
                                <p className="text-xs text-green-600">+{overview.averageRevenue}% avg</p>
                            </div>
                            <DollarSign className="h-8 w-8 text-green-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">System Health</p>
                                <p className="text-2xl font-bold">{systemHealth.uptime}%</p>
                                <p className="text-xs text-green-600">Uptime</p>
                            </div>
                            <Zap className="h-8 w-8 text-yellow-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* System Health Dashboard */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <Server className="h-5 w-5 mr-2" />
                            System Health Metrics
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {systemMetricsData.map((metric) => (
                                <div key={metric.metric} className="flex items-center justify-between">
                                    <span className="text-sm font-medium">{metric.metric}</span>
                                    <div className="flex items-center space-x-2">
                                        <span className={`text-sm font-bold ${getHealthColor(metric.value, metric.target, metric.inverted)}`}>
                                            {metric.value}%
                                        </span>
                                        <Badge className={getHealthBadge(metric.value, metric.target, metric.inverted)}>
                                            {metric.inverted ?
                                                (metric.value <= metric.target ? 'Good' : metric.value <= metric.target * 2 ? 'Warning' : 'Critical') :
                                                (metric.value >= metric.target ? 'Good' : metric.value >= metric.target * 0.9 ? 'Warning' : 'Critical')
                                            }
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                            <div className="border-t pt-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Active Connections</span>
                                    <span className="text-sm font-bold text-blue-600">{systemHealth.activeConnections}</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <Activity className="h-5 w-5 mr-2" />
                            Admin Activity Summary
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                    <div className="text-2xl font-bold text-blue-600">{adminActivity.totalActions}</div>
                                    <div className="text-sm text-muted-foreground">Total Actions</div>
                                </div>
                                <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                    <div className="text-2xl font-bold text-green-600">{adminActivity.activeAdmins}</div>
                                    <div className="text-sm text-muted-foreground">Active Admins</div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <h4 className="text-sm font-medium">Recent Activity</h4>
                                <div className="text-sm text-muted-foreground">
                                    {adminActivity.recentLogins} admin logins today
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>User Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={userTypeData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {userTypeData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Admin Actions by Type</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {adminActivityData.length === 0 || adminActivityData.every(item => item.count === 0) ? (
                            <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                                <Activity className="h-12 w-12 mb-4 opacity-50" />
                                <p className="text-sm">{t("no_activity_data")}</p>
                                <p className="text-xs mt-1">{t("activity_data_will_appear")}</p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={adminActivityData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis
                                        dataKey="action"
                                        angle={-45}
                                        textAnchor="end"
                                        height={80}
                                    />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="count" fill="#3B82F6" />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions */}
            <Card>
                <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Button
                            className="h-20 flex-col space-y-2"
                            variant="outline"
                            onClick={() => {
                                if (setActiveTab) {
                                    setActiveTab('admin-management');
                                } else {
                                    router.push('/super-admin-dashboard?tab=admin-management');
                                }
                            }}
                        >
                            <Shield className="h-6 w-6" />
                            <span>Manage Admins</span>
                        </Button>
                        <Button
                            className="h-20 flex-col space-y-2"
                            variant="outline"
                            onClick={() => {
                                if (setActiveTab) {
                                    setActiveTab('admin-activity');
                                } else {
                                    router.push('/super-admin-dashboard?tab=admin-activity');
                                }
                            }}
                        >
                            <History className="h-6 w-6" />
                            <span>View Activity</span>
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* System Alerts */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <AlertCircle className="h-5 w-5 mr-2 text-orange-500" />
                        System Alerts
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {systemHealth.errorRate > 1 && (
                            <div className="flex items-center space-x-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                <AlertCircle className="h-5 w-5 text-red-500" />
                                <div>
                                    <div className="text-sm font-medium">High Error Rate</div>
                                    <div className="text-xs text-muted-foreground">
                                        Current error rate ({systemHealth.errorRate}%) exceeds threshold
                                    </div>
                                </div>
                            </div>
                        )}
                        {systemHealth.performance < 90 && (
                            <div className="flex items-center space-x-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                                <AlertCircle className="h-5 w-5 text-yellow-500" />
                                <div>
                                    <div className="text-sm font-medium">Performance Warning</div>
                                    <div className="text-xs text-muted-foreground">
                                        System performance ({systemHealth.performance}%) is below optimal
                                    </div>
                                </div>
                            </div>
                        )}
                        {systemHealth.uptime >= 99.9 && systemHealth.performance >= 95 && systemHealth.errorRate <= 1 && (
                            <div className="flex items-center space-x-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                <CheckCircle className="h-5 w-5 text-green-500" />
                                <div>
                                    <div className="text-sm font-medium">All Systems Operational</div>
                                    <div className="text-xs text-muted-foreground">
                                        All system metrics are within normal parameters
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
