"use client"

import { useState, useCallback } from 'react';

interface AlertConfig {
  title: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  confirmText?: string;
  onConfirm?: () => void;
  showCancel?: boolean;
  cancelText?: string;
}

export function useCustomAlert() {
  const [alertConfig, setAlertConfig] = useState<AlertConfig | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const showAlert = useCallback((config: AlertConfig) => {
    setAlertConfig(config);
    setIsOpen(true);
  }, []);

  const hideAlert = useCallback(() => {
    setIsOpen(false);
    setTimeout(() => setAlertConfig(null), 200); // Delay to allow animation
  }, []);

  const showSuccess = useCallback((title: string, message: string, onConfirm?: () => void) => {
    showAlert({
      title,
      message,
      type: 'success',
      onConfirm
    });
  }, [showAlert]);

  const showError = useCallback((title: string, message: string, onConfirm?: () => void) => {
    showAlert({
      title,
      message,
      type: 'error',
      onConfirm
    });
  }, [showAlert]);

  const showWarning = useCallback((title: string, message: string, onConfirm?: () => void) => {
    showAlert({
      title,
      message,
      type: 'warning',
      onConfirm
    });
  }, [showAlert]);

  const showInfo = useCallback((title: string, message: string, onConfirm?: () => void) => {
    showAlert({
      title,
      message,
      type: 'info',
      onConfirm
    });
  }, [showAlert]);

  const showConfirm = useCallback((
    title: string, 
    message: string, 
    onConfirm: () => void,
    confirmText = 'Yes',
    cancelText = 'No'
  ) => {
    showAlert({
      title,
      message,
      type: 'warning',
      onConfirm,
      showCancel: true,
      confirmText,
      cancelText
    });
  }, [showAlert]);

  return {
    alertConfig,
    isOpen,
    hideAlert,
    showAlert,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showConfirm
  };
}
