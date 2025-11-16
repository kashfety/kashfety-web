"use client"

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import {
    Shield,
    Plus,
    Search,
    Filter,
    Eye,
    Edit,
    Trash2,
    Lock,
    Unlock,
    UserX,
    UserCheck,
    Crown,
    AlertTriangle,
    Calendar,
    Clock,
    Mail,
    Phone,
    MoreHorizontal,
    RefreshCw,
    CheckCircle,
    XCircle,
    History,
    Settings
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Alert,
    AlertDescription,
    AlertTitle,
} from '@/components/ui/alert';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface AdminUser {
    id: string;
    uid: string;
    name: string;
    email: string;
    phone: string;
    role: 'admin' | 'super_admin';
    isActive: boolean;
    lastLogin: string | null;
    loginCount: number;
    createdAt: string;
    createdBy: string | null;
    accountLocked: boolean;
    lockReason: string | null;
    lockedAt: string | null;
    lockedBy: string | null;
    permissions: {
        user_management?: boolean;
        admin_management?: boolean;
        system_settings?: boolean;
        audit_logs?: boolean;
        all?: boolean;
    };
}

interface AdminFormData {
    name: string;
    email: string;
    phone: string;
    role: 'admin' | 'super_admin';
    password: string;
    confirmPassword: string;
}

export default function AdminManagement() {
    const { toast } = useToast();
    const [admins, setAdmins] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);
    const [showAdminDetails, setShowAdminDetails] = useState(false);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [adminToDelete, setAdminToDelete] = useState<AdminUser | null>(null);
    const [formData, setFormData] = useState<AdminFormData>({
        name: '',
        email: '',
        phone: '',
        role: 'admin',
        password: '',
        confirmPassword: ''
    });

    const fetchAdmins = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page: currentPage.toString(),
                limit: '20',
                ...(searchTerm && { search: searchTerm }),
                ...(roleFilter && roleFilter !== 'all' && { role: roleFilter }),
                ...(statusFilter && statusFilter !== 'all' && { status: statusFilter })
            });

            // Try fallback route first for Vercel compatibility
            let response;
            let data;

            try {
                console.log('👑 Trying super-admin-admins fallback route');
                // Add cache-busting timestamp to ensure fresh data
                const cacheBuster = `&_t=${Date.now()}`;
                response = await fetch(`/api/super-admin-admins?${params}${cacheBuster}`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                        'Content-Type': 'application/json',
                        'Cache-Control': 'no-cache'
                    }
                });

                if (response.ok) {
                    data = await response.json();
                    if (data.success && data.data?.admins) {
                        console.log('✅ Fallback route worked for super admin admins');
                        // Continue with transformation below
                    } else {
                        throw new Error('Invalid response structure');
                    }
                } else {
                    throw new Error('Fallback route failed');
                }
            } catch (fallbackError) {
                console.log('❌ Fallback failed, trying backend route');

                // Fallback to backend route
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
                const baseUrl = apiUrl.endsWith('/api') ? apiUrl : `${apiUrl.replace(/\/$/, '')}/api`

                response = await fetch(`${baseUrl}/super-admin/admins?${params}`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch admins');
                }

                data = await response.json();
            }

            // Transform the data from the super-admin endpoint
            console.log('📊 [AdminManagement] Raw data received:', data);
            const adminUsers = (data.data?.admins || data.admins || [])
                .map((user: any) => {
                    // Determine the name - prioritize name field, then first_name + last_name, then email prefix
                    let displayName = 'Unknown';
                    if (user.name && typeof user.name === 'string' && user.name.trim()) {
                        displayName = user.name.trim();
                    } else if (user.first_name || user.last_name) {
                        displayName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
                    } else if (user.email) {
                        displayName = user.email.split('@')[0];
                    }

                    const transformed = {
                        id: user.id,
                        uid: user.uid || `admin-${user.id}`,
                        name: displayName,
                        email: user.email || '',
                        phone: user.phone || 'Not provided',
                        role: user.role,
                        isActive: user.is_active !== false,
                        lastLogin: user.last_login || user.updated_at,
                        loginCount: user.login_count || 0,
                        createdAt: user.created_at,
                        createdBy: user.created_by || 'system',
                        accountLocked: user.account_locked || false,
                        lockReason: user.account_locked ? user.lock_reason || 'Account locked' : null,
                        lockedAt: user.account_locked ? user.locked_at || user.updated_at : null,
                        lockedBy: user.account_locked ? user.locked_by || 'system' : null,
                        permissions: {
                            user_management: user.role === 'admin' || user.role === 'super_admin',
                            admin_management: user.role === 'super_admin',
                            system_settings: user.role === 'super_admin',
                            audit_logs: user.role === 'admin' || user.role === 'super_admin',
                            all: user.role === 'super_admin'
                        }
                    };
                    // Log the transformed user for debugging
                    if (user.email === 'm.ismail.official23@gmail.com') {
                        console.log('🔍 [AdminManagement] Transformed user:', transformed);
                        console.log('🔍 [AdminManagement] Original user data:', user);
                    }

                    // Log name resolution for debugging (only for specific user to avoid console spam)
                    if (user.email === 'm.ismail.official23@gmail.com' || !user.name) {
                        console.log(`👤 [AdminManagement] User ${user.id || user.email}: name="${user.name}", first_name="${user.first_name}", last_name="${user.last_name}", displayName="${displayName}"`);
                    }

                    return transformed;
                });

            console.log('📊 [AdminManagement] Setting admins:', adminUsers.length, 'admins');
            console.log('📊 [AdminManagement] Admin names:', adminUsers.map((a: AdminUser) => ({ id: a.id, name: a.name, email: a.email })));
            setAdmins(adminUsers);
            setTotalPages(data.data?.pagination?.totalPages || data.pagination?.totalPages || 1);
        } catch (error) {
            console.error('Error fetching admins:', error);

            toast({
                title: "Error",
                description: "Failed to fetch admin users. Please check your connection and try again.",
                variant: "destructive"
            });

            setAdmins([]);
            setTotalPages(1);
        } finally {
            setLoading(false);
        }
    }, [currentPage, searchTerm, roleFilter, statusFilter]);

    useEffect(() => {
        fetchAdmins();
    }, [fetchAdmins]);

    const createAdmin = async () => {
        try {
            console.log('🚀 Creating admin with data:', formData);

            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
            const baseUrl = apiUrl.endsWith('/api') ? apiUrl : `${apiUrl.replace(/\/$/, '')}/api`

            // Prepare data for backend - only send necessary fields
            const adminData = {
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                role: formData.role,
                password: formData.password
            };

            console.log('📤 Sending request to:', `${baseUrl}/super-admin/admins`);
            console.log('📤 Admin data:', { ...adminData, password: '[HIDDEN]' });

            const response = await fetch(`${baseUrl}/super-admin/admins`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(adminData)
            });

            console.log('📥 Response status:', response.status);

            if (!response.ok) {
                const errorData = await response.json();
                console.error('❌ Server error:', errorData);
                throw new Error(errorData.message || 'Failed to create admin');
            }

            const result = await response.json();
            console.log('✅ Admin created successfully:', result);

            toast({
                title: "Success",
                description: "Admin created successfully",
            });

            setShowCreateDialog(false);
            resetFormData();
            fetchAdmins();
        } catch (error) {
            console.error('❌ Error creating admin:', error);
            const errorMessage = error instanceof Error ? error.message : "Failed to create admin";
            toast({
                title: "Error",
                description: errorMessage,
                variant: "destructive"
            });
        }
    };

    const updateAdmin = async (adminId: string, formData: AdminFormData) => {
        try {
            console.log('🔄 Updating admin with data:', formData);

            // Prepare data for backend - only send editable fields
            const updateData = {
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                role: formData.role
            };

            // Try fallback route first for Vercel compatibility
            let response;
            let result;

            try {
                console.log('👑 Trying super-admin-update-admin fallback route');
                response = await fetch(`/api/super-admin-update-admin?adminId=${adminId}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(updateData)
                });

                if (response.ok) {
                    result = await response.json();
                    if (result.success) {
                        console.log('✅ Fallback route worked for updating admin');
                        // Continue with success handling below
                    } else {
                        throw new Error(result.error || 'Update failed');
                    }
                } else {
                    throw new Error('Fallback route failed');
                }
            } catch (fallbackError) {
                console.log('❌ Fallback failed, trying backend route');

                // Fallback to backend route
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
                const baseUrl = apiUrl.endsWith('/api') ? apiUrl : `${apiUrl.replace(/\/$/, '')}/api`

                console.log('📤 Sending update request to:', `${baseUrl}/super-admin/admins/${adminId}`);
                console.log('📤 Update data:', updateData);

                response = await fetch(`${baseUrl}/super-admin/admins/${adminId}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(updateData)
                });

                console.log('📥 Response status:', response.status);

                if (!response.ok) {
                    const errorData = await response.json();
                    console.error('❌ Server error:', errorData);
                    throw new Error(errorData.message || 'Failed to update admin');
                }

                result = await response.json();
            }

            console.log('✅ Admin updated successfully:', result);

            toast({
                title: "Success",
                description: "Admin updated successfully",
            });

            // Close dialog and reset form first
            setShowEditDialog(false);
            setEditingAdmin(null);
            resetFormData();

            // Refresh the admin list with a small delay to ensure DB is updated
            // Don't use setCurrentPage as it triggers useEffect which could cause loops
            setTimeout(() => {
                console.log('🔄 [AdminManagement] Refreshing admin list after update...');
                fetchAdmins();
            }, 1000); // Increased delay to ensure DB consistency
        } catch (error) {
            console.error('❌ Error updating admin:', error);
            const errorMessage = error instanceof Error ? error.message : "Failed to update admin";
            toast({
                title: "Error",
                description: errorMessage,
                variant: "destructive"
            });
        }
    };

    const deleteAdmin = async (adminId: string) => {
        try {
            console.log('🗑️ [AdminManagement] Deleting admin:', adminId);

            // For production, directly use the backend API
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
            const baseUrl = apiUrl.endsWith('/api') ? apiUrl : `${apiUrl.replace(/\/$/, '')}/api`;
            const backendUrl = `${baseUrl}/super-admin/admins/${adminId}`;

            console.log('🔄 Using backend URL:', backendUrl);

            const response = await fetch(backendUrl, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('❌ Delete error:', response.status, errorData);
                const errorMsg = errorData.error || errorData.message || errorData.details || 'Failed to delete admin';
                throw new Error(errorMsg);
            }

            const data = await response.json();
            console.log('✅ Admin deleted successfully:', data);

            toast({
                title: "Success",
                description: "Admin deleted successfully",
            });

            fetchAdmins();
        } catch (error) {
            console.error('❌ Error deleting admin:', error);
            const errorMessage = error instanceof Error ? error.message : "Failed to delete admin";
            toast({
                title: "Error",
                description: errorMessage,
                variant: "destructive"
            });
        } finally {
            setShowDeleteDialog(false);
            setAdminToDelete(null);
        }
    };

    const handleDeleteClick = (admin: AdminUser) => {
        setAdminToDelete(admin);
        setShowDeleteDialog(true);
    };

    const confirmDelete = async () => {
        if (adminToDelete) {
            await deleteAdmin(adminToDelete.id);
        }
    };

    const resetFormData = () => {
        setFormData({
            name: '',
            email: '',
            phone: '',
            role: 'admin',
            password: '',
            confirmPassword: ''
        });
    };

    const handleCreateAdmin = () => {
        resetFormData();
        setShowCreateDialog(true);
    };

    const handleEditAdmin = (admin: AdminUser) => {
        setEditingAdmin(admin);
        setFormData({
            name: admin.name,
            email: admin.email,
            phone: admin.phone || '',
            role: admin.role,
            password: '',
            confirmPassword: ''
        });
        setShowEditDialog(true);
    };

    const getStatusBadgeColor = (admin: AdminUser) => {
        if (admin.accountLocked) return 'bg-red-100 text-red-800';
        if (!admin.isActive) return 'bg-gray-100 text-gray-800';
        return 'bg-green-100 text-green-800';
    };

    const getStatusText = (admin: AdminUser) => {
        if (admin.accountLocked) return 'Locked';
        if (!admin.isActive) return 'Inactive';
        return 'Active';
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'Never';
        return new Date(dateString).toLocaleDateString();
    };

    const formatDateTime = (dateString: string | null) => {
        if (!dateString) return 'Never';
        return new Date(dateString).toLocaleString();
    };

    if (loading) {
        return (
            <div className="space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Loading admins...</CardTitle>
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
                        <Shield className="h-6 w-6 mr-2 text-blue-600" />
                        Admin Management
                    </h2>
                    <p className="text-muted-foreground">Manage admin users and their permissions</p>
                </div>
                <div className="flex space-x-2">
                    <Button onClick={fetchAdmins}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                    <Button onClick={handleCreateAdmin}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Admin
                    </Button>
                </div>
            </div>

            {/* Warning Alert */}
            <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Super Admin Access</AlertTitle>
                <AlertDescription>
                    You have full control over admin accounts. Use these powers responsibly. All actions are logged and auditable.
                </AlertDescription>
            </Alert>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                        <Filter className="h-5 w-5" />
                        <span>Filters</span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search admins..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Select value={roleFilter} onValueChange={setRoleFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="Filter by role" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All roles</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="super_admin">Super Admin</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All statuses</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                                <SelectItem value="locked">Locked</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button variant="outline" onClick={() => {
                            setSearchTerm('');
                            setRoleFilter('all');
                            setStatusFilter('all');
                        }}>
                            Clear Filters
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Admins Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Admins ({admins.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Admin</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Last Login</TableHead>
                                <TableHead>Login Count</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {admins.map((admin) => (
                                <TableRow key={admin.id}>
                                    <TableCell>
                                        <div>
                                            <div className="font-medium flex items-center">
                                                {admin.role === 'super_admin' && (
                                                    <Crown className="h-4 w-4 text-yellow-500 mr-1" />
                                                )}
                                                {admin.name}
                                            </div>
                                            <div className="text-sm text-muted-foreground">{admin.email}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-sm">{admin.phone}</div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={admin.role === 'super_admin' ? 'default' : 'secondary'}>
                                            {admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center space-x-2">
                                            <Badge className={getStatusBadgeColor(admin)}>
                                                {getStatusText(admin)}
                                            </Badge>
                                            {admin.accountLocked && (
                                                <Lock className="h-4 w-4 text-red-500" />
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-sm">
                                            {formatDateTime(admin.lastLogin)}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-sm">
                                            {admin.loginCount}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-sm">
                                            {formatDate(admin.createdAt)}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="sm">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => {
                                                    setSelectedAdmin(admin);
                                                    setShowAdminDetails(true);
                                                }}>
                                                    <Eye className="h-4 w-4 mr-2" />
                                                    View Details
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleEditAdmin(admin)}>
                                                    <Edit className="h-4 w-4 mr-2" />
                                                    Edit Admin
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    onClick={() => handleDeleteClick(admin)}
                                                    className="text-red-600"
                                                    disabled={admin.role === 'super_admin'}
                                                >
                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                    Delete Admin
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
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

            {/* Admin Details Dialog */}
            <Dialog open={showAdminDetails} onOpenChange={setShowAdminDetails}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Admin Details</DialogTitle>
                    </DialogHeader>
                    {selectedAdmin && (
                        <div className="space-y-6">
                            {/* Basic Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <h3 className="font-semibold mb-2">Basic Information</h3>
                                    <div className="space-y-2 text-sm">
                                        <div><strong>Name:</strong> {selectedAdmin.name}</div>
                                        <div><strong>Email:</strong> {selectedAdmin.email}</div>
                                        <div><strong>Phone:</strong> {selectedAdmin.phone}</div>
                                        <div><strong>Role:</strong>
                                            <Badge className="ml-2" variant={selectedAdmin.role === 'super_admin' ? 'default' : 'secondary'}>
                                                {selectedAdmin.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                                            </Badge>
                                        </div>
                                        <div><strong>Status:</strong>
                                            <Badge className={`ml-2 ${getStatusBadgeColor(selectedAdmin)}`}>
                                                {getStatusText(selectedAdmin)}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="font-semibold mb-2">Activity Information</h3>
                                    <div className="space-y-2 text-sm">
                                        <div><strong>Last Login:</strong> {formatDateTime(selectedAdmin.lastLogin)}</div>
                                        <div><strong>Login Count:</strong> {selectedAdmin.loginCount}</div>
                                        <div><strong>Created:</strong> {formatDate(selectedAdmin.createdAt)}</div>
                                        <div><strong>Created By:</strong> {selectedAdmin.createdBy || 'System'}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Permissions */}
                            <div>
                                <h3 className="font-semibold mb-2">Permissions</h3>
                                <div className="grid grid-cols-3 gap-2">
                                    {Object.entries(selectedAdmin.permissions).map(([permission, granted]) => (
                                        <div key={permission} className="flex items-center space-x-2">
                                            {granted ? (
                                                <CheckCircle className="h-4 w-4 text-green-500" />
                                            ) : (
                                                <XCircle className="h-4 w-4 text-red-500" />
                                            )}
                                            <span className="text-sm capitalize">
                                                {permission.replace('_', ' ')}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Lock Information */}
                            {selectedAdmin.accountLocked && (
                                <div>
                                    <h3 className="font-semibold mb-2 text-red-600">Lock Information</h3>
                                    <div className="space-y-2 text-sm">
                                        <div><strong>Reason:</strong> {selectedAdmin.lockReason}</div>
                                        <div><strong>Locked At:</strong> {formatDateTime(selectedAdmin.lockedAt)}</div>
                                        <div><strong>Locked By:</strong> {selectedAdmin.lockedBy}</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Create/Edit Admin Dialog */}
            <Dialog open={showCreateDialog || showEditDialog} onOpenChange={(open) => {
                if (!open) {
                    setShowCreateDialog(false);
                    setShowEditDialog(false);
                    setEditingAdmin(null);
                }
            }}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingAdmin ? 'Edit Admin' : 'Create New Admin'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium">Full Name</label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Enter full name"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium">Email</label>
                                <Input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="Enter email"
                                    disabled={!!editingAdmin}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium">Phone Number</label>
                                <Input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="Enter phone number"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium">Role</label>
                                <Select value={formData.role} onValueChange={(value: 'admin' | 'super_admin') =>
                                    setFormData({ ...formData, role: value })
                                }>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="admin">Admin</SelectItem>
                                        <SelectItem value="super_admin">Super Admin</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {!editingAdmin && (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium">Password</label>
                                    <Input
                                        type="password"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        placeholder="Enter password"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Confirm Password</label>
                                    <Input
                                        type="password"
                                        value={formData.confirmPassword}
                                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                        placeholder="Confirm password"
                                    />
                                </div>
                            </div>
                        )}

                        {editingAdmin && (
                            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                                <p className="text-sm text-blue-700">
                                    <strong>Note:</strong> Password will remain unchanged when editing admin details.
                                    To change password, please use a separate password reset process.
                                </p>
                            </div>
                        )}

                        <div className="flex justify-end space-x-2">
                            <Button variant="outline" onClick={() => {
                                setShowCreateDialog(false);
                                setShowEditDialog(false);
                                setEditingAdmin(null);
                            }}>
                                Cancel
                            </Button>
                            <Button
                                onClick={(e) => {
                                    e.preventDefault();
                                    console.log('🔘 Create Admin button clicked');
                                    console.log('📝 Current form data:', formData);

                                    // Validation
                                    if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim()) {
                                        console.log('❌ Validation failed: Missing required fields');
                                        toast({
                                            title: "Validation Error",
                                            description: "Please fill in all required fields (name, email, phone)",
                                            variant: "destructive"
                                        });
                                        return;
                                    }

                                    if (!editingAdmin) {
                                        // For new admin creation, validate passwords
                                        if (!formData.password.trim() || !formData.confirmPassword.trim()) {
                                            console.log('❌ Validation failed: Missing password fields');
                                            toast({
                                                title: "Validation Error",
                                                description: "Please provide a password and confirmation",
                                                variant: "destructive"
                                            });
                                            return;
                                        }

                                        if (formData.password !== formData.confirmPassword) {
                                            console.log('❌ Validation failed: Passwords do not match');
                                            toast({
                                                title: "Validation Error",
                                                description: "Passwords do not match",
                                                variant: "destructive"
                                            });
                                            return;
                                        }
                                    }

                                    console.log('✅ Validation passed, proceeding with creation');

                                    if (editingAdmin) {
                                        updateAdmin(editingAdmin.id, formData);
                                    } else {
                                        createAdmin();
                                    }
                                }}
                            >
                                {editingAdmin ? 'Update Admin' : 'Create Admin'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Admin Account</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete <strong>{adminToDelete?.name}</strong> ({adminToDelete?.email})?
                            This action cannot be undone and will permanently remove this admin account.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            Delete Admin
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
