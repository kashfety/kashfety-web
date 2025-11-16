"use client"

import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { AlertCircle, FileText, Upload } from 'lucide-react';
import { useLocale } from '@/components/providers/locale-provider';

interface CertificateUploadPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToUpload: () => void;
}

export default function CertificateUploadPromptModal({
  isOpen,
  onClose,
  onNavigateToUpload
}: CertificateUploadPromptModalProps) {
  const { t } = useLocale();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3 }}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4 border border-gray-200 dark:border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icon */}
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-2">
              {t('cert_upload_required_title') || 'Certificate Upload Required'}
            </h2>

            {/* Description */}
            <div className="text-center text-gray-600 dark:text-gray-400 mb-6 space-y-2">
              <p>
                {t('cert_upload_required_desc') || 
                  'You need to upload your medical certificate and wait for admin approval before you can access your dashboard.'}
              </p>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-left">
                <div className="flex items-start space-x-2">
                  <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    <p className="font-medium mb-1">
                      {t('cert_upload_steps_title') || 'What happens next:'}
                    </p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>{t('cert_upload_step_1') || 'Upload your medical license'}</li>
                      <li>{t('cert_upload_step_2') || 'Admin will review your documents'}</li>
                      <li>{t('cert_upload_step_3') || 'You will receive an email notification'}</li>
                      <li>{t('cert_upload_step_4') || 'Access granted upon approval'}</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col space-y-3">
              <Button
                onClick={onNavigateToUpload}
                className="w-full bg-red-600 hover:bg-red-700 text-white"
              >
                <Upload className="w-4 h-4 mr-2" />
                {t('cert_upload_now_button') || 'Upload Certificate Now'}
              </Button>
              
              <Button
                onClick={onClose}
                variant="outline"
                className="w-full"
              >
                {t('cert_upload_later_button') || 'I\'ll Do It Later'}
              </Button>
            </div>

            {/* Note */}
            <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-4">
              {t('cert_upload_note') || 
                'Note: You will not be able to login until your certificate is approved by an admin.'}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
