'use client';

import { useState, useEffect, useMemo } from 'react';
import { Credentials } from '@/types';
import { CredentialsTab } from './CredentialsTab';
import { TestingTab } from './TestingTab';
import { DocumentationTab } from './DocumentationTab';
import { LogsTab } from './LogsTab';
import { DataTab } from './DataTab';
import { TenantAdminTab } from './TenantAdminTab';
import { ToastProvider, useToastContext } from '@/contexts/ToastContext';
import { ToastItem } from '@/components/Toast/ToastItem';

type TabType = 'credentials' | 'testing' | 'docs' | 'logs' | 'data' | 'admin';

// Componente interno que usa el contexto
function AdminPanelContent() {
  const [activeTab, setActiveTab] = useState<TabType>('credentials');
  const [currentCredentials, setCurrentCredentials] =
    useState<Credentials | null>(null);
  const [currentTime, setCurrentTime] = useState<string>('');
  const { toasts, removeToast } = useToastContext();

  // Actualizar el tiempo solo en el cliente para evitar errores de hidratación
  useEffect(() => {
    // Verificar que estamos en el cliente
    if (typeof window === 'undefined') return;
    
    const updateTime = () => {
      setCurrentTime(new Date().toLocaleString('es-AR'));
    };
    
    updateTime(); // Establecer tiempo inicial
    const interval = setInterval(updateTime, 1000); // Actualizar cada segundo
    
    return () => clearInterval(interval);
  }, []);

  const tabs = [
    { id: 'credentials', label: 'Credenciales API', icon: '🔑' },
    { id: 'testing', label: 'Testing APIs', icon: '🧪' },
    { id: 'docs', label: 'Documentación', icon: '📚' },
    { id: 'logs', label: 'Logs en Tiempo Real', icon: '📊' },
    { id: 'data', label: 'Datos del Tenant', icon: '🗃️' },
    { id: 'admin', label: 'Admin Tenants', icon: '🔐' },
  ] as const;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-blue-800 flex">
      {/* Sidebar Navigation */}
      <div className="w-64 bg-white/10 backdrop-blur-sm border-r border-white/20 flex flex-col">
        {/* Sidebar Header */}
        <div className="p-6 border-b border-white/20">
          <h1 className="text-2xl font-bold text-white mb-2">🚀 ECHEQ Sandbox</h1>
          <p className="text-sm text-white/80">
            API de simulación para operaciones ECHEQ según especificación COELSA
          </p>
          <div className="mt-4 flex items-center">
            <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
            <span className="text-xs text-white/70">Servicio Online</span>
          </div>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {tabs.map(tab => (
              <li key={tab.id}>
                <button
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`w-full flex items-center px-4 py-3 rounded-lg text-left transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-white/20 text-white shadow-lg'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className="text-lg mr-3">{tab.icon}</span>
                  <span className="font-medium">{tab.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-white/20">
          <div className="text-xs text-white/60 text-center">
            <p>Base de datos conectada</p>
            <p className="mt-1">Ambiente: Development v1.0.0</p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <div className="bg-white/10 backdrop-blur-sm border-b border-white/20 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white flex items-center">
              <span className="text-lg mr-2">{tabs.find(tab => tab.id === activeTab)?.icon}</span>
              {tabs.find(tab => tab.id === activeTab)?.label}
            </h2>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-white/80">
                {currentTime || '--:--:--'}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6 overflow-auto">
          <div className="max-w-6xl mx-auto">
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
              <div className="p-6">
                {activeTab === 'credentials' && (
                  <CredentialsTab onCredentialsGenerated={setCurrentCredentials} />
                )}
                {activeTab === 'testing' && (
                  <TestingTab
                    credentials={currentCredentials}
                    onCredentialsLoaded={setCurrentCredentials}
                  />
                )}
                  {activeTab === 'docs' && (
                    <DocumentationTab credentials={currentCredentials} />
                  )}
                  {activeTab === 'logs' && <LogsTab />}
                  {activeTab === 'data' && <DataTab />}
                  {activeTab === 'admin' && (
                    <TenantAdminTab onCredentialsGenerated={setCurrentCredentials} />
                  )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
        {/* Toast Container - Renderizado una sola vez */}
        <div className="fixed top-4 right-4 z-50 space-y-3">
          {toasts.map((toast, index) => (
            <div
              key={toast.id}
              className="transform transition-all duration-300 ease-in-out"
              style={{
                transform: `translateY(${index * 8}px)`,
                zIndex: 50 + index,
              }}
            >
              <ToastItem
                id={toast.id}
                message={toast.message}
                type={toast.type}
                duration={toast.duration || 5000}
                onClose={removeToast}
              />
            </div>
          ))}
        </div>
    </div>
  );
}

// Componente principal que envuelve con ToastProvider
export default function AdminPanel() {
  return (
    <ToastProvider>
      <AdminPanelContent />
    </ToastProvider>
  );
}
