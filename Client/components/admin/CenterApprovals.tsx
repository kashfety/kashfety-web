"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CheckCircle, XCircle, Clock, Building, MapPin, Phone, Mail, User } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useLocale } from '@/components/providers/locale-provider'

interface Doctor {
    id: string
    first_name: string
    last_name: string
    email: string
    phone?: string
    specialty?: string
}

interface CenterRequest {
    id: string
    name: string
    address?: string
    phone?: string
    email?: string
    center_type: 'generic' | 'personal'
    approval_status: 'pending' | 'approved' | 'rejected'
    owner_doctor_id?: string
    doctor?: Doctor | null
    created_at: string
    updated_at?: string
}

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected'

export default function CenterApprovals() {
    const [requests, setRequests] = useState<CenterRequest[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<StatusFilter>('pending')
    const { toast } = useToast()
    const { t, isRTL, locale } = useLocale()

    useEffect(() => {
        fetchCenterRequests(activeTab)
    }, [activeTab])

    const fetchCenterRequests = async (status?: StatusFilter) => {
        try {
            setLoading(true)
            const token = localStorage.getItem('auth_token')
            
            let url = '/api/admin/center-requests'
            if (status && status !== 'all') {
                url += `?status=${status}`
            }
            
            console.log('🚨 FRONTEND: Fetching center requests', { url, status, hasToken: !!token })
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            console.log('🚨 FRONTEND: Response status:', response.status, response.statusText)

            if (!response.ok) {
                const errorText = await response.text()
                console.error('🚨 FRONTEND: Response error:', errorText)
                throw new Error(`Failed to fetch center requests: ${response.status} ${errorText}`)
            }

            const result = await response.json()
            console.log('🚨 FRONTEND: Response data:', result)
            
            if (result.success) {
                console.log('🚨 FRONTEND: Setting requests:', result.data?.length || 0, 'items')
                setRequests(result.data || [])
            } else {
                throw new Error(result.error || 'Failed to load center requests')
            }
        } catch (error: any) {
            console.error('Fetch center requests error:', error)
            toast({
                title: t('error') || 'Error',
                description: error.message || t('admin_load_center_requests_failed') || 'Failed to load center requests',
                variant: "destructive"
            })
        } finally {
            setLoading(false)
        }
    }

    const handleApproval = async (requestId: string, action: 'approve' | 'reject') => {
        try {
            const token = localStorage.getItem('auth_token')
            
            const response = await fetch(`/api/admin/center-requests/${requestId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ action })
            })

            if (!response.ok) {
                throw new Error(`Failed to ${action} center request`)
            }

            const result = await response.json()
            
            if (result.success) {
                toast({
                    title: t('success') || 'Success',
                    description: action === 'approve' 
                        ? t('admin_center_approved') || 'Center request approved'
                        : t('admin_center_rejected') || 'Center request rejected'
                })
                
                // Refresh the list
                await fetchCenterRequests(activeTab)
            } else {
                throw new Error(result.error || `Failed to ${action} center`)
            }
        } catch (error: any) {
            console.error(`${action} center error:`, error)
            toast({
                title: t('error') || 'Error',
                description: error.message || (action === 'approve' 
                    ? t('admin_center_approve_failed') || 'Failed to approve center'
                    : t('admin_center_reject_failed') || 'Failed to reject center'),
                variant: "destructive"
            })
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="h-3 w-3 mr-1" />{t('admin_pending') || 'Pending'}</Badge>
            case 'approved':
                return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle className="h-3 w-3 mr-1" />{t('admin_approved') || 'Approved'}</Badge>
            case 'rejected':
                return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="h-3 w-3 mr-1" />{t('admin_rejected') || 'Rejected'}</Badge>
            default:
                return <Badge variant="outline">{status}</Badge>
        }
    }

    const getCenterTypeBadge = (type: string) => {
        switch (type) {
            case 'generic':
                return <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">{t('generic_center') || 'Generic Center'}</Badge>
            case 'personal':
                return <Badge variant="secondary" className="bg-purple-50 text-purple-700 border-purple-200">{t('personal_clinic') || 'Personal Clinic'}</Badge>
            default:
                return <Badge variant="secondary">{type}</Badge>
        }
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const getTabCounts = () => {
        return {
            all: requests.length,
            pending: requests.filter(r => r.approval_status === 'pending').length,
            approved: requests.filter(r => r.approval_status === 'approved').length,
            rejected: requests.filter(r => r.approval_status === 'rejected').length
        }
    }

    const filteredRequests = activeTab === 'all' 
        ? requests 
        : requests.filter(r => r.approval_status === activeTab)

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <Building className="h-5 w-5" />
                        {t('admin_center_approvals') || 'Center Approvals'}
                    </CardTitle>
                    <CardDescription>
                        {t('admin_center_approvals_desc') || 'Review and approve center registration requests'}
                    </CardDescription>
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
                        <Building className="h-5 w-5" />
                        {t('admin_center_approvals') || 'Center Approvals'}
                    </div>
                    <Button onClick={() => fetchCenterRequests(activeTab)} variant="outline" size="sm" className="border-[#4DBCC4] text-[#4DBCC4] hover:bg-[#4DBCC4]/10 dark:border-[#4DBCC4] dark:text-[#4DBCC4] dark:hover:bg-[#4DBCC4]/20">
                        {t('refresh') || 'Refresh'}
                    </Button>
                </CardTitle>
                <CardDescription>
                    {t('admin_center_approvals_desc') || 'Review and approve center registration requests'}
                </CardDescription>
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
                            {t('admin_showing') || 'Showing'}: {filteredRequests.length} {t('admin_requests') || 'requests'}
                        </div>

                        {filteredRequests.length === 0 ? (
                            <p className={`text-muted-foreground text-center py-8 ${isRTL ? 'text-right' : 'text-left'}`}>
                                {activeTab === 'pending' && (t('admin_no_pending_requests') || 'No pending requests')}
                                {activeTab === 'approved' && (t('admin_no_approved_requests') || 'No approved requests')}
                                {activeTab === 'rejected' && (t('admin_no_rejected_requests') || 'No rejected requests')}
                                {activeTab === 'all' && (t('admin_no_center_requests') || 'No center requests found')}
                            </p>
                        ) : (
                            <div className="space-y-4">
                                {filteredRequests.map((request) => (
                                    <div key={request.id} className={`flex items-start justify-between p-4 border rounded-lg bg-card ${isRTL ? 'flex-row-reverse' : ''}`}>
                                        <div className={`space-y-2 flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                                            <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse justify-start' : ''}`}>
                                                <h3 className="font-semibold text-lg">{request.name}</h3>
                                                {getCenterTypeBadge(request.center_type)}
                                                {getStatusBadge(request.approval_status)}
                                            </div>
                                            
                                            {request.address && (
                                                <div className={`flex items-center gap-2 text-sm text-muted-foreground ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                    <MapPin className="h-4 w-4" />
                                                    {request.address}
                                                </div>
                                            )}
                                            
                                            {request.phone && (
                                                <div className={`flex items-center gap-2 text-sm text-muted-foreground ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                    <Phone className="h-4 w-4" />
                                                    {request.phone}
                                                </div>
                                            )}
                                            
                                            {request.email && (
                                                <div className={`flex items-center gap-2 text-sm text-muted-foreground ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                    <Mail className="h-4 w-4" />
                                                    {request.email}
                                                </div>
                                            )}
                                            
                                            {request.doctor && (
                                                <div className={`flex items-center gap-2 text-sm text-muted-foreground ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                    <User className="h-4 w-4" />
                                                    <span>{t('admin_requested_by') || 'Requested by'}: {request.doctor.first_name} {request.doctor.last_name}</span>
                                                    {request.doctor.email && <span>({request.doctor.email})</span>}
                                                </div>
                                            )}
                                            
                                            <div className="text-xs text-muted-foreground">
                                                {t('admin_submitted') || 'Submitted'}: {formatDate(request.created_at)}
                                            </div>
                                        </div>

                                        {request.approval_status === 'pending' && (
                                            <div className={`flex gap-2 ml-4 ${isRTL ? 'flex-row-reverse mr-4 ml-0' : ''}`}>
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleApproval(request.id, 'approve')}
                                                    className="bg-[#4DBCC4] hover:bg-[#4DBCC4]/90 dark:bg-[#2a5f6b] dark:hover:bg-[#2a5f6b]/90"
                                                >
                                                    <CheckCircle className={`h-4 w-4 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                                                    {t('admin_approve') || 'Approve'}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => handleApproval(request.id, 'reject')}
                                                >
                                                    <XCircle className={`h-4 w-4 ${isRTL ? 'ml-1' : 'mr-1'}`} />
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