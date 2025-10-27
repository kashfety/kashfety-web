"use client"

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Save,
  User,
  Mail,
  Phone,
  Shield,
  Settings,
  Eye,
  EyeOff,
  Edit,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/providers/auth-provider";
import { useLocale } from "@/components/providers/locale-provider";

interface AdminProfileData {
  id: string;
  name: string;
  first_name?: string;
  last_name?: string;
  email: string;
  phone: string;
  role: string;
  created_at: string;
  updated_at: string;
  last_login?: string;
}

interface AdminProfileSettingsProps {
  onProfileUpdate?: (updatedProfile: AdminProfileData) => void;
}

export default function AdminProfileSettings({
  onProfileUpdate
}: AdminProfileSettingsProps) {
  const { t, isRTL } = useLocale();
  const { user } = useAuth();
  const { toast } = useToast();

  const [profile, setProfile] = useState<AdminProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  // Load admin profile on component mount
  useEffect(() => {
    loadAdminProfile();
  }, []);

  const loadAdminProfile = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast({
          title: "Authentication Error",
          description: "Please log in to view your profile.",
          variant: "destructive"
        });
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const baseUrl = apiUrl.endsWith('/api') ? apiUrl : `${apiUrl.replace(/\/$/, '')}/api`;

      const response = await fetch(`${baseUrl}/auth/admin/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const adminProfile = data.admin || data.user;

        setProfile(adminProfile);

        // Handle splitting existing name if first_name/last_name are not set
        let firstName = adminProfile.first_name || "";
        let lastName = adminProfile.last_name || "";

        if (!firstName && !lastName && adminProfile.name) {
          const nameParts = adminProfile.name.trim().split(' ');
          firstName = nameParts[0] || "";
          lastName = nameParts.slice(1).join(' ') || "";
        }

        setFormData({
          name: adminProfile.name || "",
          first_name: firstName,
          last_name: lastName,
          email: adminProfile.email || "",
          phone: adminProfile.phone || "",
        });
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.message || "Failed to load profile",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error loading admin profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePasswordChange = (field: string, value: string) => {
    setPasswordData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validatePasswordChange = () => {
    if (!passwordData.currentPassword) {
      toast({
        title: "Validation Error",
        description: "Current password is required",
        variant: "destructive"
      });
      return false;
    }

    if (!passwordData.newPassword || passwordData.newPassword.length < 6) {
      toast({
        title: "Validation Error",
        description: "New password must be at least 6 characters long",
        variant: "destructive"
      });
      return false;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Validation Error",
        description: "New passwords do not match",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const saveProfile = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('auth_token');

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const baseUrl = apiUrl.endsWith('/api') ? apiUrl : `${apiUrl.replace(/\/$/, '')}/api`;

      // Build full name from first_name and last_name
      const fullName = `${formData.first_name.trim()} ${formData.last_name.trim()}`.trim();

      const requestData = {
        name: fullName,
        email: formData.email,
        phone: formData.phone
      };

      console.log('🔄 Saving admin profile:', {
        formData,
        requestData,
        url: `${baseUrl}/auth/admin/profile`,
        token: token ? 'present' : 'missing'
      });

      const response = await fetch(`${baseUrl}/auth/admin/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      console.log('📥 Response status:', response.status);

      const responseData = await response.json();
      console.log('📥 Response data:', responseData);

      if (response.ok) {
        const updatedProfile = responseData.admin || responseData.user;

        setProfile(updatedProfile);

        // Update formData with the returned data including split names
        setFormData({
          name: updatedProfile.name || "",
          first_name: updatedProfile.first_name || "",
          last_name: updatedProfile.last_name || "",
          email: updatedProfile.email || "",
          phone: updatedProfile.phone || "",
        });

        setEditMode(false);

        toast({
          title: "Profile Updated",
          description: "Your profile has been successfully updated.",
        });

        if (onProfileUpdate) {
          onProfileUpdate(updatedProfile);
        }
      } else {
        console.error('❌ Update failed:', responseData);
        toast({
          title: "Update Failed",
          description: responseData.message || responseData.error || "Failed to update profile",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('❌ Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (!validatePasswordChange()) return;

    try {
      setSaving(true);
      const token = localStorage.getItem('auth_token');

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const baseUrl = apiUrl.endsWith('/api') ? apiUrl : `${apiUrl.replace(/\/$/, '')}/api`;

      const response = await fetch(`${baseUrl}/auth/admin/change-password`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });

      if (response.ok) {
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: ""
        });
        setShowPasswordChange(false);

        toast({
          title: "Password Changed",
          description: "Your password has been successfully updated.",
        });
      } else {
        const errorData = await response.json();
        toast({
          title: "Password Change Failed",
          description: errorData.message || "Failed to change password",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error changing password:', error);
      toast({
        title: "Error",
        description: "Failed to change password. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    // Handle splitting existing name if first_name/last_name are not set
    let firstName = profile?.first_name || "";
    let lastName = profile?.last_name || "";

    if (!firstName && !lastName && profile?.name) {
      const nameParts = profile.name.trim().split(' ');
      firstName = nameParts[0] || "";
      lastName = nameParts.slice(1).join(' ') || "";
    }

    setFormData({
      name: profile?.name || "",
      first_name: firstName,
      last_name: lastName,
      email: profile?.email || "",
      phone: profile?.phone || "",
    });
    setEditMode(false);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-6"></div>
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`flex items-center ${isRTL ? 'justify-between' : 'justify-between'}`}>
        <div className={isRTL ? 'text-right' : 'text-left'}>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('profile_settings') || 'Profile Settings'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {t('manage_admin_profile') || 'Manage your admin profile and account settings'}
          </p>
        </div>
        <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
          <Shield className={`w-3 h-3 ${isRTL ? 'ml-1' : 'mr-1'}`} />
          {t('admin_profile') || 'Admin Profile'}
        </Badge>
      </div>

      {/* Profile Information */}
      <Card>
        <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
          <div className={`flex items-center ${isRTL ? 'justify-between' : 'justify-between'}`}>
            <CardTitle className={`flex items-center ${isRTL ? 'gap-2' : 'gap-2'}`}>
              <User className="w-5 h-5" />
              {t('profile_information') || 'Profile Information'}
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => editMode ? cancelEdit() : setEditMode(true)}
            >
              {editMode ? (
                <>{t('cancel') || 'Cancel'}</>
              ) : (
                <>
                  <Edit className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                  {t('edit') || 'Edit'}
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <Label htmlFor="first_name">{t('first_name') || 'First Name'}</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => handleInputChange('first_name', e.target.value)}
                placeholder={t('enter_first_name') || 'Enter your first name'}
                disabled={!editMode}
              />
            </div>
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <Label htmlFor="last_name">{t('last_name') || 'Last Name'}</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => handleInputChange('last_name', e.target.value)}
                placeholder={t('enter_last_name') || 'Enter your last name'}
                disabled={!editMode}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <Label htmlFor="email">{t('email') || 'Email'}</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder={t('enter_email') || 'Enter your email'}
                disabled={!editMode}
              />
            </div>
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <Label htmlFor="phone">{t('phone') || 'Phone Number'}</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder={t('enter_phone') || 'Enter your phone number'}
                disabled={!editMode}
              />
            </div>
          </div>

          {editMode && (
            <div className={`flex ${isRTL ? 'gap-2' : 'gap-2'} pt-4`}>
              <Button onClick={saveProfile} disabled={saving}>
                <Save className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                {saving ? (t('saving') || 'Saving...') : (t('save_changes') || 'Save Changes')}
              </Button>
              <Button variant="outline" onClick={cancelEdit}>
                {t('cancel') || 'Cancel'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Account Information */}
      <Card>
        <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
          <CardTitle className={`flex items-center ${isRTL ? 'gap-2' : 'gap-2'}`}>
            <Settings className="w-5 h-5" />
            {t('account_information') || 'Account Information'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <Label>{t('user_id') || 'User ID'}</Label>
              <Input value={profile?.id || ''} disabled />
            </div>
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <Label>{t('role') || 'Role'}</Label>
              <Input value={profile?.role || ''} disabled />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <Label>{t('account_created') || 'Account Created'}</Label>
              <Input
                value={profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : ''}
                disabled
              />
            </div>
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <Label>{t('last_updated') || 'Last Updated'}</Label>
              <Input
                value={profile?.updated_at ? new Date(profile.updated_at).toLocaleDateString() : ''}
                disabled
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
          <CardTitle className={`flex items-center ${isRTL ? 'gap-2' : 'gap-2'}`}>
            <Shield className="w-5 h-5" />
            {t('security_settings') || 'Security Settings'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className={`flex items-center ${isRTL ? 'justify-between' : 'justify-between'} p-4 bg-gray-50 dark:bg-gray-800 rounded-lg`}>
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <h4 className="font-medium text-gray-900 dark:text-white">
                {t('change_password') || 'Change Password'}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('update_password_description') || 'Update your account password to keep your account secure'}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowPasswordChange(!showPasswordChange)}
            >
              {showPasswordChange ? (
                <>
                  <EyeOff className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                  {t('hide') || 'Hide'}
                </>
              ) : (
                <>
                  <Eye className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                  {t('change') || 'Change'}
                </>
              )}
            </Button>
          </div>

          {showPasswordChange && (
            <div className="space-y-4 p-4 border rounded-lg bg-white dark:bg-gray-900">
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <Label htmlFor="currentPassword">{t('current_password') || 'Current Password'}</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                  placeholder={t('enter_current_password') || 'Enter your current password'}
                />
              </div>

              <div className={isRTL ? 'text-right' : 'text-left'}>
                <Label htmlFor="newPassword">{t('new_password') || 'New Password'}</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                  placeholder={t('enter_new_password') || 'Enter your new password'}
                />
              </div>

              <div className={isRTL ? 'text-right' : 'text-left'}>
                <Label htmlFor="confirmPassword">{t('confirm_password') || 'Confirm Password'}</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                  placeholder={t('confirm_new_password') || 'Confirm your new password'}
                />
              </div>

              <div className={`flex ${isRTL ? 'gap-2' : 'gap-2'} pt-2`}>
                <Button onClick={changePassword} disabled={saving}>
                  <Save className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                  {saving ? (t('changing') || 'Changing...') : (t('change_password') || 'Change Password')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPasswordChange(false);
                    setPasswordData({
                      currentPassword: "",
                      newPassword: "",
                      confirmPassword: ""
                    });
                  }}
                >
                  {t('cancel') || 'Cancel'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
