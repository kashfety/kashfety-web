"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useMemo } from "react";
import { useLocale } from "@/components/providers/locale-provider";

type PlanSection = { t: string; i: string[] };
export type PrepPlan = {
  prep_sections: PlanSection[];
  reminder_24h?: string;
  reminder_3h?: string;
  sms?: string;
  email_text?: string;
};

interface PrepModalProps {
  isOpen: boolean;
  onClose: () => void;
  loading?: boolean;
  plan?: PrepPlan | null;
}

export default function PrepModal({ isOpen, onClose, loading, plan }: PrepModalProps) {
  const { t } = useLocale();
  const hasPlan = !!plan && Array.isArray(plan.prep_sections) && plan.prep_sections.length > 0;
  const descId = useMemo(() => "prep-desc-" + Math.random().toString(36).slice(2), []);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-xl font-semibold">{t('prep_title') || 'Appointment Prep'}</DialogTitle>
          <DialogDescription id={descId} className="text-sm text-slate-500 dark:text-slate-400">
            {hasPlan ? (t('prep_description_ready') || "Tailored checklist and reminders") : (t('prep_description_generating') || "Generating a concise prep plan")}
          </DialogDescription>
        </DialogHeader>

        <div aria-describedby={descId} className="max-h-[60vh] overflow-y-auto px-6 pb-4">
          {loading ? (
            <div className="py-10 text-center text-slate-600 dark:text-slate-300">{t('prep_generating') || 'Generating…'}</div>
          ) : !hasPlan ? (
            <div className="py-10 text-center text-slate-600 dark:text-slate-300">{t('prep_no_prep') || 'No prep available.'}</div>
          ) : (
            <div className="space-y-4">
              {plan!.prep_sections.map((s, idx) => (
                <section key={idx} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3">
                  <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">{s.t}</h4>
                  <ul className="list-disc pl-5 space-y-1 text-sm text-slate-800 dark:text-slate-100">
                    {s.i?.map((it, ii) => (
                      <li key={ii}>{it}</li>
                    ))}
                  </ul>
                </section>
              ))}

              {(plan!.reminder_24h || plan!.reminder_3h) && (
                <section className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3">
                  <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">{t('prep_reminders') || 'Reminders'}</h4>
                  <div className="text-sm space-y-1">
                    {plan!.reminder_24h && <p><span className="font-medium">{t('prep_24h') || '24h'}:</span> {plan!.reminder_24h}</p>}
                    {plan!.reminder_3h && <p><span className="font-medium">{t('prep_3h') || '3h'}:</span> {plan!.reminder_3h}</p>}
                  </div>
                </section>
              )}

              {(plan!.sms || plan!.email_text) && (
                <section className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3 space-y-2">
                  <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t('prep_share') || 'Share'}</h4>
                  {plan!.sms && (
                    <div>
                      <div className="text-xs text-slate-500 mb-1">{t('prep_sms') || 'SMS'}</div>
                      <div className="flex items-start gap-2">
                        <pre className="flex-1 text-sm whitespace-pre-wrap break-words bg-white/70 dark:bg-slate-900/40 rounded-md p-3 border border-slate-200 dark:border-slate-700">{plan!.sms}</pre>
                        <Button
                          variant="outline"
                          onClick={() => navigator.clipboard.writeText(plan!.sms!)}
                        >
                          {t('prep_copy') || 'Copy'}
                        </Button>
                      </div>
                    </div>
                  )}
                  {plan!.email_text && (
                    <div>
                      <div className="text-xs text-slate-500 mb-1">{t('prep_email') || 'Email'}</div>
                      <div className="flex items-start gap-2">
                        <pre className="flex-1 text-sm whitespace-pre-wrap break-words bg-white/70 dark:bg-slate-900/40 rounded-md p-3 border border-slate-200 dark:border-slate-700">{plan!.email_text}</pre>
                        <Button
                          variant="outline"
                          onClick={() => navigator.clipboard.writeText(plan!.email_text!)}
                        >
                          {t('prep_copy') || 'Copy'}
                        </Button>
                      </div>
                    </div>
                  )}
                </section>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4">
          <Button variant="outline" onClick={onClose}>{t('prep_close') || 'Close'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 