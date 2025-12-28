'use client';

import { useToastContext } from '@/contexts/ToastContext';

export function useToast() {
  const { showToast, showSuccess, showError, showWarning, showInfo } = useToastContext();

  return {
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };
}