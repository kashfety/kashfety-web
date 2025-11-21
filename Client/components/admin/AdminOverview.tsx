"use client"

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLocale } from '@/components/providers/locale-provider';
import {
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
    RefreshCw
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface DashboardStats {
    overview: {
        totalUsers: number;
        totalPatients: number;
        totalDoctors: number;
        totalCenters: number;
        totalAppointments: number;
        recentAppointments: number;
        totalRevenue: number;
        averageRevenue: number;
    };
    appointments: {
        statusBreakdown: Record<string, number>;
        typeBreakdown: Record<string, number>;
        dailyTrends: Record<string, number>;
    };
    demographics: {
        specialties: Record<string, number>;
        gender: Record<string, number>;
        ageGroups: Record<string, number>;
    };
    period: {
        days: number;
        startDate: string;
        endDate: string;
    };
}

interface AdminOverviewProps {
    stats: DashboardStats | null;
    loading: boolean;
    onRefresh: () => void;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function AdminOverview({ stats, loading, onRefresh }: AdminOverviewProps) {
    const [period, setPeriod] = useState('30');
    const { t, isRTL } = useLocale();

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat(isRTL ? 'ar-SY' : 'en-SY', {
            style: 'currency',
            currency: 'SYP',
        }).format(amount);
    };

    const formatNumber = (num: number) => {
        return new Intl.NumberFormat('en-US').format(num);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-green-100 text-green-800';
            case 'scheduled': return 'bg-blue-100 text-blue-800';
            case 'cancelled': return 'bg-red-100 text-red-800';
            case 'no_show': return 'bg-yellow-100 text-yellow-800';
            case 'confirmed': return 'bg-emerald-100 text-emerald-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const prepareChartData = (data: Record<string, number> | undefined | null) => {
        if (!data) return [];
        return Object.entries(data).map(([name, value]) => ({ name, value }));
    };

    const prepareTrendData = (data: Record<string, number> | undefined | null) => {
        if (!data) return [];
        return Object.entries(data)
            .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
            .map(([date, count]) => ({ date, count }));
    };

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <Card key={i} className="animate-pulse">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <div className="h-4 bg-gray-200 rounded w-24"></div>
                                <div className="h-4 w-4 bg-gray-200 rounded"></div>
                            </CardHeader>
                            <CardContent>
                                <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
                                <div className="h-3 bg-gray-200 rounded w-32"></div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">{t('admin_no_data_available') || 'No Data Available'}</h3>
                <p className="text-muted-foreground mb-4">{t('admin_unable_to_load_stats') || 'Unable to load dashboard statistics'}</p>
                <Button onClick={onRefresh}>
                    <RefreshCw className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                    {t('admin_try_again') || 'Try Again'}
                </Button>
            </div>
        );
    }

    const statusChartData = prepareChartData(stats?.appointments?.statusBreakdown);
    const typeChartData = prepareChartData(stats?.appointments?.typeBreakdown);
    const trendData = prepareTrendData(stats?.appointments?.dailyTrends);

    return (
        <div className="space-y-6">
            {/* Period Selector */}
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={`flex items-center ${isRTL ? 'space-x-reverse space-x-2' : 'space-x-2'}`}>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('admin_period') || 'Period:'}</span>
                    <Select value={period} onValueChange={setPeriod}>
                        <SelectTrigger className="w-32">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="7">{t('admin_last_7_days') || 'Last 7 days'}</SelectItem>
                            <SelectItem value="30">{t('admin_last_30_days') || 'Last 30 days'}</SelectItem>
                            <SelectItem value="90">{t('admin_last_90_days') || 'Last 90 days'}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <Button variant="outline" size="sm" onClick={onRefresh}>
                    <RefreshCw className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                    {t('refresh') || 'Refresh'}
                </Button>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="border-0 shadow-xl shadow-red-500/5 gradient-card">
                    <CardContent className="p-6">
                        <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <div className={isRTL ? 'text-right' : 'text-left'}>
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('admin_total_users_title') || 'Total Users'}</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                                    {formatNumber(stats?.overview?.totalUsers || 0)}
                                </p>
                            </div>
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            </div>
                        </div>
                        <div className={`mt-4 flex items-center text-sm ${isRTL ? 'justify-end' : 'justify-start'}`}>
                            <span className="text-gray-600 dark:text-gray-400">
                                {t('admin_total_registered_users') || 'Total registered users'}
                            </span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-xl shadow-red-500/5 gradient-card">
                    <CardContent className="p-6">
                        <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <div className={isRTL ? 'text-right' : 'text-left'}>
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('admin_total_appointments') || 'Total Appointments'}</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                                    {formatNumber(stats?.overview?.totalAppointments || 0)}
                                </p>
                            </div>
                            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                <Calendar className="w-6 h-6 text-green-600 dark:text-green-400" />
                            </div>
                        </div>
                        <div className={`mt-4 flex items-center text-sm ${isRTL ? 'justify-end' : 'justify-start'}`}>
                            <span className="text-gray-600 dark:text-gray-400">
                                {t('admin_total_appointments_scheduled') || 'Total appointments scheduled'}
                            </span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-xl shadow-red-500/5 gradient-card">
                    <CardContent className="p-6">
                        <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <div className={isRTL ? 'text-right' : 'text-left'}>
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('admin_total_revenue') || 'Total Revenue'}</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                                    {formatCurrency(stats?.overview?.totalRevenue || 0)}
                                </p>
                            </div>
                            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                                <DollarSign className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                            </div>
                        </div>
                        <div className={`mt-4 flex items-center text-sm ${isRTL ? 'justify-end' : 'justify-start'}`}>
                            <span className="text-gray-600 dark:text-gray-400">
                                {t('admin_total_consultation_revenue') || 'Total consultation revenue'}
                            </span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-xl shadow-red-500/5 gradient-card">
                    <CardContent className="p-6">
                        <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <div className={isRTL ? 'text-right' : 'text-left'}>
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('admin_medical_centers') || 'Medical Centers'}</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                                    {formatNumber(stats?.overview?.totalCenters || 0)}
                                </p>
                            </div>
                            <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                                <Building2 className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                            </div>
                        </div>
                        <div className={`mt-4 flex items-center text-sm ${isRTL ? 'justify-end' : 'justify-start'}`}>
                            <span className="text-gray-600 dark:text-gray-400">
                                {t('admin_active_medical_centers') || 'Active medical centers'}
                            </span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Admin Hero Section */}
            <div className="relative p-6 rounded-2xl bg-gradient-to-br from-red-50 via-white to-pink-50 dark:from-red-950/30 dark:via-transparent dark:to-pink-950/20 border border-red-200/60 dark:border-red-800/60">
                <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className="p-2 rounded-xl bg-gradient-to-r from-red-500 to-pink-600 animate-glow">
                        <Activity className="h-6 w-6 text-white" />
                    </div>
                    <div className={isRTL ? 'text-right' : 'text-left'}>
                        <h3 className="text-xl font-semibold text-red-800 dark:text-red-300">{t('admin_control_center') || 'Admin Control Center'}</h3>
                        <p className="text-red-700/80 dark:text-red-400/80">{t('admin_control_center_desc') || 'Monitor and manage your healthcare platform with comprehensive insights'}</p>
                    </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4">
                    <div className="text-center">
                        <div className="text-2xl font-bold text-red-700 dark:text-red-300">{stats?.overview?.totalDoctors || 0}</div>
                        <div className="text-sm text-red-600/70 dark:text-red-400/70">{t('admin_active_doctors') || 'Active Doctors'}</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-red-700 dark:text-red-300">{stats?.overview?.totalPatients || 0}</div>
                        <div className="text-sm text-red-600/70 dark:text-red-400/70">{t('admin_registered_patients') || 'Registered Patients'}</div>
                    </div>
                </div>
                {/* Subtle glow effects */}
                <div className={`absolute -top-4 w-24 h-24 bg-gradient-to-br from-red-400/20 to-pink-600/20 rounded-full blur-2xl pointer-events-none ${isRTL ? '-right-4' : '-left-4'}`}></div>
                <div className={`absolute -bottom-4 w-32 h-32 bg-gradient-to-tl from-pink-400/15 to-red-500/15 rounded-full blur-2xl pointer-events-none ${isRTL ? '-left-4' : '-right-4'}`}></div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Appointment Trends */}
                <Card>
                    <CardHeader>
                        <CardTitle className={`flex items-center ${isRTL ? 'space-x-reverse space-x-2' : 'space-x-2'}`}>
                            <TrendingUp className="h-5 w-5" />
                            <span>{t('admin_appointment_trends') || 'Appointment Trends'}</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={trendData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(value) => new Date(value).toLocaleDateString()}
                                />
                                <YAxis />
                                <Tooltip
                                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                                    formatter={(value) => [value, t('admin_appointments') || 'Appointments']}
                                />
                                <Line type="monotone" dataKey="count" stroke="#8884d8" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Appointment Status Breakdown */}
                <Card>
                    <CardHeader>
                        <CardTitle className={`flex items-center ${isRTL ? 'space-x-reverse space-x-2' : 'space-x-2'}`}>
                            <Activity className="h-5 w-5" />
                            <span>{t('admin_appointment_status') || 'Appointment Status'}</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={statusChartData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {statusChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value) => [value, t('admin_appointments') || 'Appointments']} />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Detailed Breakdowns */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Appointment Status Details */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">{t('admin_appointment_status_details') || 'Appointment Status'}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {Object.entries(stats?.appointments?.statusBreakdown || {}).map(([status, count]) => (
                            <div key={status} className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <div className={`flex items-center ${isRTL ? 'space-x-reverse space-x-2' : 'space-x-2'}`}>
                                    <Badge className={getStatusColor(status)}>
                                        {status === 'scheduled' ? (t('admin_scheduled') || 'Scheduled') :
                                            status === 'completed' ? (t('admin_completed') || 'Completed') :
                                                status === 'cancelled' ? (t('admin_cancelled') || 'Cancelled') :
                                                    status === 'no_show' ? (t('admin_no_show') || 'No Show') :
                                                        status === 'confirmed' ? (t('admin_confirmed') || 'Confirmed') :
                                                            status.charAt(0).toUpperCase() + status.slice(1)}
                                    </Badge>
                                </div>
                                <span className="font-semibold">{formatNumber(count)}</span>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Appointment Types */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">{t('admin_appointment_types') || 'Appointment Types'}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {Object.entries(stats?.appointments?.typeBreakdown || {}).map(([type, count]) => (
                            <div key={type} className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <span className="capitalize">
                                    {type === 'clinic' ? (t('admin_clinic') || 'Clinic') :
                                        type === 'home' ? (t('admin_home') || 'Home') :
                                            type}
                                </span>
                                <span className="font-semibold">{formatNumber(count)}</span>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Patient Demographics */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">{t('admin_patient_demographics') || 'Patient Demographics'}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {Object.keys(stats?.demographics?.gender || {}).length > 0 ? (
                            Object.entries(stats?.demographics?.gender || {}).map(([gender, count]) => (
                                <div key={gender} className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                                    <span className="capitalize">
                                        {gender === 'male' ? (t('admin_male') || 'Male') :
                                            gender === 'female' ? (t('admin_female') || 'Female') :
                                                gender === 'other' ? (t('admin_other') || 'Other') :
                                                    gender}
                                    </span>
                                    <span className="font-semibold">{formatNumber(count as number)}</span>
                                </div>
                            ))
                        ) : (
                            <div className="text-sm text-muted-foreground text-center py-4">
                                {t('admin_no_demographics_data') || 'No patient demographics data available'}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Top Specialties */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">{t('admin_top_medical_specialties') || 'Top Medical Specialties'}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {Object.entries(stats?.demographics?.specialties || {})
                            .sort(([, a], [, b]) => b - a)
                            .slice(0, 12)
                            .map(([specialty, count]) => {
                                const getSpecialtyTranslation = (spec: string) => {
                                    switch (spec.toLowerCase()) {
                                        case 'pediatrics': return t('admin_pediatrics') || 'Pediatrics';
                                        case 'dermatology': return t('admin_dermatology') || 'Dermatology';
                                        case 'orthopedics': return t('admin_orthopedics') || 'Orthopedics';
                                        case 'general_medicine': return t('admin_general_medicine') || 'General Medicine';
                                        case 'cardiology': return t('admin_cardiology') || 'Cardiology';
                                        default: return spec.replace('_', ' ');
                                    }
                                };

                                return (
                                    <div key={specialty} className="text-center p-3 border rounded-lg">
                                        <div className="font-semibold text-lg">{formatNumber(count)}</div>
                                        <div className="text-sm text-muted-foreground capitalize">
                                            {getSpecialtyTranslation(specialty)}
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
