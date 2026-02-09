"use client"

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, AlertTriangle, Pill, Phone, Edit, Save, X, Plus, FileText, Trash2, Calendar, User } from "lucide-react";
import { useAuth } from "@/lib/providers/auth-provider";
import { useLocale } from "@/components/providers/locale-provider";
import { toArabicNumerals } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface MedicalInfo {
  id: string;
  name: string;
  date_of_birth?: string;
  gender?: string;
  medical_history: string;
  allergies: string;
  medications: string;
  emergency_contact: {
    name?: string;
    relationship?: string;
    phone?: string;
  };
}

interface MedicalRecord {
  id: string;
  patient_id: string;
  doctor_id?: string;
  appointment_id?: string;
  diagnosis: string;
  treatment: string;
  prescription?: string;
  notes?: string;
  record_date: string;
  created_at: string;
  updated_at: string;
  doctor?: {
    id: string;
    name: string;
    name_ar?: string;
    first_name?: string;
    last_name?: string;
    first_name_ar?: string;
    last_name_ar?: string;
    specialty?: string;
    specialty_ar?: string;
    specialty_ku?: string;
    specialty_en?: string;
  };
}

export default function MedicalRecordsSection() {
  const { user, isAuthenticated } = useAuth();
  const { t, locale, isRTL } = useLocale();
  const { toast } = useToast();

  const [medicalInfo, setMedicalInfo] = useState<MedicalInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    medical_history: '',
    allergies: '',
    medications: '',
    emergency_contact: {
      name: '',
      relationship: '',
      phone: ''
    }
  });

  // States for specialties mapping
  const [specialtiesMap, setSpecialtiesMap] = useState<Map<string, { name_ar?: string; name_ku?: string; name_en?: string }>>(new Map());

  // Helper function for localized doctor names
  const getLocalizedDoctorName = (doctor: MedicalRecord['doctor']) => {
    if (!doctor) return t('unknown_doctor') || 'Unknown Doctor';

    if (locale === 'ar') {
      if (doctor.name_ar) return doctor.name_ar;
      if (doctor.first_name_ar && doctor.last_name_ar) {
        return `${doctor.first_name_ar} ${doctor.last_name_ar}`;
      }
      if (doctor.first_name_ar) return doctor.first_name_ar;
    }
    return doctor.name || `${doctor.first_name || ''} ${doctor.last_name || ''}`.trim();
  };

  const getLocalizedSpecialty = (doctor: MedicalRecord['doctor']) => {
    if (!doctor) return '';

    // If specialty_ar is already in the doctor object, use it
    if (locale === 'ar' && doctor.specialty_ar) {
      return doctor.specialty_ar;
    }
    // Kurdish locale not currently supported
    // if (locale === 'ku' && doctor.specialty_ku) {
    //   return doctor.specialty_ku;
    // }
    if (doctor.specialty_en) {
      return doctor.specialty_en;
    }

    // Otherwise, try to get it from specialtiesMap
    if (doctor.specialty) {
      const specialtyData = specialtiesMap.get(doctor.specialty);
      if (specialtyData) {
        if (locale === 'ar' && specialtyData.name_ar) return specialtyData.name_ar;
        if (specialtyData.name_en) return specialtyData.name_en;
      }
    }

    return doctor.specialty || '';
  };

  // States for managing lists
  const [allergyInput, setAllergyInput] = useState('');
  const [medicationInput, setMedicationInput] = useState('');
  const [allergiesList, setAllergiesList] = useState<string[]>([]);
  const [medicationsList, setMedicationsList] = useState<string[]>([]);

  // States for medical records (from medical_records table)
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [showRecordDialog, setShowRecordDialog] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MedicalRecord | null>(null);
  const [recordForm, setRecordForm] = useState({
    diagnosis: '',
    treatment: '',
    prescription: '',
    notes: '',
    record_date: new Date().toISOString().split('T')[0]
  });
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      fetchMedicalInfo();
      fetchMedicalRecords();
      fetchSpecialties();
    }
  }, [isAuthenticated, user, locale]);

  const fetchSpecialties = async () => {
    try {
      const response = await fetch('/api/specialties', { headers: getAuthHeaders() });
      const result = await response.json();

      if (result.success && result.specialties) {
        const map = new Map();
        result.specialties.forEach((specialty: any) => {
          // Map by name (which is the key used in medical records)
          map.set(specialty.name, {
            name_ar: specialty.name_ar,
            name_ku: specialty.name_ku,
            name_en: specialty.name_en || specialty.name
          });
        });
        setSpecialtiesMap(map);
      }
    } catch (error) {
    }
  };

  const getAuthHeaders = (): HeadersInit => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const fetchMedicalInfo = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/patient/medical-info?userId=${user.id}`, {
        headers: getAuthHeaders(),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || result.error || 'Failed to fetch');
      }
      if (result.success) {
        setMedicalInfo(result.medical_info);
        setEditForm({
          medical_history: result.medical_info.medical_history || '',
          allergies: result.medical_info.allergies || '',
          medications: result.medical_info.medications || '',
          emergency_contact: {
            name: result.medical_info.emergency_contact?.name || '',
            relationship: result.medical_info.emergency_contact?.relationship || '',
            phone: result.medical_info.emergency_contact?.phone || ''
          }
        });

        // Parse lists
        setAllergiesList(result.medical_info.allergies ? result.medical_info.allergies.split(',').map((s: string) => s.trim()).filter(Boolean) : []);
        setMedicationsList(result.medical_info.medications ? result.medical_info.medications.split(',').map((s: string) => s.trim()).filter(Boolean) : []);
      }
    } catch (error) {
      toast({
        title: t("toast_error"),
        description: t("err_fetch_medical_info"),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const updateData = {
        userId: user.id,
        medical_history: editForm.medical_history,
        allergies: allergiesList.join(', '),
        medications: medicationsList.join(', '),
        emergency_contact: editForm.emergency_contact
      };

      const response = await fetch('/api/patient/medical-info', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updateData)
      });

      const result = await response.json();

      if (result.success) {
        await fetchMedicalInfo(); // Refresh data
        setEditing(false);
        toast({
          title: t("toast_success"),
          description: t("success_medical_info_updated")
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      toast({
        title: t("toast_error"),
        description: t("err_update_medical_info"),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    // Reset form to original values
    if (medicalInfo) {
      setEditForm({
        medical_history: medicalInfo.medical_history || '',
        allergies: medicalInfo.allergies || '',
        medications: medicalInfo.medications || '',
        emergency_contact: {
          name: medicalInfo.emergency_contact?.name || '',
          relationship: medicalInfo.emergency_contact?.relationship || '',
          phone: medicalInfo.emergency_contact?.phone || ''
        }
      });
      setAllergiesList(medicalInfo.allergies ? medicalInfo.allergies.split(',').map(s => s.trim()).filter(Boolean) : []);
      setMedicationsList(medicalInfo.medications ? medicalInfo.medications.split(',').map(s => s.trim()).filter(Boolean) : []);
    }
  };

  const addAllergy = () => {
    if (allergyInput.trim() && !allergiesList.includes(allergyInput.trim())) {
      setAllergiesList([...allergiesList, allergyInput.trim()]);
      setAllergyInput('');
    }
  };

  const removeAllergy = (allergy: string) => {
    setAllergiesList(allergiesList.filter(a => a !== allergy));
  };

  const addMedication = () => {
    if (medicationInput.trim() && !medicationsList.includes(medicationInput.trim())) {
      setMedicationsList([...medicationsList, medicationInput.trim()]);
      setMedicationInput('');
    }
  };

  const removeMedication = (medication: string) => {
    setMedicationsList(medicationsList.filter(m => m !== medication));
  };

  // Fetch medical records from medical_records table
  const fetchMedicalRecords = async () => {
    if (!user?.id) return;

    setRecordsLoading(true);
    try {
      const response = await fetch(`/api/patient-medical-records?patient_id=${user.id}`, {
        headers: getAuthHeaders(),
      });
      const result = await response.json();

      if (result.success) {
        setMedicalRecords(result.records || []);
      } else {
        throw new Error(result.error || 'Failed to fetch medical records');
      }
    } catch (error) {
      toast({
        title: t("toast_error"),
        description: t("err_fetch_medical_records"),
        variant: "destructive"
      });
    } finally {
      setRecordsLoading(false);
    }
  };

  // Handle create/update medical record
  const handleSaveRecord = async () => {
    if (!user?.id) return;

    if (!recordForm.diagnosis || !recordForm.treatment) {
      toast({
        title: t("toast_error"),
        description: t("validation_diagnosis_required"),
        variant: "destructive"
      });
      return;
    }

    setRecordsLoading(true);
    try {
      const url = editingRecord
        ? '/api/patient-medical-records'
        : '/api/patient-medical-records';

      const method = editingRecord ? 'PUT' : 'POST';
      const body = editingRecord
        ? {
          record_id: editingRecord.id,
          ...recordForm
        }
        : {
          patient_id: user.id,
          ...recordForm
        };

      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(body)
      });

      const result = await response.json();

      if (result.success) {
        await fetchMedicalRecords();
        setShowRecordDialog(false);
        setEditingRecord(null);
        setRecordForm({
          diagnosis: '',
          treatment: '',
          prescription: '',
          notes: '',
          record_date: new Date().toISOString().split('T')[0]
        });
        toast({
          title: t('success') || "Success",
          description: editingRecord ? (t('mr_record_updated') || "Medical record updated successfully") : (t('mr_record_created') || "Medical record created successfully")
        });
      } else {
        throw new Error(result.error || (t('mr_failed_save') || 'Failed to save medical record'));
      }
    } catch (error: any) {
      toast({
        title: t('error') || "Error",
        description: error.message || (t('mr_failed_save') || "Failed to save medical record"),
        variant: "destructive"
      });
    } finally {
      setRecordsLoading(false);
    }
  };

  // Handle delete medical record
  const handleDeleteRecord = async (recordId: string) => {
    if (!confirm(t('mr_confirm_delete') || 'Are you sure you want to delete this medical record?')) {
      return;
    }

    setRecordsLoading(true);
    try {
      const response = await fetch(`/api/patient-medical-records?record_id=${recordId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      const result = await response.json();

      if (result.success) {
        await fetchMedicalRecords();
        toast({
          title: t('success') || "Success",
          description: t('mr_record_deleted') || "Medical record deleted successfully"
        });
      } else {
        throw new Error(result.error || (t('mr_failed_delete') || 'Failed to delete medical record'));
      }
    } catch (error: any) {
      toast({
        title: t('error') || "Error",
        description: error.message || (t('mr_failed_delete') || "Failed to delete medical record"),
        variant: "destructive"
      });
    } finally {
      setRecordsLoading(false);
    }
  };

  // Open dialog for creating new record
  const handleCreateRecord = () => {
    setEditingRecord(null);
    setRecordForm({
      diagnosis: '',
      treatment: '',
      prescription: '',
      notes: '',
      record_date: new Date().toISOString().split('T')[0]
    });
    setShowRecordDialog(true);
  };

  // Open dialog for editing record
  const handleEditRecord = (record: MedicalRecord) => {
    setEditingRecord(record);
    setRecordForm({
      diagnosis: record.diagnosis || '',
      treatment: record.treatment || '',
      prescription: record.prescription || '',
      notes: record.notes || '',
      record_date: record.record_date || new Date().toISOString().split('T')[0]
    });
    setShowRecordDialog(true);
  };

  if (!isAuthenticated) {
    return (
      <div className="w-full">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4DBCC4] mx-auto mb-4"></div>
              <p className="text-muted-foreground">{t('mr_loading') || 'Loading medical records...'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full" id="medical-records" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className={`flex items-center justify-between mb-6 ${isRTL ? 'flex-row-reverse' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
        <div className={isRTL ? 'text-right' : 'text-left'} dir={isRTL ? 'rtl' : 'ltr'}>
          <h2 className={`text-2xl font-bold text-foreground flex items-center gap-2 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
            <Heart className="w-6 h-6 text-[#4DBCC4]" />
            <span dir={isRTL ? 'rtl' : 'ltr'}>{t('mr_section_title') || 'Your Medical Information'}</span>
          </h2>
          <p className={`text-muted-foreground ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>{t('mr_section_subtitle') || 'Keep your health information up to date'}</p>
        </div>
        {/* Hide edit button when on consultations tab */}
        {activeTab !== 'records' && (
          !editing ? (
            <Button onClick={() => setEditing(true)} variant="outline" className={`border-[#4DBCC4] text-[#4DBCC4] hover:bg-[#4DBCC4] hover:text-white hover:border-[#4DBCC4] dark:border-[#4DBCC4] dark:text-[#4DBCC4] dark:hover:bg-[#4DBCC4] dark:hover:text-white transition-all duration-200 ease-in-out flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
              <Edit className="w-4 h-4" />
              {t('mr_edit') || 'Edit'}
            </Button>
          ) : (
            <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
              <Button onClick={handleSave} disabled={loading} className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
                <Save className="w-4 h-4" />
                {loading ? (t('mr_saving_section') || 'Saving...') : (t('mr_save') || 'Save')}
              </Button>
              <Button onClick={handleCancel} variant="outline" className={`border-[#4DBCC4] text-[#4DBCC4] hover:bg-[#4DBCC4] hover:text-white hover:border-[#4DBCC4] dark:border-[#4DBCC4] dark:text-[#4DBCC4] dark:hover:bg-[#4DBCC4] dark:hover:text-white transition-all duration-200 ease-in-out flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
                <X className="w-4 h-4" />
                {t('mr_cancel') || 'Cancel'}
              </Button>
            </div>
          )
        )}
      </div>

      {loading && !editing ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4DBCC4] mx-auto mb-4"></div>
              <p className="text-muted-foreground">{t('mr_loading') || 'Loading medical records...'}</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="overview" className="w-full" dir={isRTL ? 'rtl' : 'ltr'} onValueChange={setActiveTab}>
          <TabsList className="flex flex-col h-auto w-full sm:grid sm:grid-cols-5" dir={isRTL ? 'rtl' : 'ltr'}>
            <TabsTrigger value="overview" disabled={editing && false} dir={isRTL ? 'rtl' : 'ltr'}>{t('mr_tab_overview') || 'Overview'}</TabsTrigger>
            <TabsTrigger value="allergies" disabled={editing && false} dir={isRTL ? 'rtl' : 'ltr'}>{t('mr_tab_allergies') || 'Allergies'}</TabsTrigger>
            <TabsTrigger value="medications" disabled={editing && false} dir={isRTL ? 'rtl' : 'ltr'}>{t('mr_tab_medications') || 'Medications'}</TabsTrigger>
            <TabsTrigger value="emergency" disabled={editing && false} dir={isRTL ? 'rtl' : 'ltr'}>{t('mr_tab_emergency') || 'Emergency Contact'}</TabsTrigger>
            <TabsTrigger value="records" disabled={editing} dir={isRTL ? 'rtl' : 'ltr'}>{t('mr_tab_consultations') || 'Consultations'}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" dir={isRTL ? 'rtl' : 'ltr'}>
            <Card dir={isRTL ? 'rtl' : 'ltr'}>
              <CardHeader dir={isRTL ? 'rtl' : 'ltr'}>
                <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
                  <Heart className="w-5 h-5 text-[#4DBCC4]" />
                  <span dir={isRTL ? 'rtl' : 'ltr'}>{t('mr_medical_history') || 'Medical History'}</span>
                </CardTitle>
              </CardHeader>
              <CardContent dir={isRTL ? 'rtl' : 'ltr'}>
                {editing ? (
                  <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
                    <div dir={isRTL ? 'rtl' : 'ltr'}>
                      <Label htmlFor="medical_history" className={isRTL ? 'text-right' : 'text-left'} dir={isRTL ? 'rtl' : 'ltr'}>{t('mr_medical_history') || 'Medical History'}</Label>
                      <Textarea
                        id="medical_history"
                        value={editForm.medical_history}
                        onChange={(e) => setEditForm(prev => ({ ...prev, medical_history: e.target.value }))}
                        placeholder={t('mr_medical_history_placeholder') || "Enter your medical history, past conditions, surgeries, etc."}
                        rows={6}
                        className={`mt-1 ${isRTL ? 'text-right' : 'text-left'}`}
                        dir={isRTL ? 'rtl' : 'ltr'}
                      />
                    </div>
                  </div>
                ) : (
                  <div className={isRTL ? 'text-right' : 'text-left'} dir={isRTL ? 'rtl' : 'ltr'}>
                    {medicalInfo?.medical_history ? (
                      <p className="text-foreground whitespace-pre-wrap" dir={isRTL ? 'rtl' : 'ltr'}>{medicalInfo.medical_history}</p>
                    ) : (
                      <p className="text-muted-foreground italic" dir={isRTL ? 'rtl' : 'ltr'}>{t('mr_no_medical_history') || 'No medical history recorded'}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="allergies" dir={isRTL ? 'rtl' : 'ltr'}>
            <Card dir={isRTL ? 'rtl' : 'ltr'}>
              <CardHeader dir={isRTL ? 'rtl' : 'ltr'}>
                <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <span dir={isRTL ? 'rtl' : 'ltr'}>{t('mr_allergies') || 'Allergies'}</span>
                </CardTitle>
              </CardHeader>
              <CardContent dir={isRTL ? 'rtl' : 'ltr'}>
                {editing ? (
                  <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
                    <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
                      <Input
                        value={allergyInput}
                        onChange={(e) => setAllergyInput(e.target.value)}
                        placeholder={t('mr_add_allergy_placeholder') || "Add an allergy"}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAllergy())}
                        className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}
                        dir={isRTL ? 'rtl' : 'ltr'}
                      />
                      <Button onClick={addAllergy} type="button" className="shrink-0" dir={isRTL ? 'rtl' : 'ltr'}>
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className={`flex flex-wrap gap-2 ${isRTL ? 'flex-row-reverse' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
                      {allergiesList.map((allergy, index) => (
                        <Badge key={index} variant="destructive" className={`flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
                          <span dir={isRTL ? 'rtl' : 'ltr'}>{allergy}</span>
                          <X
                            className="w-3 h-3 cursor-pointer"
                            onClick={() => removeAllergy(allergy)}
                          />
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className={`flex flex-wrap gap-2 ${isRTL ? 'flex-row-reverse' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
                    {allergiesList.length > 0 ? (
                      allergiesList.map((allergy, index) => (
                        <Badge key={index} variant="destructive" className={`flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
                          <AlertTriangle className={`w-3 h-3 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                          <span dir={isRTL ? 'rtl' : 'ltr'}>{allergy}</span>
                        </Badge>
                      ))
                    ) : (
                      <p className={`text-muted-foreground italic ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>{t('mr_no_allergies') || 'No allergies recorded'}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="medications" dir={isRTL ? 'rtl' : 'ltr'}>
            <Card dir={isRTL ? 'rtl' : 'ltr'}>
              <CardHeader dir={isRTL ? 'rtl' : 'ltr'}>
                <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
                  <Pill className="w-5 h-5 text-[#4DBCC4]" />
                  <span dir={isRTL ? 'rtl' : 'ltr'}>{t('mr_medications') || 'Medications'}</span>
                </CardTitle>
              </CardHeader>
              <CardContent dir={isRTL ? 'rtl' : 'ltr'}>
                {editing ? (
                  <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
                    <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
                      <Input
                        value={medicationInput}
                        onChange={(e) => setMedicationInput(e.target.value)}
                        placeholder={t('mr_add_medication_placeholder') || "Add a medication"}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addMedication())}
                        className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}
                        dir={isRTL ? 'rtl' : 'ltr'}
                      />
                      <Button onClick={addMedication} type="button" className="shrink-0" dir={isRTL ? 'rtl' : 'ltr'}>
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className={`flex flex-wrap gap-2 ${isRTL ? 'flex-row-reverse' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
                      {medicationsList.map((medication, index) => (
                        <Badge key={index} variant="secondary" className={`flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
                          <span dir={isRTL ? 'rtl' : 'ltr'}>{medication}</span>
                          <X
                            className="w-3 h-3 cursor-pointer"
                            onClick={() => removeMedication(medication)}
                          />
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className={`flex flex-wrap gap-2 ${isRTL ? 'flex-row-reverse' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
                    {medicationsList.length > 0 ? (
                      medicationsList.map((medication, index) => (
                        <Badge key={index} variant="secondary" className={`flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
                          <Pill className={`w-3 h-3 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                          <span dir={isRTL ? 'rtl' : 'ltr'}>{medication}</span>
                        </Badge>
                      ))
                    ) : (
                      <p className={`text-muted-foreground italic ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>{t('mr_no_medications') || 'No medications recorded'}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="emergency" dir={isRTL ? 'rtl' : 'ltr'}>
            <Card dir={isRTL ? 'rtl' : 'ltr'}>
              <CardHeader dir={isRTL ? 'rtl' : 'ltr'}>
                <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
                  <Phone className="w-5 h-5 text-[#4DBCC4]" />
                  <span dir={isRTL ? 'rtl' : 'ltr'}>{t('mr_emergency_contact') || 'Emergency Contact Information'}</span>
                </CardTitle>
              </CardHeader>
              <CardContent dir={isRTL ? 'rtl' : 'ltr'}>
                {editing ? (
                  <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4" dir={isRTL ? 'rtl' : 'ltr'}>
                      <div dir={isRTL ? 'rtl' : 'ltr'}>
                        <Label htmlFor="emergency_name" className={isRTL ? 'text-right' : 'text-left'} dir={isRTL ? 'rtl' : 'ltr'}>{t('mr_contact_name') || 'Contact Name'}</Label>
                        <Input
                          id="emergency_name"
                          value={editForm.emergency_contact.name || ''}
                          onChange={(e) => setEditForm(prev => ({
                            ...prev,
                            emergency_contact: { ...prev.emergency_contact, name: e.target.value }
                          }))}
                          placeholder={t('mr_full_name_placeholder') || "Full name"}
                          className={isRTL ? 'text-right' : 'text-left'}
                          dir={isRTL ? 'rtl' : 'ltr'}
                        />
                      </div>
                      <div dir={isRTL ? 'rtl' : 'ltr'}>
                        <Label htmlFor="emergency_relationship" className={isRTL ? 'text-right' : 'text-left'} dir={isRTL ? 'rtl' : 'ltr'}>{t('mr_relationship') || 'Relationship'}</Label>
                        <Input
                          id="emergency_relationship"
                          value={editForm.emergency_contact.relationship || ''}
                          onChange={(e) => setEditForm(prev => ({
                            ...prev,
                            emergency_contact: { ...prev.emergency_contact, relationship: e.target.value }
                          }))}
                          placeholder={t('mr_relationship_placeholder') || "e.g., Spouse, Parent, Sibling"}
                          className={isRTL ? 'text-right' : 'text-left'}
                          dir={isRTL ? 'rtl' : 'ltr'}
                        />
                      </div>
                    </div>
                    <div dir={isRTL ? 'rtl' : 'ltr'}>
                      <Label htmlFor="emergency_phone" className={isRTL ? 'text-right' : 'text-left'} dir={isRTL ? 'rtl' : 'ltr'}>{t('mr_phone') || 'Phone Number'}</Label>
                      <Input
                        id="emergency_phone"
                        value={editForm.emergency_contact.phone || ''}
                        onChange={(e) => setEditForm(prev => ({
                          ...prev,
                          emergency_contact: { ...prev.emergency_contact, phone: e.target.value }
                        }))}
                        placeholder={t('mr_phone_contact_placeholder') || "+1 (555) 123-4567"}
                        className={isRTL ? 'text-right' : 'text-left'}
                        dir="ltr"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="w-full" dir={isRTL ? 'rtl' : 'ltr'}>
                    {medicalInfo?.emergency_contact?.name ? (
                      <div className="space-y-2 w-full" dir={isRTL ? 'rtl' : 'ltr'}>
                        <div className={`w-full ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
                          <p className={`w-full ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
                            <strong>{t('mr_emergency_name') || 'Name'}:</strong> {medicalInfo.emergency_contact.name}
                          </p>
                        </div>
                        <div className={`w-full ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
                          <p className={`w-full ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
                            <strong>{t('mr_relationship') || 'Relationship'}:</strong> {medicalInfo.emergency_contact.relationship}
                          </p>
                        </div>
                        <div className={`w-full ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
                          <p className={`w-full ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
                            <strong>{t('mr_phone') || 'Phone'}:</strong> <span dir="ltr">{locale === 'ar' ? toArabicNumerals(medicalInfo.emergency_contact.phone || '', locale) : medicalInfo.emergency_contact.phone}</span>
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className={`text-muted-foreground italic ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>{t('mr_no_emergency_contact') || 'No emergency contact recorded'}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="records" dir={isRTL ? 'rtl' : 'ltr'}>
            <Card dir={isRTL ? 'rtl' : 'ltr'}>
              <CardHeader dir={isRTL ? 'rtl' : 'ltr'}>
                <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
                  <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
                    <FileText className="w-5 h-5 text-[#4DBCC4]" />
                    <span dir={isRTL ? 'rtl' : 'ltr'}>{t('mr_tab_consultations') || 'Consultations'}</span>
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent dir={isRTL ? 'rtl' : 'ltr'}>
                {recordsLoading ? (
                  <div className={`flex items-center justify-center py-8 ${isRTL ? 'flex-row-reverse' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4DBCC4]"></div>
                    <p className={`${isRTL ? 'me-3' : 'ms-3'} text-muted-foreground ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>{t('mr_loading_records') || 'Loading records...'}</p>
                  </div>
                ) : medicalRecords.length === 0 ? (
                  <div className="text-center py-8" dir={isRTL ? 'rtl' : 'ltr'}>
                    <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <p className={`text-muted-foreground ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>{t('mr_no_consultations') || 'No consultations found'}</p>
                  </div>
                ) : (
                  <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
                    {medicalRecords.map((record) => (
                      <Card key={record.id} className={`${isRTL ? 'border-r-4 border-r-[#4DBCC4]' : 'border-l-4 border-l-[#4DBCC4]'} ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
                        <CardHeader dir={isRTL ? 'rtl' : 'ltr'}>
                          <div className={`flex items-start justify-between ${isRTL ? 'flex-row-reverse' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
                            <div className="flex-1" dir={isRTL ? 'rtl' : 'ltr'}>
                              <CardTitle className={`text-lg mb-2 ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>{record.diagnosis}</CardTitle>
                              <div className={`flex flex-wrap gap-2 text-sm text-muted-foreground ${isRTL ? 'flex-row-reverse justify-start' : 'justify-start'}`} dir={isRTL ? 'rtl' : 'ltr'}>
                                {record.doctor && (
                                  <div className={`flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
                                    <User className="w-4 h-4" />
                                    <span dir={isRTL ? 'rtl' : 'ltr'}>{t('mr_dr') || 'Dr.'} {getLocalizedDoctorName(record.doctor)}</span>
                                    {getLocalizedSpecialty(record.doctor) && (
                                      <Badge variant="outline" className={isRTL ? 'me-1' : 'ms-1'} dir={isRTL ? 'rtl' : 'ltr'}>{getLocalizedSpecialty(record.doctor)}</Badge>
                                    )}
                                  </div>
                                )}
                                <div className={`flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
                                  <Calendar className="w-4 h-4" />
                                  <span dir={isRTL ? 'rtl' : 'ltr'}>{toArabicNumerals(new Date(record.record_date).toLocaleDateString(locale || 'en-US', { year: 'numeric', month: 'long', day: 'numeric' }), locale)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3" dir={isRTL ? 'rtl' : 'ltr'}>
                          <div dir={isRTL ? 'rtl' : 'ltr'}>
                            <Label className={`text-sm font-semibold ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>{t('mr_treatment') || 'Treatment'}</Label>
                            <p className={`text-foreground mt-1 ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>{record.treatment}</p>
                          </div>
                          {record.prescription && (
                            <div dir={isRTL ? 'rtl' : 'ltr'}>
                              <Label className={`text-sm font-semibold ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>{t('mr_prescription') || 'Prescription'}</Label>
                              <p className={`text-foreground mt-1 ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>{record.prescription}</p>
                            </div>
                          )}
                          {record.notes && (
                            <div dir={isRTL ? 'rtl' : 'ltr'}>
                              <Label className={`text-sm font-semibold ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>{t('mr_notes') || 'Notes'}</Label>
                              <p className={`text-foreground mt-1 whitespace-pre-wrap ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>{record.notes}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Create/Edit Medical Record Dialog */}
      <Dialog open={showRecordDialog} onOpenChange={setShowRecordDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader dir={isRTL ? 'rtl' : 'ltr'}>
            <DialogTitle className={isRTL ? 'text-right' : 'text-left'} dir={isRTL ? 'rtl' : 'ltr'}>
              {editingRecord ? (t('mr_edit_record') || 'Edit Medical Record') : (t('mr_create_record') || 'Create Medical Record')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
            <div dir={isRTL ? 'rtl' : 'ltr'}>
              <Label htmlFor="record_date" className={isRTL ? 'text-right' : 'text-left'} dir={isRTL ? 'rtl' : 'ltr'}>{t('mr_record_date') || 'Record Date'}</Label>
              <Input
                id="record_date"
                type="date"
                value={recordForm.record_date}
                onChange={(e) => setRecordForm(prev => ({ ...prev, record_date: e.target.value }))}
                className={`mt-1 ${isRTL ? 'text-right' : 'text-left'}`}
                dir="ltr"
              />
            </div>
            <div dir={isRTL ? 'rtl' : 'ltr'}>
              <Label htmlFor="diagnosis" className={isRTL ? 'text-right' : 'text-left'} dir={isRTL ? 'rtl' : 'ltr'}>{t('mr_diagnosis') || 'Diagnosis'} *</Label>
              <Textarea
                id="diagnosis"
                value={recordForm.diagnosis}
                onChange={(e) => setRecordForm(prev => ({ ...prev, diagnosis: e.target.value }))}
                placeholder={t('mr_diagnosis_placeholder') || "Enter diagnosis"}
                rows={3}
                className={`mt-1 ${isRTL ? 'text-right' : 'text-left'}`}
                dir={isRTL ? 'rtl' : 'ltr'}
                required
              />
            </div>
            <div dir={isRTL ? 'rtl' : 'ltr'}>
              <Label htmlFor="treatment" className={isRTL ? 'text-right' : 'text-left'} dir={isRTL ? 'rtl' : 'ltr'}>{t('mr_treatment') || 'Treatment'} *</Label>
              <Textarea
                id="treatment"
                value={recordForm.treatment}
                onChange={(e) => setRecordForm(prev => ({ ...prev, treatment: e.target.value }))}
                placeholder={t('mr_treatment_placeholder') || "Enter treatment details"}
                rows={4}
                className={`mt-1 ${isRTL ? 'text-right' : 'text-left'}`}
                dir={isRTL ? 'rtl' : 'ltr'}
                required
              />
            </div>
            <div dir={isRTL ? 'rtl' : 'ltr'}>
              <Label htmlFor="prescription" className={isRTL ? 'text-right' : 'text-left'} dir={isRTL ? 'rtl' : 'ltr'}>{t('mr_prescription') || 'Prescription'}</Label>
              <Textarea
                id="prescription"
                value={recordForm.prescription}
                onChange={(e) => setRecordForm(prev => ({ ...prev, prescription: e.target.value }))}
                placeholder={t('mr_prescription_placeholder') || "Enter prescription details (optional)"}
                rows={3}
                className={`mt-1 ${isRTL ? 'text-right' : 'text-left'}`}
                dir={isRTL ? 'rtl' : 'ltr'}
              />
            </div>
            <div dir={isRTL ? 'rtl' : 'ltr'}>
              <Label htmlFor="notes" className={isRTL ? 'text-right' : 'text-left'} dir={isRTL ? 'rtl' : 'ltr'}>{t('mr_notes') || 'Additional Notes'}</Label>
              <Textarea
                id="notes"
                value={recordForm.notes}
                onChange={(e) => setRecordForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder={t('mr_notes_placeholder') || "Enter any additional notes (optional)"}
                rows={3}
                className={`mt-1 ${isRTL ? 'text-right' : 'text-left'}`}
                dir={isRTL ? 'rtl' : 'ltr'}
              />
            </div>
          </div>
          <DialogFooter className={isRTL ? 'flex-row-reverse' : ''} dir={isRTL ? 'rtl' : 'ltr'}>
            <Button variant="outline" onClick={() => {
              setShowRecordDialog(false);
              setEditingRecord(null);
            }} dir={isRTL ? 'rtl' : 'ltr'}>
              {t('mr_cancel') || 'Cancel'}
            </Button>
            <Button onClick={handleSaveRecord} disabled={recordsLoading} dir={isRTL ? 'rtl' : 'ltr'}>
              {recordsLoading ? (t('mr_saving') || 'Saving...') : (t('mr_save') || 'Save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}