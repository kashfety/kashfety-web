"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Plus, Edit, Trash2, Search, Stethoscope, RefreshCw } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useLocale } from '@/components/providers/locale-provider'

interface Specialty {
    id: string
    name: string
    name_en: string
    name_ar: string
    name_ku: string
    description: string
    icon_name: string
    color_code: string
    is_active: boolean
    display_order: number
    order_index: number
    created_at: string
    updated_at: string
}

interface SpecialtyFormData {
    name: string
    name_ar: string
    name_ku: string
    description: string
    icon_name: string
    color_code: string
    is_active: boolean
    display_order: number
}

export default function SpecialtyManagement() {
    const { t, isRTL } = useLocale()
    const { toast } = useToast()

    const [specialties, setSpecialties] = useState<Specialty[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [showCreateDialog, setShowCreateDialog] = useState(false)
    const [showEditDialog, setShowEditDialog] = useState(false)
    const [showDeleteDialog, setShowDeleteDialog] = useState(false)
    const [editingSpecialty, setEditingSpecialty] = useState<Specialty | null>(null)
    const [deletingSpecialty, setDeletingSpecialty] = useState<Specialty | null>(null)
    const [formData, setFormData] = useState<SpecialtyFormData>({
        name: '',
        name_ar: '',
        name_ku: '',
        description: '',
        icon_name: 'medical_services',
        color_code: '#4CAF50',
        is_active: true,
        display_order: 0
    })

    useEffect(() => {
        fetchSpecialties()
    }, [])

    const fetchSpecialties = async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/admin-specialties', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                    'Content-Type': 'application/json'
                }
            })

            if (!response.ok) {
                throw new Error('Failed to fetch specialties')
            }

            const data = await response.json()
            setSpecialties(data.data?.specialties || data.specialties || [])
        } catch (error) {
            console.error('Error fetching specialties:', error)
            toast({
                title: t('admin_error') || 'Error',
                description: t('admin_failed_to_fetch_specialties') || 'Failed to fetch specialties',
                variant: 'destructive'
            })
        } finally {
            setLoading(false)
        }
    }

    const handleCreateSpecialty = () => {
        setFormData({
            name: '',
            name_ar: '',
            name_ku: '',
            description: '',
            icon_name: 'medical_services',
            color_code: '#4CAF50',
            is_active: true,
            display_order: 0
        })
        setShowCreateDialog(true)
    }

    const handleEditSpecialty = (specialty: Specialty) => {
        setEditingSpecialty(specialty)
        setFormData({
            name: specialty.name,
            name_ar: specialty.name_ar,
            name_ku: specialty.name_ku,
            description: specialty.description || '',
            icon_name: specialty.icon_name || 'medical_services',
            color_code: specialty.color_code || '#4CAF50',
            is_active: specialty.is_active,
            display_order: specialty.display_order || 0
        })
        setShowEditDialog(true)
    }

    const handleSaveSpecialty = async () => {
        try {
            // Validate required fields
            if (!formData.name.trim()) {
                toast({
                    title: t('admin_error') || 'Error',
                    description: t('admin_name_required') || 'Name is required',
                    variant: 'destructive'
                })
                return
            }

            if (editingSpecialty) {
                // Update existing specialty
                const response = await fetch('/api/admin-update-specialty', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        specialtyId: editingSpecialty.id,
                        ...formData
                    })
                })

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}))
                    throw new Error(errorData.error || 'Failed to update specialty')
                }

                toast({
                    title: t('admin_success') || 'Success',
                    description: t('admin_specialty_updated') || 'Specialty updated successfully'
                })

                setShowEditDialog(false)
                setEditingSpecialty(null)
            } else {
                // Create new specialty
                const response = await fetch('/api/admin-create-specialty', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                })

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}))
                    throw new Error(errorData.error || 'Failed to create specialty')
                }

                toast({
                    title: t('admin_success') || 'Success',
                    description: t('admin_specialty_created') || 'Specialty created successfully'
                })

                setShowCreateDialog(false)
            }

            fetchSpecialties()
        } catch (error: any) {
            console.error('Error saving specialty:', error)
            toast({
                title: t('admin_error') || 'Error',
                description: error.message || t('admin_failed_to_save_specialty') || 'Failed to save specialty',
                variant: 'destructive'
            })
        }
    }

    const openDeleteDialog = (specialty: Specialty) => {
        setDeletingSpecialty(specialty)
        setShowDeleteDialog(true)
    }

    const handleDeleteSpecialty = async () => {
        if (!deletingSpecialty) return

        try {
            const response = await fetch('/api/admin-delete-specialty', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ specialtyId: deletingSpecialty.id })
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.error || 'Failed to delete specialty')
            }

            toast({
                title: t('admin_success') || 'Success',
                description: t('admin_specialty_deleted') || 'Specialty deleted successfully'
            })

            setShowDeleteDialog(false)
            setDeletingSpecialty(null)
            fetchSpecialties()
        } catch (error: any) {
            console.error('Error deleting specialty:', error)
            toast({
                title: t('admin_error') || 'Error',
                description: error.message || t('admin_failed_to_delete_specialty') || 'Failed to delete specialty',
                variant: 'destructive'
            })
        }
    }

    const filteredSpecialties = specialties.filter(specialty =>
        specialty.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        specialty.name_en.toLowerCase().includes(searchTerm.toLowerCase()) ||
        specialty.name_ar?.includes(searchTerm) ||
        specialty.description?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="animate-pulse space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="h-12 bg-gray-200 rounded"></div>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={isRTL ? 'text-right' : 'text-left'}>
                    <h2 className="text-2xl font-bold">{t('admin_specialty_management') || 'Specialty Management'}</h2>
                    <p className="text-muted-foreground">{t('admin_manage_medical_specialties') || 'Manage medical specialties in the system'}</p>
                </div>
                <div className={`flex ${isRTL ? 'space-x-reverse space-x-2' : 'space-x-2'}`}>
                    <Button onClick={fetchSpecialties} variant="outline" size="icon">
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button onClick={handleCreateSpecialty}>
                        <Plus className="h-4 w-4 mr-2" />
                        {t('admin_add_specialty') || 'Add Specialty'}
                    </Button>
                </div>
            </div>

            {/* Search */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Search className="w-5 h-5" />
                        {t('admin_search') || 'Search'}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Input
                        placeholder={t('admin_search_specialties') || 'Search specialties...'}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </CardContent>
            </Card>

            {/* Specialties Table */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('admin_specialties') || 'Specialties'} ({filteredSpecialties.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('admin_name') || 'Name'}</TableHead>
                                <TableHead>{t('admin_english_name') || 'English'}</TableHead>
                                <TableHead>{t('admin_arabic_name') || 'Arabic'}</TableHead>
                                <TableHead>{t('admin_kurdish_name') || 'Kurdish'}</TableHead>
                                <TableHead>{t('admin_icon') || 'Icon'}</TableHead>
                                <TableHead>{t('admin_color') || 'Color'}</TableHead>
                                <TableHead>{t('admin_status') || 'Status'}</TableHead>
                                <TableHead>{t('admin_actions') || 'Actions'}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredSpecialties.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                                        {t('admin_no_specialties_found') || 'No specialties found'}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredSpecialties.map((specialty) => (
                                    <TableRow key={specialty.id}>
                                        <TableCell className="font-medium">{specialty.name}</TableCell>
                                        <TableCell>{specialty.name_en}</TableCell>
                                        <TableCell dir="rtl">{specialty.name_ar || '-'}</TableCell>
                                        <TableCell>{specialty.name_ku || '-'}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{specialty.icon_name}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="w-6 h-6 rounded border"
                                                    style={{ backgroundColor: specialty.color_code }}
                                                />
                                                <span className="text-xs text-muted-foreground">{specialty.color_code}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {specialty.is_active ? (
                                                <Badge variant="default">{t('admin_active') || 'Active'}</Badge>
                                            ) : (
                                                <Badge variant="secondary">{t('admin_inactive') || 'Inactive'}</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleEditSpecialty(specialty)}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => openDeleteDialog(specialty)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Create Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{t('admin_create_specialty') || 'Create New Specialty'}</DialogTitle>
                        <DialogDescription>
                            {t('admin_create_specialty_desc') || 'Add a new medical specialty to the system'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">{t('admin_name') || 'Name'} *</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="General Medicine"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name_ar">{t('admin_arabic_name') || 'Arabic Name'}</Label>
                                <Input
                                    id="name_ar"
                                    value={formData.name_ar}
                                    onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                                    placeholder="الطب العام"
                                    dir="rtl"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="name_ku">{t('admin_kurdish_name') || 'Kurdish Name'}</Label>
                                <Input
                                    id="name_ku"
                                    value={formData.name_ku}
                                    onChange={(e) => setFormData({ ...formData, name_ku: e.target.value })}
                                    placeholder="پزیشکی گشتی"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">{t('admin_description') || 'Description'}</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Brief description of the specialty..."
                                rows={3}
                            />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="icon_name">{t('admin_icon') || 'Icon'}</Label>
                                <Input
                                    id="icon_name"
                                    value={formData.icon_name}
                                    onChange={(e) => setFormData({ ...formData, icon_name: e.target.value })}
                                    placeholder="medical_services"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="color_code">{t('admin_color') || 'Color'}</Label>
                                <Input
                                    id="color_code"
                                    type="color"
                                    value={formData.color_code}
                                    onChange={(e) => setFormData({ ...formData, color_code: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="display_order">{t('admin_display_order') || 'Display Order'}</Label>
                                <Input
                                    id="display_order"
                                    type="number"
                                    value={formData.display_order}
                                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch
                                id="is_active"
                                checked={formData.is_active}
                                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                            />
                            <Label htmlFor="is_active">{t('admin_active') || 'Active'}</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                            {t('admin_cancel') || 'Cancel'}
                        </Button>
                        <Button onClick={handleSaveSpecialty}>
                            {t('admin_create') || 'Create'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{t('admin_edit_specialty') || 'Edit Specialty'}</DialogTitle>
                        <DialogDescription>
                            {t('admin_edit_specialty_desc') || 'Update specialty information'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit_name">{t('admin_name') || 'Name'} *</Label>
                            <Input
                                id="edit_name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit_name_ar">{t('admin_arabic_name') || 'Arabic Name'}</Label>
                                <Input
                                    id="edit_name_ar"
                                    value={formData.name_ar}
                                    onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                                    dir="rtl"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit_name_ku">{t('admin_kurdish_name') || 'Kurdish Name'}</Label>
                                <Input
                                    id="edit_name_ku"
                                    value={formData.name_ku}
                                    onChange={(e) => setFormData({ ...formData, name_ku: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit_description">{t('admin_description') || 'Description'}</Label>
                            <Textarea
                                id="edit_description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={3}
                            />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit_icon_name">{t('admin_icon') || 'Icon'}</Label>
                                <Input
                                    id="edit_icon_name"
                                    value={formData.icon_name}
                                    onChange={(e) => setFormData({ ...formData, icon_name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit_color_code">{t('admin_color') || 'Color'}</Label>
                                <Input
                                    id="edit_color_code"
                                    type="color"
                                    value={formData.color_code}
                                    onChange={(e) => setFormData({ ...formData, color_code: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit_display_order">{t('admin_display_order') || 'Display Order'}</Label>
                                <Input
                                    id="edit_display_order"
                                    type="number"
                                    value={formData.display_order}
                                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch
                                id="edit_is_active"
                                checked={formData.is_active}
                                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                            />
                            <Label htmlFor="edit_is_active">{t('admin_active') || 'Active'}</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                            {t('admin_cancel') || 'Cancel'}
                        </Button>
                        <Button onClick={handleSaveSpecialty}>
                            {t('admin_save') || 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-red-600 flex items-center gap-2">
                            <Trash2 className="h-5 w-5" />
                            {t('admin_delete_specialty') || 'Delete Specialty'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <p className="text-muted-foreground">
                            {t('admin_confirm_delete_specialty') || 'Are you sure you want to delete this specialty?'}
                        </p>
                        {deletingSpecialty && (
                            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                                <p className="font-semibold text-red-900 dark:text-red-100">
                                    {deletingSpecialty.name}
                                </p>
                                {deletingSpecialty.name_ar && (
                                    <p className="text-sm text-red-700 dark:text-red-300 mt-1" dir="rtl">
                                        {deletingSpecialty.name_ar}
                                    </p>
                                )}
                                {deletingSpecialty.name_ku && (
                                    <p className="text-sm text-red-700 dark:text-red-300">
                                        {deletingSpecialty.name_ku}
                                    </p>
                                )}
                            </div>
                        )}
                        <div className={`flex ${isRTL ? 'justify-start space-x-reverse space-x-2' : 'justify-end space-x-2'}`}>
                            <Button 
                                variant="outline" 
                                onClick={() => {
                                    setShowDeleteDialog(false)
                                    setDeletingSpecialty(null)
                                }}
                            >
                                {t('admin_cancel') || 'Cancel'}
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleDeleteSpecialty}
                            >
                                <Trash2 className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                                {t('admin_delete') || 'Delete'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
