"use client"

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useLocale } from "@/components/providers/locale-provider"
import { 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  Plus, 
  Edit2, 
  Trash2,
  Save,
  X,
  Check,
  Clock,
  Users
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MedicalCenter {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  description?: string;
  is_primary: boolean;
  consultation_fee?: number;
  special_notes?: string;
  operating_hours: {
    monday: { start: string; end: string; available: boolean };
    tuesday: { start: string; end: string; available: boolean };
    wednesday: { start: string; end: string; available: boolean };
    thursday: { start: string; end: string; available: boolean };
    friday: { start: string; end: string; available: boolean };
    saturday: { start: string; end: string; available: boolean };
    sunday: { start: string; end: string; available: boolean };
  };
}

interface MedicalCenterManagementProps {
  doctorId: string;
}

const DEFAULT_HOURS = {
  monday: { start: "09:00", end: "17:00", available: true },
  tuesday: { start: "09:00", end: "17:00", available: true },
  wednesday: { start: "09:00", end: "17:00", available: true },
  thursday: { start: "09:00", end: "17:00", available: true },
  friday: { start: "09:00", end: "17:00", available: true },
  saturday: { start: "09:00", end: "13:00", available: false },
  sunday: { start: "09:00", end: "13:00", available: false }
};

export default function MedicalCenterManagement({ doctorId }: MedicalCenterManagementProps) {
  const { t, isRTL } = useLocale()

  const [centers, setCenters] = useState<MedicalCenter[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingCenter, setEditingCenter] = useState<string | null>(null);
  const [newCenter, setNewCenter] = useState<Partial<MedicalCenter> | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    fetchCenters();
  }, [doctorId]);

  const fetchCenters = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
  const response = await fetch('/api/auth/doctor/centers', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCenters(data.centers || []);
      }
    } catch (error) {
      console.error('Failed to fetch centers:', error);
      toast({
        title: t('error'),
        description: "Failed to load medical centers.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const startAddingCenter = () => {
    setNewCenter({
      name: "",
      address: "",
      phone: "",
      email: "",
      description: "",
      is_primary: centers.length === 0, // First center is primary by default
      consultation_fee: 0,
      special_notes: "",
      operating_hours: DEFAULT_HOURS
    });
  };

  const saveNewCenter = async () => {
    if (!newCenter || !newCenter.name || !newCenter.address) {
      toast({
        title: "Validation Error",
        description: "Please fill in the required fields.",
        variant: "destructive"
      });
      return;
    }

    try {
      const token = localStorage.getItem('token');
  const response = await fetch('/api/auth/doctor/centers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newCenter)
      });

      if (response.ok) {
        const data = await response.json();
        setCenters(prev => [...prev, data.center]);
        setNewCenter(null);
        toast({
          title: t('success'),
          description: "Medical center added successfully.",
        });
      } else {
        throw new Error('Failed to add center');
      }
    } catch (error) {
      console.error('Failed to add center:', error);
      toast({
        title: t('error'),
        description: "Failed to add medical center.",
        variant: "destructive"
      });
    }
  };

  const updateCenter = async (centerId: string, updates: Partial<MedicalCenter>) => {
    try {
      const token = localStorage.getItem('token');
  const response = await fetch(`/api/auth/doctor/centers/${centerId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        setCenters(prev => prev.map(center => 
          center.id === centerId ? { ...center, ...updates } : center
        ));
        setEditingCenter(null);
        toast({
          title: t('success'),
          description: "Medical center updated successfully.",
        });
      } else {
        throw new Error('Failed to update center');
      }
    } catch (error) {
      console.error('Failed to update center:', error);
      toast({
        title: t('error'),
        description: "Failed to update medical center.",
        variant: "destructive"
      });
    }
  };

  const deleteCenter = async (centerId: string) => {
    if (!confirm('Are you sure you want to delete this medical center?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
  const response = await fetch(`/api/auth/doctor/centers/${centerId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setCenters(prev => prev.filter(center => center.id !== centerId));
        toast({
          title: t('success'),
          description: "Medical center deleted successfully.",
        });
      } else {
        throw new Error('Failed to delete center');
      }
    } catch (error) {
      console.error('Failed to delete center:', error);
      toast({
        title: t('error'),
        description: "Failed to delete medical center.",
        variant: "destructive"
      });
    }
  };

  const setPrimaryCenter = async (centerId: string) => {
    // Update all centers to remove primary status except the selected one
    try {
      const token = localStorage.getItem('token');
  const response = await fetch(`/api/auth/doctor/centers/${centerId}/primary`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setCenters(prev => prev.map(center => ({
          ...center,
          is_primary: center.id === centerId
        })));
        toast({
          title: t('success'),
          description: "Primary medical center updated.",
        });
      }
    } catch (error) {
      console.error('Failed to set primary center:', error);
      toast({
        title: t('error'),
        description: "Failed to update primary center.",
        variant: "destructive"
      });
    }
  };

  const CenterCard = ({ center }: { center: MedicalCenter }) => {
    const isEditing = editingCenter === center.id;
    const [editData, setEditData] = useState(center);

    const handleSave = () => {
      updateCenter(center.id, editData);
    };

    const handleCancel = () => {
      setEditData(center);
      setEditingCenter(null);
    };

    return (
      <Card className={`relative ${center.is_primary ? 'ring-2 ring-blue-500' : ''}`}>
        {center.is_primary && (
          <Badge className="absolute -top-2 -right-2 bg-blue-600">
            Primary
          </Badge>
        )}
        
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {isEditing ? (
                <Input
                  value={editData.name}
                  onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                  className="font-semibold"
                />
              ) : (
                <CardTitle>{center.name}</CardTitle>
              )}
            </div>
            <div className="flex items-center gap-1">
              {!isEditing ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingCenter(center.id)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteCenter(center.id)}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSave}
                    className="text-green-600"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancel}
                    className="text-red-600"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Basic Information */}
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 mt-1 text-gray-500" />
              {isEditing ? (
                <Textarea
                  value={editData.address}
                  onChange={(e) => setEditData(prev => ({ ...prev, address: e.target.value }))}
                  rows={2}
                  className="flex-1"
                />
              ) : (
                <p className="text-sm">{center.address}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-500" />
                {isEditing ? (
                  <Input
                    value={editData.phone}
                    onChange={(e) => setEditData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Phone number"
                  />
                ) : (
                  <span className="text-sm">{center.phone}</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-500" />
                {isEditing ? (
                  <Input
                    value={editData.email}
                    onChange={(e) => setEditData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Email address"
                  />
                ) : (
                  <span className="text-sm">{center.email}</span>
                )}
              </div>
            </div>
          </div>

          {/* Consultation Fee */}
          {isEditing ? (
            <div>
              <Label>{t('consultationFeeUSD') || 'Consultation Fee (SYP)'}</Label>
              <Input
                type="number"
                value={editData.consultation_fee || 0}
                onChange={(e) => setEditData(prev => ({ 
                  ...prev, 
                  consultation_fee: parseFloat(e.target.value) || 0 
                }))}
              />
            </div>
          ) : (
            center.consultation_fee && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {t('consultation_fee') || 'Consultation Fee'}: {center.consultation_fee} {t('currency_symbol') || 'SYP'}
                </Badge>
              </div>
            )
          )}

          {/* Description */}
          {(isEditing || center.description) && (
            <div>
              <Label>Description</Label>
              {isEditing ? (
                <Textarea
                  value={editData.description || ""}
                  onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              ) : (
                <p className="text-sm text-gray-600">{center.description}</p>
              )}
            </div>
          )}

          {/* Special Notes */}
          {(isEditing || center.special_notes) && (
            <div>
              <Label>Special Notes</Label>
              {isEditing ? (
                <Textarea
                  value={editData.special_notes || ""}
                  onChange={(e) => setEditData(prev => ({ ...prev, special_notes: e.target.value }))}
                  rows={2}
                />
              ) : (
                <p className="text-sm text-gray-600">{center.special_notes}</p>
              )}
            </div>
          )}

          {/* Actions */}
          {!isEditing && !center.is_primary && (
            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPrimaryCenter(center.id)}
              >
                Set as Primary
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const NewCenterForm = () => {
    if (!newCenter) return null;

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add New Medical Center
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setNewCenter(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Center Name *</Label>
              <Input
                id="name"
                value={newCenter.name || ""}
                onChange={(e) => setNewCenter(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Medical center name"
              />
            </div>
            <div>
              <Label htmlFor="phone">{t('phoneNumber')}</Label>
              <Input
                id="phone"
                value={newCenter.phone || ""}
                onChange={(e) => setNewCenter(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Phone number"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="address">Address *</Label>
            <Textarea
              id="address"
              value={newCenter.address || ""}
              onChange={(e) => setNewCenter(prev => ({ ...prev, address: e.target.value }))}
              placeholder="Full address"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">{t('email')}</Label>
              <Input
                id="email"
                type="email"
                value={newCenter.email || ""}
                onChange={(e) => setNewCenter(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Email address"
              />
            </div>
            <div>
              <Label htmlFor="fee">Consultation Fee (USD)</Label>
              <Input
                id="fee"
                type="number"
                value={newCenter.consultation_fee || 0}
                onChange={(e) => setNewCenter(prev => ({ 
                  ...prev, 
                  consultation_fee: parseFloat(e.target.value) || 0 
                }))}
                placeholder="Fee amount"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={newCenter.description || ""}
              onChange={(e) => setNewCenter(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of the medical center"
              rows={3}
            />
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={newCenter.is_primary || false}
              onCheckedChange={(checked) => setNewCenter(prev => ({ ...prev, is_primary: checked }))}
            />
            <Label>Set as primary center</Label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setNewCenter(null)}
            >
              Cancel
            </Button>
            <Button onClick={saveNewCenter}>
              <Save className="h-4 w-4 mr-1" />
              Save Center
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p>Loading medical centers...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              <CardTitle>Medical Centers</CardTitle>
            </div>
            {!newCenter && (
              <Button onClick={startAddingCenter}>
                <Plus className="h-4 w-4 mr-1" />
                Add Center
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* New Center Form */}
      <NewCenterForm />

      {/* Existing Centers */}
      <div className="grid gap-4">
        {centers.map(center => (
          <CenterCard key={center.id} center={center} />
        ))}

        {centers.length === 0 && !newCenter && (
          <Card>
            <CardContent className="text-center py-8">
              <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium mb-2">No Medical Centers</h3>
              <p className="text-gray-600 mb-4">
                Add your medical centers to manage your practice locations.
              </p>
              <Button onClick={startAddingCenter}>
                <Plus className="h-4 w-4 mr-1" />
                Add Your First Center
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
