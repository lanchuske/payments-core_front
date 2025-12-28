'use client';

import { useEffect, useState, useRef } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  duration?: number;
  onClose: () => void;
}

export function Toast({ message, type, duration = 5000, onClose }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false);
  const [showCloseButton, setShowCloseButton] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Solo crear el timer si no existe uno previo
    if (!timerRef.current) {
      console.log('🕐 Creando timer para cierre automático en', duration, 'ms');
      timerRef.current = setTimeout(() => {
        console.log('🕐 Timer ejecutado - cerrando toast automáticamente');
        onClose();
      }, duration);
    }

    return () => {
      if (timerRef.current) {
        console.log('🧹 Limpiando timer del toast');
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [duration, onClose]);

  const getToastStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-500 border-green-600 text-white';
      case 'error':
        return 'bg-red-500 border-red-600 text-white';
      case 'warning':
        return 'bg-yellow-500 border-yellow-600 text-white';
      case 'info':
        return 'bg-blue-500 border-blue-600 text-white';
      default:
        return 'bg-gray-500 border-gray-600 text-white';
    }
  };

  const handleClose = () => {
    console.log('❌ Cierre manual del toast');
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    onClose();
  };

  const handleMouseEnter = () => {
    setShowCloseButton(true);
  };

  const handleMouseLeave = () => {
    setShowCloseButton(false);
  };

  return (
    <div
      className={`max-w-sm w-full transform transition-all duration-500 ease-in-out ${
        isExiting 
          ? 'translate-x-full opacity-0 scale-95' 
          : 'translate-x-0 opacity-100 scale-100'
      }`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className={`${getToastStyles()} rounded-lg shadow-xl border-l-4 p-4 backdrop-blur-sm relative`}
      >
        <span className="text-sm font-medium pr-6">{message}</span>
        {showCloseButton && (
          <button
            onClick={handleClose}
            className="absolute top-2 right-2 text-white hover:text-gray-200 transition-colors p-1 rounded-full hover:bg-white/20"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

