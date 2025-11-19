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
  const { t, locale } = useLocale();
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
    if (locale === 'ku' && doctor.specialty_ku) {
      return doctor.specialty_ku;
    }
    if (doctor.specialty_en) {
      return doctor.specialty_en;
    }
    
    // Otherwise, try to get it from specialtiesMap
    if (doctor.specialty) {
      const specialtyData = specialtiesMap.get(doctor.specialty);
      if (specialtyData) {
        if (locale === 'ar' && specialtyData.name_ar) return specialtyData.name_ar;
        if (locale === 'ku' && specialtyData.name_ku) return specialtyData.name_ku;
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

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      fetchMedicalInfo();
      fetchMedicalRecords();
      fetchSpecialties();
    }
  }, [isAuthenticated, user, locale]);

  const fetchSpecialties = async () => {
    try {
      const response = await fetch('/api/specialties');
      const result = await response.json();
      
      if (result.success && result.specialties) {
        const map = new Map();
        result.specialties.forEach((specialty: any) => {
          // Map by name_en (which is typically used as the key in medical records)
          const keyName = specialty.name_en || specialty.name;
          map.set(keyName, {
            name_ar: specialty.name_ar,
            name_ku: specialty.name_ku,
            name_en: specialty.name_en || specialty.name
          });
        });
        setSpecialtiesMap(map);
      }
    } catch (error) {
      console.error('Error fetching specialties:', error);
    }
  };

  const fetchMedicalInfo = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/patient/medical-info?userId=${user.id}`);
      const result = await response.json();

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
      console.error('Error fetching medical info:', error);
      toast({
        title: "Error",
        description: "Failed to fetch medical information",
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      const result = await response.json();

      if (result.success) {
        await fetchMedicalInfo(); // Refresh data
        setEditing(false);
        toast({
          title: "Success",
          description: "Medical information updated successfully"
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Error updating medical info:', error);
      toast({
        title: "Error",
        description: "Failed to update medical information",
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
      const response = await fetch(`/api/patient-medical-records?patient_id=${user.id}`);
      const result = await response.json();

      if (result.success) {
        setMedicalRecords(result.records || []);
      } else {
        throw new Error(result.error || 'Failed to fetch medical records');
      }
    } catch (error) {
      console.error('Error fetching medical records:', error);
      toast({
        title: "Error",
        description: "Failed to fetch medical records",
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
        title: "Error",
        description: "Diagnosis and treatment are required",
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
        headers: { 'Content-Type': 'application/json' },
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
      console.error('Error saving medical record:', error);
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
        method: 'DELETE'
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
      console.error('Error deleting medical record:', error);
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
              <Heart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">{t('mr_access_required') || 'Access Required'}</h3>
              <p className="text-muted-foreground mb-4">{t('mr_login_required') || 'You need to be logged in to view your medical records'}</p>
              <Button onClick={() => window.location.href = '/login?redirect=/medical-records'}>
                {t('mr_log_in') || 'Log In'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full" id="medical-records">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Heart className="w-6 h-6 text-[#4DBCC4]" />
            {t('mr_section_title') || 'Your Medical Information'}
          </h2>
          <p className="text-muted-foreground">{t('mr_section_subtitle') || 'Keep your health information up to date'}</p>
        </div>
        {!editing ? (
          <Button onClick={() => setEditing(true)} variant="outline" className="border-[#4DBCC4] text-[#4DBCC4] hover:bg-[#4DBCC4]/10 dark:border-[#4DBCC4] dark:text-[#4DBCC4] dark:hover:bg-[#4DBCC4]/20">
            <Edit className="w-4 h-4 mr-2" />
            {t('mr_edit') || 'Edit'}
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={loading}>
              <Save className="w-4 h-4 mr-2" />
              {loading ? (t('mr_saving_section') || 'Saving...') : (t('mr_save') || 'Save')}
            </Button>
            <Button onClick={handleCancel} variant="outline" className="border-[#4DBCC4] text-[#4DBCC4] hover:bg-[#4DBCC4]/10 dark:border-[#4DBCC4] dark:text-[#4DBCC4] dark:hover:bg-[#4DBCC4]/20">
              <X className="w-4 h-4 mr-2" />
              {t('mr_cancel') || 'Cancel'}
            </Button>
          </div>
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
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">{t('mr_tab_overview') || 'Overview'}</TabsTrigger>
            <TabsTrigger value="allergies">{t('mr_tab_allergies') || 'Allergies'}</TabsTrigger>
            <TabsTrigger value="medications">{t('mr_tab_medications') || 'Medications'}</TabsTrigger>
            <TabsTrigger value="emergency">{t('mr_tab_emergency') || 'Emergency Contact'}</TabsTrigger>
            <TabsTrigger value="records">{t('mr_tab_records') || 'Medical Records'}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-[#4DBCC4]" />
                  {t('mr_medical_history') || 'Medical History'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {editing ? (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="medical_history">{t('mr_medical_history') || 'Medical History'}</Label>
                      <Textarea
                        id="medical_history"
                        value={editForm.medical_history}
                        onChange={(e) => setEditForm(prev => ({ ...prev, medical_history: e.target.value }))}
                        placeholder={t('mr_medical_history_placeholder') || "Enter your medical history, past conditions, surgeries, etc."}
                        rows={6}
                        className="mt-1"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    {medicalInfo?.medical_history ? (
                      <p className="text-foreground whitespace-pre-wrap">{medicalInfo.medical_history}</p>
                    ) : (
                      <p className="text-muted-foreground italic">{t('mr_no_medical_history') || 'No medical history recorded'}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="allergies">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  {t('mr_allergies') || 'Allergies'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {editing ? (
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        value={allergyInput}
                        onChange={(e) => setAllergyInput(e.target.value)}
                        placeholder={t('mr_add_allergy_placeholder') || "Add an allergy"}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAllergy())}
                      />
                      <Button onClick={addAllergy} type="button">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {allergiesList.map((allergy, index) => (
                        <Badge key={index} variant="destructive" className="flex items-center gap-1">
                          {allergy}
                          <X 
                            className="w-3 h-3 cursor-pointer" 
                            onClick={() => removeAllergy(allergy)}
                          />
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {allergiesList.length > 0 ? (
                      allergiesList.map((allergy, index) => (
                        <Badge key={index} variant="destructive">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          {allergy}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-muted-foreground italic">{t('mr_no_allergies') || 'No allergies recorded'}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="medications">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Pill className="w-5 h-5 text-blue-500" />
                  {t('mr_medications') || 'Current Medications'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {editing ? (
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        value={medicationInput}
                        onChange={(e) => setMedicationInput(e.target.value)}
                        placeholder={t('mr_add_medication_placeholder') || "Add a medication"}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addMedication())}
                      />
                      <Button onClick={addMedication} type="button">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {medicationsList.map((medication, index) => (
                        <Badge key={index} variant="secondary" className="flex items-center gap-1">
                          {medication}
                          <X 
                            className="w-3 h-3 cursor-pointer" 
                            onClick={() => removeMedication(medication)}
                          />
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {medicationsList.length > 0 ? (
                      medicationsList.map((medication, index) => (
                        <Badge key={index} variant="secondary">
                          <Pill className="w-3 h-3 mr-1" />
                          {medication}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-muted-foreground italic">{t('mr_no_medications') || 'No medications recorded'}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="emergency">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="w-5 h-5 text-green-500" />
                  {t('mr_emergency_contact') || 'Emergency Contact'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {editing ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="emergency_name">{t('mr_contact_name') || 'Contact Name'}</Label>
                        <Input
                          id="emergency_name"
                          value={editForm.emergency_contact.name || ''}
                          onChange={(e) => setEditForm(prev => ({
                            ...prev,
                            emergency_contact: { ...prev.emergency_contact, name: e.target.value }
                          }))}
                          placeholder={t('mr_full_name_placeholder') || "Full name"}
                        />
                      </div>
                      <div>
                        <Label htmlFor="emergency_relationship">{t('mr_relationship') || 'Relationship'}</Label>
                        <Input
                          id="emergency_relationship"
                          value={editForm.emergency_contact.relationship || ''}
                          onChange={(e) => setEditForm(prev => ({
                            ...prev,
                            emergency_contact: { ...prev.emergency_contact, relationship: e.target.value }
                          }))}
                          placeholder={t('mr_relationship_placeholder') || "e.g., Spouse, Parent, Sibling"}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="emergency_phone">{t('mr_phone') || 'Phone Number'}</Label>
                      <Input
                        id="emergency_phone"
                        value={editForm.emergency_contact.phone || ''}
                        onChange={(e) => setEditForm(prev => ({
                          ...prev,
                          emergency_contact: { ...prev.emergency_contact, phone: e.target.value }
                        }))}
                        placeholder={t('mr_phone_contact_placeholder') || "+1 (555) 123-4567"}
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    {medicalInfo?.emergency_contact?.name ? (
                      <div className="space-y-2">
                        <p><strong>{t('mr_emergency_name') || 'Name'}:</strong> {medicalInfo.emergency_contact.name}</p>
                        <p><strong>{t('mr_relationship') || 'Relationship'}:</strong> {medicalInfo.emergency_contact.relationship}</p>
                        <p><strong>{t('mr_phone') || 'Phone'}:</strong> {medicalInfo.emergency_contact.phone}</p>
                      </div>
                    ) : (
                      <p className="text-muted-foreground italic">{t('mr_no_emergency_contact') || 'No emergency contact recorded'}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="records">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[#4DBCC4]" />
                    {t('mr_tab_records') || t('mr_medical_records') || 'Medical Records'}
                  </CardTitle>
                  <Button onClick={handleCreateRecord} size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    {t('mr_add_record') || 'Add Record'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {recordsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4DBCC4]"></div>
                    <p className="ml-3 text-muted-foreground">{t('mr_loading_records') || 'Loading records...'}</p>
                  </div>
                ) : medicalRecords.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">{t('mr_no_records') || 'No medical records found'}</p>
                    <Button onClick={handleCreateRecord} className="mt-4" variant="outline">
                      <Plus className="w-4 h-4 mr-2" />
                      {t('mr_add_first_record') || 'Add Your First Record'}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {medicalRecords.map((record) => (
                      <Card key={record.id} className="border-l-4 border-l-[#4DBCC4]">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-lg mb-2">{record.diagnosis}</CardTitle>
                              <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                                {record.doctor && (
                                  <div className="flex items-center gap-1">
                                    <User className="w-4 h-4" />
                                    <span>{t('mr_dr') || 'Dr.'} {getLocalizedDoctorName(record.doctor)}</span>
                                    {getLocalizedSpecialty(record.doctor) && (
                                      <Badge variant="outline" className="ml-1">{getLocalizedSpecialty(record.doctor)}</Badge>
                                    )}
                                  </div>
                                )}
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  <span>{toArabicNumerals(new Date(record.record_date).toLocaleDateString(locale || 'en-US', { year: 'numeric', month: 'long', day: 'numeric' }), locale)}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditRecord(record)}
                                title={t('mr_edit') || 'Edit'}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteRecord(record.id)}
                                className="text-red-600 hover:text-red-700"
                                title={t('mr_delete') || 'Delete'}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div>
                            <Label className="text-sm font-semibold">{t('mr_treatment') || 'Treatment'}</Label>
                            <p className="text-foreground mt-1">{record.treatment}</p>
                          </div>
                          {record.prescription && (
                            <div>
                              <Label className="text-sm font-semibold">{t('mr_prescription') || 'Prescription'}</Label>
                              <p className="text-foreground mt-1">{record.prescription}</p>
                            </div>
                          )}
                          {record.notes && (
                            <div>
                              <Label className="text-sm font-semibold">{t('mr_notes') || 'Notes'}</Label>
                              <p className="text-foreground mt-1 whitespace-pre-wrap">{record.notes}</p>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRecord ? (t('mr_edit_record') || 'Edit Medical Record') : (t('mr_create_record') || 'Create Medical Record')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="record_date">{t('mr_record_date') || 'Record Date'}</Label>
              <Input
                id="record_date"
                type="date"
                value={recordForm.record_date}
                onChange={(e) => setRecordForm(prev => ({ ...prev, record_date: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="diagnosis">{t('mr_diagnosis') || 'Diagnosis'} *</Label>
              <Textarea
                id="diagnosis"
                value={recordForm.diagnosis}
                onChange={(e) => setRecordForm(prev => ({ ...prev, diagnosis: e.target.value }))}
                placeholder={t('mr_diagnosis_placeholder') || "Enter diagnosis"}
                rows={3}
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label htmlFor="treatment">{t('mr_treatment') || 'Treatment'} *</Label>
              <Textarea
                id="treatment"
                value={recordForm.treatment}
                onChange={(e) => setRecordForm(prev => ({ ...prev, treatment: e.target.value }))}
                placeholder={t('mr_treatment_placeholder') || "Enter treatment details"}
                rows={4}
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label htmlFor="prescription">{t('mr_prescription') || 'Prescription'}</Label>
              <Textarea
                id="prescription"
                value={recordForm.prescription}
                onChange={(e) => setRecordForm(prev => ({ ...prev, prescription: e.target.value }))}
                placeholder={t('mr_prescription_placeholder') || "Enter prescription details (optional)"}
                rows={3}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="notes">{t('mr_notes') || 'Additional Notes'}</Label>
              <Textarea
                id="notes"
                value={recordForm.notes}
                onChange={(e) => setRecordForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder={t('mr_notes_placeholder') || "Enter any additional notes (optional)"}
                rows={3}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowRecordDialog(false);
              setEditingRecord(null);
            }}>
              {t('mr_cancel') || 'Cancel'}
            </Button>
            <Button onClick={handleSaveRecord} disabled={recordsLoading}>
              {recordsLoading ? (t('mr_saving') || 'Saving...') : (t('mr_save') || 'Save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}