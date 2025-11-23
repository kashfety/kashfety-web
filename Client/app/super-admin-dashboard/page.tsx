"use client"

import { AdminDashboard } from '@/app/admin-dashboard/page';
import SuperAdminOverview from '@/components/super-admin/SuperAdminOverview';
import AdminManagement from '@/components/super-admin/AdminManagement';
import AdminActivity from '@/components/super-admin/AdminActivity';
import { Crown, Shield, History, Home } from 'lucide-react';
import { useLocale } from '@/components/providers/locale-provider';

export default function SuperAdminDashboardPage() {
    const { t, isRTL } = useLocale();

    // Define super admin specific sidebar sections as a function
    const superAdminSections = (activeTab: string, setActiveTab: (tab: string) => void) => {
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
                    onClick={() => setActiveTab(tab)}
                    className={`w-full flex items-center px-3 py-2.5 text-sm rounded-lg transition-all duration-200 ${isRTL ? 'text-right' : 'text-left'} ${isActive
                        ? `bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 ${isRTL ? 'border-l-2' : 'border-r-2'} border-yellow-500`
                        : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#1F1F23]"
                        }`}
                >
                    <Icon className={`h-4 w-4 flex-shrink-0 ${isRTL ? 'ml-3' : 'mr-3'}`} />
                    <span className={isRTL ? 'mr-3' : 'ml-3'}>{children}</span>
                </button>
            );
        }

        return (
            <div>
                <div className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-yellow-600 dark:text-yellow-400">
                    <Crown className="inline h-3 w-3 mr-1" />
                    {t('super_admin_section') || 'Super Admin'}
                </div>
                <div>
                    <NavItem tab="super-overview" icon={Home} isActive={activeTab === "super-overview"}>
                        {t('super_admin_overview') || 'Super Overview'}
                    </NavItem>
                    <NavItem tab="admin-management" icon={Shield} isActive={activeTab === "admin-management"}>
                        {t('super_admin_management') || 'Admin Management'}
                    </NavItem>
                    <NavItem tab="admin-activity" icon={History} isActive={activeTab === "admin-activity"}>
                        {t('super_admin_activity') || 'Admin Activity'}
                    </NavItem>
                </div>
            </div>
        );
    };

    // Define super admin specific tabs content as functions that receive dashboard state
    const superAdminTabs = {
        'super-overview': (stats: any, loading: boolean, onRefresh: () => void, setActiveTab: (tab: string) => void) => (
            <SuperAdminOverview stats={stats} loading={loading} onRefresh={onRefresh} setActiveTab={setActiveTab} />
        ),
        'admin-management': () => <AdminManagement />,
        'admin-activity': () => <AdminActivity />
    };

    return (
        <AdminDashboard
            additionalSidebarSections={superAdminSections}
            additionalTabs={superAdminTabs}
            defaultTab="super-overview"
        />
    );
}
