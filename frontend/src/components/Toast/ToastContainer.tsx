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
    switch (type) {
      case 'success':
        return 'bg-gradient-to-r from-green-500 to-green-600 text-white';
      case 'error':
        return 'bg-gradient-to-r from-red-500 to-red-600 text-white';
      case 'warning':
        return 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white';
      case 'info':
        return 'bg-gradient-to-r from-blue-500 to-blue-600 text-white';
      default:
        return 'bg-gradient-to-r from-gray-500 to-gray-600 text-white';
    }
  };

  const getToastIcon = (type: string) => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '📢';
    }
  };

  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-3">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            min-w-80 max-w-96 p-4 rounded-lg shadow-lg
            transform transition-all duration-300 ease-in-out
            ${getToastStyles(toast.type)}
            animate-slide-in-right
          `}
        >
          <div className="flex items-center gap-3">
            <span className="text-xl flex-shrink-0">
              {getToastIcon(toast.type)}
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium">{toast.message}</p>
            </div>
            <button
              onClick={() => onRemoveToast(toast.id)}
              className="text-white hover:text-gray-200 text-xl leading-none ml-2"
            >
              ×
            </button>
          </div>
          
          {/* Barra de progreso */}
          <div className="mt-2 h-1 bg-white bg-opacity-30 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white bg-opacity-60 rounded-full animate-progress"
              style={{
                animationDuration: `${toast.duration || 3000}ms`
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// CSS personalizado para las animaciones
const styles = `
  @keyframes slide-in-right {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes progress {
    from { width: 100%; }
    to { width: 0%; }
  }

  .animate-slide-in-right {
    animation: slide-in-right 0.3s ease-out;
  }

  .animate-progress {
    animation: progress linear;
  }
`;

// Inyectar estilos
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}

