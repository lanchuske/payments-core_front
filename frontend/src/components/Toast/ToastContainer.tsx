'use client';

import { useState, useEffect } from 'react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

interface ToastContainerProps {
  toasts: Toast[];
  onRemoveToast: (id: string) => void;
}

export function ToastContainer({ toasts, onRemoveToast }: ToastContainerProps) {
  useEffect(() => {
    toasts.forEach(toast => {
      const timer = setTimeout(() => {
        onRemoveToast(toast.id);
      }, toast.duration || 3000);

      return () => clearTimeout(timer);
    });
  }, [toasts, onRemoveToast]);

  const getToastStyles = (type: string) => {
    const base = 'bg-white border border-slate-200 text-slate-800 shadow-lg';
    const leftBorder: Record<string, string> = {
      success: 'border-l-4 border-l-emerald-500',
      error: 'border-l-4 border-l-red-500',
      warning: 'border-l-4 border-l-amber-500',
      info: 'border-l-4 border-l-slate-500',
    };
    return `${base} ${leftBorder[type] || leftBorder.info}`;
  };

  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-3">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            min-w-80 max-w-96 p-4 rounded-xl
            transform transition-all duration-300 ease-in-out
            ${getToastStyles(toast.type)}
            animate-slide-in-right
          `}
        >
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800">{toast.message}</p>
            </div>
            <button
              onClick={() => onRemoveToast(toast.id)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 shrink-0"
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// CSS para animación de entrada
const styles = `
  @keyframes slide-in-right {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  .animate-slide-in-right {
    animation: slide-in-right 0.3s ease-out;
  }
`;

// Inyectar estilos
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}

