"use client"

import { useEffect, useState } from "react";
import { centerService } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocale } from "@/components/providers/locale-provider";

export default function CenterAnalytics() {
  const { t } = useLocale();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await centerService.getAnalytics();
        setData(res?.analytics || null);
      } finally { setLoading(false); }
    })();
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardHeader><CardTitle>{t('cd_total_appointments') || 'Total Appointments'}</CardTitle></CardHeader>
        <CardContent>{loading ? '-' : (data?.totalBookings ?? '-')}</CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>{t('cd_completed') || 'Completed'}</CardTitle></CardHeader>
        <CardContent>{loading ? '-' : (data?.totals?.completed ?? '-')}</CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>{t('cd_revenue') || 'Revenue'}</CardTitle></CardHeader>
        <CardContent>{loading ? '-' : (data?.revenue ?? '-')}</CardContent>
      </Card>
    </div>
  );
}



