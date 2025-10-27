"use client"

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useLocale } from '@/components/providers/locale-provider';
import {
    Building2,
    Plus,
    Search,
    Filter,
    Eye,
    Edit,
    Trash2,
    MapPin,
    Phone,
    Mail,
    Clock,
    Users,
    Calendar,
    Star,
    MoreHorizontal,
    RefreshCw,
    CheckCircle
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

interface Center {
    id: string;
    name: string;
    address: string;
    phone: string;
    email: string;
    operating_hours: any; // jsonb in database
    services: string[]; // array in database
    center_type: string;
    approval_status: string;
    offers_labs: boolean;
    offers_imaging: boolean;
    created_at: string;
    updated_at: string;
    owner_doctor_id?: string;
    is_active?: boolean;
    description?: string;
    admin_notes?: string;
    password_hash?: string; // For displaying current password info
    stats?: {
        totalDoctors: number;
        totalAppointments: number;
        averageRating: number;
    };
}

interface CenterFormData {
    name: string;
    address: string;
    phone: string;
    email: string;
    operating_hours: string;
    services: string[];
    center_type: string;
    approval_status: string;
    offers_labs: boolean;
    offers_imaging: boolean;
    description?: string;
    admin_notes?: string;
    password?: string;
    confirmPassword?: string;
}

export default function CenterManagement() {
    const { toast } = useToast();
    const { t, isRTL } = useLocale();
    const [centers, setCenters] = useState<Center[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedCenter, setSelectedCenter] = useState<Center | null>(null);
    const [showCenterDetails, setShowCenterDetails] = useState(false);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [editingCenter, setEditingCenter] = useState<Center | null>(null);
    const [formData, setFormData] = useState<CenterFormData>({
        name: '',
        address: '',
        phone: '',
        email: '',
        operating_hours: '',
        services: [],
        center_type: 'generic',
        approval_status: 'approved',
        offers_labs: false,
        offers_imaging: false
    });

    useEffect(() => {
        fetchCenters();
    }, [currentPage, searchTerm, statusFilter]);

    const fetchCenters = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page: currentPage.toString(),
                limit: '20',
                ...(searchTerm && { search: searchTerm }),
                ...(statusFilter && statusFilter !== 'all' && { status: statusFilter })
            });

            // Normalize API URL to avoid double slashes
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
            const baseUrl = apiUrl.endsWith('/api') ? apiUrl : `${apiUrl.replace(/\/$/, '')}/api`
            const response = await fetch(`${baseUrl}/auth/admin/centers?${params}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch centers');
            }

            const data = await response.json();
            setCenters(data.data.centers);
            setTotalPages(data.data.pagination.totalPages);
        } catch (error) {
            console.error('Error fetching centers:', error);

            toast({
                title: t('admin_error') || "Error",
                description: t('admin_failed_to_load_centers') || "Failed to load medical centers",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const fetchCenterDetails = async (centerId: string) => {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
            const baseUrl = apiUrl.endsWith('/api') ? apiUrl : `${apiUrl.replace(/\/$/, '')}/api`
            const response = await fetch(`${baseUrl}/auth/admin/centers/${centerId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch center details');
            }

            const data = await response.json();
            setSelectedCenter(data.data);
            setShowCenterDetails(true);
        } catch (error) {
            console.error('Error fetching center details:', error);
            toast({
                title: t('admin_error') || "Error",
                description: t('admin_failed_to_load_center_details') || "Failed to load center details",
                variant: "destructive"
            });
        }
    };

    const createCenter = async () => {
        try {
            // Validate password fields for new centers
            if (!formData.password || !formData.confirmPassword) {
                toast({
                    title: t('admin_error') || "Error",
                    description: t('admin_password_confirm_required') || "Password and confirm password are required",
                    variant: "destructive"
                });
                return;
            }

            if (formData.password !== formData.confirmPassword) {
                toast({
                    title: t('admin_error') || "Error",
                    description: t('admin_passwords_do_not_match') || "Passwords do not match",
                    variant: "destructive"
                });
                return;
            }

            // Removed password length restriction for now

            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
            const baseUrl = apiUrl.endsWith('/api') ? apiUrl : `${apiUrl.replace(/\/$/, '')}/api`
            const response = await fetch(`${baseUrl}/auth/admin/centers`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error('Failed to create center');
            }

            toast({
                title: t('admin_success') || "Success",
                description: t('admin_center_created_successfully') || "Center created successfully with login credentials",
            });

            setShowCreateDialog(false);
            setFormData({
                name: '',
                address: '',
                phone: '',
                email: '',
                operating_hours: '',
                services: [],
                center_type: 'generic',
                approval_status: 'approved',
                offers_labs: false,
                offers_imaging: false,
                description: '',
                admin_notes: '',
                password: '',
                confirmPassword: ''
            });
            fetchCenters();
        } catch (error) {
            console.error('Error creating center:', error);
            toast({
                title: t('admin_error') || "Error",
                description: t('admin_failed_to_create_center') || "Failed to create center",
                variant: "destructive"
            });
        }
    };

    const updateCenter = async (centerId: string, updates: any) => {
        console.log('updateCenter called with centerId:', centerId, 'updates:', updates);
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
            const baseUrl = apiUrl.endsWith('/api') ? apiUrl : `${apiUrl.replace(/\/$/, '')}/api`
            console.log('Making PUT request to:', `${baseUrl}/auth/admin/centers/${centerId}`);

            const response = await fetch(`${baseUrl}/auth/admin/centers/${centerId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updates)
            });

            console.log('Response status:', response.status);
            console.log('Response ok:', response.ok);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Error response:', errorText);
                throw new Error('Failed to update center');
            }

            const result = await response.json();

            let successMessage = t('admin_center_updated_successfully') || "Center updated successfully";
            if (result.passwordUpdated) {
                successMessage += " " + (t('admin_and_password_changed') || "and password changed");
            }

            toast({
                title: t('admin_success') || "Success",
                description: successMessage,
            });

            fetchCenters();
            setShowEditDialog(false);
            setEditingCenter(null);
        } catch (error) {
            console.error('Error updating center:', error);
            toast({
                title: t('admin_error') || "Error",
                description: t('admin_failed_to_update_center') || "Failed to update center",
                variant: "destructive"
            });
        }
    };

    const deleteCenter = async (centerId: string) => {
        if (!confirm(t('admin_confirm_delete_center') || 'Are you sure you want to delete this center? This action cannot be undone.')) {
            return;
        }

        try {
            console.log('🔄 Deleting center:', centerId);

            // Use adminService for center deletion
            await adminService.deleteCenter(centerId);

            toast({
                title: t('admin_success') || "Success",
                description: t('admin_center_deleted_successfully') || "Center deleted successfully",
            });

            fetchCenters();
        } catch (error) {
            console.error('❌ Error deleting center:', error);
            toast({
                title: t('admin_error') || "Error",
                description: t('admin_failed_to_delete_center') || "Failed to delete center",
                variant: "destructive"
            });
        }
    };

    const toggleCenterStatus = async (centerId: string, currentStatus: boolean) => {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
            const baseUrl = apiUrl.endsWith('/api') ? apiUrl : `${apiUrl.replace(/\/$/, '')}/api`
            const response = await fetch(`${baseUrl}/auth/admin/centers/${centerId}/status`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ is_active: !currentStatus })
            });

            if (!response.ok) {
                throw new Error('Failed to update center status');
            }

            toast({
                title: t('admin_success') || "Success",
                description: `${t('admin_center') || 'Center'} ${!currentStatus ? (t('admin_activated') || 'activated') : (t('admin_deactivated') || 'deactivated')} ${t('admin_successfully') || 'successfully'}`,
            });

            fetchCenters();
        } catch (error) {
            console.error('Error updating center status:', error);
            toast({
                title: t('admin_error') || "Error",
                description: t('admin_failed_to_update_center_status') || "Failed to update center status",
                variant: "destructive"
            });
        }
    };

    const getStatusBadgeColor = (isActive: boolean) => {
        return isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString();
    };

    const handleCreateCenter = () => {
        setFormData({
            name: '',
            address: '',
            phone: '',
            email: '',
            description: '',
            operating_hours: '',
            admin_notes: '',
            services: [],
            center_type: 'generic',
            approval_status: 'approved',
            offers_labs: false,
            offers_imaging: false,
            password: '',
            confirmPassword: ''
        });
        setShowCreateDialog(true);
    };

    const handleEditCenter = (center: Center) => {
        setEditingCenter(center);
        setFormData({
            name: center.name,
            address: center.address,
            phone: center.phone,
            email: center.email,
            description: center.description || '',
            operating_hours: center.operating_hours,
            admin_notes: center.admin_notes || '',
            services: center.services || [],
            center_type: center.center_type,
            approval_status: center.approval_status,
            offers_labs: center.offers_labs,
            offers_imaging: center.offers_imaging,
            password: '',
            confirmPassword: ''
        });
        setShowEditDialog(true);
    };

    const handleSaveCenter = () => {
        console.log('handleSaveCenter called with editingCenter:', editingCenter);
        console.log('formData:', formData);

        try {
            console.log('Starting password validation...');
            // If editing and password fields are filled, validate them
            if (editingCenter && (formData.password || formData.confirmPassword)) {
                console.log('Password validation needed');
                console.log('formData.password:', `"${formData.password}"`);
                console.log('formData.confirmPassword:', `"${formData.confirmPassword}"`);
                console.log('Passwords equal?:', formData.password === formData.confirmPassword);

                if (formData.password !== formData.confirmPassword) {
                    console.log('Password mismatch');
                    toast({
                        title: t('admin_error') || "Error",
                        description: t('admin_passwords_do_not_match') || "Passwords do not match",
                        variant: "destructive"
                    });
                    return;
                }
                // Removed password length restriction for now
            }

            console.log('Password validation passed');
            console.log('editingCenter exists?', !!editingCenter);

            if (editingCenter) {
                console.log('Calling updateCenter with:', editingCenter.id, formData);
                updateCenter(editingCenter.id, formData);
            } else {
                console.log('Calling createCenter');
                createCenter();
            }

            console.log('handleSaveCenter completed');
        } catch (error) {
            console.error('Error in handleSaveCenter:', error);
        }
    };

    if (loading) {
        return (
            <div className="space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle>{t('admin_loading_centers') || 'Loading centers...'}</CardTitle>
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
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={isRTL ? 'text-right' : 'text-left'}>
                    <h2 className="text-2xl font-bold">{t('admin_center_management') || 'Center Management'}</h2>
                    <p className="text-muted-foreground">{t('admin_manage_medical_centers') || 'Manage medical centers in the system'}</p>
                </div>
                <div className={`flex ${isRTL ? 'space-x-reverse space-x-2' : 'space-x-2'}`}>
                    <Button onClick={fetchCenters}>
                        <RefreshCw className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                        {t('admin_refresh') || 'Refresh'}
                    </Button>
                    <Button onClick={handleCreateCenter}>
                        <Plus className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                        {t('admin_create_center') || 'Create Center'}
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle className={`flex items-center ${isRTL ? 'space-x-reverse space-x-2' : 'space-x-2'}`}>
                        <Filter className="h-5 w-5" />
                        <span>{t('admin_filters') || 'Filters'}</span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="relative">
                            <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-3 h-4 w-4 text-muted-foreground`} />
                            <Input
                                placeholder={t('admin_search_centers') || 'Search centers...'}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={isRTL ? 'pr-10' : 'pl-10'}
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder={t('admin_filter_by_status') || 'Filter by status'} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('admin_all_statuses') || 'All statuses'}</SelectItem>
                                <SelectItem value="active">{t('admin_active') || 'Active'}</SelectItem>
                                <SelectItem value="inactive">{t('admin_inactive') || 'Inactive'}</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button variant="outline" onClick={() => {
                            setSearchTerm('');
                            setStatusFilter('');
                        }}>
                            {t('admin_clear_filters') || 'Clear Filters'}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Centers Table */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('admin_centers') || 'Centers'} ({centers.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('admin_name') || 'Name'}</TableHead>
                                <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('admin_contact') || 'Contact'}</TableHead>
                                <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('admin_address') || 'Address'}</TableHead>
                                <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('admin_status') || 'Status'}</TableHead>
                                <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('admin_created') || 'Created'}</TableHead>
                                <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('admin_actions') || 'Actions'}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {centers.map((center) => (
                                <TableRow key={center.id}>
                                    <TableCell>
                                        <div className={isRTL ? 'text-right' : 'text-left'}>
                                            <div className="font-medium">{center.name}</div>
                                            <div className="text-sm text-muted-foreground">{center.email}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                                            <div className={`flex items-center ${isRTL ? 'space-x-reverse space-x-1' : 'space-x-1'}`}>
                                                <Phone className="h-3 w-3" />
                                                <span>{center.phone}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                                            <div className={`flex items-center ${isRTL ? 'space-x-reverse space-x-1' : 'space-x-1'}`}>
                                                <MapPin className="h-3 w-3" />
                                                <span className="truncate max-w-[200px]">{center.address}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={getStatusBadgeColor(center.is_active ?? true)}>
                                            {center.is_active ? (t('admin_active') || 'Active') : (t('admin_inactive') || 'Inactive')}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                                            {formatDate(center.created_at)}
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
                                                <DropdownMenuItem onClick={() => fetchCenterDetails(center.id)}>
                                                    <Eye className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                                                    {t('admin_view_details') || 'View Details'}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleEditCenter(center)}>
                                                    <Edit className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                                                    {t('admin_edit_center') || 'Edit Center'}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => toggleCenterStatus(center.id, center.is_active ?? true)}>
                                                    {center.is_active ? (
                                                        <>
                                                            <Clock className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                                                            {t('admin_deactivate') || 'Deactivate'}
                                                        </>
                                                    ) : (
                                                        <>
                                                            <CheckCircle className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                                                            {t('admin_activate') || 'Activate'}
                                                        </>
                                                    )}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => deleteCenter(center.id)}
                                                    className="text-red-600"
                                                >
                                                    <Trash2 className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                                                    {t('admin_delete_center') || 'Delete Center'}
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

            {/* Center Details Dialog */}
            <Dialog open={showCenterDetails} onOpenChange={setShowCenterDetails}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle className={isRTL ? 'text-right' : 'text-left'}>{t('admin_center_details') || 'Center Details'}</DialogTitle>
                    </DialogHeader>
                    {selectedCenter && (
                        <div className="space-y-6">
                            {/* Center Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className={isRTL ? 'text-right' : 'text-left'}>
                                    <h3 className="font-semibold mb-2">{t('admin_basic_information') || 'Basic Information'}</h3>
                                    <div className="space-y-2 text-sm">
                                        <div><strong>{t('admin_name') || 'Name'}:</strong> {selectedCenter.name}</div>
                                        <div><strong>{t('admin_email') || 'Email'}:</strong> {selectedCenter.email}</div>
                                        <div><strong>{t('admin_phone') || 'Phone'}:</strong> {selectedCenter.phone}</div>
                                        <div><strong>{t('admin_status') || 'Status'}:</strong>
                                            <Badge className={`${isRTL ? 'mr-2' : 'ml-2'} ${getStatusBadgeColor(selectedCenter.is_active ?? true)}`}>
                                                {selectedCenter.is_active ? (t('admin_active') || 'Active') : (t('admin_inactive') || 'Inactive')}
                                            </Badge>
                                        </div>
                                        <div><strong>{t('admin_password_status') || 'Password Status'}:</strong>
                                            <span className={selectedCenter.password_hash ? `text-green-600 ${isRTL ? 'mr-1' : 'ml-1'}` : `text-red-600 ${isRTL ? 'mr-1' : 'ml-1'}`}>
                                                {selectedCenter.password_hash ? (t('admin_password_set') || 'Password Set') : (t('admin_no_password_set') || 'No Password Set')}
                                            </span>
                                        </div>
                                        <div><strong>{t('admin_created') || 'Created'}:</strong> {formatDate(selectedCenter.created_at)}</div>
                                    </div>
                                </div>
                                <div className={isRTL ? 'text-right' : 'text-left'}>
                                    <h3 className="font-semibold mb-2">{t('admin_location_hours') || 'Location & Hours'}</h3>
                                    <div className="space-y-2 text-sm">
                                        <div><strong>{t('admin_address') || 'Address'}:</strong> {selectedCenter.address}</div>
                                        <div><strong>{t('admin_operating_hours') || 'Operating Hours'}:</strong> {selectedCenter.operating_hours}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Description */}
                            <div className={isRTL ? 'text-right' : 'text-left'}>
                                <h3 className="font-semibold mb-2">{t('admin_description') || 'Description'}</h3>
                                <p className="text-sm text-muted-foreground">{selectedCenter.description}</p>
                            </div>

                            {/* Statistics */}
                            {selectedCenter.stats && (
                                <div className={isRTL ? 'text-right' : 'text-left'}>
                                    <h3 className="font-semibold mb-2">{t('admin_statistics') || 'Statistics'}</h3>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="text-center p-3 border rounded">
                                            <div className="text-2xl font-bold">{selectedCenter.stats.totalDoctors}</div>
                                            <div className="text-sm text-muted-foreground">{t('admin_doctors') || 'Doctors'}</div>
                                        </div>
                                        <div className="text-center p-3 border rounded">
                                            <div className="text-2xl font-bold">{selectedCenter.stats.totalAppointments}</div>
                                            <div className="text-sm text-muted-foreground">{t('admin_appointments') || 'Appointments'}</div>
                                        </div>
                                        <div className="text-center p-3 border rounded">
                                            <div className="text-2xl font-bold">{selectedCenter.stats.averageRating.toFixed(1)}</div>
                                            <div className="text-sm text-muted-foreground">{t('admin_avg_rating') || 'Avg Rating'}</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Admin Notes */}
                            {selectedCenter.admin_notes && (
                                <div className={isRTL ? 'text-right' : 'text-left'}>
                                    <h3 className="font-semibold mb-2">{t('admin_admin_notes') || 'Admin Notes'}</h3>
                                    <p className="text-sm text-muted-foreground">{selectedCenter.admin_notes}</p>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Create/Edit Center Dialog */}
            <Dialog open={showCreateDialog || showEditDialog} onOpenChange={(open) => {
                if (!open) {
                    setShowCreateDialog(false);
                    setShowEditDialog(false);
                    setEditingCenter(null);
                }
            }}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className={isRTL ? 'text-right' : 'text-left'}>{editingCenter ? (t('admin_edit_center') || 'Edit Center') : (t('admin_create_new_center') || 'Create New Center')}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className={isRTL ? 'text-right' : 'text-left'}>
                                <label className="text-sm font-medium">{t('admin_center_name') || 'Center Name'}</label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder={t('admin_enter_center_name') || 'Enter center name'}
                                />
                            </div>
                            <div className={isRTL ? 'text-right' : 'text-left'}>
                                <label className="text-sm font-medium">{t('admin_email') || 'Email'}</label>
                                <Input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder={t('admin_enter_email') || 'Enter email'}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className={isRTL ? 'text-right' : 'text-left'}>
                                <label className="text-sm font-medium">
                                    {t('admin_password') || 'Password'} {editingCenter && <span className="text-gray-500">({t('admin_leave_empty_to_keep_current') || 'leave empty to keep current'})</span>}
                                </label>
                                <Input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    placeholder={editingCenter ? (t('admin_enter_new_password_optional') || "Enter new password (optional)") : (t('admin_enter_password_center_login') || "Enter password for center login")}
                                    required={!editingCenter}
                                />
                            </div>
                            <div className={isRTL ? 'text-right' : 'text-left'}>
                                <label className="text-sm font-medium">
                                    {t('admin_confirm_password') || 'Confirm Password'} {editingCenter && <span className="text-gray-500">({t('admin_if_changing_password') || 'if changing password'})</span>}
                                </label>
                                <Input
                                    type="password"
                                    value={formData.confirmPassword}
                                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    placeholder={editingCenter ? (t('admin_confirm_new_password') || "Confirm new password") : (t('admin_confirm_password') || "Confirm password")}
                                    required={!editingCenter}
                                />
                            </div>
                        </div>
                        {editingCenter && (
                            <div className={`bg-blue-50 p-3 rounded-md ${isRTL ? 'text-right' : 'text-left'}`}>
                                <p className="text-sm text-blue-700">
                                    <strong>{t('admin_note') || 'Note'}:</strong> {t('admin_password_instructions') || 'Leave password fields empty to keep the current password. Fill both fields to change the password.'}
                                </p>
                            </div>
                        )}
                        <div className={isRTL ? 'text-right' : 'text-left'}>
                            <label className="text-sm font-medium">{t('admin_phone') || 'Phone'}</label>
                            <Input
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                placeholder={t('admin_enter_phone_number') || 'Enter phone number'}
                            />
                        </div>
                        <div className={isRTL ? 'text-right' : 'text-left'}>
                            <label className="text-sm font-medium">{t('admin_address') || 'Address'}</label>
                            <Input
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                placeholder={t('admin_enter_full_address') || 'Enter full address'}
                            />
                        </div>
                        <div className={isRTL ? 'text-right' : 'text-left'}>
                            <label className="text-sm font-medium">{t('admin_operating_hours') || 'Operating Hours'}</label>
                            <Input
                                value={formData.operating_hours}
                                onChange={(e) => setFormData({ ...formData, operating_hours: e.target.value })}
                                placeholder={t('admin_operating_hours_example') || 'e.g., Mon-Fri 9AM-6PM, Sat 9AM-2PM'}
                            />
                        </div>
                        <div className={isRTL ? 'text-right' : 'text-left'}>
                            <label className="text-sm font-medium">{t('admin_description') || 'Description'}</label>
                            <Textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder={t('admin_enter_center_description') || 'Enter center description'}
                                rows={3}
                            />
                        </div>
                        <div className={isRTL ? 'text-right' : 'text-left'}>
                            <label className="text-sm font-medium">{t('admin_admin_notes') || 'Admin Notes'}</label>
                            <Textarea
                                value={formData.admin_notes}
                                onChange={(e) => setFormData({ ...formData, admin_notes: e.target.value })}
                                placeholder={t('admin_add_admin_notes') || 'Add any admin notes...'}
                                rows={2}
                            />
                        </div>
                        <div className={`flex ${isRTL ? 'justify-start space-x-reverse space-x-2' : 'justify-end space-x-2'}`}>
                            <Button variant="outline" onClick={() => {
                                setShowCreateDialog(false);
                                setShowEditDialog(false);
                                setEditingCenter(null);
                            }}>
                                {t('admin_cancel') || 'Cancel'}
                            </Button>
                            <Button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    console.log('Button clicked!');
                                    handleSaveCenter();
                                }}
                                disabled={!formData.name || !formData.email || !formData.phone || !formData.address}
                            >
                                {editingCenter ? (t('admin_update_center') || 'Update Center') : (t('admin_create_center') || 'Create Center')}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
