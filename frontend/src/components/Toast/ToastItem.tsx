'use client';

import { useEffect, useState, useRef } from 'react';
import { Toast, ToastType } from './Toast';

interface ToastItemProps {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  onClose: (id: string) => void;
}

export function ToastItem({ id, message, type, duration = 5000, onClose }: ToastItemProps) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => onClose(id), duration);
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [duration, onClose, id]);

  const handleClose = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    onClose(id);
  };

  return (
    <Toast
      message={message}
      type={type}
      duration={duration}
      onClose={handleClose}
    />
  );
}
