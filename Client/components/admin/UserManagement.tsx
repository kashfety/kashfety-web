"use client"

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useLocale } from '@/components/providers/locale-provider';
import { localizeSpecialty } from '@/lib/i18n';
import {
    Users,
    Search,
    Filter,
    Eye,
    Edit,
    Trash2,
    UserCheck,
    UserX,
    AlertCircle,
    CheckCircle,
    Clock,
    Mail,
    Phone,
    Calendar,
    Shield,
    MoreHorizontal,
    RefreshCw,
    Download,
    X
} from 'lucide-react';
import { adminService } from '@/lib/api';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

interface User {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: string;
    created_at: string;
    approval_status: string; // Changed from account_status to approval_status
    certificate_status?: string;
    specialty?: string;
    is_active: boolean;
    password_hash?: string; // For displaying current password info
    // Medical information for patients
    medical_history?: string;
    allergies?: string;
    medications?: string;
    date_of_birth?: string;
    gender?: string;
    emergency_contact?: any;
}

interface UserDetails {
    user: User;
    appointments: any[];
    medicalRecords: any[];
    reviews: any[];
    stats: {
        totalAppointments: number;
        totalMedicalRecords: number;
        totalReviews: number;
    };
}

export default function UserManagement() {
    const { toast } = useToast();
    const { t, isRTL, locale } = useLocale();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null);
    const [showUserDetails, setShowUserDetails] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [editForm, setEditForm] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        role: '',
        approval_status: '',
        password: '',
        confirmPassword: ''
    });
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [showBulkActions, setShowBulkActions] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, [currentPage, searchTerm, roleFilter, statusFilter]);

    // Helper function to determine account status from user data
    const getAccountStatus = (user: any) => {
        // If the user has an explicit approval_status field, use it
        if (user.approval_status) {
            return user.approval_status;
        }

        // Patients and centers are automatically approved (no approval needed)
        if (user.role === 'patient' || user.role === 'center') {
            return 'approved';
        }

        // Doctors need approval until certificate is uploaded and approved
        if (user.role === 'doctor') {
            if (!user.certificate_status || user.certificate_status === 'pending') {
                return 'pending';
            }
            if (user.certificate_status === 'approved' || user.certificate_status === 'verified') {
                return 'approved';
            }
            if (user.certificate_status === 'rejected') {
                return 'rejected';
            }
        }

        // Default to approved
        return 'approved';
    };

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const params = {
                page: currentPage,
                limit: 20,
                ...(searchTerm && { search: searchTerm }),
                ...(roleFilter && roleFilter !== 'all' && { role: roleFilter }),
                ...(statusFilter && statusFilter !== 'all' && { status: statusFilter })
            };

            console.log('🔄 Fetching users with params:', params);

            // Use adminService which handles authentication automatically
            const data = await adminService.getAllUsers(params);
            console.log('✅ Users API response:', data);

            // Handle the response structure
            const usersData = data.data?.users || data.users || [];
            const paginationData = data.data?.pagination || data.pagination || {};

            // Transform users data to match our interface and filter out other admins
            const transformedUsers = usersData
                .filter((user: any) => {
                    // Filter out other admins and super_admins (only show them if current user is super_admin)
                    const isAdmin = user.role === 'admin' || user.role === 'super_admin';
                    // For now, allow all users - you can implement current user role checking here
                    return !isAdmin || user.role !== 'admin'; // Hide regular admins but allow super_admins
                })
                .map((user: any) => {
                    return {
                        id: user.id,
                        name: user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown User',
                        email: user.email || '',
                        phone: user.phone || '',
                        role: user.role || 'patient',
                        approval_status: getAccountStatus(user),
                        is_active: user.is_active !== false,
                        created_at: user.created_at,
                        specialty: user.specialty,
                        certificate_status: user.certificate_status || (user.role === 'doctor' ? 'pending' : undefined),
                        password_hash: user.password_hash, // Include password_hash for admin viewing
                        // Medical information for patients
                        medical_history: user.medical_history,
                        allergies: user.allergies,
                        medications: user.medications,
                        date_of_birth: user.date_of_birth,
                        gender: user.gender,
                        emergency_contact: user.emergency_contact
                    };
                }); setUsers(transformedUsers);
            setTotalPages(paginationData.totalPages || Math.ceil(transformedUsers.length / 20));

        } catch (error) {
            console.error('Error fetching users:', error);
            setUsers([]);
            setTotalPages(1);

            toast({
                title: t('admin_error_loading_users') || "Error Loading Users",
                description: t('admin_failed_to_load_users') || "Failed to load user data. Please try again.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const fetchUserDetails = async (userId: string) => {
        try {
            console.log('🔄 Fetching user details for:', userId);

            // Use adminService to get user details
            const response = await adminService.getUserById(userId);
            console.log('✅ User details API response:', response);

            // Handle different response formats
            const apiData = response.data?.data || response.data || response;
            
            // Create user details with real data from API (or fallback to mock if not available)
            const userDetails = {
                user: apiData.user || apiData,
                appointments: apiData.appointments || [],
                medicalRecords: apiData.medicalRecords || [],
                reviews: apiData.reviews || [],
                stats: apiData.stats || {
                    totalAppointments: apiData.appointments?.length || 0,
                    totalMedicalRecords: apiData.medicalRecords?.length || 0,
                    totalReviews: apiData.reviews?.length || 0
                }
            };

            setSelectedUser(userDetails);
            setShowUserDetails(true);
        } catch (error) {
            console.error('❌ Error fetching user details:', error);

            toast({
                title: t('admin_error') || "Error",
                description: t('admin_failed_to_load_user_details') || "Failed to load user details. Please try again.",
                variant: "destructive"
            });
        }
    };

    const updateUserStatus = async (userId: string, updates: any) => {
        try {
            console.log('🔄 Updating user:', userId, 'with updates:', updates);

            // Use adminService for user updates
            const result = await adminService.updateUser(userId, updates);

            let successMessage = t('admin_user_updated_successfully') || "User updated successfully";
            if (result.passwordUpdated) {
                successMessage += " " + (t('admin_and_password_changed') || "and password changed");
            }

            toast({
                title: t('admin_success') || "Success",
                description: successMessage,
            });

            fetchUsers();
            setShowEditDialog(false);
            setEditingUser(null);
        } catch (error) {
            console.error('❌ Error updating user:', error);

            toast({
                title: t('admin_error') || "Error",
                description: t('admin_failed_to_update_user') || "Failed to update user. Please try again.",
                variant: "destructive"
            });
        }
    };

    const deleteUser = async (userId: string) => {
        if (!confirm(t('admin_confirm_delete_user') || 'Are you sure you want to delete this user? This action cannot be undone.')) {
            return;
        }

        try {
            console.log('🔄 Deleting user:', userId);

            // Use adminService for user deletion
            await adminService.deleteUser(userId);

            toast({
                title: t('admin_success') || "Success",
                description: t('admin_user_deleted_successfully') || "User deleted successfully",
            });

            fetchUsers();
        } catch (error) {
            console.error('❌ Error deleting user:', error);

            toast({
                title: t('admin_error') || "Error",
                description: t('admin_failed_to_delete_user') || "Failed to delete user. Please try again.",
                variant: "destructive"
            });
        }
    };

    const handleEditUser = (user: User) => {
        setEditingUser(user);
        setEditForm({
            first_name: user.name?.split(' ')[0] || '',
            last_name: user.name?.split(' ').slice(1).join(' ') || '',
            email: user.email,
            phone: user.phone,
            role: user.role,
            approval_status: user.approval_status,
            password: '',
            confirmPassword: ''
        });
        setShowEditDialog(true);
    };

    const handleSaveEdit = () => {
        if (editingUser) {
            // Validate password fields if they are filled
            if (editForm.password || editForm.confirmPassword) {
                if (editForm.password !== editForm.confirmPassword) {
                    toast({
                        title: t('admin_error') || "Error",
                        description: t('admin_passwords_do_not_match') || "Passwords do not match",
                        variant: "destructive"
                    });
                    return;
                }
            }

            const updates = {
                first_name: editForm.first_name,
                last_name: editForm.last_name,
                email: editForm.email,
                phone: editForm.phone,
                approval_status: editForm.approval_status,
                password: editForm.password,
                confirmPassword: editForm.confirmPassword
            };
            updateUserStatus(editingUser.id, updates);
        }
    };

    const exportUsers = () => {
        try {
            const csv = [
                ['Name', 'Email', 'Phone', 'Role', 'Status', 'Created', 'Specialty', 'Medical History'],
                ...users.map(user => [
                    user.name,
                    user.email,
                    user.phone,
                    user.role,
                    user.approval_status,
                    formatDate(user.created_at),
                    user.specialty ? localizeSpecialty(locale, user.specialty) : '',
                    user.role === 'patient' ? (user.medical_history || '') : ''
                ])
            ].map(row => row.join(',')).join('\n');

            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            window.URL.revokeObjectURL(url);

            toast({
                title: t('admin_export_complete') || "Export Complete",
                description: t('admin_users_exported_csv') || "Users data has been exported to CSV",
            });
        } catch (error) {
            toast({
                title: t('admin_export_failed') || "Export Failed",
                description: t('admin_failed_to_export_users') || "Failed to export users data",
                variant: "destructive"
            });
        }
    };

    const handleSelectUser = (userId: string, selected: boolean) => {
        if (selected) {
            setSelectedUsers([...selectedUsers, userId]);
        } else {
            setSelectedUsers(selectedUsers.filter(id => id !== userId));
        }
    };

    const handleSelectAll = (selected: boolean) => {
        if (selected) {
            setSelectedUsers(users.map(user => user.id));
        } else {
            setSelectedUsers([]);
        }
    };

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'admin':
            case 'super_admin':
                return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
            case 'doctor':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
            case 'patient':
                return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
            case 'center':
                return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
        }
    };

    const getStatusBadgeColor = (status: string) => {
        switch (status) {
            case 'approved': return 'bg-green-100 text-green-800';
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'rejected': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString();
    };

    if (loading) {
        return (
            <div className="space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle>{t('admin_loading_users') || 'Loading users...'}</CardTitle>
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
            <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
                <div className={isRTL ? 'text-right' : 'text-left'}>
                    <h2 className="text-2xl font-bold">{t('admin_user_management') || 'User Management'}</h2>
                    <p className="text-muted-foreground">{t('admin_manage_all_users') || 'Manage all users in the system - patients, doctors, and administrators'}</p>
                </div>
                <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    {selectedUsers.length > 0 && (
                        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <span className="text-sm text-muted-foreground">
                                {selectedUsers.length} {t('admin_selected') || 'selected'}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowBulkActions(!showBulkActions)}
                            >
                                {t('admin_bulk_actions') || 'Bulk Actions'}
                            </Button>
                        </div>
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={exportUsers}
                        className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                    >
                        <Download className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                        {t('admin_export') || 'Export'}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchUsers}
                        className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                    >
                        <RefreshCw className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                        {t('admin_refresh') || 'Refresh'}
                    </Button>
                </div>
            </div>

            {/* Bulk Actions */}
            {showBulkActions && selectedUsers.length > 0 && (
                <Card>
                    <CardContent className="pt-6">
                        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedUsers([])}
                                className="text-red-600"
                            >
                                <X className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                                {t('admin_clear_selection') || 'Clear Selection'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle className={`flex items-center ${isRTL ? 'space-x-reverse space-x-2' : 'space-x-2'}`}>
                        <Filter className="h-5 w-5" />
                        <span>{t('admin_filters') || 'Filters'}</span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="relative">
                            <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-3 h-4 w-4 text-muted-foreground`} />
                            <Input
                                placeholder={t('admin_search_users') || 'Search users...'}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={isRTL ? 'pr-10' : 'pl-10'}
                            />
                        </div>
                        <Select value={roleFilter} onValueChange={setRoleFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder={t('admin_filter_by_role') || 'Filter by role'} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('admin_all_roles') || 'All roles'}</SelectItem>
                                <SelectItem value="admin">{t('admin_admin') || 'Admin'}</SelectItem>
                                <SelectItem value="doctor">{t('admin_doctor') || 'Doctor'}</SelectItem>
                                <SelectItem value="patient">{t('admin_patient') || 'Patient'}</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder={t('admin_filter_by_status') || 'Filter by status'} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('admin_all_statuses') || 'All statuses'}</SelectItem>
                                <SelectItem value="approved">{t('admin_approved') || 'Approved'}</SelectItem>
                                <SelectItem value="pending">{t('admin_pending') || 'Pending'}</SelectItem>
                                <SelectItem value="rejected">{t('admin_rejected') || 'Rejected'}</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button variant="outline" onClick={() => {
                            setSearchTerm('');
                            setRoleFilter('');
                            setStatusFilter('');
                        }}>
                            {t('admin_clear_filters') || 'Clear Filters'}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Users Table */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('admin_users') || 'Users'} ({users.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12">
                                    <Checkbox
                                        checked={selectedUsers.length === users.length && users.length > 0}
                                        onCheckedChange={handleSelectAll}
                                    />
                                </TableHead>
                                <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('admin_name') || 'Name'}</TableHead>
                                <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('admin_contact') || 'Contact'}</TableHead>
                                <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('admin_role') || 'Role'}</TableHead>
                                <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('admin_status') || 'Status'}</TableHead>
                                <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('admin_created') || 'Created'}</TableHead>
                                <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('admin_medical_info') || 'Medical Info'}</TableHead>
                                <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('admin_actions') || 'Actions'}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell>
                                        <Checkbox
                                            checked={selectedUsers.includes(user.id)}
                                            onCheckedChange={(checked) => handleSelectUser(user.id, checked as boolean)}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <div className={isRTL ? 'text-right' : 'text-left'}>
                                            <div className="font-medium">{user.name}</div>
                                            <div className="text-sm text-muted-foreground">{user.email}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                                            <div className={`flex items-center ${isRTL ? 'space-x-reverse space-x-1' : 'space-x-1'}`}>
                                                <Phone className="h-3 w-3" />
                                                <span>{user.phone}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className={isRTL ? 'text-right' : 'text-left'}>
                                            <Badge className={getRoleBadgeColor(user.role)}>
                                                {(user.role || 'user').charAt(0).toUpperCase() + (user.role || 'user').slice(1)}
                                            </Badge>
                                            {user.specialty && (
                                                <div className="text-xs text-muted-foreground mt-1">
                                                    {localizeSpecialty(locale, user.specialty)}
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className={`space-y-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                                            <Badge className={getStatusBadgeColor(user.approval_status)}>
                                                {user.approval_status.replace(/_/g, ' ')}
                                            </Badge>
                                            <div className={`flex items-center ${isRTL ? 'space-x-reverse space-x-1' : 'space-x-1'}`}>
                                                <span className={`text-xs px-1.5 py-0.5 rounded ${user.password_hash ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                    {user.password_hash ? '🔐 ' + (t('admin_password') || 'Password') : '❌ ' + (t('admin_no_password') || 'No Password')}
                                                </span>
                                            </div>
                                            {user.certificate_status && user.role === 'doctor' && (
                                                <div className="text-xs text-muted-foreground">
                                                    {t('admin_cert') || 'Cert'}: {user.certificate_status}
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                                            {formatDate(user.created_at)}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                                            {user.role === 'patient' ? (
                                                <div>
                                                    {user.medical_history ? (
                                                        <div className="text-xs text-muted-foreground truncate max-w-32">
                                                            {user.medical_history}
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground">{t('admin_no_medical_history') || 'No medical history'}</span>
                                                    )}
                                                    {user.allergies && (
                                                        <div className="text-xs text-red-600 mt-1">
                                                            {t('admin_allergies') || 'Allergies'}: {user.allergies}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground">N/A</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="sm">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align={isRTL ? 'start' : 'end'}>
                                                <DropdownMenuItem onClick={() => fetchUserDetails(user.id)}>
                                                    <Eye className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                                                    {t('admin_view_details') || 'View Details'}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleEditUser(user)}>
                                                    <Edit className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                                                    {t('admin_edit_user') || 'Edit User'}
                                                </DropdownMenuItem>

                                                <DropdownMenuItem
                                                    onClick={() => deleteUser(user.id)}
                                                    className="text-red-600"
                                                >
                                                    <Trash2 className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                                                    {t('admin_delete_user') || 'Delete User'}
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
                        <div className={`flex items-center justify-between mt-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <div className={`text-sm text-muted-foreground ${isRTL ? 'text-right' : 'text-left'}`}>
                                {t('admin_page') || 'Page'} {currentPage} {t('admin_of') || 'of'} {totalPages}
                            </div>
                            <div className={`flex ${isRTL ? 'space-x-reverse space-x-2' : 'space-x-2'}`}>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                    disabled={currentPage === 1}
                                >
                                    {t('admin_previous') || 'Previous'}
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                    disabled={currentPage === totalPages}
                                >
                                    {t('admin_next') || 'Next'}
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* User Details Dialog */}
            <Dialog open={showUserDetails} onOpenChange={setShowUserDetails}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle className={isRTL ? 'text-right' : 'text-left'}>{t('admin_user_details') || 'User Details'}</DialogTitle>
                    </DialogHeader>
                    {selectedUser && (
                        <div className="space-y-6">
                            {/* User Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className={isRTL ? 'text-right' : 'text-left'}>
                                    <h3 className="font-semibold mb-2">{t('admin_basic_information') || 'Basic Information'}</h3>
                                    <div className="space-y-2 text-sm">
                                        <div><strong>{t('admin_name') || 'Name'}:</strong> {selectedUser.user.name}</div>
                                        <div><strong>{t('admin_email') || 'Email'}:</strong> {selectedUser.user.email}</div>
                                        <div><strong>{t('admin_phone') || 'Phone'}:</strong> {selectedUser.user.phone}</div>
                                        <div><strong>{t('admin_role') || 'Role'}:</strong> {selectedUser.user.role}</div>
                                        <div><strong>{t('admin_created') || 'Created'}:</strong> {formatDate(selectedUser.user.created_at)}</div>
                                        {selectedUser.user.date_of_birth && (
                                            <div><strong>{t('admin_date_of_birth') || 'Date of Birth'}:</strong> {formatDate(selectedUser.user.date_of_birth)}</div>
                                        )}
                                        {selectedUser.user.gender && (
                                            <div><strong>{t('admin_gender') || 'Gender'}:</strong> {selectedUser.user.gender}</div>
                                        )}
                                    </div>
                                </div>
                                <div className={isRTL ? 'text-right' : 'text-left'}>
                                    <h3 className="font-semibold mb-2">{t('admin_activity_statistics') || 'Activity Statistics'}</h3>
                                    <div className="space-y-2 text-sm">
                                        <div><strong>{t('admin_total_appointments') || 'Total Appointments'}:</strong> {selectedUser.stats.totalAppointments}</div>
                                        <div><strong>{t('admin_medical_records') || 'Medical Records'}:</strong> {selectedUser.stats.totalMedicalRecords}</div>
                                        <div><strong>{t('admin_reviews') || 'Reviews'}:</strong> {selectedUser.stats.totalReviews}</div>
                                        <div><strong>{t('admin_approval_status') || 'Approval Status'}:</strong> {selectedUser.user.approval_status}</div>
                                        <div><strong>{t('admin_password_status') || 'Password Status'}:</strong>
                                            <span className={selectedUser.user.password_hash && selectedUser.user.password_hash !== null && selectedUser.user.password_hash !== '' ? `text-green-600 ${isRTL ? 'mr-1' : 'ml-1'}` : `text-red-600 ${isRTL ? 'mr-1' : 'ml-1'}`}>
                                                {selectedUser.user.password_hash && selectedUser.user.password_hash !== null && selectedUser.user.password_hash !== '' ? '✅ ' + (t('admin_password_set') || 'Password Set') : '❌ ' + (t('admin_no_password_set') || 'No Password Set')}
                                            </span>
                                            {selectedUser.user.password_hash ? (
                                                <div className="text-xs text-gray-500 mt-1 font-mono bg-gray-100 p-1 rounded">
                                                    <strong>{t('admin_hash') || 'Hash'}:</strong> {selectedUser.user.password_hash.substring(0, 20)}...
                                                </div>
                                            ) : (
                                                <div className="text-xs text-orange-600 mt-1">
                                                    ⚠️ {t('admin_user_needs_password') || 'User needs to set a password or admin can set one via edit'}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Medical Information for Patients */}
                            {selectedUser.user.role === 'patient' && (
                                <div className={isRTL ? 'text-right' : 'text-left'}>
                                    <h3 className="font-semibold mb-2">{t('admin_medical_information') || 'Medical Information'}</h3>
                                    <div className="space-y-2 text-sm">
                                        {selectedUser.user.medical_history && (
                                            <div><strong>{t('admin_medical_history') || 'Medical History'}:</strong> {selectedUser.user.medical_history}</div>
                                        )}
                                        {selectedUser.user.allergies && (
                                            <div><strong>{t('admin_allergies') || 'Allergies'}:</strong> {selectedUser.user.allergies}</div>
                                        )}
                                        {selectedUser.user.medications && (
                                            <div><strong>{t('admin_current_medications') || 'Current Medications'}:</strong> {selectedUser.user.medications}</div>
                                        )}
                                        {selectedUser.user.emergency_contact && (
                                            <div>
                                                <strong>{t('admin_emergency_contact') || 'Emergency Contact'}:</strong>
                                                {typeof selectedUser.user.emergency_contact === 'object' ? (
                                                    <div className={`${isRTL ? 'mr-4' : 'ml-4'} mt-1`}>
                                                        {selectedUser.user.emergency_contact.name && (
                                                            <div>{t('admin_name') || 'Name'}: {selectedUser.user.emergency_contact.name}</div>
                                                        )}
                                                        {selectedUser.user.emergency_contact.phone && (
                                                            <div>{t('admin_phone') || 'Phone'}: {selectedUser.user.emergency_contact.phone}</div>
                                                        )}
                                                        {selectedUser.user.emergency_contact.relationship && (
                                                            <div>{t('admin_relationship') || 'Relationship'}: {selectedUser.user.emergency_contact.relationship}</div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span> {selectedUser.user.emergency_contact}</span>
                                                )}
                                            </div>
                                        )}
                                        {!selectedUser.user.medical_history && !selectedUser.user.allergies &&
                                            !selectedUser.user.medications && !selectedUser.user.emergency_contact && (
                                                <div className="text-muted-foreground">{t('admin_no_medical_info_available') || 'No medical information available'}</div>
                                            )}
                                    </div>
                                </div>
                            )}

                            {/* Recent Activity */}
                            <div className={isRTL ? 'text-right' : 'text-left'}>
                                <h3 className="font-semibold mb-2">{t('admin_recent_appointments') || 'Recent Appointments'}</h3>
                                <div className="space-y-2">
                                    {(selectedUser.appointments || []).slice(0, 5).map((apt: any) => (
                                        <div key={apt.id} className="p-2 border rounded text-sm">
                                            <div className={`flex ${isRTL ? 'flex-row-reverse' : 'justify-between'}`}>
                                                <span>{apt.appointment_date} {t('admin_at') || 'at'} {apt.appointment_time}</span>
                                                <Badge variant="outline">{apt.status}</Badge>
                                            </div>
                                        </div>
                                    ))}
                                    {selectedUser.appointments.length === 0 && (
                                        <p className="text-muted-foreground">{t('admin_no_appointments_found') || 'No appointments found'}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Edit User Dialog */}
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className={isRTL ? 'text-right' : 'text-left'}>{t('admin_edit_user_details') || 'Edit User Details'}</DialogTitle>
                        <DialogDescription className={isRTL ? 'text-right' : 'text-left'}>
                            {t('admin_update_user_info') || 'Update user information, status, and password settings.'}
                        </DialogDescription>
                    </DialogHeader>
                    {editingUser && (
                        <div className="space-y-4">
                            {/* Basic Information */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className={isRTL ? 'text-right' : 'text-left'}>
                                    <label className="text-sm font-medium">{t('admin_first_name') || 'First Name'}</label>
                                    <Input
                                        value={editForm.first_name}
                                        onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                                        placeholder={t('admin_enter_first_name') || 'Enter first name'}
                                    />
                                </div>
                                <div className={isRTL ? 'text-right' : 'text-left'}>
                                    <label className="text-sm font-medium">{t('admin_last_name') || 'Last Name'}</label>
                                    <Input
                                        value={editForm.last_name}
                                        onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                                        placeholder={t('admin_enter_last_name') || 'Enter last name'}
                                    />
                                </div>
                            </div>

                            <div className={isRTL ? 'text-right' : 'text-left'}>
                                <label className="text-sm font-medium">{t('admin_email') || 'Email'}</label>
                                <Input
                                    type="email"
                                    value={editForm.email}
                                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                    placeholder={t('admin_enter_email') || 'Enter email address'}
                                />
                            </div>

                            <div className={isRTL ? 'text-right' : 'text-left'}>
                                <label className="text-sm font-medium">{t('admin_phone_number') || 'Phone Number'}</label>
                                <Input
                                    value={editForm.phone}
                                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                    placeholder={t('admin_enter_phone') || 'Enter phone number'}
                                />
                            </div>

                            {/* Role - Read-only for patients and centers */}
                            <div className={isRTL ? 'text-right' : 'text-left'}>
                                <label className="text-sm font-medium">{t('admin_role') || 'Role'}</label>
                                {editingUser.role === 'patient' || editingUser.role === 'center' ? (
                                    <Input
                                        value={editForm.role.charAt(0).toUpperCase() + editForm.role.slice(1)}
                                        disabled
                                        className="bg-gray-100"
                                    />
                                ) : (
                                    <Select value={editForm.role} onValueChange={(value) => setEditForm({ ...editForm, role: value })}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="doctor">{t('admin_doctor') || 'Doctor'}</SelectItem>
                                            <SelectItem value="admin">{t('admin_admin') || 'Admin'}</SelectItem>
                                            <SelectItem value="super_admin">{t('admin_super_admin') || 'Super Admin'}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>

                            <div className={isRTL ? 'text-right' : 'text-left'}>
                                <label className="text-sm font-medium">{t('admin_account_status') || 'Account Status'}</label>
                                <Select value={editForm.approval_status} onValueChange={(value) => setEditForm({ ...editForm, approval_status: value })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="approved">{t('admin_approved') || 'Approved'}</SelectItem>
                                        <SelectItem value="pending">{t('admin_pending') || 'Pending'}</SelectItem>
                                        <SelectItem value="rejected">{t('admin_rejected') || 'Rejected'}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Password Fields */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className={isRTL ? 'text-right' : 'text-left'}>
                                    <label className="text-sm font-medium">
                                        {t('admin_password') || 'Password'} <span className="text-gray-500">({t('admin_leave_empty_to_keep_current') || 'leave empty to keep current'})</span>
                                    </label>
                                    <Input
                                        type="password"
                                        value={editForm.password}
                                        onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                                        placeholder={t('admin_enter_new_password_optional') || 'Enter new password (optional)'}
                                    />
                                </div>
                                <div className={isRTL ? 'text-right' : 'text-left'}>
                                    <label className="text-sm font-medium">
                                        {t('admin_confirm_password') || 'Confirm Password'} <span className="text-gray-500">({t('admin_if_changing_password') || 'if changing password'})</span>
                                    </label>
                                    <Input
                                        type="password"
                                        value={editForm.confirmPassword}
                                        onChange={(e) => setEditForm({ ...editForm, confirmPassword: e.target.value })}
                                        placeholder={t('admin_confirm_new_password') || 'Confirm new password'}
                                    />
                                </div>
                            </div>
                            {editingUser && (
                                <div className={`bg-blue-50 p-3 rounded-md ${isRTL ? 'text-right' : 'text-left'}`}>
                                    <div className="text-sm text-blue-700">
                                        <strong>{t('admin_current_password_status') || 'Current Password Status'}:</strong> {editingUser.password_hash && editingUser.password_hash !== null && editingUser.password_hash !== '' ? (t('admin_password_is_set') || 'Password is set') : (t('admin_no_password_set') || 'No password set')}
                                        {editingUser.password_hash && (
                                            <div className="text-xs text-gray-500 mt-1">
                                                {t('admin_current_hash') || 'Current Hash'}: {editingUser.password_hash}
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-sm text-blue-600 mt-1">
                                        {t('admin_password_instructions') || 'Leave password fields empty to keep the current password. Fill both fields to change the password.'}
                                    </p>
                                </div>
                            )}

                            <div className={`flex ${isRTL ? 'justify-start space-x-reverse space-x-2' : 'justify-end space-x-2'}`}>
                                <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                                    {t('admin_cancel') || 'Cancel'}
                                </Button>
                                <Button onClick={handleSaveEdit}>
                                    {t('admin_save_changes') || 'Save Changes'}
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
