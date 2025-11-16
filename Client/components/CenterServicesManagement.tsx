"use client"

import { useEffect, useMemo, useState } from "react";
import { labService, centerService } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useLocale } from "@/components/providers/locale-provider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  
  // New lab test type dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTestType, setNewTestType] = useState({
    code: '',
    name: '',
    category: 'lab' as 'lab' | 'imaging',
    default_fee: ''
  });

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
  
  const handleCreateTestType = async () => {
    if (!newTestType.code || !newTestType.name) {
      toast({ title: 'Error', description: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }
    
    setCreating(true);
    try {
      const response = await labService.createLabTestType({
        code: newTestType.code,
        name: newTestType.name,
        category: newTestType.category,
        default_fee: newTestType.default_fee ? Number(newTestType.default_fee) : undefined
      });
      
      const newType = response.data;
      
      // Add to types list
      setTypes(prev => [...prev, newType]);
      
      // Auto-enable in services with default fee
      setServices(prev => ({
        ...prev,
        [newType.id]: {
          active: true,
          fee: newTestType.default_fee || ''
        }
      }));
      
      toast({ title: 'Success', description: 'Lab test type created successfully' });
      
      // Reset form and close dialog
      setNewTestType({ code: '', name: '', category: 'lab', default_fee: '' });
      setShowCreateDialog(false);
    } catch (error: any) {
      console.error('Failed to create lab test type:', error);
      toast({ 
        title: 'Error', 
        description: error.response?.data?.error || 'Failed to create lab test type',
        variant: 'destructive' 
      });
    } finally {
      setCreating(false);
    }
  };

  const handleSave = async () => {
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
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">{t('lab_test_types') || 'Lab Test Types'}</h3>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  {t('add_new_type') || 'Add New Type'}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('create_lab_test_type') || 'Create Lab Test Type'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">{t('code') || 'Code'} *</Label>
                    <Input
                      id="code"
                      value={newTestType.code}
                      onChange={(e) => setNewTestType(prev => ({ ...prev, code: e.target.value }))}
                      placeholder="e.g., CBC, MRI"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">{t('name') || 'Name'} *</Label>
                    <Input
                      id="name"
                      value={newTestType.name}
                      onChange={(e) => setNewTestType(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Complete Blood Count"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">{t('category') || 'Category'} *</Label>
                    <Select
                      value={newTestType.category}
                      onValueChange={(value: 'lab' | 'imaging') => setNewTestType(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger id="category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lab">{t('lab') || 'Lab'}</SelectItem>
                        <SelectItem value="imaging">{t('imaging') || 'Imaging'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="default_fee">{t('default_fee') || 'Default Fee (Optional)'}</Label>
                    <Input
                      id="default_fee"
                      type="number"
                      value={newTestType.default_fee}
                      onChange={(e) => setNewTestType(prev => ({ ...prev, default_fee: e.target.value }))}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)} disabled={creating}>
                    {t('cancel') || 'Cancel'}
                  </Button>
                  <Button onClick={handleCreateTestType} disabled={creating}>
                    {creating ? (t('creating') || 'Creating...') : (t('create') || 'Create')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
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



