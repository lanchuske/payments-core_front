'use client';

import { useState, useEffect } from 'react';
import { Credentials } from '@/types';
import { CredentialsTab } from './CredentialsTab';
import { TestingTab } from './TestingTab';
import { DocumentationTab } from './DocumentationTab';
import { LogsTab } from './LogsTab';
import { DataTab } from './DataTab';
import { TenantAdminTab } from './TenantAdminTab';
import { TransactionsTab } from './TransactionsTab';
import { TransfersTab } from './TransfersTab';
import { PaymentLinksTab } from './PaymentLinksTab';
import { DebitsTab } from './DebitsTab';
import { ReconciliationTab } from './ReconciliationTab';
import { ReportsTab } from './ReportsTab';
import { TenantSelector } from './TenantSelector';
import { ToastProvider, useToastContext } from '@/contexts/ToastContext';
import { ToastItem } from '@/components/Toast/ToastItem';

type TabType = 'credentials' | 'transactions' | 'transfers' | 'payment-links' | 'debits' | 'reconciliation' | 'reports' | 'testing' | 'docs' | 'logs' | 'data' | 'admin';

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
    { id: 'transactions', label: 'Transacciones', icon: '💳' },
    { id: 'transfers', label: 'Transferencias', icon: '🔄' },
    { id: 'payment-links', label: 'Payment Links', icon: '🔗' },
    { id: 'debits', label: 'Débitos Automáticos', icon: '📅' },
    { id: 'reconciliation', label: 'Conciliación', icon: '📊' },
    { id: 'reports', label: 'Reportes', icon: '📈' },
    { id: 'testing', label: 'Testing APIs', icon: '🧪' },
    { id: 'docs', label: 'Documentación', icon: '📚' },
    { id: 'logs', label: 'Logs en Tiempo Real', icon: '📋' },
    { id: 'data', label: 'Datos del Tenant', icon: '🗃️' },
    { id: 'admin', label: 'Admin Tenants', icon: '🔐' },
  ] as const;

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-blue-800">
      {/* Sidebar Navigation */}
      <div className="flex flex-col w-64 border-r backdrop-blur-sm bg-white/10 border-white/20">
        {/* Sidebar Header */}
        <div className="p-6 border-b border-white/20">
          <h1 className="mb-2 text-2xl font-bold text-white">💳 Payments Platform</h1>
          <p className="text-sm text-white/80">
            Plataforma integral de pagos y gestión financiera
          </p>
          <div className="flex items-center mt-4">
            <div className="mr-2 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
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
                  <span className="mr-3 text-lg">{tab.icon}</span>
                  <span className="font-medium">{tab.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-white/20">
          <div className="text-xs text-center text-white/60">
            <p>Base de datos conectada</p>
            <p className="mt-1">Ambiente: Development v1.0.0</p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1">
        {/* Top Header */}
        <div className="p-4 border-b backdrop-blur-sm bg-white/10 border-white/20">
          <div className="flex justify-between items-center">
            <h2 className="flex items-center text-xl font-semibold text-white">
              <span className="mr-2 text-lg">{tabs.find(tab => tab.id === activeTab)?.icon}</span>
              {tabs.find(tab => tab.id === activeTab)?.label}
            </h2>
            <div className="flex items-center space-x-4">
              <TenantSelector />
              <div className="text-sm text-white/80">
                {currentTime || '--:--:--'}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="overflow-auto flex-1 p-6">
          <div className="mx-auto max-w-6xl">
            <div className="overflow-hidden bg-white rounded-2xl shadow-2xl">
              <div className="p-6">
                {activeTab === 'credentials' && (
                  <CredentialsTab onCredentialsGenerated={setCurrentCredentials} />
                )}
                {activeTab === 'transactions' && <TransactionsTab />}
                {activeTab === 'transfers' && <TransfersTab />}
                {activeTab === 'payment-links' && <PaymentLinksTab />}
                {activeTab === 'debits' && <DebitsTab />}
                {activeTab === 'reconciliation' && <ReconciliationTab />}
                {activeTab === 'reports' && <ReportsTab />}
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
              className="transition-all duration-300 ease-in-out transform"
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
