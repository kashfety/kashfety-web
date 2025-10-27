"use client";

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, ExternalLink, Calendar, Clock, MapPin } from 'lucide-react';
import { useLocale } from '@/components/providers/locale-provider';

interface LabResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: {
    id: string;
    booking_date: string;
    booking_time: string;
    status: string;
    result_file_url?: string | null;
    center?: { name: string; address: string };
    type?: { name: string; category: string };
    notes?: string;
  } | null;
}

export default function LabResultModal({ isOpen, onClose, booking }: LabResultModalProps) {
  const { t, locale } = useLocale();
  const [loading, setLoading] = useState(false);

  if (!booking) return null;

  const descriptionId = 'lab-result-desc';

  const getStatusColor = (status: string) => {
    switch ((status || '').toLowerCase()) {
      case 'confirmed': return 'bg-green-100 text-green-800 border-green-200';
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      case 'no_show': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleDownload = async () => {
    try {
      // Get secure download URL from backend
      const response = await fetch(`/api/center-dashboard/download-lab-result/${booking.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to get download link');
      }

      const result = await response.json();
      
      if (result.success && result.download_url) {
        // Create download link with signed URL
        const link = document.createElement('a');
        link.href = result.download_url;
        link.download = `lab-result-${booking.type?.name || 'test'}-${booking.booking_date}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        throw new Error(result.error || 'Failed to get download link');
      }
    } catch (error) {
      console.error('Download error:', error);
      // Fallback to direct URL if available
      if (booking.result_file_url) {
        const link = document.createElement('a');
        link.href = booking.result_file_url;
        link.download = `lab-result-${booking.type?.name || 'test'}-${booking.booking_date}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  };

  const handleView = async () => {
    try {
      // Get secure download URL for viewing
      const response = await fetch(`/api/center-dashboard/download-lab-result/${booking.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to get view link');
      }

      const result = await response.json();
      
      if (result.success && result.download_url) {
        window.open(result.download_url, '_blank');
      } else {
        throw new Error(result.error || 'Failed to get view link');
      }
    } catch (error) {
      console.error('View error:', error);
      // Fallback to direct URL if available
      if (booking.result_file_url) {
        window.open(booking.result_file_url, '_blank');
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl p-0 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600" />
            {t('lab_result_title') || 'Lab Test Result'}
          </DialogTitle>
          <DialogDescription id={descriptionId} className="text-sm text-slate-500 dark:text-slate-400">
            {booking.result_file_url 
              ? (t('lab_result_available') || 'Your lab test results are available for viewing')
              : (t('lab_result_pending') || 'Lab test results are still being processed')
            }
          </DialogDescription>
        </DialogHeader>

        {/* Body */}
        <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
          {/* Test Information */}
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 mb-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {booking.type?.name}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={`${getStatusColor(booking.status)} border text-xs`}>
                    {(booking.status || '').toUpperCase()}
                  </Badge>
                  <span className="text-sm text-emerald-600 font-medium">
                    {booking.type?.category === 'imaging' ? (t('imaging') || 'Imaging') : (t('lab') || 'Lab')}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <div>
                    <div className="font-medium">
                      {new Date(booking.booking_date).toLocaleDateString(locale || 'en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </div>
                    <div className="text-xs text-slate-500">{t('test_date') || 'Test Date'}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  <div>
                    <div className="font-medium">
                      {(() => { 
                        try { 
                          const [h,m] = (booking.booking_time||'').split(':'); 
                          const t2 = new Date(); 
                          t2.setHours(parseInt(h), parseInt(m), 0); 
                          return t2.toLocaleTimeString(locale || 'en-US', { 
                            hour: 'numeric', 
                            minute: '2-digit', 
                            hour12: locale !== 'ar' 
                          }); 
                        } catch { 
                          return booking.booking_time; 
                        } 
                      })()}
                    </div>
                    <div className="text-xs text-slate-500">{t('test_time') || 'Test Time'}</div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3 text-slate-600 dark:text-slate-300">
                  <MapPin className="w-4 h-4 text-emerald-600 mt-0.5" />
                  <div>
                    <div className="font-medium">{booking.center?.name}</div>
                    <div className="text-xs text-slate-500">{booking.center?.address}</div>
                  </div>
                </div>
              </div>
            </div>

            {booking.notes && (
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
                  {t('notes') || 'Notes'}
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700 p-3 rounded-lg">
                  {booking.notes}
                </p>
              </div>
            )}
          </div>

          {/* Results Section */}
          <div>
            <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
              {t('test_results') || 'Test Results'}
            </h4>
            
            {booking.result_file_url ? (
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <FileText className="w-6 h-6 text-emerald-600" />
                  <div>
                    <div className="font-medium text-emerald-900 dark:text-emerald-100">
                      {t('results_available') || 'Results Available'}
                    </div>
                    <div className="text-sm text-emerald-700 dark:text-emerald-300">
                      {t('results_pdf_ready') || 'Your test results are ready to view'}
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    onClick={handleView}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    size="sm"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    {t('view_results') || 'View Results'}
                  </Button>
                  <Button 
                    onClick={handleDownload}
                    variant="outline"
                    size="sm"
                    className="border-emerald-600 text-emerald-600 hover:bg-emerald-50"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {t('download_results') || 'Download PDF'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Clock className="w-6 h-6 text-amber-600" />
                  <div>
                    <div className="font-medium text-amber-900 dark:text-amber-100">
                      {t('results_pending') || 'Results Pending'}
                    </div>
                    <div className="text-sm text-amber-700 dark:text-amber-300">
                      {t('results_processing') || 'Your test results are being processed and will be available soon'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="px-6 py-4 bg-slate-50 dark:bg-slate-800">
          <Button 
            onClick={onClose} 
            variant="outline"
            className="w-full sm:w-auto"
          >
            {t('close') || 'Close'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
