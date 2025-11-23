"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CheckCircle, XCircle, Clock, User } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useLocale } from '@/components/providers/locale-provider'
import { localizeSpecialty } from '@/lib/i18n'

interface DoctorApproval {
    id: string
    name: string
    email: string
    specialty: string
    experience_years: number
    status: 'pending' | 'approved' | 'rejected'
    created_at: string
}

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected'

export default function DoctorApprovals() {
    const [approvals, setApprovals] = useState<DoctorApproval[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<StatusFilter>('pending')
    const { toast } = useToast()
    const { t, isRTL, locale } = useLocale()

    useEffect(() => {
        fetchDoctorApprovals(activeTab)
    }, [activeTab])

    const fetchDoctorApprovals = async (status?: StatusFilter) => {
        try {
            setLoading(true)

            console.log(' Fetching doctor approvals with status:', status);

            // Build URL with status filter
            let url = '/api/admin-doctor-certificates';
            if (status && status !== 'all') {
                url += `?status=${status}`;
            }

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch doctor approvals');
            }

            const data = await response.json();
            console.log(' [Doctor Approvals] Response:', data);

            if (data.success && data.data?.certificates) {
                const approvals: DoctorApproval[] = data.data.certificates
                    .map((cert: any) => ({
                        id: cert.id,
                        name: cert.doctor?.name || 'Unknown',
                        email: cert.doctor?.email || '',
                        specialty: cert.doctor?.specialty || 'General',
                        experience_years: cert.doctor?.experience_years || 0,
                        status: cert.status || 'pending',
                        created_at: cert.submitted_at || cert.created_at
                    }));

                setApprovals(approvals);
            }
        } catch (error) {
            console.error('Error fetching doctor approvals:', error)
            toast({
                title: t('admin_error') || "Error",
                description: t('admin_failed_to_load_doctor_approvals') || "Failed to load doctor approvals",
                variant: "destructive"
            })
        } finally {
            setLoading(false)
        }
    }

    const handleApproval = async (certificateId: string, action: 'approve' | 'reject') => {
        try {
            console.log(` [Doctor Approvals] ${action} certificate:`, certificateId);

            const requestBody = {
                status: action === 'approve' ? 'approved' : 'rejected',
                admin_notes: action === 'approve' ? 'Certificate approved' : 'Certificate rejected'
            };

            // Use dedicated action endpoint (no dynamic routes - Vercel compatible)
            const endpoint = `/api/admin-review-certificate-action`;
            console.log(` [Doctor Approvals] Calling:`, endpoint);

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    certificateId,
                    ...requestBody
                })
            });

            console.log(` [Doctor Approvals] Response:`, response.status);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error(` [Doctor Approvals] Error:`, errorData);
                throw new Error(`Failed to ${action} doctor`);
            }

            const responseData = await response.json();
            console.log(` [Doctor Approvals] Success:`, responseData);

            fetchDoctorApprovals(activeTab);

            toast({
                title: t('admin_success') || "Success",
                description: `${t('admin_doctor') || 'Doctor'} ${action === 'approve' ? (t('admin_approved') || 'approved') : (t('admin_rejected') || 'rejected')} ${t('admin_successfully') || 'successfully'}`,
                variant: "default"
            });

        } catch (error) {
            console.error(`Error ${action}ing doctor:`, error);
            toast({
                title: t('admin_error') || "Error",
                description: `${t('admin_failed_to') || 'Failed to'} ${action} ${t('admin_doctor') || 'doctor'}`,
                variant: "destructive"
            });
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return <Badge variant="secondary"><Clock className={`w-3 h-3 ${isRTL ? 'ml-1' : 'mr-1'}`} />{t('admin_pending') || 'Pending'}</Badge>
            case 'approved':
                return <Badge variant="default" className="bg-green-500"><CheckCircle className={`w-3 h-3 ${isRTL ? 'ml-1' : 'mr-1'}`} />{t('admin_approved') || 'Approved'}</Badge>
            case 'rejected':
                return <Badge variant="destructive"><XCircle className={`w-3 h-3 ${isRTL ? 'ml-1' : 'mr-1'}`} />{t('admin_rejected') || 'Rejected'}</Badge>
            default:
                return <Badge variant="secondary">{t('admin_unknown') || 'Unknown'}</Badge>
        }
    }

    const getTabCounts = () => {
        return {
            all: approvals.length,
            pending: approvals.filter(a => a.status === 'pending').length,
            approved: approvals.filter(a => a.status === 'approved').length,
            rejected: approvals.filter(a => a.status === 'rejected').length
        }
    }

    const filteredApprovals = activeTab === 'all'
        ? approvals
        : approvals.filter(a => a.status === activeTab)

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <User className="h-5 w-5" />
                        {t('admin_doctor_approvals') || 'Doctor Approvals'}
                    </CardTitle>
                    <CardDescription>{t('admin_doctor_approvals_desc') || 'Review and approve doctor registrations'}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                </CardContent>
            </Card>
        )
    }

    const tabCounts = getTabCounts()

    return (
        <Card>
            <CardHeader>
                <CardTitle className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <User className="h-5 w-5" />
                        {t('admin_doctor_approvals') || 'Doctor Approvals'}
                    </div>
                    <Button onClick={() => fetchDoctorApprovals(activeTab)} variant="outline" size="sm" className="border-[#4DBCC4] text-[#4DBCC4] hover:bg-[#4DBCC4]/10 dark:border-[#4DBCC4] dark:text-[#4DBCC4] dark:hover:bg-[#4DBCC4]/20">
                        {t('refresh') || 'Refresh'}
                    </Button>
                </CardTitle>
                <CardDescription>{t('admin_doctor_approvals_desc') || 'Review and approve doctor registrations'}</CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as StatusFilter)} className="w-full">
                    <TabsList className={`grid w-full grid-cols-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <TabsTrigger value="pending" className="relative">
                            {t('admin_pending') || 'Pending'}
                            {tabCounts.pending > 0 && (
                                <Badge variant="secondary" className="ml-2 h-5 w-5 text-xs">
                                    {tabCounts.pending}
                                </Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="approved" className="relative">
                            {t('admin_approved') || 'Approved'}
                            {tabCounts.approved > 0 && (
                                <Badge variant="secondary" className="ml-2 h-5 w-5 text-xs">
                                    {tabCounts.approved}
                                </Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="rejected" className="relative">
                            {t('admin_rejected') || 'Rejected'}
                            {tabCounts.rejected > 0 && (
                                <Badge variant="secondary" className="ml-2 h-5 w-5 text-xs">
                                    {tabCounts.rejected}
                                </Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="all" className="relative">
                            {t('all') || 'All'}
                            {tabCounts.all > 0 && (
                                <Badge variant="secondary" className="ml-2 h-5 w-5 text-xs">
                                    {tabCounts.all}
                                </Badge>
                            )}
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value={activeTab} className="mt-6">
                        <div className={`text-sm text-muted-foreground mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                            {t('admin_showing') || 'Showing'}: {filteredApprovals.length} {t('admin_approvals') || 'approvals'}
                        </div>

                        {filteredApprovals.length === 0 ? (
                            <p className={`text-muted-foreground text-center py-8 ${isRTL ? 'text-right' : 'text-left'}`}>
                                {activeTab === 'pending' && (t('admin_no_pending_approvals') || 'No pending approvals')}
                                {activeTab === 'approved' && (t('admin_no_approved_approvals') || 'No approved approvals')}
                                {activeTab === 'rejected' && (t('admin_no_rejected_approvals') || 'No rejected approvals')}
                                {activeTab === 'all' && (t('admin_no_doctor_approvals') || 'No doctor approvals found')}
                            </p>
                        ) : (
                            <div className="space-y-4">
                                {filteredApprovals.map((doctor) => (
                                    <div key={doctor.id} className={`flex items-center justify-between p-4 border rounded-lg ${isRTL ? 'flex-row-reverse' : ''}`}>
                                        <div className={`space-y-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                                            <div className={`flex items-center ${isRTL ? 'gap-2 flex-row-reverse' : 'gap-2'}`}>
                                                <h3 className="font-semibold">{doctor.name}</h3>
                                                {getStatusBadge(doctor.status)}
                                            </div>
                                            <p className="text-sm text-muted-foreground">{doctor.email}</p>
                                            <p className="text-sm">
                                                {localizeSpecialty(locale, doctor.specialty)} • {doctor.experience_years} {t('admin_years_experience') || 'years experience'}
                                            </p>
                                        </div>

                                        {doctor.status === 'pending' && (
                                            <div className={`flex ${isRTL ? 'gap-2 flex-row-reverse' : 'gap-2'}`}>
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleApproval(doctor.id, 'approve')}
                                                    className="bg-green-600 hover:bg-green-700 text-white"
                                                >
                                                    <CheckCircle className={`w-4 h-4 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                                                    {t('admin_approve') || 'Approve'}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => handleApproval(doctor.id, 'reject')}
                                                >
                                                    <XCircle className={`w-4 h-4 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                                                    {t('admin_reject') || 'Reject'}
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    )
}
