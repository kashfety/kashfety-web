"use client"

import { useState } from "react";
import { labService, centerService } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLocale } from "@/components/providers/locale-provider";

interface Props {
  booking: any | null;
  onClose: () => void;
  onUpdated?: () => void;
}

export default function CenterLabDetailsModal({ booking, onClose, onUpdated }: Props) {
  const { t } = useLocale();
  const { toast } = useToast();
  const [notes, setNotes] = useState<string>(booking?.result_notes || "");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  if (!booking) return null;

  const doUpload = async () => {
    if (!file) {
      toast({ title: t('center_lab_error') || 'Error', description: t('center_lab_select_pdf') || 'Select a PDF first', variant: 'destructive' });
      return;
    }
    try {
      setSaving(true);
      await centerService.uploadResult(booking.id, file, notes);
      toast({ title: t('center_lab_success') || 'Success', description: t('center_lab_result_uploaded') || 'Result uploaded' });
      onUpdated && onUpdated();
      onClose();
    } catch (e: any) {
      toast({ title: t('center_lab_error') || 'Error', description: e?.message || (t('center_lab_upload_failed') || 'Upload failed'), variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const updateStatus = async (status: string) => {
    try {
      setSaving(true);
      await labService.updateStatus(booking.id, status);
      toast({ title: t('center_lab_success') || 'Success', description: t('center_lab_status_updated') || 'Status updated' });
      onUpdated && onUpdated();
      onClose();
    } catch (e: any) {
      toast({ title: t('center_lab_error') || 'Error', description: e?.message || (t('center_lab_failed') || 'Failed'), variant: 'destructive' });
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="bg-card w-full max-w-2xl p-4 border">
        <div className="flex items-center justify-between mb-3">
          <div className="text-lg font-semibold">{booking?.type?.name || (t('center_lab_booking') || 'Lab Booking')}</div>
          <button onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground">{t('center_lab_close') || 'Close'}</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3 text-sm text-muted-foreground">
          <div>{t('center_lab_patient') || 'Patient'}: <span className="text-foreground">{booking?.patient?.name || '-'}</span></div>
          <div>{t('center_lab_date_time') || 'Date/Time'}: <span className="text-foreground">{booking?.booking_date} {booking?.booking_time}</span></div>
          <div>{t('center_lab_status') || 'Status'}: <span className="text-foreground">{booking?.status}</span></div>
          <div>{t('center_lab_fee') || 'Fee'}: <span className="text-foreground">{booking?.fee ?? '-'}</span></div>
        </div>

        <div className="space-y-2 mb-4">
          <div className="text-sm">{t('center_lab_attach_pdf') || 'Attach PDF result'}</div>
          <Input type="file" accept="application/pdf" onChange={e => setFile(e.target.files?.[0] || null)} />
          <div className="text-sm">{t('center_lab_notes') || 'Notes'}</div>
          <textarea className="w-full border rounded p-2 bg-background" rows={4} value={notes} onChange={e => setNotes(e.target.value)} />
          {booking?.result_file_url && (
            <a className="text-emerald-600 text-sm" href={booking.result_file_url} target="_blank" rel="noreferrer">{t('center_lab_view_current') || 'View current result'}</a>
          )}
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={() => updateStatus('confirmed')} disabled={saving}>{t('center_lab_confirm') || 'Confirm'}</Button>
          <Button variant="outline" onClick={() => updateStatus('completed')} disabled={saving}>{t('center_lab_complete') || 'Complete'}</Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={doUpload} disabled={saving || !file}>{saving ? (t('center_lab_saving') || 'Saving...') : (t('center_lab_upload') || 'Upload Result')}</Button>
        </div>
      </Card>
    </div>
  );
}



