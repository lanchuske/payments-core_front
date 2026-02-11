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
import { AccountsTab } from './AccountsTab';
import { ReconciliationTab } from './ReconciliationTab';
import { ReportsTab } from './ReportsTab';
import { TenantSelector } from './TenantSelector';
import { AdminLoginView } from './AdminLoginView';
import { ToastProvider, useToastContext } from '@/contexts/ToastContext';
import { AdminAuthProvider, useAdminAuth } from '@/contexts/AdminAuthContext';
import { ToastItem } from '@/components/Toast/ToastItem';

type TabType = 'credentials' | 'transactions' | 'transfers' | 'payment-links' | 'debits' | 'accounts' | 'reconciliation' | 'reports' | 'testing' | 'docs' | 'logs' | 'data' | 'admin';

const ADMIN_REQUIRED_TABS: TabType[] = ['admin', 'transactions', 'data'];

type TabItem = { id: TabType; label: string; icon: string };

const NAV_SECTIONS: { title: string; items: TabItem[] }[] = [
  {
    title: 'Configuración',
    items: [
      { id: 'credentials', label: 'Credenciales API', icon: '🔑' },
      { id: 'admin', label: 'Admin Tenants', icon: '🔐' },
    ],
  },
  {
    title: 'Operaciones',
    items: [
      { id: 'accounts', label: 'Cuentas', icon: '🏦' },
      { id: 'transactions', label: 'Transacciones', icon: '💳' },
      { id: 'transfers', label: 'Transferencias', icon: '🔄' },
      { id: 'payment-links', label: 'Payment Links', icon: '🔗' },
      { id: 'debits', label: 'Débitos Automáticos', icon: '📅' },
    ],
  },
  {
    title: 'Contabilidad y reportes',
    items: [
      { id: 'reconciliation', label: 'Conciliación', icon: '📊' },
      { id: 'reports', label: 'Reportes', icon: '📈' },
    ],
  },
  {
    title: 'Datos y auditoría',
    items: [
      { id: 'data', label: 'Datos del Tenant', icon: '🗃️' },
      { id: 'logs', label: 'Logs en Tiempo Real', icon: '📋' },
    ],
  },
  {
    title: 'Desarrollo',
    items: [
      { id: 'testing', label: 'Testing APIs', icon: '🧪' },
      { id: 'docs', label: 'Documentación', icon: '📚' },
    ],
  },
];

function getActiveTabInfo(activeTab: TabType): TabItem | undefined {
  for (const section of NAV_SECTIONS) {
    const found = section.items.find((item) => item.id === activeTab);
    if (found) return found;
  }
  return undefined;
}

// Componente interno que usa el contexto
function AdminPanelContent() {
  const [activeTab, setActiveTab] = useState<TabType>('credentials');
  const [currentCredentials, setCurrentCredentials] =
    useState<Credentials | null>(null);
  const [currentTime, setCurrentTime] = useState<string>('');
  const { toasts, removeToast } = useToastContext();
  const { isAuthenticated: isAdminAuthenticated } = useAdminAuth();
  const needsAdminAuth = ADMIN_REQUIRED_TABS.includes(activeTab);
  const showAdminLogin = needsAdminAuth && !isAdminAuthenticated;

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

  const activeTabInfo = getActiveTabInfo(activeTab);

  return (
    <div className="flex min-h-screen bg-slate-100">
      {/* Sidebar Navigation */}
      <div className="flex flex-col w-64 shrink-0 border-r border-slate-200 bg-slate-800">
        {/* Sidebar Header */}
        <div className="p-5 border-b border-slate-700">
          <h1 className="mb-1 text-lg font-semibold text-white">Payments Platform</h1>
          <p className="text-xs text-slate-400">
            Pagos y gestión financiera
          </p>
          <div className="flex items-center mt-3 gap-1.5">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-xs text-slate-500">Online</span>
          </div>
        </div>

        {/* Sidebar Navigation - Agrupado por secciones */}
        <nav className="flex-1 overflow-y-auto p-3">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title} className="mb-5">
              <p className="mb-1.5 px-2 text-[11px] font-medium uppercase tracking-wider text-slate-500">
                {section.title}
              </p>
              <ul className="space-y-0.5">
                {section.items.map((tab) => (
                  <li key={tab.id}>
                    <button
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center px-3 py-2 rounded-md text-left transition-colors ${
                        activeTab === tab.id
                          ? 'bg-slate-700 text-white'
                          : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                      }`}
                    >
                      <span className="mr-2.5 text-[15px] opacity-90">{tab.icon}</span>
                      <span className="text-sm font-medium">{tab.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-700">
          <div className="text-[11px] text-center text-slate-500">
            <p>Development v1.0.0</p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1">
        {/* Top Header */}
        <div className="p-4 border-b border-slate-200 bg-white">
          <div className="flex justify-between items-center">
            <h2 className="flex items-center text-lg font-semibold text-slate-800">
              <span className="mr-2 text-slate-500">{activeTabInfo?.icon}</span>
              {activeTabInfo?.label}
            </h2>
            <div className="flex items-center gap-4">
              <TenantSelector />
              <div className="text-sm text-slate-500 tabular-nums">
                {currentTime || '--:--:--'}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="overflow-auto flex-1 p-6 bg-slate-100">
          <div className="mx-auto max-w-6xl">
            <div className="overflow-hidden bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="p-6">
                {showAdminLogin ? (
                  <AdminLoginView
                    title="Acceso de administrador"
                    description="Ingresá la clave de administrador una sola vez. La sesión se mantendrá mientras tengas el panel abierto."
                  />
                ) : (
                  <>
                    {activeTab === 'credentials' && (
                      <CredentialsTab onCredentialsGenerated={setCurrentCredentials} />
                    )}
                    {activeTab === 'transactions' && <TransactionsTab />}
                    {activeTab === 'transfers' && <TransfersTab />}
                    {activeTab === 'payment-links' && <PaymentLinksTab />}
                    {activeTab === 'debits' && <DebitsTab />}
                    {activeTab === 'accounts' && <AccountsTab />}
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
                  </>
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

// Componente principal que envuelve con ToastProvider y AdminAuthProvider
export default function AdminPanel() {
  return (
    <ToastProvider>
      <AdminAuthProvider>
        <AdminPanelContent />
      </AdminAuthProvider>
    </ToastProvider>
  );
}
