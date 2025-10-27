"use client"

import { useEffect, useState } from "react";
import { centerService, labService } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLocale } from "@/components/providers/locale-provider";
import CenterLabDetailsModal from "./CenterLabDetailsModal";

export default function CenterOverview() {
  const { toast } = useToast();
  const { t } = useLocale();
  const [stats, setStats] = useState<any>(null);
  const [today, setToday] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingAction, setBookingAction] = useState<string | null>(null);
  const [selected, setSelected] = useState<any | null>(null);

  const refresh = async () => {
    try {
      setLoading(true);
      const [an, td] = await Promise.all([
        centerService.getAnalytics().catch(()=>({})),
        centerService.todayBookings()
      ]);
      setStats(an?.analytics || null);
      setToday(td?.bookings || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { refresh(); }, []);

  const updateStatus = async (id: string, status: string) => {
    try {
      setBookingAction(id+status);
      await labService.updateStatus(id, status);
      await refresh();
      toast({ title: t('success') || 'Success', description: t('saved') || 'Saved successfully' });
    } catch (e: any) {
      toast({ title: t('error') || 'Error', description: e?.message || 'Failed', variant: 'destructive' });
    } finally { setBookingAction(null); }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardHeader><CardTitle>{t('total') || 'Total'}</CardTitle></CardHeader><CardContent>{stats ? stats.totalBookings : '-'}</CardContent></Card>
        <Card><CardHeader><CardTitle>{t('completed') || 'Completed'}</CardTitle></CardHeader><CardContent>{stats ? stats.totals?.completed : '-'}</CardContent></Card>
        <Card><CardHeader><CardTitle>{t('revenue') || 'Revenue'}</CardTitle></CardHeader><CardContent>{stats ? stats.revenue : '-'}</CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle>{t('today_labs') || "Today's Labs"}</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">{t('loading') || 'Loading...'}</div>
          ) : today.length === 0 ? (
            <div className="text-sm text-muted-foreground">{t('no_labs') || 'No lab bookings today'}</div>
          ) : (
            <div className="space-y-2">
              {today.map(b => (
                <div key={b.id} className="flex items-center justify-between border rounded p-3">
                  <div>
                    <div className="font-medium">{b.type?.name}</div>
                    <div className="text-xs text-muted-foreground">{b.booking_date} {b.booking_time} • {b.patient?.name || b.patient_name || ''}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={bookingAction===b.id+'confirmed'} onClick={()=>updateStatus(b.id,'confirmed')}>{t('confirm') || 'Confirm'}</Button>
                    <Button size="sm" variant="outline" disabled={bookingAction===b.id+'completed'} onClick={()=>updateStatus(b.id,'completed')}>{t('complete') || 'Complete'}</Button>
                    <Button size="sm" onClick={()=>setSelected(b)}>{t('view') || 'View'}</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      {selected && (
        <CenterLabDetailsModal booking={selected} onClose={()=>setSelected(null)} onUpdated={refresh} />
      )}
    </div>
  );
}


