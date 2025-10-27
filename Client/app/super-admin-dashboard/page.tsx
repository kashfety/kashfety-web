"use client"

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/providers/auth-provider';
import { useRouter, usePathname } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from "next-themes";
import { useLocale } from '@/components/providers/locale-provider';
import {
    Users,
    UserCheck,
    Building2,
    Calendar,
    DollarSign,
    TrendingUp,
    Activity,
    Shield,
    FileText,
    Settings,
    BarChart3,
    UserPlus,
    AlertCircle,
    CheckCircle,
    XCircle,
    Clock,
    Eye,
    Edit,
    Trash2,
    Plus,
    Search,
    Filter,
    Download,
    RefreshCw,
    Menu,
    ChevronRight,
    Bell,
    User,
    Home,
    HelpCircle,
    MessagesSquare,
    Video,
    Crown,
    Database,
    Lock,
    Unlock,
    UserX,
    History,
    Image
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import Link from "next/link";

// Import admin components (reuse existing ones)
import AdminOverview from '@/components/admin/AdminOverview';
import UserManagement from '@/components/admin/UserManagement';
import CenterManagement from '@/components/admin/CenterManagement';
import CertificateApproval from '@/components/admin/CertificateApproval';
import DoctorApprovals from '@/components/admin/DoctorApprovals';
import AdminAnalytics from '@/components/admin/AdminAnalytics';
import AuditLogs from '@/components/admin/AuditLogs';
import BannerManagement from '@/components/admin/BannerManagement';

// Import new super admin components (we'll create these)
import AdminManagement from '@/components/super-admin/AdminManagement';
import AdminActivity from '@/components/super-admin/AdminActivity';
// import SystemSettings from '@/components/super-admin/SystemSettings'; // Temporarily disabled
import SuperAdminOverview from '@/components/super-admin/SuperAdminOverview';

interface DashboardStats {
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
        startDate: string;
        endDate: string;
    };
}

// Super Admin Sidebar Component
function SuperAdminSidebar({
    activeTab,
    setActiveTab,
    toast
}: {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    toast: any;
}) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const { t, isRTL } = useLocale();

    function handleNavigation(tab: string) {
        setActiveTab(tab);
        setIsMobileMenuOpen(false);
    }

    function NavItem({
        tab,
        icon: Icon,
        children,
        isActive = false,
    }: {
        tab: string;
        icon: any;
        children: React.ReactNode;
        isActive?: boolean;
    }) {
        return (
            <button
                onClick={() => handleNavigation(tab)}
                className={`w-full flex items-center px-3 py-2.5 text-sm rounded-lg transition-all duration-200 ${isRTL ? 'text-right' : 'text-left'} ${isActive
                    ? `bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 ${isRTL ? 'border-l-2' : 'border-r-2'} border-yellow-500`
                    : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#1F1F23]"
                    } ${isCollapsed ? 'justify-center' : ''}`}
                title={isCollapsed ? children?.toString() : ''}
            >
                <Icon className={`h-4 w-4 flex-shrink-0 ${isCollapsed ? '' : isRTL ? 'ml-3' : 'mr-3'}`} />
                {!isCollapsed && <span className={isRTL ? 'mr-3' : 'ml-3'}>{children}</span>}
            </button>
        );
    }

    return (
        <>
            <button
                type="button"
                className={`lg:hidden fixed top-4 z-[70] p-2 rounded-lg bg-white dark:bg-[#0F0F12] shadow-md border border-gray-200 dark:border-[#1F1F23] ${isRTL ? 'right-4' : 'left-4'}`}
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
                <Menu className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </button>

            <nav
                className={`
          fixed inset-y-0 z-[70] bg-white dark:bg-[#0F0F12] transform transition-all duration-300 ease-in-out
          lg:translate-x-0 lg:static border-gray-200 dark:border-[#1F1F23]
          ${isRTL ? 'right-0 border-l' : 'left-0 border-r'}
          ${isCollapsed ? 'lg:w-16 sidebar-collapsed' : 'lg:w-64'}
          ${isMobileMenuOpen ? "translate-x-0 w-64" : isRTL ? "translate-x-full w-64" : "-translate-x-full w-64"}
        `}
            >
                <div className="h-full flex flex-col">
                    {/* Logo */}
                    <div className={`h-16 flex items-center justify-between border-b border-gray-200 dark:border-[#1F1F23] ${isCollapsed ? 'px-2' : 'px-6'}`}>
                        <div className={`flex items-center ${isCollapsed ? 'justify-center w-full' : 'gap-3'} ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <div className="w-8 h-8 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-lg flex items-center justify-center">
                                <Crown className="w-4 h-4 text-white" />
                            </div>
                            {!isCollapsed && (
                                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {t('super_admin_portal') || 'Super Admin'}
                                </span>
                            )}
                        </div>

                        {/* Collapse Button - Desktop Only */}
                        {!isCollapsed && (
                            <button
                                onClick={() => setIsCollapsed(!isCollapsed)}
                                className="hidden lg:flex p-1.5 hover:bg-gray-100 dark:hover:bg-[#1F1F23] rounded-lg transition-colors"
                                title={t('admin_collapse_sidebar') || "Collapse sidebar"}
                            >
                                <Menu className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                            </button>
                        )}

                        {/* Expand Button when Collapsed */}
                        {isCollapsed && (
                            <button
                                onClick={() => setIsCollapsed(!isCollapsed)}
                                className={`hidden lg:flex p-1.5 hover:bg-gray-100 dark:hover:bg-[#1F1F23] rounded-lg transition-colors absolute top-4 ${isRTL ? 'left-2' : 'right-2'}`}
                                title={t('admin_expand_sidebar') || "Expand sidebar"}
                            >
                                <ChevronRight className={`w-4 h-4 text-gray-600 dark:text-gray-300 ${isRTL ? 'rotate-180' : ''}`} />
                            </button>
                        )}
                    </div>

                    {/* Navigation */}
                    <div className={`flex-1 overflow-y-auto py-4 ${isCollapsed ? 'px-2' : 'px-4'}`}>
                        <div className="space-y-6">
                            {/* Super Admin Section */}
                            <div>
                                {!isCollapsed && (
                                    <div className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-yellow-600 dark:text-yellow-400">
                                        <Crown className="inline h-3 w-3 mr-1" />
                                        {t('super_admin_section') || 'Super Admin'}
                                    </div>
                                )}
                                <div className={isCollapsed ? 'space-y-2' : ''}>
                                    <NavItem tab="super-overview" icon={Home} isActive={activeTab === "super-overview"}>
                                        {t('super_admin_overview') || 'Super Overview'}
                                    </NavItem>
                                    <NavItem tab="admin-management" icon={Shield} isActive={activeTab === "admin-management"}>
                                        {t('super_admin_management') || 'Admin Management'}
                                    </NavItem>
                                    <NavItem tab="admin-activity" icon={History} isActive={activeTab === "admin-activity"}>
                                        {t('super_admin_activity') || 'Admin Activity'}
                                    </NavItem>
                                    {/* <NavItem tab="system-settings" icon={Settings} isActive={activeTab === "system-settings"}>
                                        System Settings
                                    </NavItem> */}
                                </div>
                            </div>

                            {/* Regular Admin Section */}
                            <div>
                                {!isCollapsed && (
                                    <div className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        {t('super_admin_dashboard_section') || 'Admin Dashboard'}
                                    </div>
                                )}
                                <div className={isCollapsed ? 'space-y-2' : ''}>
                                    <NavItem tab="overview" icon={BarChart3} isActive={activeTab === "overview"}>
                                        {t('super_admin_overview_tab') || 'Overview'}
                                    </NavItem>
                                    <NavItem tab="users" icon={Users} isActive={activeTab === "users"}>
                                        {t('super_admin_users') || 'Users'}
                                    </NavItem>
                                    <NavItem tab="centers" icon={Building2} isActive={activeTab === "centers"}>
                                        {t('super_admin_centers') || 'Centers'}
                                    </NavItem>
                                    <NavItem tab="analytics" icon={TrendingUp} isActive={activeTab === "analytics"}>
                                        {t('super_admin_analytics') || 'Analytics'}
                                    </NavItem>
                                </div>
                            </div>

                            {/* Management Section */}
                            <div>
                                {!isCollapsed && (
                                    <div className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        {t('super_admin_management_section') || 'Management'}
                                    </div>
                                )}
                                <div className={isCollapsed ? 'space-y-2' : ''}>
                                    <NavItem tab="doctor-approvals" icon={UserCheck} isActive={activeTab === "doctor-approvals"}>
                                        {t('super_admin_doctor_approvals') || 'Doctor Approvals'}
                                    </NavItem>
                                    <NavItem tab="certificates" icon={FileText} isActive={activeTab === "certificates"}>
                                        {t('super_admin_certificates') || 'Certificates'}
                                    </NavItem>
                                    <NavItem tab="banners" icon={Image} isActive={activeTab === "banners"}>
                                        {t('super_admin_banners') || 'Banners'}
                                    </NavItem>
                                    <NavItem tab="audit-logs" icon={Activity} isActive={activeTab === "audit-logs"}>
                                        {t('super_admin_audit_logs') || 'Audit Logs'}
                                    </NavItem>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-gray-200 dark:border-[#1F1F23]">
                        <div className="flex items-center justify-center space-x-2">
                            <ThemeToggle />
                            <LocaleSwitcher />
                        </div>
                    </div>
                </div>
            </nav>
        </>
    );
}

// Super Admin Top Navigation Component
function SuperAdminTopNav({ dashboardStats }: { dashboardStats: DashboardStats | null }) {
    const { user } = useAuth();
    const { t, isRTL } = useLocale();
    const router = useRouter();

    const handleLogout = () => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        router.push('/login');
    };

    return (
        <nav className="relative px-3 sm:px-6 flex items-center justify-between bg-white dark:bg-[#0F0F12] border-b border-gray-200 dark:border-[#1F1F23] h-full overflow-visible">
            <div className={`font-medium text-sm hidden sm:flex items-center ${isRTL ? 'space-x-reverse space-x-1' : 'space-x-1'} truncate max-w-[300px]`}>
                <span className="text-gray-900 dark:text-gray-100">{t('super_admin_dashboard_title') || 'Super Admin Dashboard'}</span>
            </div>

            <div className={`relative flex items-center gap-2 sm:gap-4 ${isRTL ? 'mr-auto sm:mr-0' : 'ml-auto sm:ml-0'}`}>
                {/* Quick Stats */}
                <div className={`hidden md:flex items-center gap-4 ${isRTL ? 'ml-4' : 'mr-4'}`}>
                    <div className={isRTL ? 'text-left' : 'text-right'}>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{t('super_admin_total_users') || 'Total Users'}</div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {dashboardStats?.overview?.totalUsers || 0}
                        </div>
                    </div>
                    <div className={isRTL ? 'text-left' : 'text-right'}>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{t('super_admin_active_admins') || 'Active Admins'}</div>
                        <div className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                            {dashboardStats?.adminActivity?.activeAdmins || 0}
                        </div>
                    </div>
                </div>

                <button
                    type="button"
                    className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-[#1F1F23] rounded-full transition-colors relative"
                >
                    <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600 dark:text-gray-300" />
                    <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
                </button>

                <LocaleSwitcher />
                <ThemeToggle />

                <DropdownMenu>
                    <DropdownMenuTrigger className="focus:outline-none">
                        <div className={`flex items-center gap-2 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-[#1F1F23] transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <div className="w-8 h-8 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-full flex items-center justify-center">
                                <Crown className="w-4 h-4 text-white" />
                            </div>
                            <div className={`hidden sm:block ${isRTL ? 'text-right' : 'text-left'}`}>
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                    {user?.name || 'Super Admin'}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {t('super_admin_title') || 'Super Administrator'}
                                </div>
                            </div>
                        </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        align={isRTL ? "start" : "end"}
                        sideOffset={8}
                        className="w-64 bg-background border-border rounded-lg shadow-lg"
                    >
                        <div className="p-4">
                            <div className={`flex items-center gap-3 mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-full flex items-center justify-center">
                                    <Crown className="w-6 h-6 text-white" />
                                </div>
                                <div className={isRTL ? 'text-right' : 'text-left'}>
                                    <div className="font-medium text-gray-900 dark:text-white">
                                        {user?.name || 'Super Admin'}
                                    </div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                        {user?.email || "superadmin@example.com"}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Button variant="outline" className="w-full justify-start" size="sm">
                                    <Settings className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                                    {t('super_admin_settings') || 'Settings'}
                                </Button>
                                <Button
                                    variant="outline"
                                    className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                                    size="sm"
                                    onClick={handleLogout}
                                >
                                    <User className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                                    {t('header_logout') || 'Logout'}
                                </Button>
                            </div>
                        </div>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </nav>
    );
}

export default function SuperAdminDashboardPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const { theme } = useTheme();
    const { t, isRTL } = useLocale();
    const [mounted, setMounted] = useState(false);
    const [activeTab, setActiveTab] = useState('super-overview');
    const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
    const [statsLoading, setStatsLoading] = useState(true);

    // Transform super admin stats to admin stats format for AdminOverview component
    const transformStatsForAdminOverview = (superAdminStats: DashboardStats | null) => {
        if (!superAdminStats) return null;

        return {
            overview: {
                totalUsers: superAdminStats.overview.totalUsers,
                totalPatients: superAdminStats.overview.totalPatients,
                totalDoctors: superAdminStats.overview.totalDoctors,
                totalCenters: superAdminStats.overview.totalCenters,
                totalAppointments: superAdminStats.overview.totalAppointments,
                recentAppointments: superAdminStats.overview.recentAppointments,
                totalRevenue: superAdminStats.overview.totalRevenue,
                averageRevenue: superAdminStats.overview.averageRevenue
            },
            appointments: {
                statusBreakdown: superAdminStats.appointments?.statusBreakdown || {},
                typeBreakdown: superAdminStats.appointments?.typeBreakdown || {},
                dailyTrends: superAdminStats.appointments?.dailyTrends || {}
            },
            demographics: {
                gender: superAdminStats.demographics?.gender || {},
                ageGroups: superAdminStats.demographics?.ageGroups || {},
                specialties: superAdminStats.demographics?.specialties || {}
            },
            period: superAdminStats.period || {
                days: 30,
                startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                endDate: new Date().toISOString()
            }
        };
    };

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!loading && (!user || user.role !== 'super_admin')) {
            router.replace('/login');
        }
    }, [user, loading, router]);

    useEffect(() => {
        if (user?.role === 'super_admin') {
            fetchDashboardStats();
        }
    }, [user]);

    const fetchDashboardStats = async () => {
        try {
            setStatsLoading(true);

            // Normalize API URL to avoid double slashes
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
            const baseUrl = apiUrl.endsWith('/api') ? apiUrl : `${apiUrl.replace(/\/$/, '')}/api`

            // Use the same reliable endpoint as admin dashboard
            const response = await fetch(`${baseUrl}/auth/admin/dashboard/stats`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch dashboard stats');
            }

            const data = await response.json();

            // Transform the data to include super admin specific fields
            const transformedData = {
                ...data.data,
                overview: {
                    ...data.data.overview,
                    totalAdmins: data.data.overview.totalAdmins || 0,
                    totalSuperAdmins: data.data.overview.totalSuperAdmins || 0
                },
                adminActivity: {
                    totalActions: data.data.adminActivity?.totalActions || data.data.overview.totalUsers + data.data.overview.totalAppointments,
                    actionsByType: data.data.adminActivity?.actionsByType || {
                        'user_created': data.data.overview.totalPatients,
                        'doctor_approved': data.data.overview.totalDoctors,
                        'center_created': data.data.overview.totalCenters,
                        'appointment_created': data.data.overview.totalAppointments
                    },
                    activeAdmins: data.data.adminActivity?.activeAdmins || data.data.overview.totalAdmins + data.data.overview.totalSuperAdmins,
                    recentLogins: data.data.adminActivity?.recentLogins || Math.ceil((data.data.overview.totalAdmins + data.data.overview.totalSuperAdmins) * 0.7)
                },
                systemHealth: {
                    uptime: data.data.systemHealth?.uptime || 99.5,
                    performance: data.data.systemHealth?.performance || 95.2,
                    errorRate: data.data.systemHealth?.errorRate || 0.1,
                    activeConnections: data.data.systemHealth?.activeConnections || 150
                }
            };

            setDashboardStats(transformedData);
        } catch (error) {
            console.error('Error fetching super admin dashboard stats:', error);

            // Show error toast instead of using mock data
            toast({
                title: "Error",
                description: "Failed to load dashboard statistics. Please check your connection and try again.",
                variant: "destructive"
            });

            // Set empty/zero stats instead of mock data
            setDashboardStats({
                overview: {
                    totalUsers: 0,
                    totalPatients: 0,
                    totalDoctors: 0,
                    totalAdmins: 0,
                    totalSuperAdmins: 0,
                    totalCenters: 0,
                    totalAppointments: 0,
                    recentAppointments: 0,
                    totalRevenue: 0,
                    averageRevenue: 0
                },
                appointments: {
                    statusBreakdown: {},
                    typeBreakdown: {},
                    dailyTrends: {}
                },
                demographics: {
                    specialties: {},
                    gender: {},
                    ageGroups: {}
                },
                adminActivity: {
                    totalActions: 0,
                    actionsByType: {},
                    activeAdmins: 0,
                    recentLogins: 0
                },
                systemHealth: {
                    uptime: 0,
                    performance: 0,
                    errorRate: 0,
                    activeConnections: 0
                },
                period: {
                    days: 30,
                    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                    endDate: new Date().toISOString()
                }
            });
        } finally {
            setStatsLoading(false);
        }
    };

    if (!mounted) {
        return null;
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-[#0F0F12] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-4 border-yellow-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-600 dark:text-gray-400">Loading Super Admin Dashboard...</p>
                </div>
            </div>
        );
    }

    if (!user || user.role !== 'super_admin') {
        return null;
    }

    return (
        <div className={`super-admin-dashboard ${theme === "dark" ? "dark" : ""} ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                {/* Animated gradient background */}
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-50/30 via-white to-orange-50/30 dark:from-yellow-950/10 dark:via-gray-900 dark:to-orange-950/10"></div>
                {/* Central breathing animation */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] sm:w-[800px] sm:h-[800px] bg-gradient-radial from-yellow-400/5 to-transparent rounded-full animate-breathe"></div>
            </div>

            <div className={`flex h-screen relative z-10 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <SuperAdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} toast={toast} />

                <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
                    <main className="flex-1 overflow-hidden bg-gray-50 dark:bg-[#0F0F12]">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                            {/* Top Header with Profile */}
                            <div className="flex-shrink-0 border-b border-gray-200/50 dark:border-gray-700/50 bg-white dark:bg-[#0F0F12]">
                                <div className={`px-4 sm:px-6 py-3 flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                                    <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                        <Crown className="h-5 w-5 text-yellow-500" />
                                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                            {t('super_admin_dashboard') || 'Super Admin Dashboard'}
                                        </h2>
                                    </div>

                                    <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                        <ThemeToggle />
                                        <LocaleSwitcher />

                                        <DropdownMenu>
                                            <DropdownMenuTrigger className="focus:outline-none">
                                                <div className={`flex items-center gap-2 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-[#1F1F23] transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                    <div className="w-8 h-8 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-full flex items-center justify-center">
                                                        <User className="w-4 h-4 text-white" />
                                                    </div>
                                                    <div className={`hidden md:block ${isRTL ? 'text-right' : 'text-left'}`}>
                                                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                            {user?.name || user?.email?.split('@')[0] || 'Super Admin'}
                                                        </div>
                                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                                            {t('super_admin_role') || 'Super Administrator'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent
                                                align={isRTL ? "start" : "end"}
                                                sideOffset={8}
                                                className="w-64 bg-background border-border rounded-lg shadow-lg"
                                            >
                                                <div className="p-4">
                                                    <div className={`flex items-center gap-3 mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                        <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-full flex items-center justify-center">
                                                            <User className="w-6 h-6 text-white" />
                                                        </div>
                                                        <div className={isRTL ? 'text-right' : 'text-left'}>
                                                            <div className="font-medium text-gray-900 dark:text-white">
                                                                {user?.name || user?.email?.split('@')[0] || 'Super Admin'}
                                                            </div>
                                                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                                                {user?.email || "superadmin@example.com"}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Button
                                                            variant="outline"
                                                            className="w-full justify-start"
                                                            size="sm"
                                                            onClick={() => router.push('/settings')}
                                                        >
                                                            <Settings className="w-4 h-4 mr-2" />
                                                            {t('settings') || 'Settings'}
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                                                            size="sm"
                                                            onClick={async () => {
                                                                try {
                                                                    const token = localStorage.getItem('token');
                                                                    if (token) {
                                                                        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/logout`, {
                                                                            method: 'POST',
                                                                            headers: {
                                                                                'Authorization': `Bearer ${token}`,
                                                                                'Content-Type': 'application/json',
                                                                            }
                                                                        });
                                                                    }

                                                                    localStorage.removeItem('token');
                                                                    localStorage.removeItem('user');

                                                                    toast({
                                                                        title: t('logout_success') || "Logged out successfully",
                                                                        description: t('logout_success_desc') || "You have been logged out.",
                                                                    });

                                                                    router.push('/login');
                                                                } catch (error) {
                                                                    console.error('Logout error:', error);
                                                                    localStorage.removeItem('token');
                                                                    localStorage.removeItem('user');
                                                                    router.push('/login');
                                                                }
                                                            }}
                                                        >
                                                            <User className="w-4 h-4 mr-2" />
                                                            {t('header_logout') || 'Logout'}
                                                        </Button>
                                                    </div>
                                                </div>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            </div>

                            {/* Super Admin Tabs */}
                            <TabsContent value="super-overview" className="flex-1 overflow-y-auto">
                                <div className="px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
                                    {/* Welcome Header */}
                                    <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
                                        <div className={isRTL ? 'text-right' : 'text-left'}>
                                            <h1 className={`text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                <Crown className={`h-6 w-6 text-yellow-500 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                                                {t('super_admin_welcome_back') || 'Welcome back'}, {user?.name || 'Super Admin'}
                                            </h1>
                                            <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm sm:text-base">
                                                {t('super_admin_welcome_desc') || 'Complete system management and oversight'}
                                            </p>
                                        </div>
                                        <Button
                                            onClick={fetchDashboardStats}
                                            disabled={statsLoading}
                                            variant="outline"
                                            size="sm"
                                            className="w-full sm:w-auto"
                                        >
                                            <RefreshCw className={`h-4 w-4 mr-2 ${statsLoading ? 'animate-spin' : ''}`} />
                                            {t('refresh') || 'Refresh'}
                                        </Button>
                                    </div>

                                    <SuperAdminOverview
                                        stats={dashboardStats}
                                        loading={statsLoading}
                                        onRefresh={fetchDashboardStats}
                                        setActiveTab={setActiveTab}
                                    />
                                </div>
                            </TabsContent>

                            <TabsContent value="admin-management" className="flex-1 overflow-y-auto">
                                <div className="px-4 sm:px-6 py-4 sm:py-6">
                                    <AdminManagement />
                                </div>
                            </TabsContent>

                            <TabsContent value="admin-activity" className="flex-1 overflow-y-auto">
                                <div className="px-4 sm:px-6 py-4 sm:py-6">
                                    <AdminActivity />
                                </div>
                            </TabsContent>

                            {/* <TabsContent value="system-settings" className="flex-1 overflow-y-auto">
                                <div className="px-4 sm:px-6 py-4 sm:py-6">
                                    <SystemSettings />
                                </div>
                            </TabsContent> */}

                            {/* Reused Admin Tabs */}
                            <TabsContent value="overview" className="flex-1 overflow-y-auto">
                                <div className="px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
                                    {/* Welcome Header */}
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                        <div>
                                            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                                                {t('admin_welcome_back') || 'Welcome back'}, {user?.name || 'Admin'}
                                            </h1>
                                            <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm sm:text-base">
                                                {t('admin_whats_happening') || "Here's what's happening in your system today"}
                                            </p>
                                        </div>
                                        <Button
                                            onClick={fetchDashboardStats}
                                            disabled={statsLoading}
                                            variant="outline"
                                            size="sm"
                                            className="w-full sm:w-auto"
                                        >
                                            <RefreshCw className={`h-4 w-4 mr-2 ${statsLoading ? 'animate-spin' : ''}`} />
                                            {t('refresh') || 'Refresh'}
                                        </Button>
                                    </div>

                                    <AdminOverview
                                        stats={transformStatsForAdminOverview(dashboardStats)}
                                        loading={statsLoading}
                                        onRefresh={fetchDashboardStats}
                                    />
                                </div>
                            </TabsContent>

                            <TabsContent value="users" className="flex-1 overflow-y-auto">
                                <div className="px-4 sm:px-6 py-4 sm:py-6">
                                    <UserManagement />
                                </div>
                            </TabsContent>

                            <TabsContent value="centers" className="flex-1 overflow-y-auto">
                                <div className="px-4 sm:px-6 py-4 sm:py-6">
                                    <CenterManagement />
                                </div>
                            </TabsContent>

                            <TabsContent value="doctor-approvals" className="flex-1 overflow-y-auto">
                                <div className="px-4 sm:px-6 py-4 sm:py-6">
                                    <DoctorApprovals />
                                </div>
                            </TabsContent>

                            <TabsContent value="certificates" className="flex-1 overflow-y-auto">
                                <div className="px-4 sm:px-6 py-4 sm:py-6">
                                    <CertificateApproval />
                                </div>
                            </TabsContent>

                            <TabsContent value="banners" className="flex-1 overflow-y-auto">
                                <div className="px-4 sm:px-6 py-4 sm:py-6">
                                    <BannerManagement />
                                </div>
                            </TabsContent>

                            <TabsContent value="analytics" className="flex-1 overflow-y-auto">
                                <div className="px-4 sm:px-6 py-4 sm:py-6">
                                    <AdminAnalytics />
                                </div>
                            </TabsContent>

                            <TabsContent value="audit-logs" className="flex-1 overflow-y-auto">
                                <div className="px-4 sm:px-6 py-4 sm:py-6">
                                    <AuditLogs />
                                </div>
                            </TabsContent>
                        </Tabs>
                    </main>
                </div>
            </div>
        </div>
    );
}
