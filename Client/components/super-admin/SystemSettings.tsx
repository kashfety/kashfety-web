"use client"

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
    Settings,
    Save,
    RefreshCw,
    AlertTriangle,
    Shield,
    Globe,
    Clock,
    Database,
    Mail,
    Bell,
    Key,
    Users,
    Building2,
    Zap,
    Download,
    Upload
} from 'lucide-react';
import {
    Alert,
    AlertDescription,
    AlertTitle,
} from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface SystemSetting {
    id: string;
    setting_key: string;
    setting_value: any;
    setting_type: 'string' | 'number' | 'boolean' | 'json';
    description: string;
    is_public: boolean;
    updated_at: string;
    updated_by: string | null;
}

interface SettingsGroup {
    [key: string]: SystemSetting;
}

export default function SystemSettings() {
    const { toast } = useToast();
    const [settings, setSettings] = useState<Record<string, SystemSetting>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [modifiedSettings, setModifiedSettings] = useState<Record<string, any>>({});

    const settingsGroups = {
        general: {
            title: 'General Settings',
            icon: Settings,
            keys: ['system_name', 'system_description', 'support_email', 'support_phone']
        },
        security: {
            title: 'Security & Authentication',
            icon: Shield,
            keys: ['max_login_attempts', 'session_timeout_minutes', 'require_email_verification', 'require_2fa_for_admins']
        },
        appointments: {
            title: 'Appointment System',
            icon: Clock,
            keys: ['max_appointment_days_ahead', 'require_admin_approval_for_doctors', 'allow_cancellation_hours', 'appointment_reminder_hours']
        },
        notifications: {
            title: 'Notifications',
            icon: Bell,
            keys: ['email_notifications_enabled', 'sms_notifications_enabled', 'push_notifications_enabled', 'notification_frequency']
        },
        maintenance: {
            title: 'System Maintenance',
            icon: Database,
            keys: ['maintenance_mode', 'backup_frequency', 'log_retention_days', 'auto_cleanup_enabled']
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
            const baseUrl = apiUrl.endsWith('/api') ? apiUrl : `${apiUrl.replace(/\/$/, '')}/api`
            const response = await fetch(`${baseUrl}/super-admin/settings`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch system settings');
            }

            const data = await response.json();
            const settingsMap: Record<string, SystemSetting> = {};
            data.data.forEach((setting: SystemSetting) => {
                settingsMap[setting.setting_key] = setting;
            });
            setSettings(settingsMap);
        } catch (error) {
            setSettings({});

            toast({
                title: "Error Loading Settings",
                description: "Failed to load system settings. Please try again.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSettingChange = (settingKey: string, value: any) => {
        setModifiedSettings(prev => ({
            ...prev,
            [settingKey]: value
        }));
        setHasChanges(true);
    };

    const getCurrentValue = (settingKey: string) => {
        return modifiedSettings[settingKey] !== undefined
            ? modifiedSettings[settingKey]
            : settings[settingKey]?.setting_value;
    };

    const saveSettings = async () => {
        try {
            setSaving(true);
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
            const baseUrl = apiUrl.endsWith('/api') ? apiUrl : `${apiUrl.replace(/\/$/, '')}/api`

            const response = await fetch(`${baseUrl}/super-admin/settings`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ settings: modifiedSettings })
            });

            if (!response.ok) {
                throw new Error('Failed to save settings');
            }

            toast({
                title: "Success",
                description: "System settings saved successfully",
            });

            setHasChanges(false);
            setModifiedSettings({});
            fetchSettings(); // Refresh to get updated timestamps
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to save system settings",
                variant: "destructive"
            });
        } finally {
            setSaving(false);
        }
    };

    const resetSettings = () => {
        setModifiedSettings({});
        setHasChanges(false);
    };

    const exportSettings = async () => {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
            const baseUrl = apiUrl.endsWith('/api') ? apiUrl : `${apiUrl.replace(/\/$/, '')}/api`
            const response = await fetch(`${baseUrl}/super-admin/settings/export`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to export settings');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `system-settings-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast({
                title: "Success",
                description: "Settings exported successfully",
            });
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to export settings",
                variant: "destructive"
            });
        }
    };

    const renderSettingInput = (setting: SystemSetting) => {
        const currentValue = getCurrentValue(setting.setting_key);

        switch (setting.setting_type) {
            case 'boolean':
                return (
                    <Switch
                        checked={currentValue}
                        onCheckedChange={(checked) => handleSettingChange(setting.setting_key, checked)}
                    />
                );
            case 'number':
                return (
                    <Input
                        type="number"
                        value={currentValue}
                        onChange={(e) => handleSettingChange(setting.setting_key, Number(e.target.value))}
                        className="w-32"
                    />
                );
            case 'string':
                if (setting.setting_key.includes('email')) {
                    return (
                        <Input
                            type="email"
                            value={currentValue}
                            onChange={(e) => handleSettingChange(setting.setting_key, e.target.value)}
                        />
                    );
                }
                if (setting.description.toLowerCase().includes('description')) {
                    return (
                        <Textarea
                            value={currentValue}
                            onChange={(e) => handleSettingChange(setting.setting_key, e.target.value)}
                            rows={3}
                        />
                    );
                }
                return (
                    <Input
                        value={currentValue}
                        onChange={(e) => handleSettingChange(setting.setting_key, e.target.value)}
                    />
                );
            case 'json':
                return (
                    <Textarea
                        value={JSON.stringify(currentValue, null, 2)}
                        onChange={(e) => {
                            try {
                                const parsed = JSON.parse(e.target.value);
                                handleSettingChange(setting.setting_key, parsed);
                            } catch (error) {
                                // Invalid JSON, don't update
                            }
                        }}
                        rows={4}
                        className="font-mono text-sm"
                    />
                );
            default:
                return (
                    <Input
                        value={String(currentValue)}
                        onChange={(e) => handleSettingChange(setting.setting_key, e.target.value)}
                    />
                );
        }
    };

    if (loading) {
        return (
            <div className="space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Loading system settings...</CardTitle>
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
                        <Settings className="h-6 w-6 mr-2 text-gray-600" />
                        System Settings
                    </h2>
                    <p className="text-muted-foreground">Configure system-wide settings and preferences</p>
                </div>
                <div className="flex space-x-2">
                    <Button onClick={exportSettings} variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Export
                    </Button>
                    <Button onClick={fetchSettings}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Warning Alert */}
            <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Caution</AlertTitle>
                <AlertDescription>
                    Changes to system settings can affect the entire platform. Make sure you understand the impact before saving changes.
                </AlertDescription>
            </Alert>

            {/* Save/Reset Actions */}
            {hasChanges && (
                <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                                <span className="text-sm font-medium">You have unsaved changes</span>
                            </div>
                            <div className="flex space-x-2">
                                <Button variant="outline" onClick={resetSettings}>
                                    Reset
                                </Button>
                                <Button onClick={saveSettings} disabled={saving}>
                                    <Save className="h-4 w-4 mr-2" />
                                    {saving ? 'Saving...' : 'Save Changes'}
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Settings Tabs */}
            <Tabs defaultValue="general" className="space-y-6">
                <TabsList className="grid w-full grid-cols-5">
                    {Object.entries(settingsGroups).map(([key, group]) => {
                        const IconComponent = group.icon;
                        return (
                            <TabsTrigger key={key} value={key} className="flex items-center space-x-2">
                                <IconComponent className="h-4 w-4" />
                                <span className="hidden sm:inline">{group.title.split(' ')[0]}</span>
                            </TabsTrigger>
                        );
                    })}
                </TabsList>

                {Object.entries(settingsGroups).map(([groupKey, group]) => (
                    <TabsContent key={groupKey} value={groupKey}>
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    <group.icon className="h-5 w-5 mr-2" />
                                    {group.title}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-6">
                                    {group.keys.map((settingKey) => {
                                        const setting = settings[settingKey];
                                        if (!setting) return null;

                                        return (
                                            <div key={settingKey} className="flex items-center justify-between py-3 border-b last:border-b-0">
                                                <div className="flex-1">
                                                    <div className="flex items-center space-x-2">
                                                        <h4 className="font-medium capitalize">
                                                            {setting.setting_key.replace(/_/g, ' ')}
                                                        </h4>
                                                        {!setting.is_public && (
                                                            <Shield className="h-4 w-4 text-orange-500" title="Private setting" />
                                                        )}
                                                        {modifiedSettings[settingKey] !== undefined && (
                                                            <span className="text-xs text-yellow-600 font-medium">Modified</span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-muted-foreground mt-1">
                                                        {setting.description}
                                                    </p>
                                                    {setting.updated_at && (
                                                        <p className="text-xs text-muted-foreground mt-1">
                                                            Last updated: {new Date(setting.updated_at).toLocaleString()}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="flex-shrink-0 ml-4">
                                                    {renderSettingInput(setting)}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    );
}
