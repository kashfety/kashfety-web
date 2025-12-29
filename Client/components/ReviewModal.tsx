"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star } from 'lucide-react';
import { useLocale } from '@/components/providers/locale-provider';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentId: string;
  doctorId: string;
  patientId: string;
  onSuccess?: (rating: number) => void;
}

export default function ReviewModal({ isOpen, onClose, appointmentId, doctorId, patientId, onSuccess }: ReviewModalProps) {
  const { t } = useLocale();
  const [rating, setRating] = useState<number>(0);
  const [hover, setHover] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  const submit = async () => {
    if (!rating) return;
    setSaving(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointment_id: appointmentId, doctor_id: doctorId, patient_id: patientId, rating, comment })
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed to submit review');
      onSuccess?.(rating);
      onClose();
    } catch (e) {
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('review_title') || 'Rate Your Visit'}</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-2 py-2">
          {[1,2,3,4,5].map(i => (
            <button
              key={i}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(i)}
              className="p-1"
            >
              <Star className={(hover >= i || rating >= i) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-400'} />
            </button>
          ))}
        </div>
        <Textarea value={comment} onChange={e => setComment(e.target.value)} placeholder={t('review_comment_placeholder') || "Leave a comment (optional)"} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>{t('review_cancel') || 'Cancel'}</Button>
          <Button onClick={submit} disabled={!rating || saving}>{saving ? (t('review_saving') || 'Saving...') : (t('review_submit') || 'Submit Review')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 