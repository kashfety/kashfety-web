"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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

export default function DoctorApprovals() {
    const [approvals, setApprovals] = useState<DoctorApproval[]>([])
    const [loading, setLoading] = useState(true)
    const { toast } = useToast()
    const { t, isRTL, locale } = useLocale()

    useEffect(() => {
        fetchDoctorApprovals()
    }, [])

    const fetchDoctorApprovals = async () => {
        try {
            setLoading(true)

            console.log(' Fetching doctor approvals');
            const response = await fetch('/api/admin-doctor-certificates?status=pending', {
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
                    .filter((cert: any) => cert.status === 'pending' || !cert.status)
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
            
            // Call the [id]/route.ts directly (without /review suffix)
            // Using POST instead of PUT (Vercel serverless workaround)
            const endpoint = `/api/auth/admin/certificates/${certificateId}`;
            console.log(` [Doctor Approvals] Calling:`, endpoint);
            
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            console.log(` [Doctor Approvals] Response:`, response.status);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error(` [Doctor Approvals] Error:`, errorData);
                throw new Error(`Failed to ${action} doctor`);
            }
            
            const responseData = await response.json();
            console.log(` [Doctor Approvals] Success:`, responseData);

            fetchDoctorApprovals();

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

    if (loading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className={`flex items-center ${isRTL ? 'gap-2 flex-row-reverse' : 'gap-2'}`}>
                        <User className="w-5 h-5" />
                        {t('admin_doctor_approvals') || 'Doctor Approvals'}
                    </CardTitle>
                    <CardDescription className={isRTL ? 'text-right' : 'text-left'}>
                        {t('admin_review_approve_doctor_requests') || 'Review and approve doctor registration requests'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {approvals.length === 0 ? (
                        <p className={`text-center text-muted-foreground py-8 ${isRTL ? 'text-right' : 'text-left'}`}>
                            {t('admin_no_pending_doctor_approvals') || 'No pending doctor approvals'}
                        </p>
                    ) : (
                        <div className="space-y-4">
                            {approvals.map((doctor) => (
                                <div key={doctor.id} className={`flex items-center justify-between p-4 border rounded-lg ${isRTL ? 'flex-row-reverse' : ''}`}>
                                    <div className={`space-y-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                                        <div className={`flex items-center ${isRTL ? 'gap-2 flex-row-reverse' : 'gap-2'}`}>
                                            <h3 className="font-semibold">{doctor.name}</h3>
                                            {getStatusBadge(doctor.status)}
                                        </div>
                                        <p className="text-sm text-muted-foreground">{doctor.email}</p>
                                        <p className="text-sm">
                                            {localizeSpecialty(locale, doctor.specialty)}  {doctor.experience_years} {t('admin_years_experience') || 'years experience'}
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
                </CardContent>
            </Card>
        </div>
    )
}
