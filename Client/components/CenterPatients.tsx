"use client"

import { useEffect, useState } from "react";
import { centerService } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLocale } from "@/components/providers/locale-provider";

export default function CenterPatients() {
  const { t } = useLocale();
  const [patients, setPatients] = useState<any[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      setLoading(true);
      const res = await centerService.listPatients();
      setPatients(res?.patients || []);
    } finally { setLoading(false); }
  };
  useEffect(()=>{ refresh(); }, []);

  const filtered = patients.filter(p => (p.name || '').toLowerCase().includes(filter.toLowerCase()) || (p.phone || '').includes(filter));

  return (
    <Card className="bg-card border">
      <CardHeader><CardTitle>{t('dd_patients_tab') || 'Patients'}</CardTitle></CardHeader>
      <CardContent>
        <div className="mb-3"><Input placeholder={t('appointments_search_placeholder') || 'Search'} value={filter} onChange={e=>setFilter(e.target.value)} /></div>
        {loading ? (
          <div className="text-sm text-muted-foreground">{t('loading') || 'Loading...'}</div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-muted-foreground">{t('no_results') || 'No results'}</div>
        ) : (
          <div className="space-y-2">
            {filtered.map(p => (
              <div key={p.id} className="border rounded p-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.phone} • {p.email}</div>
                </div>
                <div className="text-xs text-muted-foreground">{t('last_visit') || 'Last visit'}: {p.lastBooking || '-'}</div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}



