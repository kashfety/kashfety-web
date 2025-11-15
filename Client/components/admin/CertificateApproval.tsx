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
import { localizeSpecialty } from '@/lib/i18n';
import {
    FileText,
    Search,
    Filter,
    Eye,
    CheckCircle,
    XCircle,
    AlertCircle,
    Clock,
    Download,
    Send,
    RefreshCw,
    Calendar,
    User,
    Mail,
    Phone,
    MoreHorizontal,
    Edit
} from 'lucide-react';
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

interface CertificateSubmission {
    id: string;
    doctor_id: string;
    doctor_name: string;
    doctor_email: string;
    doctor_phone: string;
    specialty: string;
    certificate_file_url: string;
    certificate_file_name: string;
    certificate_status: 'pending' | 'approved' | 'rejected' | 'resubmission_required';
    submitted_at: string;
    reviewed_at?: string;
    reviewed_by?: string;
    rejection_reason?: string;
    certificate_comments?: string;
    certificate_resubmission_requirements?: string;
    certificate_resubmission_deadline?: string;
    certificate_resubmission_requested_at?: string;
    admin_notes?: string;
}

interface CertificateFormData {
    status: string;
    rejection_reason: string;
    certificate_comments: string;
    certificate_resubmission_requirements: string;
    certificate_resubmission_deadline: string;
    admin_notes: string;
}

export default function CertificateApproval() {
    const { toast } = useToast();
    const { t, isRTL, locale } = useLocale();
    const [certificates, setCertificates] = useState<CertificateSubmission[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedCertificate, setSelectedCertificate] = useState<CertificateSubmission | null>(null);
    const [showCertificateDetails, setShowCertificateDetails] = useState(false);
    const [showReviewDialog, setShowReviewDialog] = useState(false);
    const [reviewingCertificate, setReviewingCertificate] = useState<CertificateSubmission | null>(null);
    const [formData, setFormData] = useState<CertificateFormData>({
        status: '',
        rejection_reason: '',
        certificate_comments: '',
        certificate_resubmission_requirements: '',
        certificate_resubmission_deadline: '',
        admin_notes: ''
    });

    useEffect(() => {
        fetchCertificates();
    }, [currentPage, searchTerm, statusFilter]);

    const fetchCertificates = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page: currentPage.toString(),
                limit: '20',
                ...(searchTerm && { search: searchTerm }),
                ...(statusFilter && statusFilter !== 'all' && { status: statusFilter })
            });

            // Try fallback route first for Vercel compatibility
            let response;
            let data;
            
            try {
                console.log('📜 Trying admin-doctor-certificates fallback route');
                response = await fetch(`/api/admin-doctor-certificates?${params}`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (response.ok) {
                    data = await response.json();
                    if (data.success && data.data?.certificates) {
                        console.log('✅ Fallback route worked for certificates');
                        
                        // Transform the certificate data to match our CertificateSubmission interface
                        const transformedCertificates = data.data.certificates.map((cert: any) => ({
                            ...cert,
                            doctor_name: cert.doctor?.name || 'Unknown',
                            doctor_email: cert.doctor?.email || 'Unknown',
                            doctor_phone: cert.doctor?.phone || 'Unknown',
                            specialty: cert.doctor?.specialty || 'General',
                            certificate_status: cert.status || 'pending'
                        }));

                        setCertificates(transformedCertificates);
                        setTotalPages(data.data.pagination?.totalPages || 1);
                        return;
                    }
                }
            } catch (fallbackError) {
                console.log('❌ Fallback failed, trying backend route');
            }

            // Fallback to backend route
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
            const baseUrl = apiUrl.endsWith('/api') ? apiUrl : `${apiUrl.replace(/\/$/, '')}/api`
            response = await fetch(`${baseUrl}/auth/admin/certificates?${params}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch certificates');
            }

            data = await response.json();

            // Transform the certificate data to match our CertificateSubmission interface
            const transformedCertificates = data.data.certificates.map((cert: any) => ({
                ...cert,
                doctor_name: cert.doctor?.name || 'Unknown',
                doctor_email: cert.doctor?.email || 'Unknown',
                doctor_phone: cert.doctor?.phone || 'Unknown',
                specialty: cert.doctor?.specialty || 'General',
                certificate_status: cert.status || 'pending'
            }));

            setCertificates(transformedCertificates);
            setTotalPages(data.data.pagination.totalPages);
        } catch (error) {
            console.error('Error fetching certificates:', error);

            // Show error instead of using mock data
            toast({
                title: t('admin_error') || "Error",
                description: t('admin_failed_to_load_certificates') || "Failed to load certificates. Please check your connection and try again.",
                variant: "destructive"
            });

            // Set empty state instead of mock data
            setCertificates([]);
            setTotalPages(1);
        } finally {
            setLoading(false);
        }
    };

    const fetchCertificateDetails = async (certificateId: string) => {
        try {
            // Try fallback route first for Vercel compatibility
            let response;
            let data;
            
            try {
                console.log('📜 Trying admin-certificate-details fallback route');
                response = await fetch(`/api/admin-certificate-details?certificateId=${certificateId}`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (response.ok) {
                    data = await response.json();
                    if (data.success && data.data) {
                        console.log('✅ Fallback route worked for certificate details');
                        
                        // Transform the certificate data to match our CertificateSubmission interface
                        const transformedCertificate = {
                            ...data.data,
                            doctor_name: data.data.doctor_name || data.data.doctor?.name || 'Unknown',
                            doctor_email: data.data.doctor_email || data.data.doctor?.email || 'Unknown',
                            doctor_phone: data.data.doctor_phone || data.data.doctor?.phone || 'Unknown',
                            specialty: data.data.specialty || data.data.doctor?.specialty || 'General',
                            certificate_status: data.data.certificate_status || data.data.status || 'pending'
                        };

                        setSelectedCertificate(transformedCertificate);
                        setShowCertificateDetails(true);
                        return;
                    }
                }
            } catch (fallbackError) {
                console.log('❌ Fallback failed, trying backend route');
            }

            // Fallback to backend route
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
            const baseUrl = apiUrl.endsWith('/api') ? apiUrl : `${apiUrl.replace(/\/$/, '')}/api`
            response = await fetch(`${baseUrl}/auth/admin/certificates/${certificateId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch certificate details');
            }

            data = await response.json();

            // Transform the certificate data to match our CertificateSubmission interface
            const transformedCertificate = {
                ...data.data,
                doctor_name: data.data.doctor?.name || 'Unknown',
                doctor_email: data.data.doctor?.email || 'Unknown',
                doctor_phone: data.data.doctor?.phone || 'Unknown',
                specialty: data.data.doctor?.specialty || 'General',
                certificate_status: data.data.status || 'pending'
            };

            setSelectedCertificate(transformedCertificate);
            setShowCertificateDetails(true);
        } catch (error) {
            console.error('Error fetching certificate details:', error);
            toast({
                title: t('admin_error') || "Error",
                description: t('admin_failed_to_load_certificate_details') || "Failed to load certificate details",
                variant: "destructive"
            });
        }
    };

    const reviewCertificate = async (certificateId: string, reviewData: any) => {
        try {
            // Use static API route (Vercel-compatible, no dynamic [id] in URL)
            const endpoint = '/api/admin-review-certificate-action';
            console.log('📝 [Certificate Approval] Calling:', endpoint, 'for certificate:', certificateId);
            
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    certificateId,
                    ...reviewData
                })
            });

            console.log('📡 [Certificate Approval] Response status:', response.status);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('❌ [Certificate Approval] Error:', errorData);
                throw new Error('Failed to review certificate');
            }

            const responseData = await response.json();
            console.log('✅ [Certificate Approval] Success:', responseData);

            toast({
                title: t('admin_success') || "Success",
                description: `${t('admin_certificate') || 'Certificate'} ${reviewData.status} ${t('admin_successfully') || 'successfully'}`,
            });

            fetchCertificates();
            setShowReviewDialog(false);
            setReviewingCertificate(null);
        } catch (error) {
            console.error('Error reviewing certificate:', error);
            toast({
                title: t('admin_error') || "Error",
                description: t('admin_failed_to_review_certificate') || "Failed to review certificate",
                variant: "destructive"
            });
        }
    };

    const downloadCertificate = async (fileUrl: string, fileName: string, certificateId?: string) => {
        try {
            // If we have a certificate ID, use the download proxy route to get a fresh signed URL
            if (certificateId) {
                try {
                    console.log('📥 Trying admin-download-certificate fallback route');
                    const response = await fetch(`/api/admin-download-certificate?certificateId=${certificateId}`, {
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                            'Content-Type': 'application/json'
                        }
                    });

                    if (response.ok) {
                        const data = await response.json();
                        if (data.success && data.download_url) {
                            console.log('✅ Fallback route worked, got fresh download URL');
                            // Use the fresh signed URL
                            fileUrl = data.download_url;
                            fileName = data.file_name || fileName;
                        }
                    }
                } catch (fallbackError) {
                    console.log('❌ Fallback download route failed, using original URL');
                }
            }

            // Construct the full URL with the backend server
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
            const baseUrl = apiUrl.endsWith('/api') ? apiUrl.replace('/api', '') : apiUrl.replace(/\/$/, '')

            let fullUrl;
            if (fileUrl.startsWith('http')) {
                fullUrl = fileUrl; // Already a complete URL
            } else {
                // Handle relative paths with or without leading slash
                const cleanPath = fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`
                fullUrl = `${baseUrl}${cleanPath}`
            }

            console.log('📥 Downloading certificate from:', fullUrl);
            const response = await fetch(fullUrl);

            if (!response.ok) {
                throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`)
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName || 'certificate.pdf';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            toast({
                title: t('admin_success') || "Success",
                description: t('admin_certificate_downloaded') || "Certificate downloaded successfully",
            });
        } catch (error: any) {
            console.error('Error downloading certificate:', error);
            toast({
                title: t('admin_error') || "Error",
                description: t('admin_failed_to_download_certificate') || "Failed to download certificate",
                variant: "destructive"
            });
        }
    };

    const getStatusBadgeColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'approved': return 'bg-green-100 text-green-800';
            case 'rejected': return 'bg-red-100 text-red-800';
            case 'resubmission_required': return 'bg-blue-100 text-blue-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'pending': return <Clock className="h-4 w-4" />;
            case 'approved': return <CheckCircle className="h-4 w-4" />;
            case 'rejected': return <XCircle className="h-4 w-4" />;
            case 'resubmission_required': return <AlertCircle className="h-4 w-4" />;
            default: return <Clock className="h-4 w-4" />;
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString();
    };

    const handleReviewCertificate = (certificate: CertificateSubmission) => {
        setReviewingCertificate(certificate);
        setFormData({
            status: certificate.certificate_status,
            rejection_reason: certificate.rejection_reason || '',
            certificate_comments: certificate.certificate_comments || '',
            certificate_resubmission_requirements: certificate.certificate_resubmission_requirements || '',
            certificate_resubmission_deadline: certificate.certificate_resubmission_deadline || '',
            admin_notes: certificate.admin_notes || ''
        });
        setShowReviewDialog(true);
    };

    const handleSaveReview = () => {
        if (!reviewingCertificate) return;
        reviewCertificate(reviewingCertificate.id, formData);
    };

    const getActionButtons = (certificate: CertificateSubmission) => {
        if (certificate.certificate_status === 'pending') {
            return (
                <>
                    <Button
                        size="sm"
                        onClick={() => {
                            setFormData({
                                ...formData,
                                status: 'approved',
                                rejection_reason: '',
                                certificate_resubmission_requirements: '',
                                certificate_resubmission_deadline: ''
                            });
                            reviewCertificate(certificate.id, { status: 'approved' });
                        }}
                        className="bg-green-600 hover:bg-green-700"
                    >
                        <CheckCircle className={`h-4 w-4 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                        {t('admin_approve') || 'Approve'}
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReviewCertificate(certificate)}
                    >
                        <XCircle className={`h-4 w-4 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                        {t('admin_review') || 'Review'}
                    </Button>
                </>
            );
        }
        return (
            <Button
                size="sm"
                variant="outline"
                onClick={() => handleReviewCertificate(certificate)}
            >
                <Edit className={`h-4 w-4 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                {t('admin_update_review') || 'Update Review'}
            </Button>
        );
    };

    if (loading) {
        return (
            <div className="space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle>{t('admin_loading_certificates') || 'Loading certificates...'}</CardTitle>
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
                    <h2 className="text-2xl font-bold">{t('admin_certificate_approval') || 'Certificate Approval'}</h2>
                    <p className="text-muted-foreground">{t('admin_review_manage_certificates') || 'Review and manage doctor certificate submissions'}</p>
                </div>
                <Button onClick={fetchCertificates}>
                    <RefreshCw className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                    {t('admin_refresh') || 'Refresh'}
                </Button>
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
                                placeholder={t('admin_search_doctors') || 'Search doctors...'}
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
                                <SelectItem value="pending">{t('admin_pending') || 'Pending'}</SelectItem>
                                <SelectItem value="approved">{t('admin_approved') || 'Approved'}</SelectItem>
                                <SelectItem value="rejected">{t('admin_rejected') || 'Rejected'}</SelectItem>
                                <SelectItem value="resubmission_required">{t('admin_resubmission_required') || 'Resubmission Required'}</SelectItem>
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

            {/* Certificates Table */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('admin_certificate_submissions') || 'Certificate Submissions'} ({certificates.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('admin_doctor') || 'Doctor'}</TableHead>
                                <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('admin_specialty') || 'Specialty'}</TableHead>
                                <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('admin_certificate_file') || 'Certificate File'}</TableHead>
                                <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('admin_status') || 'Status'}</TableHead>
                                <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('admin_submitted') || 'Submitted'}</TableHead>
                                <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('admin_actions') || 'Actions'}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {certificates.map((certificate) => (
                                <TableRow key={certificate.id}>
                                    <TableCell>
                                        <div className={isRTL ? 'text-right' : 'text-left'}>
                                            <div className="font-medium">{certificate.doctor_name}</div>
                                            <div className="text-sm text-muted-foreground">{certificate.doctor_email}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                                            {localizeSpecialty(locale, certificate.specialty)}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className={`flex items-center ${isRTL ? 'space-x-reverse space-x-2' : 'space-x-2'}`}>
                                            <FileText className="h-4 w-4 text-blue-600" />
                                            <Button
                                                variant="link"
                                                size="sm"
                                                onClick={() => downloadCertificate(certificate.certificate_file_url, certificate.certificate_file_name, certificate.id)}
                                            >
                                                {certificate.certificate_file_name}
                                            </Button>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={getStatusBadgeColor(certificate.certificate_status)}>
                                            <div className={`flex items-center ${isRTL ? 'space-x-reverse space-x-1' : 'space-x-1'}`}>
                                                {getStatusIcon(certificate.certificate_status)}
                                                <span>{(certificate.certificate_status || 'unknown').replace(/_/g, ' ')}</span>
                                            </div>
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                                            {formatDate(certificate.submitted_at)}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className={`flex items-center ${isRTL ? 'space-x-reverse space-x-2' : 'space-x-2'}`}>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => fetchCertificateDetails(certificate.id)}
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            {getActionButtons(certificate)}
                                        </div>
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

            {/* Certificate Details Dialog */}
            <Dialog open={showCertificateDetails} onOpenChange={setShowCertificateDetails}>
                <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                    <DialogHeader className="flex-shrink-0">
                        <DialogTitle className={isRTL ? 'text-right' : 'text-left'}>{t('admin_certificate_details') || 'Certificate Details'}</DialogTitle>
                    </DialogHeader>
                    {selectedCertificate && (
                        <div className="space-y-6 overflow-y-auto flex-1 pr-2 -mr-2">
                            {/* Doctor Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className={isRTL ? 'text-right' : 'text-left'}>
                                    <h3 className="font-semibold mb-2">{t('admin_doctor_information') || 'Doctor Information'}</h3>
                                    <div className="space-y-2 text-sm">
                                        <div><strong>{t('admin_name') || 'Name'}:</strong> {selectedCertificate.doctor_name}</div>
                                        <div><strong>{t('admin_email') || 'Email'}:</strong> {selectedCertificate.doctor_email}</div>
                                        <div><strong>{t('admin_phone') || 'Phone'}:</strong> {selectedCertificate.doctor_phone}</div>
                                        <div><strong>{t('admin_specialty') || 'Specialty'}:</strong> {localizeSpecialty(locale, selectedCertificate.specialty)}</div>
                                    </div>
                                </div>
                                <div className={isRTL ? 'text-right' : 'text-left'}>
                                    <h3 className="font-semibold mb-2">{t('admin_submission_details') || 'Submission Details'}</h3>
                                    <div className="space-y-2 text-sm">
                                        <div><strong>{t('admin_status') || 'Status'}:</strong>
                                            <Badge className={`${isRTL ? 'mr-2' : 'ml-2'} ${getStatusBadgeColor(selectedCertificate.certificate_status)}`}>
                                                {(selectedCertificate.certificate_status || 'unknown').replace(/_/g, ' ')}
                                            </Badge>
                                        </div>
                                        <div><strong>{t('admin_submitted') || 'Submitted'}:</strong> {formatDate(selectedCertificate.submitted_at)}</div>
                                        {selectedCertificate.reviewed_at && (
                                            <div><strong>{t('admin_reviewed') || 'Reviewed'}:</strong> {formatDate(selectedCertificate.reviewed_at)}</div>
                                        )}
                                        {selectedCertificate.reviewed_by && (
                                            <div><strong>{t('admin_reviewed_by') || 'Reviewed By'}:</strong> {selectedCertificate.reviewed_by}</div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Certificate File */}
                            <div className={isRTL ? 'text-right' : 'text-left'}>
                                <h3 className="font-semibold mb-2">{t('admin_certificate_file') || 'Certificate File'}</h3>
                                <div className={`flex items-center ${isRTL ? 'space-x-reverse' : 'space-x-2'} p-3 border rounded`}>
                                    <FileText className="h-6 w-6 text-blue-600" />
                                    <div className="flex-1">
                                        <div className="font-medium">{selectedCertificate.certificate_file_name}</div>
                                        <div className="text-sm text-muted-foreground">{t('admin_submitted_on') || 'Submitted on'} {formatDate(selectedCertificate.submitted_at)}</div>
                                    </div>
                                    <Button
                                        onClick={() => downloadCertificate(selectedCertificate.certificate_file_url, selectedCertificate.certificate_file_name, selectedCertificate.id)}
                                    >
                                        <Download className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                                        {t('admin_download') || 'Download'}
                                    </Button>
                                </div>
                            </div>

                            {/* Review Information */}
                            {(selectedCertificate.rejection_reason || selectedCertificate.certificate_comments || selectedCertificate.certificate_resubmission_requirements) && (
                                <div className={isRTL ? 'text-right' : 'text-left'}>
                                    <h3 className="font-semibold mb-2">{t('admin_review_information') || 'Review Information'}</h3>
                                    <div className="space-y-3">
                                        {selectedCertificate.rejection_reason && (
                                            <div>
                                                <strong className="text-sm">{t('admin_rejection_reason') || 'Rejection Reason'}:</strong>
                                                <p className="text-sm text-muted-foreground mt-1">{selectedCertificate.rejection_reason}</p>
                                            </div>
                                        )}
                                        {selectedCertificate.certificate_comments && (
                                            <div>
                                                <strong className="text-sm">{t('admin_comments') || 'Comments'}:</strong>
                                                <p className="text-sm text-muted-foreground mt-1">{selectedCertificate.certificate_comments}</p>
                                            </div>
                                        )}
                                        {selectedCertificate.certificate_resubmission_requirements && (
                                            <div>
                                                <strong className="text-sm">{t('admin_resubmission_requirements') || 'Resubmission Requirements'}:</strong>
                                                <p className="text-sm text-muted-foreground mt-1">{selectedCertificate.certificate_resubmission_requirements}</p>
                                            </div>
                                        )}
                                        {selectedCertificate.certificate_resubmission_deadline && (
                                            <div>
                                                <strong className="text-sm">{t('admin_resubmission_deadline') || 'Resubmission Deadline'}:</strong>
                                                <p className="text-sm text-muted-foreground mt-1">{formatDate(selectedCertificate.certificate_resubmission_deadline)}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Admin Notes */}
                            {selectedCertificate.admin_notes && (
                                <div className={isRTL ? 'text-right' : 'text-left'}>
                                    <h3 className="font-semibold mb-2">{t('admin_admin_notes') || 'Admin Notes'}</h3>
                                    <p className="text-sm text-muted-foreground">{selectedCertificate.admin_notes}</p>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Review Certificate Dialog */}
            <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
                <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
                    <DialogHeader className="flex-shrink-0">
                        <DialogTitle className={isRTL ? 'text-right' : 'text-left'}>{t('admin_review_certificate') || 'Review Certificate'}</DialogTitle>
                    </DialogHeader>
                    {reviewingCertificate && (
                        <div className="space-y-4 overflow-y-auto flex-1 pr-2 -mr-2">
                            <div className={isRTL ? 'text-right' : 'text-left'}>
                                <label className="text-sm font-medium">{t('admin_review_status') || 'Review Status'}</label>
                                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="approved">{t('admin_approve') || 'Approve'}</SelectItem>
                                        <SelectItem value="rejected">{t('admin_reject') || 'Reject'}</SelectItem>
                                        <SelectItem value="resubmission_required">{t('admin_request_resubmission') || 'Request Resubmission'}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {formData.status === 'rejected' && (
                                <div className={isRTL ? 'text-right' : 'text-left'}>
                                    <label className="text-sm font-medium">{t('admin_rejection_reason') || 'Rejection Reason'} *</label>
                                    <Textarea
                                        value={formData.rejection_reason}
                                        onChange={(e) => setFormData({ ...formData, rejection_reason: e.target.value })}
                                        placeholder={t('admin_explain_rejection') || 'Explain why the certificate was rejected...'}
                                        rows={3}
                                    />
                                </div>
                            )}

                            {formData.status === 'resubmission_required' && (
                                <>
                                    <div className={isRTL ? 'text-right' : 'text-left'}>
                                        <label className="text-sm font-medium">{t('admin_resubmission_requirements') || 'Resubmission Requirements'} *</label>
                                        <Textarea
                                            value={formData.certificate_resubmission_requirements}
                                            onChange={(e) => setFormData({ ...formData, certificate_resubmission_requirements: e.target.value })}
                                            placeholder={t('admin_specify_resubmission') || 'Specify what needs to be adjusted or resubmitted...'}
                                            rows={3}
                                        />
                                    </div>
                                    <div className={isRTL ? 'text-right' : 'text-left'}>
                                        <label className="text-sm font-medium">{t('admin_resubmission_deadline') || 'Resubmission Deadline'}</label>
                                        <Input
                                            type="date"
                                            value={formData.certificate_resubmission_deadline}
                                            onChange={(e) => setFormData({ ...formData, certificate_resubmission_deadline: e.target.value })}
                                        />
                                    </div>
                                </>
                            )}

                            <div className={isRTL ? 'text-right' : 'text-left'}>
                                <label className="text-sm font-medium">{t('admin_comments') || 'Comments'}</label>
                                <Textarea
                                    value={formData.certificate_comments}
                                    onChange={(e) => setFormData({ ...formData, certificate_comments: e.target.value })}
                                    placeholder={t('admin_add_comments') || 'Add any additional comments...'}
                                    rows={2}
                                />
                            </div>

                            <div className={isRTL ? 'text-right' : 'text-left'}>
                                <label className="text-sm font-medium">{t('admin_admin_notes') || 'Admin Notes'}</label>
                                <Textarea
                                    value={formData.admin_notes}
                                    onChange={(e) => setFormData({ ...formData, admin_notes: e.target.value })}
                                    placeholder={t('admin_internal_notes') || 'Internal notes (not visible to doctor)...'}
                                    rows={2}
                                />
                            </div>

                            <div className={`flex ${isRTL ? 'justify-start space-x-reverse' : 'justify-end space-x-2'}`}>
                                <Button variant="outline" onClick={() => setShowReviewDialog(false)}>
                                    {t('admin_cancel') || 'Cancel'}
                                </Button>
                                <Button onClick={handleSaveReview}>
                                    <Send className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                                    {t('admin_submit_review') || 'Submit Review'}
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
