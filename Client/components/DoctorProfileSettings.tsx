"use client"

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Save, DollarSign, User, FileText, Award, Clock, Plus, Minus, Eye, Download, CheckCircle, XCircle, AlertCircle, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCustomAlert } from "@/hooks/use-custom-alert";
import CustomAlert from "@/components/CustomAlert";

import { useLocale } from "@/components/providers/locale-provider"
import { formatLocalizedNumber } from "@/lib/i18n"

interface DoctorCertificate {
  id: string;
  certificate_type: string;
  certificate_number: string;
  certificate_file_url: string;
  certificate_file_name: string;
  issuing_authority: string;
  issue_date: string;
  expiry_date: string;
  status: 'pending' | 'approved' | 'rejected' | 'resubmission_required';
  submitted_at: string;
  reviewed_at?: string;
  rejection_reason?: string;
  admin_notes?: string;
}

interface DoctorProfileData {
  id: string;
  name: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  specialty: string;
  specialty_ar?: string;
  bio: string;
  experience_years: number;
  consultation_fee: number;
  qualifications: string[];
}

interface DoctorProfileSettingsProps {
  doctorId?: string;
  onProfileUpdate?: (updatedProfile: DoctorProfileData) => void;
}

export default function DoctorProfileSettings({
  doctorId,
  onProfileUpdate
}: DoctorProfileSettingsProps) {
  const { t, isRTL, locale } = useLocale()

  const [profile, setProfile] = useState<DoctorProfileData | null>(null);
  const [certificates, setCertificates] = useState<DoctorCertificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingCertificates, setLoadingCertificates] = useState(false);
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    name_ar: "",
    specialty: "",
    specialty_ar: "",
    bio: "",
    experience_years: 0,
    consultation_fee: 0,
    qualifications: [] as string[]
  });

  const { toast } = useToast();
  const { alertConfig, isOpen: alertOpen, hideAlert, showSuccess, showError } = useCustomAlert();

  // Helper function to get localized certificate type
  const getLocalizedCertificateType = (type: string): string => {
    const typeKey = `dc_${type.toLowerCase()}`;
    const translated = t(typeKey);
    if (translated && translated !== typeKey) {
      return translated;
    }
    // Fallback to formatted English name
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Load doctor profile on component mount
  useEffect(() => {
    loadDoctorProfile();
    loadDoctorCertificates();
    loadProfilePicture();
  }, [doctorId]);

  const loadDoctorProfile = async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
      if (!token) {
        showError(t('dp_auth_error') || 'خطأ في المصادقة', t('dp_login_required_profile') || 'يرجى تسجيل الدخول لعرض ملفك الشخصي');
        return;
      }

      const storedUserStr = localStorage.getItem('auth_user');
      const storedUser = storedUserStr ? JSON.parse(storedUserStr) : null;
      const doctorId = (storedUser?.role === 'doctor') ? storedUser?.id : undefined;

      console.log('Loading doctor profile with token:', token ? 'present' : 'missing');

      const response = await fetch(`/api/auth/doctor/profile${doctorId ? `?doctor_id=${encodeURIComponent(doctorId)}` : ''}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Profile response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        const doctorProfile = data.doctor;
        console.log('Profile data received:', doctorProfile);

        setProfile(doctorProfile);
        setFormData({
          name: doctorProfile.name || "",
          name_ar: doctorProfile.name_ar || "",
          specialty: doctorProfile.specialty || "",
          specialty_ar: doctorProfile.specialty_ar || "",
          bio: doctorProfile.bio || "",
          experience_years: doctorProfile.experience_years || 0,
          consultation_fee: doctorProfile.consultation_fee || 0,
          qualifications: doctorProfile.qualifications || []
        });
      } else {
        const errorText = await response.text();
        console.error('Profile load error:', response.status, errorText);
        throw new Error(`Failed to load profile: ${response.status} ${errorText}`);
      }
    } catch (error: any) {
      console.error('Error loading doctor profile:', error);
      showError(t('error'), `Failed to load your profile: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadDoctorCertificates = async () => {
    try {
      setLoadingCertificates(true);
      const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
      if (!token) {
        return;
      }

      const storedUserStr = localStorage.getItem('auth_user');
      const storedUser = storedUserStr ? JSON.parse(storedUserStr) : null;
      const doctorId = (storedUser?.role === 'doctor') ? storedUser?.id : undefined;

      const response = await fetch(`/api/auth/doctor/certificates${doctorId ? `?doctor_id=${encodeURIComponent(doctorId)}` : ''}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCertificates(data.certificates || []);
        return data.certificates || [];
      } else {
        console.error('Failed to load certificates:', response.status);
        return [];
      }
    } catch (error) {
      console.error('Error loading certificates:', error);
      return [];
    } finally {
      setLoadingCertificates(false);
    }
  };

  const handleViewCertificate = async (certificateId: string, currentUrl: string) => {
    try {
      // Refresh certificates to get fresh signed URLs
      const freshCertificates = await loadDoctorCertificates();
      const freshCert = freshCertificates.find((c: any) => c.id === certificateId);
      const urlToOpen = freshCert?.certificate_file_url || currentUrl;
      window.open(urlToOpen, '_blank');
    } catch (error) {
      console.error('Error opening certificate:', error);
      // Fallback to current URL if refresh fails
      window.open(currentUrl, '_blank');
    }
  };

  const handleDownloadCertificate = async (certificateId: string, currentUrl: string, fileName: string) => {
    try {
      // Refresh certificates to get fresh signed URLs
      const freshCertificates = await loadDoctorCertificates();
      const freshCert = freshCertificates.find((c: any) => c.id === certificateId);
      const urlToDownload = freshCert?.certificate_file_url || currentUrl;

      const link = document.createElement('a');
      link.href = urlToDownload;
      link.download = fileName;
      link.click();
    } catch (error) {
      console.error('Error downloading certificate:', error);
      // Fallback to current URL if refresh fails
      const link = document.createElement('a');
      link.href = currentUrl;
      link.download = fileName;
      link.click();
    }
  };

  const loadProfilePicture = async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
      if (!token) {
        return;
      }

      const storedUserStr = localStorage.getItem('auth_user');
      const storedUser = storedUserStr ? JSON.parse(storedUserStr) : null;
      const doctorId = (storedUser?.role === 'doctor') ? storedUser?.id : undefined;

      const response = await fetch(`/api/auth/doctor/profile-picture${doctorId ? `?doctor_id=${encodeURIComponent(doctorId)}` : ''}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setProfilePictureUrl(data.profile_picture_url);
      } else {
        console.error('Failed to load profile picture:', response.status);
      }
    } catch (error) {
      console.error('Error loading profile picture:', error);
    }
  };

  const handleProfilePictureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      showError(t('error') || 'خطأ', t('dp_invalid_file_type') || 'نوع ملف غير صالح. يسمح فقط بملفات JPEG و PNG و WebP و GIF');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      showError(t('error') || 'خطأ', t('dp_file_too_large') || 'حجم الملف كبير جداً. الحد الأقصى 5MB');
      return;
    }

    setUploadingPicture(true);

    try {
      const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
      if (!token) {
        showError(t('dp_auth_error') || 'خطأ في المصادقة', t('dp_login_required_upload') || 'يرجى تسجيل الدخول لرفع صورة الملف');
        return;
      }

      const storedUserStr = localStorage.getItem('auth_user');
      const storedUser = storedUserStr ? JSON.parse(storedUserStr) : null;
      const doctorId = (storedUser?.role === 'doctor') ? storedUser?.id : undefined;

      const formData = new FormData();
      formData.append('profile_picture', file);

      const response = await fetch(`/api/auth/doctor/profile-picture${doctorId ? `?doctor_id=${encodeURIComponent(doctorId)}` : ''}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setProfilePictureUrl(data.profile_picture_url);
        showSuccess(
          t('dp_picture_updated_title') || 'تم تحديث صورة الملف!',
          t('dp_picture_updated_desc') || 'تم رفع صورة ملفك بنجاح'
        );
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Failed to upload profile picture: ${response.status}`);
      }
    } catch (error: any) {
      console.error('Error uploading profile picture:', error);
      showError(t('dp_upload_failed') || 'فشل الرفع', error.message || t('dp_picture_upload_failed') || 'فشل رفع الصورة. يرجى المحاولة مرة أخرى');
    } finally {
      setUploadingPicture(false);
      // Reset file input
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
      if (!token) {
        showError(t('dp_auth_error') || 'خطأ في المصادقة', t('dp_login_required_update') || 'يرجى تسجيل الدخول لتحديث ملفك الشخصي');
        return;
      }

      // Validate consultation fee
      if (formData.consultation_fee < 0) {
        showError(t('dp_invalid_fee') || 'رسوم غير صالحة', t('dp_invalid_fee_desc') || 'لا يمكن أن تكون رسوم الاستشارة سالبة');
        return;
      }

      console.log('Saving profile with token:', token ? 'present' : 'missing');
      console.log('Profile data:', formData);

      const storedUserStr = localStorage.getItem('auth_user');
      const storedUser = storedUserStr ? JSON.parse(storedUserStr) : null;
      const doctorId = (storedUser?.role === 'doctor') ? storedUser?.id : undefined;

      const response = await fetch(`/api/auth/doctor/profile${doctorId ? `?doctor_id=${encodeURIComponent(doctorId)}` : ''}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ...formData, doctor_id: doctorId })
      });

      console.log('Save profile response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        const updatedProfile = data.doctor;
        console.log('Profile saved successfully:', updatedProfile);

        setProfile(updatedProfile);

        showSuccess(
          t('dp_profile_updated_title') || 'تم تحديث الملف الشخصي!',
          t('dp_profile_updated_desc') || 'تم تحديث ملفك ورسوم الاستشارة بنجاح',
          () => {
            if (onProfileUpdate) {
              onProfileUpdate(updatedProfile);
            }
          }
        );
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('Save profile error:', response.status, errorData);
        throw new Error(errorData.message || `Failed to update profile: ${response.status}`);
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      showError(t('dp_update_failed') || 'فشل التحديث', error.message || t('dp_profile_update_failed') || 'فشل تحديث ملفك الشخصي. يرجى المحاولة مرة أخرى');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-sm text-gray-500">{t('dd_loading_profile') || 'Loading profile...'}</span>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center p-8" dir={isRTL ? 'rtl' : 'ltr'}>
        <p className="text-gray-500">{t('dd_unable_load_profile') || 'Unable to load profile data.'}</p>
        <Button onClick={loadDoctorProfile} className="mt-4">
          {t('dd_retry') || 'Retry'}
        </Button>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{t('profile_settings_title') || 'Profile Settings'}</h2>
          <p className="text-gray-600">{t('profile_settings_desc') || 'Manage your professional profile and consultation fees'}</p>
        </div>
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800">
          {t('doctor_profile') || 'ملف الطبيب'}
        </Badge>
      </div>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            {t('dd_basic_info') || 'المعلومات الأساسية'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={isRTL ? "md:order-last" : ""}>
              <Label htmlFor="name" className="block mb-2">{t('fullName') || 'Full Name (English)'}</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder={t('fullNamePlaceholder') || "أدخل اسمك الكامل بالإنجليزية"}
                className="text-left"
                dir="ltr"
              />
            </div>
            <div className={isRTL ? "md:order-first" : ""}>
              <Label htmlFor="name_ar" className="block mb-2">{t('fullNameArabic') || 'Full Name (Arabic)'}</Label>
              <Input
                id="name_ar"
                value={formData.name_ar}
                onChange={(e) => handleInputChange('name_ar', e.target.value)}
                placeholder={t('fullNameArabicPlaceholder') || "أدخل اسمك الكامل بالعربية"}
                className="text-right"
                dir="rtl"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={isRTL ? "md:order-last" : ""}>
              <Label htmlFor="specialty" className="block mb-2">{t('specialty') || 'Specialty'}</Label>
              <Input
                id="specialty"
                value={formData.specialty}
                readOnly
                disabled
                className="bg-gray-100 text-gray-500 text-left"
                placeholder={t('specialtyPlaceholder') || "e.g., Cardiology, Dermatology"}
                dir="ltr"
              />
            </div>
            <div className={isRTL ? "md:order-first" : ""}>
              <Label htmlFor="specialty_ar" className="block mb-2">{t('specialtyArabic') || 'Specialty (Arabic)'}</Label>
              <Input
                id="specialty_ar"
                value={formData.specialty_ar}
                readOnly
                disabled
                className={`bg-gray-100 text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}
                placeholder={t('specialtyArabicPlaceholder') || "التخصص بالعربية"}
                dir="rtl"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="bio" className="block mb-2">{t('professionalBio') || 'Professional Bio'}</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => handleInputChange('bio', e.target.value)}
              placeholder={t('professionalBioPlaceholder') || "اكتب خلفيتك وخبراتك ونهجك في رعاية المرضى..."}
              rows={4}
              className={isRTL ? 'text-right' : 'text-left'}
              dir={isRTL ? 'rtl' : 'ltr'}
            />
          </div>

          <div>
            <Label htmlFor="experience" className="block mb-2">{t('yearsOfExperience') || 'Years of Experience'}</Label>
            <Input
              id="experience"
              type="number"
              min="0"
              max="50"
              value={formData.experience_years}
              onChange={(e) => handleInputChange('experience_years', parseInt(e.target.value) || 0)}
              placeholder={t('yearsOfExperiencePlaceholder') || "Enter years of experience"}
              className={isRTL ? 'text-right' : 'text-left'}
              dir="ltr"
            />
          </div>
        </CardContent>
      </Card>

      {/* Consultation Fee Settings */}
      <Card className="border-emerald-200 bg-emerald-50/30 dark:border-emerald-800 dark:bg-emerald-900/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-emerald-800">
            <DollarSign className="w-5 h-5" />
            {t('dd_consultation_fee_settings') || 'إعدادات رسوم الاستشارة'}
          </CardTitle>
          <p className="text-sm text-emerald-600">
            {t('dd_consultation_fee_desc') || 'Set your consultation fee that will be displayed to patients and used in billing'}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="consultation_fee" className="text-base font-medium block mb-2">
                {t('consultationFeeUSD') || 'Consultation Fee (SYP)'}
              </Label>
              <div className="mt-1 flex items-center gap-2">
                <button
                  type="button"
                  aria-label={t('dp_decrease_fee') || 'إنقاص الرسوم'}
                  className="h-10 w-10 inline-flex items-center justify-center rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-[#1F1F23] dark:text-gray-300 dark:hover:bg-[#1F1F23]"
                  onClick={() => handleInputChange('consultation_fee', Math.max(0, (Number(formData.consultation_fee) || 0) - 1))}
                  disabled={saving}
                >
                  <Minus className="w-4 h-4" />
                </button>
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none z-10">
                    <span className="text-gray-500 text-sm font-medium">{t('currency_symbol') || 'SYP'}</span>
                  </div>
                  <Input
                    id="consultation_fee"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.consultation_fee}
                    onChange={(e) => handleInputChange('consultation_fee', parseFloat(e.target.value) || 0)}
                    className="ps-12 text-start text-lg font-medium bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white border-gray-200 dark:border-[#1F1F23] placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    placeholder="0.00"
                    disabled={saving}
                  />
                </div>
                <button
                  type="button"
                  aria-label={t('dp_increase_fee') || 'زيادة الرسوم'}
                  className="h-10 w-10 inline-flex items-center justify-center rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-[#1F1F23] dark:text-gray-300 dark:hover:bg-[#1F1F23]"
                  onClick={() => handleInputChange('consultation_fee', Math.min(1000000, (Number(formData.consultation_fee) || 0) + 1))}
                  disabled={saving}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-3">
                <input
                  type="range"
                  min={0}
                  max={1000}
                  step={1}
                  value={Number(formData.consultation_fee) || 0}
                  onChange={(e) => handleInputChange('consultation_fee', Number(e.target.value))}
                  className="w-full accent-emerald-600 dark:accent-emerald-400"
                  disabled={saving}
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>0 {t('currency_symbol') || 'SYP'}</span>
                  <span>1000 {t('currency_symbol') || 'SYP'}</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {t('consultationFeeNote') || 'This fee will be displayed to patients when booking appointments'}
              </p>
            </div>

            <div className="bg-white dark:bg-[#0F0F12] p-4 rounded-lg border border-emerald-200 dark:border-emerald-900">
              <h4 className="font-medium text-emerald-800 mb-2">{t('feePreview') || 'Fee Preview'}</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>{t('clinicConsultation') || 'Clinic Consultation'}:</span>
                  <span className="font-medium">{formData.consultation_fee.toFixed(2)} {t('currency_symbol') || 'SYP'}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('homeVisit') || 'Home Visit'}:</span>
                  <span className="font-medium">{(formData.consultation_fee + 50).toFixed(2)} {t('currency_symbol') || 'SYP'}</span>
                </div>
                <Separator className="my-2" />
                <p className="text-xs text-gray-600">
                  {t('homeVisitNote') || 'Home visits include additional travel fee'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <h4 className="font-medium text-blue-800 dark:text-blue-400 mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {t('feeChangeNotice') || 'ملاحظة تغيير الرسوم'}
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              {t('feeChangeNoticeText') || 'سيتم تطبيق التغييرات على الرسوم على الحجوزات الجديدة فقط. الحجوزات الحالية ستبقى بسعرها الأصلي.'}
            </p>
          </div>

          {/* Save Consultation Fee Button */}
          <div className="flex justify-end mt-4">
            <Button
              onClick={handleSaveProfile}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Save className="w-4 h-4 me-2" />
              {saving ? (t('saving') || "Saving...") : (t('saveConsultationFee') || "Save Consultation Fee")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Qualifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5" />
            {t('dd_qualifications_certifications') || 'المؤهلات والشهادات'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {formData.qualifications.length > 0 ? (
              formData.qualifications.map((qualification, index) => (
                <Badge key={index} variant="secondary" className="me-2 mb-2">
                  {qualification}
                </Badge>
              ))
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-sm">{t('dd_no_qualifications') || 'لا توجد مؤهلات مسجلة'}</p>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {t('dd_contact_support_qualifications') || 'اتصل بالدعم لتحديث مؤهلاتك وشهاداتك'}
          </p>
        </CardContent>
      </Card>

      {/* Certificates Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5" />
            {t('certificates_title') || 'شهاداتي'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingCertificates ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : certificates.length > 0 ? (
            <div className="space-y-4">
              {certificates.map((certificate) => (
                <div key={certificate.id} className={`border rounded-lg p-4 space-y-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <h3 className="font-medium">
                        {getLocalizedCertificateType(certificate.certificate_type)}
                      </h3>
                      {certificate.certificate_number && (
                        <p className="text-sm text-gray-600">
                          <strong>{t('certificate_number') || 'رقم الشهادة'}:</strong> <span dir="ltr">{certificate.certificate_number}</span>
                        </p>
                      )}
                      {certificate.issuing_authority && (
                        <p className="text-sm text-gray-600">
                          <strong>{t('issuing_authority') || 'الجهة المصدرة'}:</strong> {certificate.issuing_authority}
                        </p>
                      )}
                      <div className="flex gap-4 text-sm text-gray-600">
                        {certificate.issue_date && (
                          <span>
                            <strong>{t('issue_date') || 'تاريخ الإصدار'}:</strong> <span dir="ltr">{new Date(certificate.issue_date).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US')}</span>
                          </span>
                        )}
                        {certificate.expiry_date && (
                          <span>
                            <strong>{t('expiry_date') || 'تاريخ الانتهاء'}:</strong> <span dir="ltr">{new Date(certificate.expiry_date).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US')}</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {t('certificate_uploaded_on') || 'تم الرفع في'}: <span dir="ltr">{new Date(certificate.submitted_at).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US')}</span>
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {/* Status Badge */}
                      <div className="flex items-center gap-1">
                        {certificate.status === 'approved' && <CheckCircle className="w-4 h-4 text-green-600" />}
                        {certificate.status === 'rejected' && <XCircle className="w-4 h-4 text-red-600" />}
                        {certificate.status === 'pending' && <Clock className="w-4 h-4 text-yellow-600" />}
                        {certificate.status === 'resubmission_required' && <AlertCircle className="w-4 h-4 text-orange-600" />}
                        <Badge
                          variant={
                            certificate.status === 'approved' ? 'default' :
                              certificate.status === 'rejected' ? 'destructive' :
                                certificate.status === 'pending' ? 'secondary' : 'outline'
                          }
                          className={
                            certificate.status === 'approved' ? 'bg-green-100 text-green-800 border-green-200' :
                              certificate.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                                certificate.status === 'resubmission_required' ? 'bg-orange-100 text-orange-800 border-orange-200' :
                                  ''
                          }
                        >
                          {t(`certificate_${certificate.status}`) || certificate.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewCertificate(certificate.id, certificate.certificate_file_url)}
                          className="flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          {t('certificate_view_btn') || 'عرض'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownloadCertificate(certificate.id, certificate.certificate_file_url, certificate.certificate_file_name)}
                          className="flex items-center gap-1"
                        >
                          <Download className="w-3 h-3" />
                          {t('certificate_download_btn') || 'تنزيل'}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Rejection Reason */}
                  {certificate.status === 'rejected' && certificate.rejection_reason && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                      <p className="text-sm font-medium text-red-800 dark:text-red-400">
                        {t('certificate_admin_feedback') || 'ملاحظات الإدارة'}:
                      </p>
                      <p className="text-sm text-red-700 mt-1">{certificate.rejection_reason}</p>
                    </div>
                  )}

                  {/* Admin Notes */}
                  {certificate.admin_notes && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                      <p className="text-sm font-medium text-blue-800 dark:text-blue-400">
                        {t('admin_notes') || 'ملاحظات الإدارة'}:
                      </p>
                      <p className="text-sm text-blue-700 mt-1">{certificate.admin_notes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">
                {t('certificate_none_found') || 'لم يتم العثور على شهادات'}
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                {t('certificate_none_description') || 'لم تقم برفع أي شهادات بعد'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Profile Picture Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            {t('profile_picture_title') || 'صورة الملف الشخصي'}
          </CardTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('profile_picture_description') || 'ارفع صورة ملف مهنية سيتم عرضها للمرضى'}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Current Profile Picture */}
            <div className="flex flex-col items-center space-y-3">
              <div className="relative">
                {profilePictureUrl ? (
                  <img
                    src={profilePictureUrl}
                    alt="Profile"
                    className="w-32 h-32 rounded-full object-cover border-4 border-gray-200 shadow-lg"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-gray-200 border-4 border-gray-300 shadow-lg flex items-center justify-center">
                    <User className="w-12 h-12 text-gray-400" />
                  </div>
                )}
                {uploadingPicture && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent"></div>
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                {profilePictureUrl
                  ? (t('profile_picture_current') || 'الصورة الحالية')
                  : (t('profile_picture_no_image') || 'لا توجد صورة مرفوعة')
                }
              </p>
            </div>

            {/* Upload Section */}
            <div className="flex-1 space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                  {t('profile_picture_upload_hint') || 'انقر لرفع صورة ملف جديدة'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                  {t('profile_picture_supported_formats') || 'الصيغ المدعومة: JPEG, PNG, WebP, GIF (بحد أقصى 5MB)'}
                </p>
                <label
                  htmlFor="profile-picture-upload"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Upload className="w-4 h-4 me-2" />
                  {uploadingPicture 
                    ? 'Uploading...' 
                    : (t('profile_picture_upload_btn') || 'Upload Picture')
                  }
                </label>
                <input
                  id="profile-picture-upload"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleProfilePictureUpload}
                  disabled={uploadingPicture}
                  className="hidden"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSaveProfile}
          disabled={saving}
          className="bg-emerald-600 hover:bg-emerald-700"
          size="lg"
        >
          <Save className="w-4 h-4 me-2" />
          {saving ? (t('dd_save_profile_saving') || "Saving...") : (t('dd_save_profile') || "Save Profile")}
        </Button>
      </div>

      {/* Custom Alert Dialog */}
      {alertConfig && (
        <CustomAlert
          isOpen={alertOpen}
          onClose={hideAlert}
          title={alertConfig.title}
          message={alertConfig.message}
          type={alertConfig.type}
          confirmText={alertConfig.confirmText}
          onConfirm={alertConfig.onConfirm}
          showCancel={alertConfig.showCancel}
          cancelText={alertConfig.cancelText}
        />
      )}
    </div>
  );
}
