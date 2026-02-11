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
    if (!timerRef.current) {
      timerRef.current = setTimeout(() => onClose(), duration);
    }
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [duration, onClose]);

  const getToastStyles = () => {
    const base = 'bg-white border border-slate-200 text-slate-800 shadow-lg';
    const leftBorder = {
      success: 'border-l-4 border-l-emerald-500',
      error: 'border-l-4 border-l-red-500',
      warning: 'border-l-4 border-l-amber-500',
      info: 'border-l-4 border-l-slate-500',
    };
    return `${base} ${leftBorder[type] || leftBorder.info}`;
  };

  const handleClose = () => {
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
        className={`${getToastStyles()} rounded-xl p-4 relative min-w-[280px] max-w-sm`}
      >
        <span className="text-sm font-medium text-slate-800 pr-8 block">{message}</span>
        {showCloseButton && (
          <button
            onClick={handleClose}
            className="absolute top-2 right-2 text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-md hover:bg-slate-100"
            aria-label="Cerrar"
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

