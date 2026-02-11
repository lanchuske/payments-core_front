'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToastContext } from '@/contexts/ToastContext';
import { nestjsApi } from '@/lib/api/nestjs-client';

interface ReconciliationForm {
  accountId: string;
  startDate: string;
  endDate: string;
  currency: string;
  initialBalance: string;
}

interface Reconciliation {
  id: string;
  accountId: string;
  type: string;
  startDate: string;
  endDate: string;
  status: string;
  matchedCount: number;
  unmatchedBankCount: number;
  unmatchedSystemCount: number;
  discrepancyAmount: number;
  createdAt: string;
}

/**
 * Helper para obtener el tenantId del localStorage de forma consistente
 */
const getTenantId = (): string => {
  if (typeof window === 'undefined') return '';
  
  // Intentar múltiples fuentes
  const tenantId = localStorage.getItem('tenantId');
  if (tenantId) return tenantId;
  
  const currentTenantId = localStorage.getItem('current_tenant_id');
  if (currentTenantId) return currentTenantId;
  
  // Intentar desde credenciales guardadas
  try {
    const storedCreds = localStorage.getItem('echeq-credentials');
    if (storedCreds) {
      const creds = JSON.parse(storedCreds);
      if (creds.tenantId) return creds.tenantId;
    }
  } catch {
    // Ignorar errores de parsing
  }
  
  return '';
};

export function ReconciliationTab() {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [reconciliations, setReconciliations] = useState<Reconciliation[]>([]);
  const [loadingReconciliations, setLoadingReconciliations] = useState(true);
  const [formData, setFormData] = useState<ReconciliationForm>({
    accountId: '',
    startDate: '',
    endDate: '',
    currency: 'ARS',
    initialBalance: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentReconciliationId, setCurrentReconciliationId] = useState<string | null>(null);
  const { showSuccess, showError, showWarning } = useToastContext();

  const loadReconciliations = useCallback(async () => {
    try {
      setLoadingReconciliations(true);
      const tenantId = getTenantId();
      
      if (!tenantId) {
        setReconciliations([]);
        setLoadingReconciliations(false);
        return;
      }
      
      const response = await nestjsApi.getReconciliations(tenantId);
      
      if (response.success && response.data) {
        const reconciliationsData = Array.isArray(response.data) 
          ? response.data 
          : (response.data.reconciliations || response.data.data || []);
        setReconciliations(reconciliationsData);
      } else {
        setReconciliations([]);
      }
    } catch (error: unknown) {
      console.error('Error loading reconciliations:', error);
      setReconciliations([]);
      showError('Error al cargar las conciliaciones');
    } finally {
      setLoadingReconciliations(false);
    }
  }, [showError]);

  useEffect(() => {
    loadReconciliations();
  }, [loadReconciliations]);

  // Escuchar cambios de tenant
  useEffect(() => {
    const handleTenantChange = () => {
      loadReconciliations();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('tenantChanged', handleTenantChange);
      return () => window.removeEventListener('tenantChanged', handleTenantChange);
    }
  }, [loadReconciliations]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.startDate || !formData.endDate) {
      showError('Las fechas de inicio y fin son requeridas');
      return;
    }

    if (new Date(formData.startDate) > new Date(formData.endDate)) {
      showError('La fecha de inicio debe ser anterior a la fecha de fin');
      return;
    }

    if (!formData.accountId.trim()) {
      showError('La cuenta (ID) es requerida');
      return;
    }

    try {
      setLoading(true);
      const tenantId = getTenantId();
      
      if (!tenantId) {
        showError('Tenant ID no encontrado. Selecciona un tenant primero.');
        return;
      }

      const response = await nestjsApi.createReconciliation({
        tenantId,
        accountId: formData.accountId,
        startDate: formData.startDate,
        endDate: formData.endDate,
        currency: formData.currency,
        initialBalance: formData.initialBalance ? parseFloat(formData.initialBalance) : undefined,
        type: 'BANK_STATEMENT',
      });
      
      if (response.success && response.data) {
        // Guardar el ID de la conciliación creada para el upload
        const reconciliationId = response.data.id || response.data.data?.id;
        if (reconciliationId) {
          setCurrentReconciliationId(reconciliationId);
          showSuccess('Proceso de conciliación iniciado. Ahora puedes subir el extracto bancario.');
        } else {
          showSuccess('Proceso de conciliación iniciado');
        }
        loadReconciliations(); // Recargar lista
        
        // Limpiar formulario
        setFormData({
          accountId: '',
          startDate: '',
          endDate: '',
          currency: 'ARS',
          initialBalance: '',
        });
        setShowForm(false);
      } else {
        showError(response.message || 'Error al iniciar la conciliación');
      }
    } catch (error: unknown) {
      console.error('Error creating reconciliation:', error);
      const errorMessage = (error as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message 
        || (error as { message?: string })?.message 
        || 'Error al iniciar la conciliación. Verifica los datos e intenta nuevamente.';
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      showError('Selecciona un archivo primero');
      return;
    }

    if (!currentReconciliationId) {
      showWarning('Primero crea un proceso de conciliación, luego sube el extracto');
      return;
    }

    // Validar tamaño del archivo (máximo 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (selectedFile.size > maxSize) {
      showError('El archivo es demasiado grande. El tamaño máximo es 10MB.');
      return;
    }

    try {
      setUploading(true);
      // Determinar el formato del archivo por extensión
      const fileName = selectedFile.name.toLowerCase();
      const format = fileName.endsWith('.csv') ? 'CSV' : 'TXT';
      
      const response = await nestjsApi.uploadBankStatement(
        currentReconciliationId,
        selectedFile,
        format,
      );
      
      if (response.success) {
        showSuccess('Extracto bancario cargado y procesado exitosamente');
        setSelectedFile(null);
        loadReconciliations(); // Recargar lista
      } else {
        showError(response.message || 'Error al cargar el extracto');
      }
    } catch (error: unknown) {
      console.error('Error uploading file:', error);
      const errorMessage = (error as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message 
        || (error as { message?: string })?.message 
        || 'Error al cargar el extracto. Verifica el formato del archivo e intenta nuevamente.';
      showError(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Conciliación Bancaria</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 text-white bg-slate-700 rounded-lg transition-colors hover:bg-slate-800"
        >
          {showForm ? '✕ Cancelar' : '+ Nueva Conciliación'}
        </button>
      </div>

      {showForm && (
        <div className="p-6 bg-white rounded-lg border border-gray-200">
          <h3 className="mb-4 text-lg font-semibold text-gray-800">Nuevo Proceso de Conciliación</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Cuenta (ID) *
                </label>
                <input
                  type="text"
                  value={formData.accountId}
                  onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                  placeholder="UUID de la cuenta"
                  className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Moneda *
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ARS">ARS - Peso Argentino</option>
                  <option value="USD">USD - Dólar</option>
                </select>
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Fecha de Inicio *
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Fecha de Fin *
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Saldo Inicial
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.initialBalance}
                  onChange={(e) => setFormData({ ...formData, initialBalance: e.target.value })}
                  placeholder="0.00"
                  className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 transition-colors hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-white bg-slate-700 rounded-lg transition-colors hover:bg-slate-800 disabled:opacity-50"
              >
                {loading ? 'Iniciando...' : 'Iniciar Conciliación'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Upload de Extracto Bancario */}
      <div className="p-6 bg-white rounded-lg border border-gray-200">
        <h3 className="mb-4 text-lg font-semibold text-gray-800">Cargar Extracto Bancario</h3>
        <div className="space-y-4">
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">
              Seleccionar archivo (CSV, TXT)
            </label>
            <input
              type="file"
              accept=".csv,.txt"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Formatos soportados: CSV, TXT. El archivo debe contener movimientos bancarios. Tamaño máximo: 10MB.
            </p>
            {selectedFile && (
              <div className="p-2 mt-2 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-700">
                  <strong>Archivo seleccionado:</strong> {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                </p>
              </div>
            )}
          </div>
          {currentReconciliationId && (
            <div className="p-2 mb-2 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-sm text-slate-800">
                <strong>Conciliación activa:</strong> {currentReconciliationId.substring(0, 8)}...
              </p>
            </div>
          )}
          <button
            onClick={handleFileUpload}
            disabled={!selectedFile || uploading || !currentReconciliationId}
            className="px-4 py-2 text-white bg-slate-700 rounded-lg transition-colors hover:bg-slate-800 disabled:opacity-50"
          >
            {uploading ? 'Subiendo...' : 'Subir Extracto'}
          </button>
          {!currentReconciliationId && (
            <p className="mt-1 text-xs text-gray-500">
              Primero crea un proceso de conciliación para poder subir el extracto
            </p>
          )}
        </div>
      </div>

      <div className="overflow-hidden bg-white rounded-lg border border-gray-200">
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Procesos de Conciliación</h3>
          <button
            onClick={loadReconciliations}
            className="px-3 py-1 text-sm bg-gray-100 rounded-lg transition-colors hover:bg-gray-200"
          >
            🔄 Actualizar
          </button>
        </div>
        {loadingReconciliations ? (
          <div className="py-12 text-center">
            <div className="inline-block w-8 h-8 rounded-full border-b-2 border-slate-600 animate-spin"></div>
            <p className="mt-4 text-gray-600">Cargando conciliaciones...</p>
          </div>
        ) : reconciliations.length === 0 ? (
          <div className="py-12 text-center bg-gray-50">
            <p className="mb-2 text-gray-600">No hay procesos de conciliación disponibles</p>
            <p className="text-sm text-gray-500">
              Los procesos de conciliación aparecerán aquí
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                    Período
                  </th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                    Matches
                  </th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                    Discrepancias
                  </th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                    Diferencia
                  </th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                    Fecha
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reconciliations.map((reconciliation) => (
                  <tr key={reconciliation.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                      {new Date(reconciliation.startDate).toLocaleDateString('es-AR')} - {new Date(reconciliation.endDate).toLocaleDateString('es-AR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          reconciliation.status === 'COMPLETED'
                            ? 'bg-slate-100 text-slate-800'
                            : reconciliation.status === 'FAILED'
                            ? 'bg-red-100 text-red-800'
                            : reconciliation.status === 'PROCESSING'
                            ? 'bg-slate-100 text-slate-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {reconciliation.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                      {reconciliation.matchedCount} coincidencias
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                      Banco: {reconciliation.unmatchedBankCount} | Sistema: {reconciliation.unmatchedSystemCount}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900 whitespace-nowrap">
                      {new Intl.NumberFormat('es-AR', {
                        style: 'currency',
                        currency: 'ARS',
                      }).format(reconciliation.discrepancyAmount)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                      {new Date(reconciliation.createdAt).toLocaleString('es-AR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

