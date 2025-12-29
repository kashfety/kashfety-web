"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
    Shield,
    Search,
    Filter,
    Download,
    User,
    Calendar,
    Activity,
    AlertCircle,
    CheckCircle,
    XCircle
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useLocale } from '@/components/providers/locale-provider'

interface AuditLog {
    id: string
    timestamp: string
    user: {
        id: string
        name: string
        role: string
    }
    action: string
    resource: string
    resourceId?: string
    details: string
    status: 'success' | 'failure' | 'warning'
    ipAddress: string
    userAgent: string
}

export default function AuditLogs() {
    const [logs, setLogs] = useState<AuditLog[]>([])
    const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [actionFilter, setActionFilter] = useState<string>('all')
    const { toast } = useToast()
    const { t, isRTL } = useLocale()

    useEffect(() => {
        fetchAuditLogs()
    }, [])

    useEffect(() => {
        filterLogs()
    }, [logs, searchTerm, statusFilter, actionFilter])

    const fetchAuditLogs = async () => {
        try {
            setLoading(true)

            const params = new URLSearchParams({
                page: '1',
                limit: '50'
            });

            if (statusFilter && statusFilter !== 'all') {
                params.append('status', statusFilter);
            }

            if (actionFilter && actionFilter !== 'all') {
                params.append('action', actionFilter);
            }

            // Try multiple route variants for Vercel compatibility
            const routes = [
                `/api/admin-audit-logs?${params}`,
                `/api/auth/admin/audit-logs?${params}`
            ];

            let response = null;
            for (let i = 0; i < routes.length; i++) {
                try {
                    response = await fetch(routes[i], {
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                            'Content-Type': 'application/json'
                        }
                    });
                    if (response.ok) {
                        break;
                    }
                } catch (error) {
                    if (i === routes.length - 1) {
                        throw error; // Rethrow on last attempt
                    }
                }
            }

            if (!response || !response.ok) {
                throw new Error('Failed to fetch audit logs');
            }

            const data = await response.json();

            // Check if audit logs exist
            if (data.success && data.data && data.data.logs && Array.isArray(data.data.logs)) {
                // Transform the audit log data to match our AuditLog interface
                const transformedLogs: AuditLog[] = data.data.logs.map((log: any) => ({
                    id: log.id,
                    timestamp: log.created_at,
                    user: {
                        id: log.user?.id || log.user_id || 'unknown',
                        name: log.user?.name || 'Unknown User',
                        role: log.user?.role || 'unknown'
                    },
                    action: log.action,
                    resource: log.resource_type,
                    resourceId: log.resource_id,
                    details: log.details || formatLogDetails(log),
                    status: determineLogStatus(log.action),
                    ipAddress: log.ip_address || 'Unknown',
                    userAgent: log.user_agent || 'Unknown'
                }));

                setLogs(transformedLogs);
            } else {
                // No audit logs - set empty array
                setLogs([]);
            }
        } catch (error) {
            toast({
                title: t('admin_error') || "Error",
                description: t('admin_failed_to_load_audit_logs') || "Failed to load audit logs",
                variant: "destructive"
            })

            // Set empty state instead of mock data
            setLogs([]);
        } finally {
            setLoading(false)
        }
    }

    // Helper function to format log details based on action and values
    const formatLogDetails = (log: any): string => {
        // If details are already provided, use them
        if (log.details) {
            return log.details;
        }

        const action = log.action;
        const resourceType = log.resource_type;
        const resourceId = log.resource_id;
        const userName = log.user?.name || 'Unknown User';

        switch (action) {
            case 'CREATE':
                return `Created new ${resourceType.toLowerCase()}${resourceId ? ` (ID: ${resourceId})` : ''}`;
            case 'UPDATE':
                return `Updated ${resourceType.toLowerCase()}${resourceId ? ` (ID: ${resourceId})` : ''}`;
            case 'DELETE':
                return `Deleted ${resourceType.toLowerCase()}${resourceId ? ` (ID: ${resourceId})` : ''}`;
            case 'REGISTER':
                return `User registered in the system`;
            case 'LOGIN':
                return 'User logged in successfully';
            case 'LOGIN_FAILED':
                return 'Failed login attempt';
            case 'LOGOUT':
                return 'User logged out';
            case 'APPROVE':
                return `Approved ${resourceType.toLowerCase()}${resourceId ? ` (ID: ${resourceId})` : ''}`;
            case 'REJECT':
                return `Rejected ${resourceType.toLowerCase()}${resourceId ? ` (ID: ${resourceId})` : ''}`;
            case 'SUBMIT':
                return `Submitted ${resourceType.toLowerCase()} for review`;
            default:
                return `${action} on ${resourceType.toLowerCase()}${resourceId ? ` (ID: ${resourceId})` : ''}`;
        }
    }

    // Helper function to determine log status based on action
    const determineLogStatus = (action: string): 'success' | 'failure' | 'warning' => {
        const failureActions = ['LOGIN_FAILED', 'DELETE', 'REJECT'];
        const warningActions = ['UPDATE', 'APPROVE', 'SUBMIT'];

        if (failureActions.includes(action)) {
            return 'failure';
        } else if (warningActions.includes(action)) {
            return 'warning';
        } else {
            return 'success';
        }
    }

    const filterLogs = () => {
        let filtered = logs

        if (searchTerm) {
            filtered = filtered.filter(log =>
                log.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.resource.toLowerCase().includes(searchTerm.toLowerCase())
            )
        }

        if (statusFilter !== 'all') {
            filtered = filtered.filter(log => log.status === statusFilter)
        }

        if (actionFilter !== 'all') {
            filtered = filtered.filter(log => log.action === actionFilter)
        }

        setFilteredLogs(filtered)
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'success':
                return <Badge variant="default" className="bg-green-500"><CheckCircle className={`w-3 h-3 ${isRTL ? 'ml-1' : 'mr-1'}`} />{t('admin_success') || 'Success'}</Badge>
            case 'failure':
                return <Badge variant="destructive"><XCircle className={`w-3 h-3 ${isRTL ? 'ml-1' : 'mr-1'}`} />{t('admin_failure') || 'Failure'}</Badge>
            case 'warning':
                return <Badge variant="secondary" className="bg-yellow-500 text-white"><AlertCircle className={`w-3 h-3 ${isRTL ? 'ml-1' : 'mr-1'}`} />{t('admin_warning') || 'Warning'}</Badge>
            default:
                return <Badge variant="secondary">{t('admin_unknown') || 'Unknown'}</Badge>
        }
    }

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'admin':
                return <Badge variant="destructive">{t('admin_admin') || 'Admin'}</Badge>
            case 'doctor':
                return <Badge variant="default">{t('admin_doctor') || 'Doctor'}</Badge>
            case 'patient':
                return <Badge variant="secondary">{t('admin_patient') || 'Patient'}</Badge>
            case 'system':
                return <Badge variant="outline">{t('admin_system') || 'System'}</Badge>
            default:
                return <Badge variant="secondary">{role}</Badge>
        }
    }

    const exportLogs = () => {
        const csv = [
            'Timestamp,User,Role,Action,Resource,Status,Details,IP Address',
            ...filteredLogs.map(log =>
                `${log.timestamp},${log.user.name},${log.user.role},${log.action},${log.resource},${log.status},"${log.details}",${log.ipAddress}`
            )
        ].join('\n')

        const blob = new Blob([csv], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        window.URL.revokeObjectURL(url)

        toast({
            title: t('admin_success') || "Success",
            description: t('admin_audit_logs_exported_successfully') || "Audit logs exported successfully",
        })
    }

    const uniqueActions = Array.from(new Set(logs.map(log => log.action)))

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
                <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
                    <CardTitle className={`flex items-center ${isRTL ? 'gap-2' : 'gap-2'}`}>
                        <Shield className="w-5 h-5" />
                        {t('admin_audit_logs') || 'Audit Logs'}
                    </CardTitle>
                    <CardDescription>
                        {t('admin_system_activity_and_security_audit_trail') || 'System activity and security audit trail'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {/* Filters */}
                    <div className={`flex flex-col md:flex-row gap-4 mb-6 ${isRTL ? 'md:flex-row-reverse' : ''}`}>
                        <div className="flex-1">
                            <div className="relative">
                                <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4`} />
                                <Input
                                    placeholder={t('admin_search_logs') || 'Search logs...'}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className={isRTL ? 'pr-10' : 'pl-10'}
                                />
                            </div>
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[150px]">
                                <SelectValue placeholder={t('admin_status') || 'Status'} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('admin_all_status') || 'All Status'}</SelectItem>
                                <SelectItem value="success">{t('admin_success') || 'Success'}</SelectItem>
                                <SelectItem value="failure">{t('admin_failure') || 'Failure'}</SelectItem>
                                <SelectItem value="warning">{t('admin_warning') || 'Warning'}</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={actionFilter} onValueChange={setActionFilter}>
                            <SelectTrigger className="w-[150px]">
                                <SelectValue placeholder={t('admin_action') || 'Action'} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('admin_all_actions') || 'All Actions'}</SelectItem>
                                {uniqueActions.map(action => (
                                    <SelectItem key={action} value={action}>
                                        {action.replace('_', ' ')}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button onClick={exportLogs} variant="outline" className={`flex items-center ${isRTL ? 'gap-2' : 'gap-2'}`}>
                            <Download className="w-4 h-4" />
                            {t('admin_export') || 'Export'}
                        </Button>
                    </div>

                    {/* Logs List */}
                    <ScrollArea className="h-[600px]">
                        {filteredLogs.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">
                                {t('admin_no_audit_logs_found') || 'No audit logs found'}
                            </p>
                        ) : (
                            <div className="space-y-4">
                                {filteredLogs.map((log) => (
                                    <div key={log.id} className="border rounded-lg p-4 space-y-3">
                                        <div className={`flex items-start ${isRTL ? 'justify-between' : 'justify-between'}`}>
                                            <div className="space-y-2">
                                                <div className={`flex items-center ${isRTL ? 'gap-2' : 'gap-2'}`}>
                                                    <h4 className="font-semibold">{log.action.replace('_', ' ')}</h4>
                                                    {getStatusBadge(log.status)}
                                                </div>

                                                <div className={`flex items-center ${isRTL ? 'gap-4' : 'gap-4'} text-sm text-muted-foreground`}>
                                                    <div className={`flex items-center ${isRTL ? 'gap-1' : 'gap-1'}`}>
                                                        <User className="w-4 h-4" />
                                                        {log.user.name}
                                                        {getRoleBadge(log.user.role)}
                                                    </div>

                                                    <div className={`flex items-center ${isRTL ? 'gap-1' : 'gap-1'}`}>
                                                        <Calendar className="w-4 h-4" />
                                                        {new Date(log.timestamp).toLocaleString()}
                                                    </div>

                                                    <div className={`flex items-center ${isRTL ? 'gap-1' : 'gap-1'}`}>
                                                        <Activity className="w-4 h-4" />
                                                        {log.resource}
                                                        {log.resourceId && (
                                                            <span className="text-xs bg-muted px-2 py-1 rounded">
                                                                {log.resourceId}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <p className="text-sm">{log.details}</p>

                                        <div className="text-xs text-muted-foreground pt-2 border-t">
                                            IP: {log.ipAddress} • User Agent: {log.userAgent.substring(0, 50)}...
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    )
}
