"use client"

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Building,
  MapPin,
  Save,
  CheckCircle,
  Star
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";
import { useLocale } from "@/components/providers/locale-provider";
import { toArabicNumerals } from "@/lib/i18n";

interface Center {
  id: string;
  name: string;
  name_ar?: string;
  address: string;
  phone?: string;
  email?: string;
  is_assigned: boolean;
  is_primary: boolean;
  // Optional fields for visibility/ownership
  center_type?: string;
  owner_doctor_id?: string;
  approval_status?: string;
}

export default function DoctorCenterManagement() {
  const { toast } = useToast();
  const { t, locale } = useLocale();
  const isRTL = locale === 'ar';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [centers, setCenters] = useState<Center[]>([]);
  const [selectedCenters, setSelectedCenters] = useState<string[]>([]);
  const [initialSelectedCenters, setInitialSelectedCenters] = useState<string[]>([]);
  const [primaryCenter, setPrimaryCenter] = useState<string>('');
  const [initialPrimaryCenter, setInitialPrimaryCenter] = useState<string>('');
  const [creating, setCreating] = useState(false);
  const [newCenter, setNewCenter] = useState<{ name: string; address?: string; phone?: string; email?: string; center_type: 'generic' | 'personal'; set_as_primary: boolean }>({ name: '', address: '', phone: '', email: '', center_type: 'generic', set_as_primary: false });

  // Helper to get localized center name
  const getLocalizedCenterName = (center: Center) => {
    if (locale === 'ar' && center.name_ar) {
      return center.name_ar;
    }
    return center.name;
  };

  useEffect(() => {
    fetchCenters();
  }, []);

  const fetchCenters = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');

      // Try fallback route first for Vercel compatibility
      let response;
      try {
        console.log('🏥 Trying doctor-centers fallback route');
        response = await axios.get(
          `/api/doctor-centers`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
      } catch (fallbackError) {
        console.log('❌ Fallback failed, trying dynamic route');
        response = await axios.get(
          `/api/doctor-dashboard/centers`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
      }

      if (response.data.success) {
        const rawCenters: Center[] = response.data.centers || [];
        // Client-side guard: hide other doctors' personal clinics and unapproved centers
        let currentDoctorId = '';
        try {
          const storedUser = localStorage.getItem('auth_user');
          if (storedUser) currentDoctorId = JSON.parse(storedUser)?.id || '';
        } catch { }

        const filtered = rawCenters.filter((c: Center) => {
          const type = (c.center_type || 'generic').toLowerCase();
          const approved = (c.approval_status || 'approved').toLowerCase() === 'approved';
          if (type === 'personal') {
            if (!approved) return false;
            if (!currentDoctorId || !c.owner_doctor_id) return false;
            return c.owner_doctor_id === currentDoctorId;
          }
          return approved;
        });

        console.log('[Centers][client] doctorId=', currentDoctorId, 'received=', rawCenters.length, 'filtered=', filtered.length);
        filtered.forEach((c) => console.log('[Centers][client] kept:', c.id, c.name, c.center_type, c.owner_doctor_id));
        setCenters(filtered);

        // Set current assignments
        const assignedCenters = filtered.filter((c: Center) => c.is_assigned) || [];
        const assignedIds = assignedCenters.map((c: Center) => c.id);
        setSelectedCenters(assignedIds);
        setInitialSelectedCenters(assignedIds);

        // Set primary center
        const primary = assignedCenters.find((c: Center) => c.is_primary);
        if (primary) {
          setPrimaryCenter(primary.id);
          setInitialPrimaryCenter(primary.id);
        } else {
          setPrimaryCenter('');
          setInitialPrimaryCenter('');
        }
      }
    } catch (error) {
      console.error('Fetch centers error:', error);
      toast({
        title: t('error') || 'Error',
        description: t('dd_load_centers_failed') || 'Failed to load centers',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createCenter = async () => {
    if (!newCenter.name) return;
    try {
      setCreating(true);
      const token = localStorage.getItem('auth_token');

      // Try fallback route first for Vercel compatibility
      let res;
      try {
        console.log('🏥 Trying doctor-create-center fallback route');
        res = await axios.post('/api/doctor-create-center', newCenter, { headers: { Authorization: `Bearer ${token}` } });
      } catch (fallbackError) {
        console.log('❌ Fallback failed, trying dynamic route');
        res = await axios.post('/api/doctor-dashboard/centers', newCenter, { headers: { Authorization: `Bearer ${token}` } });
      }
      if (res.data?.success) {
        // Show pending state and wait for admin approval before it appears in list
        toast({ title: t('submitted_for_approval') || 'Submitted for approval', description: (res.data?.approval_status || 'pending').toUpperCase() });
        await fetchCenters();
        setNewCenter({ name: '', address: '', phone: '', email: '', center_type: 'generic', set_as_primary: false });
        toast({ title: t('success') || 'Success', description: t('dd_center_created') || 'Center request created' });
      }
    } catch (e: any) {
      const msg = e?.response?.data?.migration as string | undefined;
      if (msg) {
        toast({ title: t('migration_required') || 'Migration required', description: msg, variant: 'destructive' });
      } else {
        toast({ title: t('error') || 'Error', description: e?.response?.data?.error || 'Failed to create center', variant: 'destructive' });
      }
    } finally {
      setCreating(false);
    }
  };

  const toggleCenterSelection = (centerId: string) => {
    setSelectedCenters(prev => {
      const newSelection = prev.includes(centerId)
        ? prev.filter(id => id !== centerId)
        : [...prev, centerId];

      // If removing the primary center, clear primary selection
      if (!newSelection.includes(primaryCenter)) {
        setPrimaryCenter('');
      }

      return newSelection;
    });
  };

  const setPrimary = (centerId: string) => {
    if (selectedCenters.includes(centerId)) {
      setPrimaryCenter(centerId);
    }
  };

  const hasChanges = (() => {
    if (primaryCenter !== initialPrimaryCenter) return true;
    if (selectedCenters.length !== initialSelectedCenters.length) return true;
    const sortedSelected = [...selectedCenters].sort();
    const sortedInitial = [...initialSelectedCenters].sort();
    return sortedSelected.some((id, index) => id !== sortedInitial[index]);
  })();

  const saveAssignments = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('auth_token');
      const storedUser = localStorage.getItem('auth_user');
      const doctorId = storedUser ? (JSON.parse(storedUser)?.id || '') : '';

      if (selectedCenters.length === 0) {
        toast({
          title: t('error') || 'Error',
          description: t('dd_select_one_center') || 'Please select at least one center',
          variant: "destructive"
        });
        return;
      }

      // If only one center selected, make it primary
      const finalPrimary = selectedCenters.length === 1 ? selectedCenters[0] : (primaryCenter || selectedCenters[0]);

      // Try fallback route first for Vercel compatibility
      let response;
      try {
        console.log('🏥 Trying doctor-centers-assignments fallback route');
        response = await axios.put(
          `/api/doctor-centers-assignments`,
          {
            center_ids: selectedCenters,
            primary_center_id: finalPrimary,
            ...(doctorId ? { doctor_id: doctorId } : {}),
          },
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
      } catch (fallbackError) {
        console.log('❌ Fallback failed, trying dynamic route');
        response = await axios.put(
          `/api/doctor-dashboard/centers`,
          {
            center_ids: selectedCenters,
            primary_center_id: finalPrimary,
            ...(doctorId ? { doctor_id: doctorId } : {}),
          },
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
      }

      if (response.data.success) {
        console.log('✅ [Centers] Assignments saved successfully. Selected centers should now appear in Schedule tab.');
        toast({
          title: t('success') || 'Success',
          description: (t('dd_assignments_updated') || 'Center assignments updated successfully') + ' - ' + (t('check_schedule_tab') || 'Check the Schedule tab to set your hours.'),
        });
        // Refresh the data
        await fetchCenters();
        // Update initial state to match current state after successful save
        setInitialSelectedCenters(selectedCenters);
        setInitialPrimaryCenter(finalPrimary);
      }
    } catch (error: any) {
      console.error('Save assignments error:', error);
      toast({
        title: t('error') || 'Error',
        description: error.response?.data?.error || (t('dd_save_assignments_failed') || 'Failed to save assignments'),
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
          <Building className="h-5 w-5" />
          <span dir={isRTL ? 'rtl' : 'ltr'}>{t('dd_loading_centers') || 'Loading centers...'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
          <Building className="h-5 w-5" />
          <h2 className="text-xl font-semibold" dir={isRTL ? 'rtl' : 'ltr'}>{t('dd_medical_center_assignments') || 'Medical Center Assignments'}</h2>
        </div>
        {hasChanges && (
          <Button
            onClick={saveAssignments}
            disabled={saving || selectedCenters.length === 0}
            size="sm"
            className={isRTL ? 'flex-row-reverse' : ''}
            dir={isRTL ? 'rtl' : 'ltr'}
          >
            <Save className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
            <span dir={isRTL ? 'rtl' : 'ltr'}>{saving ? (t('dd_assignments_saving') || 'Saving...') : (t('dd_save_assignments') || 'Save Assignments')}</span>
          </Button>
        )}
      </div>

      {/* Instructions */}
      <Card dir={isRTL ? 'rtl' : 'ltr'}>
        <CardContent className={`pt-6 ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
          <div className="space-y-2" dir={isRTL ? 'rtl' : 'ltr'}>
            <p className={`text-sm text-gray-600 dark:text-gray-400 ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>• {t('dd_select_centers_instruction_1') || 'Select the medical centers where you want to practice'}</p>
            <p className={`text-sm text-gray-600 dark:text-gray-400 ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>• {t('dd_select_centers_instruction_2') || 'Choose one center as your primary location'}</p>
            <p className={`text-sm text-gray-600 dark:text-gray-400 ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>• {t('dd_select_centers_instruction_3') || 'You can set different schedules for each assigned center'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Centers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {centers.map(center => {
          const isSelected = selectedCenters.includes(center.id);
          const isPrimary = primaryCenter === center.id;

          return (
            <Card
              key={center.id}
              className={`cursor-pointer transition-all ${isSelected
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              onClick={() => toggleCenterSelection(center.id)}
              dir={isRTL ? 'rtl' : 'ltr'}
            >
              <CardHeader className={`pb-2 ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
                <div className={`flex items-start justify-between ${isRTL ? 'flex-row-reverse' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
                  <CardTitle className={`text-base ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>{getLocalizedCenterName(center)}</CardTitle>
                  <div className={`flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
                    {isSelected && (
                      <CheckCircle className={`h-5 w-5 text-blue-500 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent dir={isRTL ? 'rtl' : 'ltr'}>
                <div className="space-y-3" dir={isRTL ? 'rtl' : 'ltr'}>
                  <div className={`flex items-start gap-2 ${isRTL ? 'flex-row-reverse' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
                    <MapPin className={`h-4 w-4 text-gray-500 mt-0.5 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                    <p className={`text-sm text-gray-600 dark:text-gray-400 ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
                      {center.address}
                    </p>
                  </div>

                  {center.phone && (
                    <p className={`text-sm text-gray-600 dark:text-gray-400 ${isRTL ? 'flex items-center gap-1 flex-row-reverse' : 'flex items-center gap-1'}`} dir={isRTL ? 'rtl' : 'ltr'}>
                      <span>📞</span>
                      <span dir="ltr">{center.phone}</span>
                    </p>
                  )}

                  {center.email && (
                    <p className={`text-sm text-gray-600 dark:text-gray-400 ${isRTL ? 'flex items-center gap-1 flex-row-reverse' : 'flex items-center gap-1'}`} dir={isRTL ? 'rtl' : 'ltr'}>
                      <span>✉️</span>
                      <span dir="ltr">{center.email}</span>
                    </p>
                  )}

                  {isSelected && (
                    <div className={`flex items-center justify-between pt-2 border-t ${isRTL ? 'flex-row-reverse' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
                      <span className={`text-xs text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>{isPrimary ? (t('dd_primary_center') || 'Primary Center') : (t('dd_click_to_set_primary') || 'Click to set as primary')}</span>
                      {isPrimary ? (
                        <Badge variant="default" className={`text-xs ${isRTL ? 'flex-row-reverse' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
                          <Star className={`h-3 w-3 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                          <span dir={isRTL ? 'rtl' : 'ltr'}>{t('dd_primary') || 'Primary'}</span>
                        </Badge>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPrimary(center.id);
                          }}
                          className="text-xs h-6"
                          dir={isRTL ? 'rtl' : 'ltr'}
                        >
                          <span dir={isRTL ? 'rtl' : 'ltr'}>{t('dd_set_primary') || 'Set Primary'}</span>
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Create new center (generic or personal clinic) */}
      <Card dir={isRTL ? 'rtl' : 'ltr'}>
        <CardHeader className={isRTL ? 'text-right' : 'text-left'} dir={isRTL ? 'rtl' : 'ltr'}>
          <CardTitle className={isRTL ? 'text-right' : 'text-left'} dir={isRTL ? 'rtl' : 'ltr'}>{t('dd_add_center') || 'Add Center / Clinic'}</CardTitle>
        </CardHeader>
        <CardContent className={`space-y-3 ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
          <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 ${isRTL ? 'md:grid-flow-col md:auto-cols-fr' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
            <input className={`w-full rounded-md border px-3 py-2 bg-background ${isRTL ? 'text-right' : 'text-left'}`} placeholder={t('name') || 'Name'} value={newCenter.name} onChange={(e) => setNewCenter({ ...newCenter, name: e.target.value })} dir={isRTL ? 'rtl' : 'ltr'} />
            <input className={`w-full rounded-md border px-3 py-2 bg-background ${isRTL ? 'text-right' : 'text-left'}`} placeholder={t('address') || 'Address'} value={newCenter.address} onChange={(e) => setNewCenter({ ...newCenter, address: e.target.value })} dir={isRTL ? 'rtl' : 'ltr'} />
            <input className={`w-full rounded-md border px-3 py-2 bg-background ${isRTL ? 'text-right' : 'text-left'}`} placeholder={t('phone') || 'Phone'} value={newCenter.phone} onChange={(e) => setNewCenter({ ...newCenter, phone: e.target.value })} dir="ltr" />
            <input className={`w-full rounded-md border px-3 py-2 bg-background ${isRTL ? 'text-right' : 'text-left'}`} placeholder={t('email') || 'Email'} value={newCenter.email} onChange={(e) => setNewCenter({ ...newCenter, email: e.target.value })} dir="ltr" />
          </div>
          <div className={`flex flex-wrap items-center gap-4 ${isRTL ? 'flex-row-reverse justify-end' : 'justify-start'}`} dir={isRTL ? 'rtl' : 'ltr'}>
            <label className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
              <input type="radio" checked={newCenter.center_type === 'generic'} onChange={() => setNewCenter({ ...newCenter, center_type: 'generic' })} />
              <span dir={isRTL ? 'rtl' : 'ltr'}>{t('generic_center') || 'Generic Center'}</span>
            </label>
            <label className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
              <input type="radio" checked={newCenter.center_type === 'personal'} onChange={() => setNewCenter({ ...newCenter, center_type: 'personal', set_as_primary: true })} />
              <span dir={isRTL ? 'rtl' : 'ltr'}>{t('personal_clinic') || 'Personal Clinic'}</span>
            </label>
            <label className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
              <input type="checkbox" checked={newCenter.set_as_primary} onChange={(e) => setNewCenter({ ...newCenter, set_as_primary: e.target.checked })} />
              <span dir={isRTL ? 'rtl' : 'ltr'}>{t('set_as_primary') || 'Set as Primary'}</span>
            </label>
          </div>
          <div className={isRTL ? 'flex justify-end' : 'flex justify-start'} dir={isRTL ? 'rtl' : 'ltr'}>
            <Button onClick={createCenter} disabled={creating || !newCenter.name} dir={isRTL ? 'rtl' : 'ltr'}>
              <span dir={isRTL ? 'rtl' : 'ltr'}>{creating ? (t('saving') || 'Saving...') : (t('create') || 'Create')}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card dir={isRTL ? 'rtl' : 'ltr'}>
        <CardHeader className={isRTL ? 'text-right' : 'text-left'} dir={isRTL ? 'rtl' : 'ltr'}>
          <CardTitle className={`text-base ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>{t('dd_assignment_summary') || 'Assignment Summary'}</CardTitle>
        </CardHeader>
        <CardContent dir={isRTL ? 'rtl' : 'ltr'}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4" dir={isRTL ? 'rtl' : 'ltr'}>
            <div className={isRTL ? 'text-right' : 'text-left'} dir={isRTL ? 'rtl' : 'ltr'}>
              <Label className={`text-sm font-medium text-gray-600 dark:text-gray-400 ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>{t('dd_selected_centers') || 'Selected Centers'}</Label>
              <p className={`text-lg font-semibold ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>{toArabicNumerals(selectedCenters.length.toString(), locale)} {t('dd_centers_unit') || 'centers'}</p>
            </div>
            <div className={isRTL ? 'text-right' : 'text-left'} dir={isRTL ? 'rtl' : 'ltr'}>
              <Label className={`text-sm font-medium text-gray-600 dark:text-gray-400 ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>{t('dd_primary_center') || 'Primary Center'}</Label>
              <p className={`text-lg font-semibold ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>{(primaryCenter || (selectedCenters.length > 0 ? selectedCenters[0] : ''))
                ? getLocalizedCenterName(centers.find(c => c.id === primaryCenter) || { id: '', name: '', address: '', is_assigned: false, is_primary: false })
                : (t('dd_none_selected') || 'None selected')
              }</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
