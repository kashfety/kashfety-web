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
  const { t, isRTL } = useLocale()

  const [profile, setProfile] = useState<DoctorProfileData | null>(null);
  const [certificates, setCertificates] = useState<DoctorCertificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingCertificates, setLoadingCertificates] = useState(false);
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    specialty: "",
    bio: "",
    experience_years: 0,
    consultation_fee: 0,
    qualifications: [] as string[]
  });

  const { toast } = useToast();
  const { alertConfig, isOpen: alertOpen, hideAlert, showSuccess, showError } = useCustomAlert();

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
        showError("Authentication Error", "Please log in to view your profile.");
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
          specialty: doctorProfile.specialty || "",
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
      } else {
        console.error('Failed to load certificates:', response.status);
      }
    } catch (error) {
      console.error('Error loading certificates:', error);
    } finally {
      setLoadingCertificates(false);
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
      showError(t('error'), 'Invalid file type. Only JPEG, PNG, WebP, and GIF files are allowed.');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      showError(t('error'), 'File size too large. Maximum size is 5MB.');
      return;
    }

    setUploadingPicture(true);
    
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
      if (!token) {
        showError("Authentication Error", "Please log in to upload profile picture.");
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
          "Profile Picture Updated!",
          "Your profile picture has been uploaded successfully."
        );
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Failed to upload profile picture: ${response.status}`);
      }
    } catch (error: any) {
      console.error('Error uploading profile picture:', error);
      showError("Upload Failed", error.message || "Failed to upload profile picture. Please try again.");
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
        showError("Authentication Error", "Please log in to update your profile.");
        return;
      }

      // Validate consultation fee
      if (formData.consultation_fee < 0) {
        showError("Invalid Fee", "Consultation fee cannot be negative.");
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
          "Profile Updated!",
          "Your profile and consultation fee have been updated successfully.",
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
      showError("Update Failed", error.message || "Failed to update your profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-sm text-gray-500">Loading profile...</span>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-500">Unable to load profile data.</p>
        <Button onClick={loadDoctorProfile} className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Profile Settings</h2>
          <p className="text-gray-600">Manage your professional profile and consultation fees</p>
        </div>
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          Doctor Profile
        </Badge>
      </div>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Basic Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">t('fullName')</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter your full name"
              />
            </div>
            <div>
              <Label htmlFor="specialty">Specialty</Label>
              <Input
                id="specialty"
                value={formData.specialty}
                onChange={(e) => handleInputChange('specialty', e.target.value)}
                placeholder="e.g., Cardiology, Dermatology"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="bio">Professional Bio</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => handleInputChange('bio', e.target.value)}
              placeholder="Describe your background, expertise, and approach to patient care..."
              rows={4}
            />
          </div>

          <div>
            <Label htmlFor="experience">Years of Experience</Label>
            <Input
              id="experience"
              type="number"
              min="0"
              max="50"
              value={formData.experience_years}
              onChange={(e) => handleInputChange('experience_years', parseInt(e.target.value) || 0)}
              placeholder="Enter years of experience"
            />
          </div>
        </CardContent>
      </Card>

      {/* Consultation Fee Settings */}
      <Card className="border-emerald-200 bg-emerald-50/30 dark:border-emerald-800 dark:bg-emerald-900/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-emerald-800">
            <DollarSign className="w-5 h-5" />
            Consultation Fee Settings
          </CardTitle>
          <p className="text-sm text-emerald-600">
            Set your consultation fee that will be displayed to patients and used in billing
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="consultation_fee" className="text-base font-medium">
                Consultation Fee (USD)
              </Label>
              <div className="mt-1 flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Decrease fee"
                  className="h-10 w-10 inline-flex items-center justify-center rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-[#1F1F23] dark:text-gray-300 dark:hover:bg-[#1F1F23]"
                  onClick={() => handleInputChange('consultation_fee', Math.max(0, (Number(formData.consultation_fee) || 0) - 1))}
                  disabled={saving}
                >
                  <Minus className="w-4 h-4" />
                </button>
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                    <span className="text-gray-500 text-lg">$</span>
                  </div>
                  <Input
                    id="consultation_fee"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.consultation_fee}
                    onChange={(e) => handleInputChange('consultation_fee', parseFloat(e.target.value) || 0)}
                    className="pl-8 text-lg font-medium bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white border-gray-200 dark:border-[#1F1F23] placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    placeholder="0.00"
                    disabled={saving}
                  />
                </div>
                <button
                  type="button"
                  aria-label="Increase fee"
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
                  <span>$0</span>
                  <span>$1000</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                This fee will be displayed to patients when booking appointments
              </p>
            </div>

            <div className="bg-white dark:bg-[#0F0F12] p-4 rounded-lg border border-emerald-200 dark:border-emerald-900">
              <h4 className="font-medium text-emerald-800 mb-2">Fee Preview</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Clinic Consultation:</span>
                  <span className="font-medium">${formData.consultation_fee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Home Visit:</span>
                  <span className="font-medium">${(formData.consultation_fee + 50).toFixed(2)}</span>
                </div>
                <Separator className="my-2" />
                <p className="text-xs text-gray-600">
                  Home visits include additional travel fee
                </p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Fee Change Notice
            </h4>
            <p className="text-sm text-blue-700">
              Changes to your consultation fee will apply to all new appointments. 
              Existing scheduled appointments will keep their original pricing.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Qualifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5" />
            Qualifications & Certifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {formData.qualifications.length > 0 ? (
              formData.qualifications.map((qualification, index) => (
                <Badge key={index} variant="secondary" className="mr-2 mb-2">
                  {qualification}
                </Badge>
              ))
            ) : (
              <p className="text-gray-500 text-sm">No qualifications listed</p>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Contact support to update your qualifications and certifications
          </p>
        </CardContent>
      </Card>

      {/* Certificates Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5" />
            {t('certificates_title') || 'My Certificates'}
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
                <div key={certificate.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <h3 className="font-medium capitalize">
                        {certificate.certificate_type.replace('_', ' ')}
                      </h3>
                      {certificate.certificate_number && (
                        <p className="text-sm text-gray-600">
                          <strong>{t('certificate_number') || 'Certificate Number'}:</strong> {certificate.certificate_number}
                        </p>
                      )}
                      {certificate.issuing_authority && (
                        <p className="text-sm text-gray-600">
                          <strong>{t('issuing_authority') || 'Issuing Authority'}:</strong> {certificate.issuing_authority}
                        </p>
                      )}
                      <div className="flex gap-4 text-sm text-gray-600">
                        {certificate.issue_date && (
                          <span>
                            <strong>{t('issue_date') || 'Issued'}:</strong> {new Date(certificate.issue_date).toLocaleDateString()}
                          </span>
                        )}
                        {certificate.expiry_date && (
                          <span>
                            <strong>{t('expiry_date') || 'Expires'}:</strong> {new Date(certificate.expiry_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        {t('certificate_uploaded_on') || 'Uploaded on'}: {new Date(certificate.submitted_at).toLocaleDateString()}
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
                          onClick={() => window.open(certificate.certificate_file_url, '_blank')}
                          className="flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          {t('certificate_view_btn') || 'View'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = certificate.certificate_file_url;
                            link.download = certificate.certificate_file_name;
                            link.click();
                          }}
                          className="flex items-center gap-1"
                        >
                          <Download className="w-3 h-3" />
                          {t('certificate_download_btn') || 'Download'}
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Rejection Reason */}
                  {certificate.status === 'rejected' && certificate.rejection_reason && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                      <p className="text-sm font-medium text-red-800">
                        {t('certificate_admin_feedback') || 'Admin Feedback'}:
                      </p>
                      <p className="text-sm text-red-700 mt-1">{certificate.rejection_reason}</p>
                    </div>
                  )}
                  
                  {/* Admin Notes */}
                  {certificate.admin_notes && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                      <p className="text-sm font-medium text-blue-800">
                        {t('admin_notes') || 'Admin Notes'}:
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
              <p className="text-gray-500">
                {t('certificate_none_found') || 'No certificates found'}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                {t('certificate_none_description') || 'You haven\'t uploaded any certificates yet'}
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
            {t('profile_picture_title') || 'Profile Picture'}
          </CardTitle>
          <p className="text-sm text-gray-600">
            {t('profile_picture_description') || 'Upload a professional profile picture that will be displayed to patients'}
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
              <p className="text-sm text-gray-600 text-center">
                {profilePictureUrl 
                  ? (t('profile_picture_current') || 'Current Picture')
                  : (t('profile_picture_no_image') || 'No profile picture uploaded')
                }
              </p>
            </div>

            {/* Upload Section */}
            <div className="flex-1 space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-2">
                  {t('profile_picture_upload_hint') || 'Click to upload a new profile picture'}
                </p>
                <p className="text-xs text-gray-500 mb-4">
                  {t('profile_picture_supported_formats') || 'Supported formats: JPEG, PNG, WebP, GIF (Max 5MB)'}
                </p>
                <label 
                  htmlFor="profile-picture-upload" 
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Upload className="w-4 h-4 mr-2" />
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
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Saving..." : "Save Profile"}
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
