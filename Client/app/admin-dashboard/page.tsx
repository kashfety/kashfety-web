"use client"

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/providers/auth-provider';
import { useRouter, usePathname } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
    Image
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import Link from "next/link";

// Import admin components
import AdminOverview from '@/components/admin/AdminOverview';
import UserManagement from '@/components/admin/UserManagement';
import CenterManagement from '@/components/admin/CenterManagement';
import CenterApprovals from '@/components/admin/CenterApprovals';
import CertificateApproval from '@/components/admin/CertificateApproval';
import DoctorApprovals from '@/components/admin/DoctorApprovals';
import AdminAnalytics from '@/components/admin/AdminAnalytics';
import AuditLogs from '@/components/admin/AuditLogs';
import AdminProfileSettings from '@/components/admin/AdminProfileSettings';
import BannerManagement from '@/components/admin/BannerManagement';

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

// Admin Sidebar Component
function AdminSidebar({
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
                    ? `bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 ${isRTL ? 'border-l-2' : 'border-r-2'} border-blue-500`
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
                className={`lg:hidden fixed top-4 z-[70] p-2 rounded-lg bg-white dark:bg-[#0F0F12] shadow-md border border-gray-200 dark:border-[#1F1F23] transition-all duration-300 hover:scale-110 hover:translate-y-[-2px] hover:shadow-lg ${isRTL ? 'right-4' : 'left-4'}`}
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
                            <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-pink-600 rounded-lg flex items-center justify-center">
                                <Shield className="w-4 h-4 text-white" />
                            </div>
                            {!isCollapsed && (
                                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {t('admin_portal') || 'Admin Portal'}
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
                            <div>
                                {!isCollapsed && (
                                    <div className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        {t('admin_dashboard') || 'Dashboard'}
                                    </div>
                                )}
                                <div className={isCollapsed ? 'space-y-2' : ''}>
                                    <NavItem tab="overview" icon={Home} isActive={activeTab === "overview"}>
                                        {t('admin_overview') || 'Overview'}
                                    </NavItem>
                                    <NavItem tab="users" icon={Users} isActive={activeTab === "users"}>
                                        {t('admin_users') || 'Users'}
                                    </NavItem>
                                    <NavItem tab="centers" icon={Building2} isActive={activeTab === "centers"}>
                                        {t('admin_centers') || 'Centers'}
                                    </NavItem>
                                    <NavItem tab="analytics" icon={BarChart3} isActive={activeTab === "analytics"}>
                                        {t('admin_analytics') || 'Analytics'}
                                    </NavItem>
                                </div>
                            </div>

                            <div>
                                {!isCollapsed && (
                                    <div className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        {t('admin_management') || 'Management'}
                                    </div>
                                )}
                                <div className={isCollapsed ? 'space-y-2' : ''}>
                                    <NavItem tab="doctor-approvals" icon={UserCheck} isActive={activeTab === "doctor-approvals"}>
                                        {t('admin_doctor_approvals') || 'Doctor Approvals'}
                                    </NavItem>
                                    <NavItem tab="center-approvals" icon={Building2} isActive={activeTab === "center-approvals"}>
                                        {t('admin_center_approvals') || 'Center Approvals'}
                                    </NavItem>
                                    <NavItem tab="certificates" icon={FileText} isActive={activeTab === "certificates"}>
                                        {t('admin_certificates') || 'Certificates'}
                                    </NavItem>
                                    <NavItem tab="banners" icon={Image} isActive={activeTab === "banners"}>
                                        {t('admin_banners') || 'Banners'}
                                    </NavItem>
                                    <NavItem tab="audit-logs" icon={Activity} isActive={activeTab === "audit-logs"}>
                                        {t('admin_audit_logs') || 'Audit Logs'}
                                    </NavItem>
                                </div>
                            </div>

                            <div>
                                {!isCollapsed && (
                                    <div className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        {t('admin_account') || 'Account'}
                                    </div>
                                )}
                                <div className={isCollapsed ? 'space-y-2' : ''}>
                                    <NavItem tab="profile" icon={User} isActive={activeTab === "profile"}>
                                        {t('admin_profile') || 'Profile'}
                                    </NavItem>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Navigation */}
                    <div className={`py-4 border-t border-gray-200 dark:border-[#1F1F23] ${isCollapsed ? 'px-2' : 'px-4'}`}>
                        <div>
                            <button
                                onClick={() => window.open('mailto:support@adminapp.com', '_blank')}
                                className={`w-full flex items-center px-3 py-2.5 text-sm rounded-lg transition-all duration-200 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#1F1F23] ${isCollapsed ? 'justify-center' : ''}`}
                                title={isCollapsed ? (t('admin_help_support') || 'Help & Support') : ''}
                            >
                                <HelpCircle className={`h-4 w-4 flex-shrink-0 ${isCollapsed ? '' : isRTL ? 'ml-3' : 'mr-3'}`} />
                                {!isCollapsed && <span className={isRTL ? 'mr-3' : 'ml-3'}>{t('admin_help_support') || 'Help & Support'}</span>}
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-[65] lg:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}
        </>
    );
}

// Admin Top Navigation Component
function AdminTopNav({
    dashboardStats,
    setActiveTab
}: {
    dashboardStats: DashboardStats | null;
    setActiveTab: (tab: string) => void;
}) {
    const { t, isRTL } = useLocale();
    const { logout } = useAuth();
    const router = useRouter();
    const { user } = useAuth();

    const breadcrumbs = [
        { label: t('admin_portal') || "Admin Portal", href: "#" },
        { label: t('admin_dashboard') || "Dashboard", href: "#" },
    ];

    const handleLogout = () => {
        logout();
        router.push('/login');
    };

    const handleProfileClick = () => {
        setActiveTab('profile');
    };

    return (
        <nav className="relative px-2 sm:px-6 flex items-center justify-between bg-white dark:bg-[#0F0F12] h-full overflow-visible">
            <div className={`font-medium text-xs sm:text-sm hidden md:flex items-center truncate max-w-[200px] lg:max-w-[300px] ${isRTL ? 'space-x-reverse space-x-1' : 'space-x-1'}`}>
                {breadcrumbs.map((item, index) => (
                    <div key={item.label} className="flex items-center">
                        {index > 0 && <ChevronRight className={`h-4 w-4 text-gray-500 dark:text-gray-400 mx-1 ${isRTL ? 'rotate-180' : ''}`} />}
                        {item.href ? (
                            <Link
                                href={item.href}
                                className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                            >
                                {item.label}
                            </Link>
                        ) : (
                            <span className="text-gray-900 dark:text-gray-100">{item.label}</span>
                        )}
                    </div>
                ))}
            </div>

            <div className={`relative flex items-center gap-1 sm:gap-2 ${isRTL ? 'mr-auto' : 'ml-auto'}`}>
                {/* Quick Stats */}
                <div className={`hidden lg:flex items-center gap-3 ${isRTL ? 'ml-2' : 'mr-2'}`}>
                    <div className={isRTL ? 'text-left' : 'text-right'}>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{t('admin_total_users') || 'Users'}</div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {dashboardStats?.overview?.totalUsers || 0}
                        </div>
                    </div>
                    <div className={isRTL ? 'text-left' : 'text-right'}>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{t('admin_revenue') || 'Revenue'}</div>
                        <div className="text-sm font-medium text-green-600 dark:text-green-400">
                            ${dashboardStats?.overview?.totalRevenue?.toLocaleString() || '0'}
                        </div>
                    </div>
                </div>

                <button
                    type="button"
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#1F1F23] rounded-full transition-colors relative"
                >
                    <Bell className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                    <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
                </button>

                <div className="hidden sm:flex items-center gap-1">
                    <LocaleSwitcher />
                    <ThemeToggle />
                </div>

                <DropdownMenu>
                    <DropdownMenuTrigger className="focus:outline-none">
                        <div className={`flex items-center gap-1 sm:gap-2 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-[#1F1F23] transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-r from-red-500 to-pink-600 rounded-full flex items-center justify-center">
                                <User className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                            </div>
                            <div className={`hidden md:block ${isRTL ? 'text-right' : 'text-left'}`}>
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                    {user?.name || user?.email?.split('@')[0] || 'Admin'}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {t('admin_role') || 'Administrator'}
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
                                <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-pink-600 rounded-full flex items-center justify-center">
                                    <User className="w-6 h-6 text-white" />
                                </div>
                                <div className={isRTL ? 'text-right' : 'text-left'}>
                                    <div className="font-medium text-gray-900 dark:text-white">
                                        {user?.name || user?.email?.split('@')[0] || 'Admin'}
                                    </div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                        {user?.email || "admin@example.com"}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Button
                                    variant="outline"
                                    className="w-full justify-start"
                                    size="sm"
                                    onClick={handleProfileClick}
                                >
                                    <Settings className="w-4 h-4 mr-2" />
                                    {t('admin_profile') || 'Profile'}
                                </Button>
                                <Button
                                    variant="outline"
                                    className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                                    size="sm"
                                    onClick={handleLogout}
                                >
                                    <User className="w-4 h-4 mr-2" />
                                    {t('header_logout') || 'Logout'}
                                </Button>
                            </div>
                        </div>
                    </DropdownMenuContent>
                </DropdownMenu>
                {/* Red glow behind user controls */}
                <div className="pointer-events-none absolute -top-8 -right-8 w-48 h-48 bg-gradient-to-br from-red-400/20 to-pink-600/20 rounded-full blur-3xl" />
            </div>
        </nav>
    );
}

export default function AdminDashboardPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const { theme } = useTheme();
    const { t, isRTL } = useLocale();
    const [mounted, setMounted] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');
    const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
    const [statsLoading, setStatsLoading] = useState(true);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!loading && (!user || !['admin', 'super_admin'].includes(user.role))) {
            router.replace('/login');
        }
    }, [user, loading, router]);

    useEffect(() => {
        if (user?.role === 'admin' || user?.role === 'super_admin') {
            fetchDashboardStats();
        }
    }, [user]);

    const fetchDashboardStats = async () => {
        try {
            setStatsLoading(true);

            // Try fallback route first for Vercel compatibility
            let response;
            let data;
            
            try {
                console.log('📊 Trying admin-dashboard-stats fallback route');
                response = await fetch('/api/admin-dashboard-stats', {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (response.ok) {
                    data = await response.json();
                    if (data.success) {
                        console.log('✅ Fallback route worked');
                        setDashboardStats(data.data);
                        return;
                    }
                }
            } catch (fallbackError) {
                console.log('❌ Fallback failed, trying backend route');
            }

            // Fallback to backend route
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
            const baseUrl = apiUrl.endsWith('/api') ? apiUrl : `${apiUrl.replace(/\/$/, '')}/api`

            response = await fetch(`${baseUrl}/auth/admin/dashboard/stats`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch dashboard stats');
            }

            data = await response.json();
            setDashboardStats(data.data);
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);

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
                    totalCenters: 0,
                    totalAppointments: 0,
                    recentAppointments: 0,
                    totalRevenue: 0,
                    averageRevenue: 0
                },
                period: {
                    days: 30,
                    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                    endDate: new Date().toISOString()
                },
                demographics: {
                    gender: {},
                    specialties: {},
                    ageGroups: {}
                },
                appointments: {
                    statusBreakdown: {},
                    typeBreakdown: {},
                    dailyTrends: {}
                }
            });
        } finally {
            setStatsLoading(false);
        }
    };

    if (!user || user.role !== 'admin') return null;

    return (
        <div className={`admin-dashboard ${theme === "dark" ? "dark" : ""} ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                {/* Animated gradient background */}
                <div className="absolute inset-0 bg-gradient-to-br from-red-50/30 via-white to-pink-50/30 dark:from-red-950/10 dark:via-gray-900 dark:to-pink-950/10"></div>
                {/* Central breathing animation */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] sm:w-[800px] sm:h-[800px] bg-gradient-radial from-red-400/5 to-transparent rounded-full animate-breathe"></div>
            </div>

            <div className={`flex h-screen relative z-10 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} toast={toast} />

                <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
                    <header className="h-14 sm:h-16 border-b border-gray-200 dark:border-[#1F1F23] flex-shrink-0 relative">
                        <AdminTopNav dashboardStats={dashboardStats} setActiveTab={setActiveTab} />
                        {/* Subtle red glow behind user controls */}
                        <div className={`pointer-events-none absolute top-0 -translate-y-4 sm:-translate-y-8 w-24 h-24 sm:w-48 sm:h-48 bg-gradient-to-br from-red-400/20 to-pink-600/20 rounded-full blur-2xl sm:blur-3xl ${isRTL ? 'left-0 -translate-x-4 sm:-translate-x-8' : 'right-0 translate-x-4 sm:translate-x-8'}`}></div>
                    </header>

                    <main className="flex-1 overflow-hidden bg-gray-50 dark:bg-[#0F0F12]">
                        <div className="h-full flex flex-col">
                            {/* Render active tab content based on sidebar selection */}
                            <div className="flex-1 overflow-y-auto">
                                {activeTab === 'overview' && (
                                    <div className="px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
                                        {/* Welcome Header */}
                                        <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
                                            <div className={isRTL ? 'text-right' : 'text-left'}>
                                                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                                                    {t('admin_welcome_back') || 'Welcome back'}, {user?.name || user?.email?.split('@')[0] || 'Admin'}
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
                                                <RefreshCw className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'} ${statsLoading ? 'animate-spin' : ''}`} />
                                                {t('refresh') || 'Refresh'}
                                            </Button>
                                        </div>

                                        <AdminOverview
                                            stats={dashboardStats}
                                            loading={statsLoading}
                                            onRefresh={fetchDashboardStats}
                                        />
                                    </div>
                                )}

                                {activeTab === 'users' && (
                                    <div className="px-4 sm:px-6 py-4 sm:py-6">
                                        <UserManagement />
                                    </div>
                                )}

                                {activeTab === 'centers' && (
                                    <div className="px-4 sm:px-6 py-4 sm:py-6">
                                        <CenterManagement />
                                    </div>
                                )}

                                {activeTab === 'doctor-approvals' && (
                                    <div className="px-4 sm:px-6 py-4 sm:py-6">
                                        <DoctorApprovals />
                                    </div>
                                )}

                                {activeTab === 'center-approvals' && (
                                    <div className="px-4 sm:px-6 py-4 sm:py-6">
                                        <CenterApprovals />
                                    </div>
                                )}

                                {activeTab === 'certificates' && (
                                    <div className="px-4 sm:px-6 py-4 sm:py-6">
                                        <CertificateApproval />
                                    </div>
                                )}

                                {activeTab === 'banners' && (
                                    <div className="px-4 sm:px-6 py-4 sm:py-6">
                                        <BannerManagement />
                                    </div>
                                )}

                                {activeTab === 'analytics' && (
                                    <div className="px-4 sm:px-6 py-4 sm:py-6">
                                        <AdminAnalytics />
                                    </div>
                                )}

                                {activeTab === 'audit-logs' && (
                                    <div className="px-4 sm:px-6 py-4 sm:py-6">
                                        <AuditLogs />
                                    </div>
                                )}

                                {activeTab === 'profile' && (
                                    <div className="px-4 sm:px-6 py-4 sm:py-6">
                                        <AdminProfileSettings />
                                    </div>
                                )}
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}
