"use client"

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useLocale } from '@/components/providers/locale-provider';
import {
    Upload,
    Trash2,
    Image as ImageIcon,
    Loader2,
    AlertCircle,
    CheckCircle,
    X,
    FileImage,
    Edit,
    Eye,
    EyeOff
} from 'lucide-react';
import Image from 'next/image';

interface Banner {
    id: string;
    title: string;
    description?: string;
    file_name: string;
    file_url: string;
    file_path: string;
    file_size: number;
    mime_type: string;
    display_order: number;
    is_active: boolean;
    target_audience: string;
    click_url?: string;
    click_count: number;
    view_count: number;
    start_date?: string;
    end_date?: string;
    created_at: string;
    updated_at: string;
}

export default function BannerManagement() {
    const [banners, setBanners] = useState<Banner[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [deletingBanner, setDeletingBanner] = useState<string | null>(null);
    const [bannerToDelete, setBannerToDelete] = useState<Banner | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [mounted, setMounted] = useState(false);
    
    // Form state for banner upload
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        target_audience: 'all',
        click_url: '',
        display_order: 0
    });
    
    const { toast } = useToast();
    const { t, isRTL } = useLocale();

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (mounted && typeof window !== 'undefined' && localStorage.getItem('auth_token')) {
            fetchBanners();
        } else if (mounted) {
            // Token not found, stop loading
            setLoading(false);
        }
    }, [mounted]);

    const fetchBanners = async () => {
        try {
            setLoading(true);
            
            // Ensure we're on client side and wait a bit for localStorage
            if (typeof window === 'undefined') {
                setLoading(false);
                return;
            }
            
            const token = localStorage.getItem('auth_token');
            
            if (!token) {
                console.error('No token found in localStorage');
                toast({
                    title: t('error') || 'Error',
                    description: 'Please log in to continue',
                    variant: 'destructive'
                });
                setLoading(false);
                return;
            }
            
            // Try fallback route first for Vercel compatibility
            let response;
            let result;
            
            try {
                console.log('🎨 Trying admin-banners fallback route');
                response = await fetch('/api/admin-banners', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (response.ok) {
                    result = await response.json();
                    if (result.success) {
                        console.log('✅ Fallback route worked for banners');
                        setBanners(result.data || []);
                        return;
                    }
                }
            } catch (fallbackError) {
                console.log('❌ Fallback failed, trying backend route');
            }

            // Fallback to backend route
            response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/banners`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch banners');
            }

            result = await response.json();
            setBanners(result.data || []);
        } catch (error) {
            console.error('Error fetching banners:', error);
            toast({
                title: t('error') || 'Error',
                description: t('failed_to_fetch_banners') || 'Failed to fetch banners',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!validTypes.includes(file.type)) {
            toast({
                title: t('invalid_file_type') || 'Invalid file type',
                description: t('please_select_valid_image') || 'Please select a valid image file (JPEG, PNG, WebP, or GIF)',
                variant: 'destructive'
            });
            return;
        }

        // Validate file size (10MB max)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            toast({
                title: t('file_too_large') || 'File too large',
                description: t('max_file_size_10mb') || 'Maximum file size is 10MB',
                variant: 'destructive'
            });
            return;
        }

        setSelectedFile(file);

        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreviewUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleUpload = async () => {
        console.log('🎯 Upload button clicked!', { selectedFile });
        if (!selectedFile) {
            console.log('❌ No file selected');
            return;
        }

        try {
            setUploading(true);
            console.log('📤 Starting upload...');
            const token = localStorage.getItem('auth_token');
            console.log('🔑 Token:', token ? 'Found' : 'Not found');

            if (!token) {
                toast({
                    title: t('error') || 'Error',
                    description: 'Authentication required. Please log in again.',
                    variant: 'destructive'
                });
                setUploading(false);
                return;
            }

            // Create FormData for file upload with metadata
            const uploadFormData = new FormData();
            uploadFormData.append('banner', selectedFile);
            uploadFormData.append('title', formData.title || selectedFile.name);
            uploadFormData.append('description', formData.description);
            uploadFormData.append('target_audience', formData.target_audience);
            uploadFormData.append('click_url', formData.click_url);
            uploadFormData.append('display_order', formData.display_order.toString());
            console.log('📦 FormData created with file:', selectedFile.name);

            console.log('🌐 Sending request to: /api/admin-banners');
            const response = await fetch('/api/admin-banners', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: uploadFormData
            });

            console.log('📬 Response status:', response.status);
            if (!response.ok) {
                const errorData = await response.json();
                console.error('❌ Upload failed:', errorData);
                throw new Error(errorData.error || 'Failed to upload banner');
            }

            const result = await response.json();

            toast({
                title: t('success') || 'Success',
                description: t('banner_uploaded_successfully') || 'Banner uploaded successfully',
            });

            // Reset form
            setSelectedFile(null);
            setPreviewUrl(null);
            setFormData({
                title: '',
                description: '',
                target_audience: 'all',
                click_url: '',
                display_order: 0
            });
            
            // Refresh banners list
            await fetchBanners();

        } catch (error) {
            console.error('Error uploading banner:', error);
            toast({
                title: t('error') || 'Error',
                description: t('failed_to_upload_banner') || 'Failed to upload banner',
                variant: 'destructive'
            });
        } finally {
            setUploading(false);
        }
    };

    const openDeleteModal = (banner: Banner) => {
        setBannerToDelete(banner);
        setShowDeleteModal(true);
    };

    const closeDeleteModal = () => {
        setBannerToDelete(null);
        setShowDeleteModal(false);
    };

    const confirmDelete = async () => {
        if (!bannerToDelete) return;

        try {
            setDeletingBanner(bannerToDelete.id);
            const token = localStorage.getItem('auth_token');

            if (!token) {
                toast({
                    title: t('error') || 'Error',
                    description: 'Authentication required. Please log in again.',
                    variant: 'destructive'
                });
                setDeletingBanner(null);
                return;
            }

            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/api/admin/banners/${bannerToDelete.id}`,
                {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            if (!response.ok) {
                throw new Error('Failed to delete banner');
            }

            toast({
                title: t('success') || 'Success',
                description: t('banner_deleted_successfully') || 'Banner deleted successfully',
            });

            closeDeleteModal();
            // Refresh banners list
            await fetchBanners();
        } catch (error) {
            console.error('Error deleting banner:', error);
            toast({
                title: t('error') || 'Error',
                description: t('failed_to_delete_banner') || 'Failed to delete banner',
                variant: 'destructive'
            });
        } finally {
            setDeletingBanner(null);
        }
    };

    const cancelUpload = () => {
        setSelectedFile(null);
        setPreviewUrl(null);
        setFormData({
            title: '',
            description: '',
            target_audience: 'all',
            click_url: '',
            display_order: 0
        });
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className={isRTL ? 'text-right' : 'text-left'}>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {t('banner_management') || 'Banner Management'}
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                    {t('manage_mobile_app_banners') || 'Manage banners displayed in the mobile application'}
                </p>
            </div>

            {/* Upload Section */}
            <Card>
                <CardHeader>
                    <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <Upload className="h-5 w-5" />
                        {t('upload_banner') || 'Upload Banner'}
                    </CardTitle>
                    <CardDescription className={isRTL ? 'text-right' : 'text-left'}>
                        {t('upload_banner_description') || 'Upload banners to be displayed in the mobile application. Maximum file size: 10MB'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-6">
                        {/* Banner Details Form */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="banner-title">
                                    {t('title') || 'Title'} *
                                </Label>
                                <Input
                                    id="banner-title"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder={t('enter_banner_title') || 'Enter banner title'}
                                />
                            </div>
                            
                            <div className="space-y-2">
                                <Label htmlFor="target-audience">
                                    {t('target_audience') || 'Target Audience'}
                                </Label>
                                <Select 
                                    value={formData.target_audience} 
                                    onValueChange={(value) => setFormData({ ...formData, target_audience: value })}
                                >
                                    <SelectTrigger id="target-audience">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('all_users') || 'All Users'}</SelectItem>
                                        <SelectItem value="patients">{t('patients') || 'Patients'}</SelectItem>
                                        <SelectItem value="doctors">{t('doctors') || 'Doctors'}</SelectItem>
                                        <SelectItem value="centers">{t('centers') || 'Centers'}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="description">
                                    {t('description') || 'Description'}
                                </Label>
                                <Textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder={t('enter_banner_description') || 'Enter banner description (optional)'}
                                    rows={3}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="click-url">
                                    {t('click_url') || 'Click URL (Optional)'}
                                </Label>
                                <Input
                                    id="click-url"
                                    type="url"
                                    value={formData.click_url}
                                    onChange={(e) => setFormData({ ...formData, click_url: e.target.value })}
                                    placeholder="https://example.com/target-page"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="display-order">
                                    {t('display_order') || 'Display Order'}
                                </Label>
                                <Input
                                    id="display-order"
                                    type="number"
                                    value={formData.display_order}
                                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                                    placeholder="0"
                                    min="0"
                                />
                            </div>
                        </div>

                        {/* File Input */}
                        <div>
                            <label
                                htmlFor="banner-upload"
                                className={`block w-full cursor-pointer border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center hover:border-blue-500 dark:hover:border-blue-400 transition-colors ${
                                    previewUrl ? 'hidden' : ''
                                }`}
                            >
                                <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                                    {t('click_to_upload') || 'Click to upload or drag and drop'}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-500">
                                    {t('supported_formats') || 'PNG, JPG, WebP, GIF up to 10MB'}
                                </p>
                            </label>
                            <input
                                id="banner-upload"
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/gif"
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                        </div>

                        {/* Preview */}
                        {previewUrl && selectedFile && (
                            <div className="space-y-4">
                                <div className="relative rounded-lg overflow-hidden border-2 border-gray-300 dark:border-gray-700">
                                    <img
                                        src={previewUrl}
                                        alt="Preview"
                                        className="w-full h-64 object-cover"
                                    />
                                    <button
                                        onClick={cancelUpload}
                                        className="absolute top-2 right-2 p-2 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                                <div className={`flex items-center justify-between gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                    <div className={isRTL ? 'text-right' : 'text-left'}>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                                            {selectedFile.name}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {formatFileSize(selectedFile.size)}
                                        </p>
                                    </div>
                                    <Button
                                        onClick={handleUpload}
                                        disabled={uploading}
                                        className="flex items-center gap-2"
                                    >
                                        {uploading ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                {t('uploading') || 'Uploading...'}
                                            </>
                                        ) : (
                                            <>
                                                <Upload className="h-4 w-4" />
                                                {t('upload') || 'Upload'}
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Banners List */}
            <Card>
                <CardHeader>
                    <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <FileImage className="h-5 w-5" />
                        {t('existing_banners') || 'Existing Banners'}
                    </CardTitle>
                    <CardDescription className={isRTL ? 'text-right' : 'text-left'}>
                        {`${banners.length} ${t('banner') || 'banner'}${banners.length !== 1 ? 's' : ''} ${t('uploaded') || 'uploaded'}`}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                        </div>
                    ) : banners.length === 0 ? (
                        <div className="text-center py-12">
                            <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                                {t('no_banners_uploaded') || 'No banners uploaded yet'}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {banners.map((banner) => (
                                <div
                                    key={banner.id}
                                    className="group relative rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
                                >
                                    <div className="aspect-video relative">
                                        <img
                                            src={banner.file_url}
                                            alt={banner.title}
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity flex items-center justify-center gap-2">
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => openDeleteModal(banner)}
                                                disabled={deletingBanner === banner.id}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                {deletingBanner === banner.id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <>
                                                        <Trash2 className="h-4 w-4" />
                                                        <span className="ml-1">Delete</span>
                                                    </>
                                                )}
                                            </Button>
                                            {banner.is_active ? (
                                                <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                                                    Active
                                                </div>
                                            ) : (
                                                <div className="absolute top-2 right-2 bg-gray-500 text-white text-xs px-2 py-1 rounded">
                                                    Inactive
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="p-3 bg-white dark:bg-gray-800 space-y-1">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                            {banner.title}
                                        </p>
                                        {banner.description && (
                                            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                                                {banner.description}
                                            </p>
                                        )}
                                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                            <span>{formatFileSize(banner.file_size)}</span>
                                            <span className="capitalize">{banner.target_audience}</span>
                                        </div>
                                        {banner.display_order > 0 && (
                                            <div className="text-xs text-blue-600 dark:text-blue-400">
                                                Order: {banner.display_order}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Delete Confirmation Modal */}
            <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <AlertCircle className="h-5 w-5" />
                            {t('confirm_delete') || 'Confirm Delete'}
                        </DialogTitle>
                        <DialogDescription>
                            {t('delete_banner_warning') || 'Are you sure you want to delete this banner? This action cannot be undone.'}
                        </DialogDescription>
                    </DialogHeader>
                    
                    {bannerToDelete && (
                        <div className="space-y-4">
                            <div className="rounded-lg overflow-hidden border">
                                <img
                                    src={bannerToDelete.file_url}
                                    alt={bannerToDelete.title}
                                    className="w-full h-32 object-cover"
                                />
                            </div>
                            <div className="space-y-1">
                                <p className="font-medium text-gray-900 dark:text-white">
                                    {bannerToDelete.title}
                                </p>
                                {bannerToDelete.description && (
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        {bannerToDelete.description}
                                    </p>
                                )}
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {formatFileSize(bannerToDelete.file_size)} • {bannerToDelete.target_audience}
                                </p>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={closeDeleteModal}
                            disabled={deletingBanner !== null}
                        >
                            {t('cancel') || 'Cancel'}
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={confirmDelete}
                            disabled={deletingBanner !== null}
                        >
                            {deletingBanner ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    {t('deleting') || 'Deleting...'}
                                </>
                            ) : (
                                <>
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    {t('delete') || 'Delete'}
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
