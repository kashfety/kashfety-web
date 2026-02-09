"use client";

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/components/providers/locale-provider';

interface VisitSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentId: string;
  patientId?: string;
  doctorId?: string;
}

export default function VisitSummaryModal({ isOpen, onClose, appointmentId, patientId, doctorId }: VisitSummaryModalProps) {
  const { t } = useLocale();
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<any[]>([]);

  const getAuthHeaders = (): HeadersInit => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  useEffect(() => {
    if (!isOpen) return;
    const load = async () => {
      setLoading(true);
      try {
        const qs = new URLSearchParams({ appointment_id: appointmentId });
        if (patientId) qs.set('patient_id', patientId);
        if (doctorId) qs.set('doctor_id', doctorId);
        const res = await fetch(`/api/medical-records?${qs.toString()}`, {
          headers: getAuthHeaders(),
        });
        const json = await res.json();
        if (res.ok && json.success) setRecords(json.records || []);
        else setRecords([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isOpen, appointmentId, patientId, doctorId]);

  const descriptionId = 'visit-summary-desc';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-xl font-semibold">{t('visit_summary_title') || 'Visit Summary'}</DialogTitle>
          <DialogDescription id={descriptionId} className="text-sm text-slate-500 dark:text-slate-400">
            {records.length > 0 ? 
              (t('visit_summary_showing_records') || `Showing ${records.length} record${records.length > 1 ? 's' : ''}`).replace('{count}', records.length.toString()) :
              (t('visit_summary_description') || 'Summary details from your completed visit')
            }
          </DialogDescription>
        </DialogHeader>

        {/* Body */}
        <div aria-describedby={descriptionId} className="max-h-[60vh] overflow-y-auto px-6 pb-4">
          {loading ? (
            <div className="py-10 text-center text-slate-600 dark:text-slate-300">{t('visit_summary_loading') || 'Loading summary…'}</div>
          ) : records.length === 0 ? (
            <div className="py-10 text-center text-slate-600 dark:text-slate-300">{t('visit_summary_no_summary') || 'No summary available.'}</div>
          ) : (
            <div className="space-y-4">
              {records.map((r) => (
                <div key={r.id} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  {/* Diagnosis */}
                  {r.diagnosis && (
                    <section className="px-4 py-3">
                      <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">{t('visit_summary_diagnosis') || 'Diagnosis'}</h4>
                      <p className="text-sm whitespace-pre-wrap text-slate-800 dark:text-slate-100">{r.diagnosis}</p>
                    </section>
                  )}
                  {/* Divider */}
                  {r.diagnosis && (r.treatment || r.prescription || r.description) && <hr className="border-slate-200 dark:border-slate-700" />}

                  {/* Treatment */}
                  {r.treatment && (
                    <section className="px-4 py-3">
                      <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">{t('visit_summary_treatment') || 'Treatment'}</h4>
                      <p className="text-sm whitespace-pre-wrap text-slate-800 dark:text-slate-100">{r.treatment}</p>
                    </section>
                  )}
                  {r.treatment && (r.prescription || r.description) && <hr className="border-slate-200 dark:border-slate-700" />}

                  {/* Prescription */}
                  {r.prescription && (
                    <section className="px-4 py-3">
                      <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">{t('visit_summary_prescription') || 'Prescription'}</h4>
                      <pre className="text-sm whitespace-pre-wrap break-words text-slate-800 dark:text-slate-100 bg-white/70 dark:bg-slate-900/40 rounded-md p-3 border border-slate-200 dark:border-slate-700">{r.prescription}</pre>
                    </section>
                  )}
                  {r.prescription && r.description && <hr className="border-slate-200 dark:border-slate-700" />}

                  {/* Notes */}
                  {r.description && (
                    <section className="px-4 py-3">
                      <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">{t('visit_summary_notes') || 'Notes'}</h4>
                      <p className="text-sm whitespace-pre-wrap text-slate-800 dark:text-slate-100">{r.description}</p>
                    </section>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4">
          <Button variant="outline" onClick={onClose}>{t('visit_summary_close') || 'Close'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 