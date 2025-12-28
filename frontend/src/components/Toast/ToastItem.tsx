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
    // Crear timer para cierre automático
    timerRef.current = setTimeout(() => {
      console.log('🕐 Timer ejecutado - cerrando toast automáticamente');
      onClose(id);
    }, duration);

    return () => {
      if (timerRef.current) {
        console.log('🧹 Limpiando timer del toast');
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [duration, onClose, id]);

  const handleClose = () => {
    console.log('❌ Cierre manual del toast');
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
