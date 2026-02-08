"use client"

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLocale } from '@/components/providers/locale-provider';
import { Beaker, Plus, Trash2, Search, AlertCircle, CheckCircle } from 'lucide-react';
import { useCustomAlert } from '@/hooks/use-custom-alert';
import CustomAlert from '@/components/CustomAlert';

interface LabTestType {
  id: string;
  name: string;
  name_ar: string;
  name_ku?: string;
  code?: string;
  category: string;
  description?: string;
  default_duration?: number;
  default_fee?: number;
  is_active: boolean;
  display_order?: number;
  created_at: string;
}

export default function LabTestTypesManagement() {
  const { t, locale, isRTL } = useLocale();
  const [labTestTypes, setLabTestTypes] = useState<LabTestType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newTestType, setNewTestType] = useState({
    name: '',
    name_ar: '',
    name_ku: '',
    code: '',
    category: 'lab',
    description: '',
    default_duration: 30,
    default_fee: 0,
    display_order: 0
  });
  const [submitting, setSubmitting] = useState(false);

  const { alertConfig, isOpen, showSuccess, showError, hideAlert } = useCustomAlert();

  useEffect(() => {
    fetchLabTestTypes();
  }, []);

  const fetchLabTestTypes = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/lab-test-types');

      if (!response.ok) {
        throw new Error('Failed to fetch lab test types');
      }

      const data = await response.json();
      setLabTestTypes(data.labTestTypes || []);
    } catch (error: any) {
      showError(
        t('error') || 'Error',
        error.message || 'Failed to load lab test types'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAddTestType = async () => {
    if (!newTestType.name.trim() || !newTestType.name_ar.trim()) {
      showError(
        t('error') || 'Error',
        'Please fill in both English and Arabic names'
      );
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch('/api/admin/lab-test-types', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newTestType.name.trim(),
          name_ar: newTestType.name_ar.trim(),
          name_ku: newTestType.name_ku?.trim() || null,
          code: newTestType.code?.trim() || null,
          category: newTestType.category,
          description: newTestType.description?.trim() || null,
          default_duration: newTestType.default_duration || 30,
          default_fee: newTestType.default_fee || 0,
          display_order: newTestType.display_order || 0
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add lab test type');
      }

      const data = await response.json();

      showSuccess(
        t('success') || 'Success',
        'Lab test type added successfully',
        () => {
          setLabTestTypes([data.labTestType, ...labTestTypes]);
          setNewTestType({
            name: '',
            name_ar: '',
            name_ku: '',
            code: '',
            category: 'lab',
            description: '',
            default_duration: 30,
            default_fee: 0,
            display_order: 0
          });
          setIsAddingNew(false);
        }
      );
    } catch (error: any) {
      showError(
        t('error') || 'Error',
        error.message || 'Failed to add lab test type'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTestType = async (id: string, name: string) => {
    showError(
      'Confirm Delete',
      `Are you sure you want to delete "${name}"? This action cannot be undone.`,
      async () => {
        try {
          const response = await fetch(`/api/admin/lab-test-types?id=${id}`, {
            method: 'DELETE'
          });

          const data = await response.json();

          if (!response.ok) {
            // Show the specific error message from the API
            throw new Error(data.error || 'Failed to delete lab test type');
          }

          setLabTestTypes(labTestTypes.filter(test => test.id !== id));
          showSuccess(
            t('success') || 'Success',
            'Lab test type deleted successfully'
          );
        } catch (error: any) {
          showError(
            t('error') || 'Error',
            error.message || 'Failed to delete lab test type'
          );
        }
      },
    );
  };

  const filteredTestTypes = labTestTypes.filter(test =>
    (test.name && test.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (test.name_ar && test.name_ar.includes(searchTerm)) ||
    (test.name_ku && test.name_ku.includes(searchTerm)) ||
    (test.code && test.code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
        <div className={isRTL ? 'text-right' : 'text-left'}>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Beaker className="w-6 h-6 text-blue-500" />
            {t('admin_lab_test_types') || 'Lab Test Types'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage laboratory test types available in the system
          </p>
        </div>
        <Button
          onClick={() => setIsAddingNew(!isAddingNew)}
          className="w-full sm:w-auto"
        >
          <Plus className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
          Add New Test Type
        </Button>
      </div>

      {/* Add New Test Type Form */}
      {isAddingNew && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Lab Test Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">English Name *</Label>
                <Input
                  id="name"
                  value={newTestType.name}
                  onChange={(e) => setNewTestType({ ...newTestType, name: e.target.value })}
                  placeholder="e.g., Complete Blood Count"
                  disabled={submitting}
                />
              </div>
              <div>
                <Label htmlFor="name_ar">Arabic Name *</Label>
                <Input
                  id="name_ar"
                  value={newTestType.name_ar}
                  onChange={(e) => setNewTestType({ ...newTestType, name_ar: e.target.value })}
                  placeholder="مثال: تعداد الدم الكامل"
                  dir="rtl"
                  disabled={submitting}
                />
              </div>
              <div>
                <Label htmlFor="name_ku">Kurdish Name</Label>
                <Input
                  id="name_ku"
                  value={newTestType.name_ku}
                  onChange={(e) => setNewTestType({ ...newTestType, name_ku: e.target.value })}
                  placeholder={t("kurdish_name_optional")}
                  disabled={submitting}
                />
              </div>
              <div>
                <Label htmlFor="code">Test Code</Label>
                <Input
                  id="code"
                  value={newTestType.code}
                  onChange={(e) => setNewTestType({ ...newTestType, code: e.target.value })}
                  placeholder={t("test_code_placeholder")}
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  value={newTestType.category}
                  onValueChange={(value) => setNewTestType({ ...newTestType, category: value })}
                  disabled={submitting}
                >
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lab">{t("lab_tests")}</SelectItem>
                    <SelectItem value="imaging">{t("imaging")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="default_duration">Default Duration (minutes)</Label>
                <Input
                  id="default_duration"
                  type="number"
                  value={newTestType.default_duration}
                  onChange={(e) => setNewTestType({ ...newTestType, default_duration: parseInt(e.target.value) || 30 })}
                  placeholder="30"
                  min="1"
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <Label htmlFor="default_fee">Default Fee</Label>
                <Input
                  id="default_fee"
                  type="number"
                  value={newTestType.default_fee}
                  onChange={(e) => setNewTestType({ ...newTestType, default_fee: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                  min="0"
                  step="0.01"
                  disabled={submitting}
                />
              </div>
              <div>
                <Label htmlFor="display_order">Display Order</Label>
                <Input
                  id="display_order"
                  type="number"
                  value={newTestType.display_order}
                  onChange={(e) => setNewTestType({ ...newTestType, display_order: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                  min="0"
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="mt-4">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={newTestType.description}
                onChange={(e) => setNewTestType({ ...newTestType, description: e.target.value })}
                placeholder={t("optional_description")}
                disabled={submitting}
              />
            </div>

            <div className="flex gap-2 mt-4">
              <Button
                onClick={handleAddTestType}
                disabled={submitting}
                className="flex-1"
              >
                {submitting ? t("adding") : t("add_test_type")}
              </Button>
              <Button
                onClick={() => {
                  setIsAddingNew(false);
                  setNewTestType({
                    name: '',
                    name_ar: '',
                    name_ku: '',
                    code: '',
                    category: 'lab',
                    description: '',
                    default_duration: 30,
                    default_fee: 0,
                    display_order: 0
                  });
                }}
                variant="outline"
                disabled={submitting}
              >
                {t("cancel")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className={`absolute top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 ${isRTL ? 'right-3' : 'left-3'}`} />
            <Input
              placeholder={t("search_test_types")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={isRTL ? 'pr-10' : 'pl-10'}
            />
          </div>
        </CardContent>
      </Card>

      {/* Lab Test Types List */}
      <Card>
        <CardHeader>
          <CardTitle>
            Lab Test Types ({filteredTestTypes.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">
              {t("loading_lab_test_types")}
            </div>
          ) : filteredTestTypes.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">{t("no_lab_test_types_found")}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTestTypes.map((test) => (
                <div
                  key={test.id}
                  className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Beaker className="w-4 h-4 text-blue-500" />
                      <span className="font-medium text-gray-900 dark:text-white">
                        {locale === 'ar' ? test.name_ar : test.name}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {locale === 'ar' ? test.name : test.name_ar}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteTestType(test.id, locale === 'ar' ? test.name_ar : test.name)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Custom Alert */}
      {alertConfig && (
        <CustomAlert
          isOpen={isOpen}
          onClose={hideAlert}
          title={alertConfig.title}
          message={alertConfig.message}
          type={alertConfig.type}
          confirmText={alertConfig.confirmText}
          onConfirm={alertConfig.onConfirm}
          showCancel={alertConfig.showCancel}
          cancelText={alertConfig.cancelText}
        />
      )}
    </div>
  );
}
