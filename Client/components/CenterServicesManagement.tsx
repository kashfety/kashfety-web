"use client"

import { useEffect, useMemo, useState } from "react";
import { labService, centerService } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useLocale } from "@/components/providers/locale-provider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TypeRow {
  id: string;
  code?: string;
  name: string;
  category: string; // 'lab' | 'imaging'
  default_fee?: number | null;
}

export default function CenterServicesManagement() {
  const { toast } = useToast();
  const { t } = useLocale();
  const [loading, setLoading] = useState(true);
  const [types, setTypes] = useState<TypeRow[]>([]);
  const [services, setServices] = useState<Record<string, { active: boolean; fee?: string }>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [typesRes, svcRes] = await Promise.all([
          labService.getTypes(),
          centerService.listServices()
        ]);
        const rows: TypeRow[] = typesRes?.types || [];
        setTypes(rows);
        const initial: Record<string, { active: boolean; fee?: string }> = {};
        // Mark existing services as active
        const svc = svcRes?.services || [];
        for (const t of rows) {
          const found = svc.find((s: any) => s.lab_test_types?.id === t.id);
          if (found) initial[t.id] = { active: true, fee: (found.base_fee ?? found.lab_test_types?.default_fee ?? '').toString() };
          else initial[t.id] = { active: false, fee: (t.default_fee ?? '').toString() };
        }
        setServices(initial);
      } catch (e: any) {
        toast({ title: t('error') || 'Error', description: e?.message || 'Failed to load services', variant: 'destructive' });
      } finally { setLoading(false); }
    })();
  }, [t, toast]);

  const anyChanged = useMemo(() => true, [services]);

  const toggleActive = (id: string) => {
    setServices(prev => ({ ...prev, [id]: { active: !prev[id]?.active, fee: prev[id]?.fee } }));
  };

  const updateFee = (id: string, fee: string) => {
    setServices(prev => ({ ...prev, [id]: { active: prev[id]?.active ?? false, fee } }));
  };

  const save = async () => {
    try {
      setSaving(true);
      const payload = Object.entries(services)
        .filter(([, v]) => v.active)
        .map(([id, v]) => ({ lab_test_type_id: id, base_fee: v.fee ? Number(v.fee) : undefined, is_active: true }));
      await centerService.saveServices(payload);
      toast({ title: t('success') || 'Success', description: t('saved') || 'Saved successfully' });
    } catch (e: any) {
      toast({ title: t('error') || 'Error', description: e?.message || 'Failed to save services', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  return (
    <Card className="bg-card p-4 border">
      {loading ? (
        <div className="text-sm text-muted-foreground">{t('loading') || 'Loading...'}</div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {types.map((t1) => (
              <div key={t1.id} className="border rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{t1.name}</div>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={!!services[t1.id]?.active} onChange={() => toggleActive(t1.id)} />
                    {t('enabled') || 'Enabled'}
                  </label>
                </div>
                <div className="text-xs text-muted-foreground">{t1.category}</div>
                <div className="mt-2">
                  <div className="text-xs mb-1">{t('fee') || 'Fee'}</div>
                  <Input value={services[t1.id]?.fee ?? ''} onChange={(e) => updateFee(t1.id, e.target.value)} placeholder={(t1.default_fee ?? '').toString()} />
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <Button onClick={save} disabled={saving || !anyChanged} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {saving ? (t('saving') || 'Saving...') : (t('save') || 'Save')}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}



