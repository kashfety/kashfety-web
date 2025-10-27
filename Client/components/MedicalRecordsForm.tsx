"use client"

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Plus, FileText, Heart, AlertTriangle } from "lucide-react";
import { useCustomAlert } from "@/hooks/use-custom-alert";
import CustomAlert from "@/components/CustomAlert";

import { useLocale } from "@/components/providers/locale-provider"
interface MedicalRecordsFormProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  patientId: string;
  patientName: string;
}

interface MedicalRecord {
  record_type: string;
  title: string;
  description: string;
  diagnosis?: string;
  treatment?: string;
  prescription?: string;
  record_date: string;
}

export default function MedicalRecordsForm({ 
  isOpen, 
  onClose, 
  onComplete, 
  patientId, 
  patientName 
}: MedicalRecordsFormProps) {
  const { t, isRTL } = useLocale()

  const { alertConfig, isOpen: alertOpen, hideAlert, showSuccess, showError } = useCustomAlert();
  const [loading, setLoading] = useState(false);
  
  // Medical records data
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [currentRecord, setCurrentRecord] = useState<MedicalRecord>({
    record_type: 'consultation',
    title: '',
    description: '',
    diagnosis: '',
    treatment: '',
    prescription: '',
    record_date: new Date().toISOString().split('T')[0]
  });

  // Health information
  const [allergies, setAllergies] = useState<string[]>([]);
  const [medications, setMedications] = useState<string[]>([]);
  const [medicalHistory, setMedicalHistory] = useState<string[]>([]);
  const [emergencyContact, setEmergencyContact] = useState({
    name: '',
    relationship: '',
    phone: ''
  });

  // Input states
  const [allergyInput, setAllergyInput] = useState('');
  const [medicationInput, setMedicationInput] = useState('');
  const [historyInput, setHistoryInput] = useState('');

  const addAllergy = () => {
    if (allergyInput.trim() && !allergies.includes(allergyInput.trim())) {
      setAllergies([...allergies, allergyInput.trim()]);
      setAllergyInput('');
    }
  };

  const removeAllergy = (allergy: string) => {
    setAllergies(allergies.filter(a => a !== allergy));
  };

  const addMedication = () => {
    if (medicationInput.trim() && !medications.includes(medicationInput.trim())) {
      setMedications([...medications, medicationInput.trim()]);
      setMedicationInput('');
    }
  };

  const removeMedication = (medication: string) => {
    setMedications(medications.filter(m => m !== medication));
  };

  const addMedicalHistory = () => {
    if (historyInput.trim() && !medicalHistory.includes(historyInput.trim())) {
      setMedicalHistory([...medicalHistory, historyInput.trim()]);
      setHistoryInput('');
    }
  };

  const removeMedicalHistory = (history: string) => {
    setMedicalHistory(medicalHistory.filter(h => h !== history));
  };

  const addRecord = () => {
    if (currentRecord.title.trim() && currentRecord.description.trim()) {
      setRecords([...records, { ...currentRecord }]);
      setCurrentRecord({
        record_type: 'consultation',
        title: '',
        description: '',
        diagnosis: '',
        treatment: '',
        prescription: '',
        record_date: new Date().toISOString().split('T')[0]
      });
    }
  };

  const removeRecord = (index: number) => {
    setRecords(records.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        showError("Authentication Error", "Please log in again.");
        return;
      }

      // Prepare data for submission
      const medicalData = {
        patient_id: patientId,
        allergies,
        medications,
        medical_history: medicalHistory,
        emergency_contact: emergencyContact,
        medical_records: records
      };

      console.log('Submitting medical data:', medicalData);

      const response = await fetch('http://localhost:5000/api/auth/medical-records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(medicalData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save medical records');
      }

      showSuccess(
        t('success') || "Success!",
        t('mr_save_success') || "Your medical records have been saved successfully!",
        () => {
          onComplete();
          onClose();
        }
      );

    } catch (error: any) {
      console.error('Error saving medical records:', error);
      showError(
        t('error') || 'Error',
        t('mr_save_error') || "Failed to save medical records. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    showSuccess(
      t('registration_complete') || "Registration Complete",
      t('mr_skip_message') || "You can add your medical records later from your profile.",
      () => {
        onComplete();
        onClose();
      }
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Heart className="w-6 h-6 text-red-500" />
            {t('complete_medical_profile') || 'Complete Your Medical Profile'}
          </DialogTitle>
          <p className="text-gray-600">
            {t('help_us_provide_care') || 'Help us provide better care by sharing your medical information. All information is confidential and secure.'}
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Emergency Contact */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                {t('mr_emergency_contact') || 'Emergency Contact'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="emergency-name">{t('name')}</Label>
                  <Input
                    id="emergency-name"
                    value={emergencyContact.name}
                    onChange={(e) => setEmergencyContact({...emergencyContact, name: e.target.value})}
                    placeholder={t('mr_full_name_placeholder') || 'Full name'}
                  />
                </div>
                <div>
                  <Label htmlFor="emergency-relationship">Relationship</Label>
                  <Select
                    value={emergencyContact.relationship}
                    onValueChange={(value) => setEmergencyContact({...emergencyContact, relationship: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('mr_select_relationship_placeholder') || 'Select relationship'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="spouse">Spouse</SelectItem>
                      <SelectItem value="parent">Parent</SelectItem>
                      <SelectItem value="child">Child</SelectItem>
                      <SelectItem value="sibling">Sibling</SelectItem>
                      <SelectItem value="friend">Friend</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="emergency-phone">{t('phoneNumber')}</Label>
                  <Input
                    id="emergency-phone"
                    value={emergencyContact.phone}
                    onChange={(e) => setEmergencyContact({...emergencyContact, phone: e.target.value})}
                    placeholder={t('mr_phone_placeholder') || 'Phone number'}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Allergies */}
          <Card>
            <CardHeader>
              <CardTitle>{t('mr_allergies') || 'Allergies'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={allergyInput}
                  onChange={(e) => setAllergyInput(e.target.value)}
                  placeholder={t('mr_allergies_placeholder') || 'Enter an allergy (e.g., Penicillin, Peanuts)'}
                  onKeyPress={(e) => e.key === 'Enter' && addAllergy()}
                />
                <Button onClick={addAllergy} size="sm">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {allergies.map((allergy, index) => (
                  <Badge key={index} variant="destructive" className="flex items-center gap-1">
                    {allergy}
                    <X 
                      className="w-3 h-3 cursor-pointer" 
                      onClick={() => removeAllergy(allergy)}
                    />
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Current Medications */}
          <Card>
            <CardHeader>
              <CardTitle>{t('mr_medications') || 'Current Medications'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={medicationInput}
                  onChange={(e) => setMedicationInput(e.target.value)}
                  placeholder={t('mr_medications_placeholder') || 'Enter a medication (e.g., Aspirin 100mg daily)'}
                  onKeyPress={(e) => e.key === 'Enter' && addMedication()}
                />
                <Button onClick={addMedication} size="sm">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {medications.map((medication, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {medication}
                    <X 
                      className="w-3 h-3 cursor-pointer" 
                      onClick={() => removeMedication(medication)}
                    />
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Medical History */}
          <Card>
            <CardHeader>
              <CardTitle>{t('mr_conditions') || 'Medical History'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={historyInput}
                  onChange={(e) => setHistoryInput(e.target.value)}
                  placeholder={t('mr_conditions_placeholder') || 'Enter a medical condition (e.g., Hypertension, Diabetes)'}
                  onKeyPress={(e) => e.key === 'Enter' && addMedicalHistory()}
                />
                <Button onClick={addMedicalHistory} size="sm">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {medicalHistory.map((history, index) => (
                  <Badge key={index} variant="outline" className="flex items-center gap-1">
                    {history}
                    <X 
                      className="w-3 h-3 cursor-pointer" 
                      onClick={() => removeMedicalHistory(history)}
                    />
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Previous Medical Records */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-500" />
                {t('mr_previous_medical_records') || 'Previous Medical Records (Optional)'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="record-type">Record Type</Label>
                  <Select
                    value={currentRecord.record_type}
                    onValueChange={(value) => setCurrentRecord({...currentRecord, record_type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="consultation">{t('consultation')}</SelectItem>
                      <SelectItem value="lab_result">Lab Result</SelectItem>
                      <SelectItem value="prescription">Prescription</SelectItem>
                      <SelectItem value="diagnosis">Diagnosis</SelectItem>
                      <SelectItem value="treatment_plan">Treatment Plan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="record-date">{t('date')}</Label>
                  <Input
                    id="record-date"
                    type="date"
                    value={currentRecord.record_date}
                    onChange={(e) => setCurrentRecord({...currentRecord, record_date: e.target.value})}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="record-title">Title</Label>
                <Input
                  id="record-title"
                  value={currentRecord.title}
                  onChange={(e) => setCurrentRecord({...currentRecord, title: e.target.value})}
                  placeholder={t('mr_record_title_placeholder') || 'Brief title (e.g., Annual Checkup, Blood Test Results)'}
                />
              </div>
              
              <div>
                <Label htmlFor="record-description">Description</Label>
                <Textarea
                  id="record-description"
                  value={currentRecord.description}
                  onChange={(e) => setCurrentRecord({...currentRecord, description: e.target.value})}
                  placeholder={t('mr_record_description_placeholder') || 'Detailed description of the medical record'}
                  rows={3}
                />
              </div>

              <Button 
                onClick={addRecord} 
                disabled={!currentRecord.title.trim() || !currentRecord.description.trim()}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('mr_add_record') || 'Add Record'}
              </Button>

              {records.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Added Records:</h4>
                  {records.map((record, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{record.title}</div>
                        <div className="text-sm text-gray-600">{record.record_type} - {record.record_date}</div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRecord(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-3 pt-4">
          <Button
            onClick={handleSkip}
            variant="outline"
            className="flex-1"
            disabled={loading}
          >
            {t('skip') || 'Skip for Now'}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            {loading ? (t('mr_saving') || 'Saving...') : (t('mr_save_medical_records') || 'Save Medical Records')}
          </Button>
        </div>
      </DialogContent>

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
    </Dialog>
  );
}
