"use client"

import { useEffect, useMemo, useState } from "react";
import { labService, centerService } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useLocale } from "@/components/providers/locale-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Calendar, Clock, Save, RotateCcw } from "lucide-react";

const DAYS = [
  { value: 0, label: 'Sun' }, { value: 1, label: 'Mon' }, { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' }, { value: 4, label: 'Thu' }, { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' }
];

export default function CenterScheduleManagement() {
  const { toast } = useToast();
  const { t } = useLocale();
  const [services, setServices] = useState<any[]>([]);
  const [selectedType, setSelectedType] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dayConfigs, setDayConfigs] = useState<Record<number, { isAvailable: boolean; start?: string; end?: string; slot?: number; breakStart?: string; breakEnd?: string; notes?: string }>>({});

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        // Fetch center's selected services instead of all lab test types
        const res = await centerService.listServices();
        const centerServices = res?.services || [];
        // Extract the lab test types from services that are active
        const activeServices = centerServices.filter((s: any) => s.is_active !== false);
        setServices(activeServices);
      } catch {}
      finally { setLoading(false); }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!selectedType) return;
      try {
        const res = await centerService.getLabSchedule(selectedType);
        const schedule = res?.schedule || [];
        const cfg: Record<number, any> = {};
        for (const s of schedule) {
          cfg[s.day_of_week] = { isAvailable: !!s.is_available, start: undefined, end: undefined, slot: s.slot_duration || 30, breakStart: s.break_start || '', breakEnd: s.break_end || '', notes: s.notes || '' };
        }
        setDayConfigs(cfg);
      } catch {}
    })();
  }, [selectedType]);

  const generateSlots = (start: string, end: string, duration: number): Array<{ time: string; duration: number }> => {
    if (!start || !end || !duration) return [];
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    const out: Array<{ time: string; duration: number }> = [];
    for (let m = startMin; m + duration <= endMin; m += duration) {
      const h = Math.floor(m / 60).toString().padStart(2, '0');
      const mm = (m % 60).toString().padStart(2, '0');
      out.push({ time: `${h}:${mm}`, duration });
    }
    return out;
  };

  const refresh = async () => {
    try {
      setLoading(true);
      // Refresh both services and schedule
      const res = await centerService.listServices();
      const centerServices = res?.services || [];
      const activeServices = centerServices.filter((s: any) => s.is_active !== false);
      setServices(activeServices);

      // If a type is selected, refresh its schedule too
      if (selectedType) {
        const scheduleRes = await centerService.getLabSchedule(selectedType);
        const schedule = scheduleRes?.schedule || [];
        const cfg: Record<number, any> = {};
        for (const s of schedule) {
          cfg[s.day_of_week] = { isAvailable: !!s.is_available, start: undefined, end: undefined, slot: s.slot_duration || 30, breakStart: s.break_start || '', breakEnd: s.break_end || '', notes: s.notes || '' };
        }
        setDayConfigs(cfg);
      }
    } catch {}
    finally { setLoading(false); }
  };

  const save = async () => {
    if (!selectedType) {
      toast({ title: t('error') || 'Error', description: t('selectTest') || 'Select test', variant: 'destructive' });
      return;
    }
    try {
      setSaving(true);
      const schedule = DAYS
        .filter(d => dayConfigs[d.value]?.isAvailable)
        .map(d => {
          const cfg = dayConfigs[d.value];
          const slots = generateSlots(cfg.start || '', cfg.end || '', Number(cfg.slot || 30));
          return {
            day_of_week: d.value,
            is_available: true,
            slots,
            break_start: cfg.breakStart || null,
            break_end: cfg.breakEnd || null,
            notes: cfg.notes || null,
            slot_duration: Number(cfg.slot || 30)
          };
        })
        .filter(d => d.slots.length > 0);

      await centerService.saveLabSchedule(selectedType, schedule as any);
      toast({ title: t('success') || 'Success', description: t('dd_schedule_updated') || 'Schedule updated successfully' });
    } catch (e: any) {
      toast({ title: t('error') || 'Error', description: e?.message || 'Failed to save schedule', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const setCfg = (day: number, key: string, value: any) => {
    setDayConfigs(prev => ({ ...prev, [day]: { ...prev[day], [key]: value } }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          <h2 className="text-xl font-semibold">{t('dd_schedule_management') || 'Schedule Management'}</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={refresh} variant="outline" size="sm" disabled={loading}>
            <RotateCcw className="h-4 w-4 mr-2" />{t('dd_refresh') || 'Refresh'}
          </Button>
          <Button onClick={save} disabled={saving || !selectedType} size="sm">
            <Save className="h-4 w-4 mr-2" />{saving ? (t('dd_saving') || 'Saving...') : (t('dd_save_schedule') || 'Save Schedule')}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>{t('selectTest') || 'Select Test/Service'}</CardTitle></CardHeader>
        <CardContent>
          {services.length > 0 ? (
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger><SelectValue placeholder={t('chooseTestType') || 'Choose test type'} /></SelectTrigger>
              <SelectContent>
                {services.map((service: any) => (
                  <SelectItem key={service.lab_test_types?.id || service.id} value={service.lab_test_types?.id || service.lab_test_type_id}>
                    {service.lab_test_types?.name || 'Unnamed Test'}
                    <span className="ml-2 text-xs text-gray-500">
                      (${service.base_fee || service.lab_test_types?.default_fee || 'No price'})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <div className="space-y-2">
                <p className="text-gray-600 dark:text-gray-400">{t('noServicesSelected') || 'No lab services selected yet'}</p>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  {t('goToServicesTab') || 'Go to the "Services" tab to select which lab tests and scans your center offers, then return here to set schedules.'}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedType && (
        <Card>
          <CardHeader><CardTitle><Clock className="inline h-5 w-5 mr-2" />{t('dd_weekly_schedule_for') || 'Weekly Schedule for'} {services.find((s:any)=>s.lab_test_types?.id===selectedType || s.lab_test_type_id===selectedType)?.lab_test_types?.name || 'Selected Test'}</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            {DAYS.map(d => {
              const cfg = dayConfigs[d.value] || { isAvailable: false, slot: 30 };
              const slots = generateSlots(cfg.start || '', cfg.end || '', Number(cfg.slot || 30));
              return (
                <div key={d.value} className="space-y-4 p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">{d.label}</h3>
                    <Switch checked={!!cfg.isAvailable} onCheckedChange={(checked)=> setCfg(d.value, 'isAvailable', checked)} />
                  </div>
                  {cfg.isAvailable && (
                    <div className="space-y-4 ml-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label>{t('dd_start_time') || 'Start Time'}</Label>
                          <Input type="time" value={cfg.start || ''} onChange={e=>setCfg(d.value,'start',e.target.value)} />
                        </div>
                        <div>
                          <Label>{t('dd_end_time') || 'End Time'}</Label>
                          <Input type="time" value={cfg.end || ''} onChange={e=>setCfg(d.value,'end',e.target.value)} />
                        </div>
                        <div>
                          <Label>{t('dd_slot_duration_minutes') || 'Slot Duration (minutes)'}</Label>
                          <Input type="number" min="15" max="120" step="15" value={cfg.slot?.toString() || '30'} onChange={e=>setCfg(d.value,'slot',Number(e.target.value||30))} />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>{t('dd_break_start_optional') || 'Break Start (optional)'}</Label>
                          <Input type="time" value={cfg.breakStart || ''} onChange={e=>setCfg(d.value,'breakStart',e.target.value)} />
                        </div>
                        <div>
                          <Label>{t('dd_break_end_optional') || 'Break End (optional)'}</Label>
                          <Input type="time" value={cfg.breakEnd || ''} onChange={e=>setCfg(d.value,'breakEnd',e.target.value)} />
                        </div>
                      </div>
                      {slots.length > 0 && (
                        <div>
                          <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            {(t('dd_generated_time_slots_total') || 'Generated Time Slots ({count} total)').replace('{count}', String(slots.length))}
                          </Label>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {slots.slice(0,8).map((s,i)=>(<Badge key={i} variant="outline" className="text-xs">{s.time}</Badge>))}
                            {slots.length>8 && (<Badge variant="secondary" className="text-xs">{`+${slots.length-8} more`}</Badge>)}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}


