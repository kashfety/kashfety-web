import { useAuth } from '@/lib/providers/auth-provider';

export interface PermissionConfig {
    allowedRoles: string[];
    requireAll?: boolean;
}

export function usePermissions() {
    const { user } = useAuth();

    const hasRole = (role: string): boolean => {
        return user?.role === role;
    };

    const hasAnyRole = (roles: string[]): boolean => {
        return roles.some(role => user?.role === role);
    };

    const hasAllRoles = (roles: string[]): boolean => {
        return roles.every(role => user?.role === role);
    };

    const hasPermission = (config: PermissionConfig): boolean => {
        if (!user) return false;

        if (config.requireAll) {
            return hasAllRoles(config.allowedRoles);
        }

        return hasAnyRole(config.allowedRoles);
    };

    // Super admin has access to everything
    const isSuperAdmin = (): boolean => {
        return user?.role === 'super_admin';
    };

    // Admin or super admin
    const isAdminOrSuperAdmin = (): boolean => {
        return hasAnyRole(['admin', 'super_admin']);
    };

    // Check if user can manage admins (super admin only)
    const canManageAdmins = (): boolean => {
        return isSuperAdmin();
    };

    // Check if user can manage users (admin or super admin)
    const canManageUsers = (): boolean => {
        return isAdminOrSuperAdmin();
    };

    // Check if user can manage centers (admin or super admin)
    const canManageCenters = (): boolean => {
        return isAdminOrSuperAdmin();
    };

    // Check if user can manage doctors (admin or super admin)
    const canManageDoctors = (): boolean => {
        return isAdminOrSuperAdmin();
    };

    // Check if user can access system settings (super admin only)
    const canAccessSystemSettings = (): boolean => {
        return isSuperAdmin();
    };

    // Check if user can view audit logs (admin or super admin)
    const canViewAuditLogs = (): boolean => {
        return isAdminOrSuperAdmin();
    };

    // Check if user can view all admin activity (super admin only)
    const canViewAdminActivity = (): boolean => {
        return isSuperAdmin();
    };

    return {
        user,
        hasRole,
        hasAnyRole,
        hasAllRoles,
        hasPermission,
        isSuperAdmin,
        isAdminOrSuperAdmin,
        canManageAdmins,
        canManageUsers,
        canManageCenters,
        canManageDoctors,
        canAccessSystemSettings,
        canViewAuditLogs,
        canViewAdminActivity
    };
}

// Higher-order component for role-based access control
export interface WithPermissionsProps {
    allowedRoles: string[];
    fallback?: React.ReactNode;
    requireAll?: boolean;
}

export function withPermissions<T extends object>(
    Component: React.ComponentType<T>,
    permissionConfig: WithPermissionsProps
) {
    return function PermissionWrapper(props: T) {
        const { hasPermission } = usePermissions();

        const hasAccess = hasPermission({
            allowedRoles: permissionConfig.allowedRoles,
            requireAll: permissionConfig.requireAll
        });

        if (!hasAccess) {
            return permissionConfig.fallback || null;
        }

        return <Component { ...props } />;
    };
}

// Role-based component wrapper
export interface RoleGuardProps {
    allowedRoles: string[];
    fallback?: React.ReactNode;
    requireAll?: boolean;
    children: React.ReactNode;
}

export function RoleGuard({
    allowedRoles,
    fallback = null,
    requireAll = false,
    children
}: RoleGuardProps) {
    const { hasPermission } = usePermissions();

    const hasAccess = hasPermission({
        allowedRoles,
        requireAll
    });

    if (!hasAccess) {
        return <>{ fallback } </>;
    }

    return <>{ children } </>;
}

export default usePermissions;
