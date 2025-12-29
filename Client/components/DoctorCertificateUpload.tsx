"use client"

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useLocale } from '@/components/providers/locale-provider';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { useCustomAlert } from '@/hooks/use-custom-alert';

interface DoctorCertificateUploadProps {
    onUploadComplete: () => void;
    onSkip?: () => void;
    doctorToken: string;
    showSkipOption?: boolean;
    isModal?: boolean;
}

interface CertificateFormData {
    certificate_type: string;
    certificate_number: string;
    issuing_authority: string;
    issue_date: string;
    expiry_date: string;
    certificate_file: File | null;
}

export default function DoctorCertificateUpload({
    onUploadComplete,
    onSkip,
    doctorToken,
    showSkipOption = false,
    isModal = false
}: DoctorCertificateUploadProps) {
    const { toast } = useToast();
    const { showAlert } = useCustomAlert();
    const { t } = useLocale();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<CertificateFormData>({
        certificate_type: 'medical_license',
        certificate_number: '',
        issuing_authority: '',
        issue_date: '',
        expiry_date: '',
        certificate_file: null
    });

    const handleInputChange = (field: keyof CertificateFormData, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            // Validate file type
            const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
            if (!allowedTypes.includes(file.type)) {
                toast({
                    title: "Invalid File Type",
                    description: "Please upload a PDF, JPG, JPEG, or PNG file",
                    variant: "destructive"
                });
                return;
            }

            // Validate file size (10MB)
            if (file.size > 10 * 1024 * 1024) {
                toast({
                    title: "File Too Large",
                    description: "Please upload a file smaller than 10MB",
                    variant: "destructive"
                });
                return;
            }

            setFormData(prev => ({
                ...prev,
                certificate_file: file
            }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.certificate_file) {
            toast({
                title: t('dc_missing_file') || "Missing File",
                description: t('dc_missing_file_desc') || "Please select a certificate file to upload",
                variant: "destructive"
            });
            return;
        }

        if (!formData.issuing_authority) {
            toast({
                title: t('dc_missing_info') || "Missing Information",
                description: t('dc_missing_authority_desc') || "Please enter the issuing authority",
                variant: "destructive"
            });
            return;
        }

        try {
            setLoading(true);

            const uploadFormData = new FormData();
            uploadFormData.append('certificate', formData.certificate_file);
            uploadFormData.append('certificate_type', formData.certificate_type);
            uploadFormData.append('certificate_number', formData.certificate_number);
            uploadFormData.append('issuing_authority', formData.issuing_authority);
            uploadFormData.append('issue_date', formData.issue_date);
            uploadFormData.append('expiry_date', formData.expiry_date);

            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
            const baseUrl = apiUrl.endsWith('/api') ? apiUrl : `${apiUrl.replace(/\/$/, '')}/api`;
            const uploadUrl = `${baseUrl}/auth/doctor/upload-certificate`;


            const response = await fetch(uploadUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${doctorToken}`
                },
                body: uploadFormData
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to upload certificate');
            }

            // Clear temporary token after successful upload
            localStorage.removeItem('temp_doctor_token');

            showSuccess(
                'Success',
                t('dc_upload_success') || "Certificate uploaded successfully! Your account is now pending admin approval. You will be notified once approved."
            );

            onUploadComplete();

        } catch (error: any) {
            toast({
                title: t('dc_upload_failed') || "Upload Failed",
                description: t('dc_upload_error') || "Failed to upload certificate. Please try again.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={isModal ? "w-full" : "min-h-screen bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-950/20 dark:to-pink-950/20 flex items-center justify-center p-4"}>
            <Card className={isModal ? "w-full border-none shadow-none bg-transparent" : "w-full max-w-2xl"}>
                <CardHeader className={isModal ? "px-0 pt-0" : "text-center"}>
                    {!isModal && (
                        <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
                            <FileText className="w-6 h-6 text-red-600 dark:text-red-400" />
                        </div>
                    )}
                    <CardTitle className={isModal ? "text-xl font-bold text-white" : "text-2xl font-bold"}>{t('dc_upload_certificate') || 'Upload Medical Certificate'}</CardTitle>
                    <p className={isModal ? "text-gray-300" : "text-gray-600 dark:text-gray-400"}>
                        {t('dc_upload_description') || 'Please upload your medical license or certification to complete your registration'}
                    </p>
                </CardHeader>

                <CardContent className={isModal ? "px-0" : ""}>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Certificate Type */}
                        <div className="space-y-2">
                            <Label htmlFor="certificate_type" className={isModal ? "text-white" : ""}>{t('dc_certificate_type') || 'Certificate Type'}</Label>
                            <Select
                                value={formData.certificate_type}
                                onValueChange={(value) => handleInputChange('certificate_type', value)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="medical_license">{t('dc_medical_license') || 'Medical License'}</SelectItem>
                                    <SelectItem value="board_certification">{t('dc_board_certification') || 'Board Certification'}</SelectItem>
                                    <SelectItem value="fellowship_certificate">{t('dc_fellowship_certificate') || 'Fellowship Certificate'}</SelectItem>
                                    <SelectItem value="residency_certificate">{t('dc_residency_certificate') || 'Residency Certificate'}</SelectItem>
                                    <SelectItem value="other">{t('dc_other') || 'Other'}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Certificate Number */}
                        <div className="space-y-2">
                            <Label htmlFor="certificate_number" className={isModal ? "text-white" : ""}>{t('dc_certificate_number') || 'Certificate Number (Optional)'}</Label>
                            <Input
                                id="certificate_number"
                                value={formData.certificate_number}
                                onChange={(e) => handleInputChange('certificate_number', e.target.value)}
                                placeholder={t('dc_certificate_number_placeholder') || 'Enter certificate number'}
                            />
                        </div>

                        {/* Issuing Authority */}
                        <div className="space-y-2">
                            <Label htmlFor="issuing_authority" className={isModal ? "text-white" : ""}>{t('dc_issuing_authority') || 'Issuing Authority *'}</Label>
                            <Input
                                id="issuing_authority"
                                value={formData.issuing_authority}
                                onChange={(e) => handleInputChange('issuing_authority', e.target.value)}
                                placeholder={t('dc_issuing_authority_placeholder') || 'e.g., State Medical Board, University Name'}
                                required
                            />
                        </div>

                        {/* Issue Date */}
                        <div className="space-y-2">
                            <Label htmlFor="issue_date" className={isModal ? "text-white" : ""}>{t('dc_issue_date') || 'Issue Date (Optional)'}</Label>
                            <Input
                                id="issue_date"
                                type="date"
                                value={formData.issue_date}
                                onChange={(e) => handleInputChange('issue_date', e.target.value)}
                            />
                        </div>

                        {/* Expiry Date */}
                        <div className="space-y-2">
                            <Label htmlFor="expiry_date" className={isModal ? "text-white" : ""}>{t('dc_expiry_date') || 'Expiry Date (Optional)'}</Label>
                            <Input
                                id="expiry_date"
                                type="date"
                                value={formData.expiry_date}
                                onChange={(e) => handleInputChange('expiry_date', e.target.value)}
                            />
                        </div>

                        {/* File Upload */}
                        <div className="space-y-2">
                            <Label htmlFor="certificate_file" className={isModal ? "text-white" : ""}>{t('dc_certificate_file') || 'Certificate File *'}</Label>
                            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                                <div className="space-y-2">
                                    <Label htmlFor="certificate_file" className="cursor-pointer">
                                        <span className="text-red-600 hover:text-red-500">{t('dc_click_upload') || 'Click to upload'}</span>
                                        <span className={isModal ? "text-gray-300" : "text-gray-500"}>{t('dc_drag_drop') || ' or drag and drop'}</span>
                                    </Label>
                                    <p className={isModal ? "text-sm text-gray-300" : "text-sm text-gray-500"}>{t('dc_file_formats') || 'PDF, JPG, JPEG, PNG (Max 10MB)'}</p>
                                </div>
                                <Input
                                    id="certificate_file"
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    onChange={handleFileChange}
                                    className="hidden"
                                    required
                                />
                            </div>
                            {formData.certificate_file && (
                                <div className="flex items-center space-x-2 text-sm text-green-400">
                                    <CheckCircle className="w-4 h-4" />
                                    <span>{formData.certificate_file.name}</span>
                                </div>
                            )}
                        </div>

                        {/* Info Box */}
                        <div className={isModal ? "bg-blue-900/20 border border-blue-600 rounded-lg p-4" : "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4"}>
                            <div className="flex items-start space-x-2">
                                <AlertCircle className={isModal ? "w-5 h-5 text-blue-400 mt-0.5" : "w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5"} />
                                <div className={isModal ? "text-sm text-blue-200" : "text-sm text-blue-800 dark:text-blue-200"}>
                                    <p className="font-medium mb-1">{t('dc_important_info') || 'Important Information:'}</p>
                                    <ul className="list-disc list-inside space-y-1">
                                        <li>{t('dc_review_message') || 'Your certificate will be reviewed by our admin team'}</li>
                                        <li>{t('dc_email_notification') || 'You will receive an email notification once approved'}</li>
                                        <li>{t('dc_login_restriction') || 'You cannot login until your certificate is approved'}</li>
                                        <li>{t('dc_clarity_requirement') || 'Make sure the certificate is clear and legible'}</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-4">
                            <Button
                                type="submit"
                                className="flex-1"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        {t('dc_uploading') || 'Uploading...'}
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-4 h-4 mr-2" />
                                        {t('dc_upload_certificate') || 'Upload Certificate'}
                                    </>
                                )}
                            </Button>

                            {showSkipOption && onSkip && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={onSkip}
                                    className="flex-1"
                                    disabled={loading}
                                >
                                    {t('skip') || 'Skip for Now'}
                                </Button>
                            )}
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
