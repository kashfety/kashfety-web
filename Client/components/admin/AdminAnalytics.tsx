"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts'
import { TrendingUp, Users, Calendar, Activity } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useLocale } from '@/components/providers/locale-provider'

interface AnalyticsData {
    appointments: {
        daily: Array<{ date: string; count: number }>
        statusDistribution: Array<{ status: string; count: number; color: string }>
    }
    users: {
        growth: Array<{ month: string; doctors: number; patients: number }>
        totalByRole: Array<{ role: string; count: number }>
    }
    revenue: {
        monthly: Array<{ month: string; amount: number }>
    }
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

export default function AdminAnalytics() {
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
    const [loading, setLoading] = useState(true)
    const { toast } = useToast()
    const { t, isRTL } = useLocale()

    useEffect(() => {
        fetchAnalytics()
    }, [])

    const fetchAnalytics = async () => {
        try {
            setLoading(true)

            // Fetch real analytics data from API
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
            const baseUrl = apiUrl.endsWith('/api') ? apiUrl : `${apiUrl.replace(/\/$/, '')}/api`

            const response = await fetch(`${baseUrl}/auth/admin/analytics`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch analytics data');
            }

            const result = await response.json();
            const data = result.data;

            // Transform the API response to match our AnalyticsData interface
            const analyticsData: AnalyticsData = {
                appointments: {
                    daily: data.appointments.daily,
                    statusDistribution: data.appointments.statusDistribution
                },
                users: {
                    growth: data.users.growth,
                    totalByRole: data.users.totalByRole
                },
                revenue: {
                    monthly: data.revenue.monthly
                }
            };

            setAnalytics(analyticsData);
        } catch (error) {
            console.error('Error fetching analytics:', error)
            toast({
                title: t('admin_error') || "Error",
                description: t('admin_failed_to_load_analytics') || "Failed to load analytics data",
                variant: "destructive"
            })
        } finally {
            setLoading(false)
        }
    }

    // Calculate growth rate from monthly data
    const calculateMonthlyGrowthRate = (monthlyData: Array<{ month: string;[key: string]: any }>, key: string) => {
        if (!monthlyData || monthlyData.length < 2) return 0;
        const current = monthlyData[monthlyData.length - 1]?.[key] || 0;
        const previous = monthlyData[monthlyData.length - 2]?.[key] || 0;
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
    };

    // Calculate growth rate from daily data
    const calculateDailyGrowthRate = (dailyData: Array<{ date: string; count: number }>) => {
        if (!dailyData || dailyData.length < 2) return 0;
        const current = dailyData[dailyData.length - 1]?.count || 0;
        const previous = dailyData[dailyData.length - 2]?.count || 0;
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
    };

    // Calculate total users growth
    const usersGrowthRate = analytics?.users.growth ?
        (calculateMonthlyGrowthRate(analytics.users.growth, 'doctors') + calculateMonthlyGrowthRate(analytics.users.growth, 'patients')) / 2 : 12;

    // Calculate appointments growth (using daily data)
    const appointmentsGrowthRate = analytics?.appointments.daily ?
        calculateDailyGrowthRate(analytics.appointments.daily) : 8;

    // Calculate revenue growth
    const revenueGrowthRate = analytics?.revenue.monthly ?
        calculateMonthlyGrowthRate(analytics.revenue.monthly, 'amount') : 15;

    if (loading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </CardContent>
            </Card>
        )
    }

    if (!analytics) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center h-64">
                    <p className="text-muted-foreground">{t('admin_failed_to_load_analytics') || 'Failed to load analytics data'}</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className={`flex flex-row items-center ${isRTL ? 'justify-between space-x-reverse' : 'justify-between space-y-0'} pb-2`}>
                        <CardTitle className="text-sm font-medium">{t('admin_total_users') || 'Total Users'}</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {analytics.users.totalByRole.reduce((sum, item) => sum + item.count, 0)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {usersGrowthRate >= 0 ? '+' : ''}{Math.round(usersGrowthRate)}% {t('admin_from_last_month') || 'from last month'}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className={`flex flex-row items-center ${isRTL ? 'justify-between space-x-reverse' : 'justify-between space-y-0'} pb-2`}>
                        <CardTitle className="text-sm font-medium">{t('admin_total_appointments') || 'Total Appointments'}</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {analytics.appointments.statusDistribution.reduce((sum, item) => sum + item.count, 0)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {appointmentsGrowthRate >= 0 ? '+' : ''}{Math.round(appointmentsGrowthRate)}% {t('admin_from_last_week') || 'from last week'}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className={`flex flex-row items-center ${isRTL ? 'justify-between space-x-reverse' : 'justify-between space-y-0'} pb-2`}>
                        <CardTitle className="text-sm font-medium">{t('admin_monthly_revenue') || 'Monthly Revenue'}</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            ${analytics.revenue.monthly[analytics.revenue.monthly.length - 1]?.amount.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {revenueGrowthRate >= 0 ? '+' : ''}{Math.round(revenueGrowthRate)}% {t('admin_from_last_month') || 'from last month'}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className={`flex flex-row items-center ${isRTL ? 'justify-between space-x-reverse' : 'justify-between space-y-0'} pb-2`}>
                        <CardTitle className="text-sm font-medium">{t('admin_system_status') || 'System Status'}</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            <Badge variant="default" className="bg-green-500">{t('admin_healthy') || 'Healthy'}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {t('admin_all_systems_operational') || 'All systems operational'}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Daily Appointments Chart */}
                <Card>
                    <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
                        <CardTitle>{t('admin_daily_appointments') || 'Daily Appointments'}</CardTitle>
                        <CardDescription>{t('admin_appointment_bookings_last_7_days') || 'Appointment bookings over the last 7 days'}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={analytics.appointments.daily}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" tickFormatter={(value) => new Date(value).getDate().toString()} />
                                <YAxis />
                                <Tooltip
                                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                                    formatter={(value: number) => [value, 'Appointments']}
                                />
                                <Bar dataKey="count" fill="#0088FE" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* User Growth Chart */}
                <Card>
                    <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
                        <CardTitle>{t('admin_user_growth') || 'User Growth'}</CardTitle>
                        <CardDescription>{t('admin_monthly_user_registration_trends') || 'Monthly user registration trends'}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={analytics.users.growth}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="doctors" fill="#00C49F" name="Doctors" />
                                <Bar dataKey="patients" fill="#0088FE" name="Patients" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Appointment Status Distribution */}
                <Card>
                    <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
                        <CardTitle>{t('admin_appointment_status') || 'Appointment Status'}</CardTitle>
                        <CardDescription>{t('admin_distribution_of_appointment_statuses') || 'Distribution of appointment statuses'}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={analytics.appointments.statusDistribution}
                                    dataKey="count"
                                    nameKey="status"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={100}
                                    label={({ status, count }) => `${status}: ${count}`}
                                >
                                    {analytics.appointments.statusDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Revenue Chart */}
                <Card>
                    <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
                        <CardTitle>{t('admin_monthly_revenue') || 'Monthly Revenue'}</CardTitle>
                        <CardDescription>{t('admin_revenue_trends_last_6_months') || 'Revenue trends over the last 6 months'}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={analytics.revenue.monthly}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis tickFormatter={(value) => `$${value / 1000}k`} />
                                <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']} />
                                <Bar dataKey="amount" fill="#FFBB28" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
