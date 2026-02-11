'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToastContext } from '@/contexts/ToastContext';
import { nestjsApi } from '@/lib/api/nestjs-client';

interface DebitMandateForm {
  debtorAccountId: string;
  creditorAccountId: string;
  amount: string;
  currency: string;
  frequency: string;
  startDate: string;
  endDate: string;
  description: string;
  reference: string;
}

interface DebitMandate {
  id: string;
  debtorAccountId: string;
  creditorAccountId: string;
  amount: number;
  currency: string;
  frequency: string;
  startDate: string;
  endDate?: string;
  nextDebitAt?: string;
  status: string;
  debitsCount: number;
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

export function DebitsTab() {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mandates, setMandates] = useState<DebitMandate[]>([]);
  const [loadingMandates, setLoadingMandates] = useState(true);
  const [formData, setFormData] = useState<DebitMandateForm>({
    debtorAccountId: '',
    creditorAccountId: '',
    amount: '',
    currency: 'ARS',
    frequency: 'MONTHLY',
    startDate: '',
    endDate: '',
    description: '',
    reference: '',
  });
  const { showSuccess, showError } = useToastContext();

  const loadMandates = useCallback(async () => {
    try {
      setLoadingMandates(true);
      const tenantId = getTenantId();
      
      if (!tenantId) {
        setMandates([]);
        setLoadingMandates(false);
        return;
      }
      
      const response = await nestjsApi.getDebitMandates(tenantId);
      
      if (response.success && response.data) {
        const mandatesData = Array.isArray(response.data) 
          ? response.data 
          : (response.data.mandates || response.data.data || []);
        setMandates(mandatesData);
      } else {
        setMandates([]);
      }
    } catch (error: unknown) {
      console.error('Error loading mandates:', error);
      setMandates([]);
      showError('Error al cargar los mandatos de débito');
    } finally {
      setLoadingMandates(false);
    }
  }, [showError]);

  useEffect(() => {
    loadMandates();
  }, [loadMandates]);

  // Escuchar cambios de tenant
  useEffect(() => {
    const handleTenantChange = () => {
      loadMandates();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('tenantChanged', handleTenantChange);
      return () => window.removeEventListener('tenantChanged', handleTenantChange);
    }
  }, [loadMandates]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const tenantId = getTenantId();
    
    if (!tenantId) {
      showError('Tenant ID no encontrado. Selecciona un tenant primero.');
      return;
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      showError('El monto debe ser mayor a 0');
      return;
    }

    if (!formData.startDate) {
      showError('La fecha de inicio es requerida');
      return;
    }

    if (!formData.debtorAccountId || !formData.creditorAccountId) {
      showError('Las cuentas deudora y acreedora son requeridas');
      return;
    }

    // Validar que la fecha de fin sea posterior a la de inicio si ambas están presentes
    if (formData.endDate && new Date(formData.endDate) < new Date(formData.startDate)) {
      showError('La fecha de fin debe ser posterior a la fecha de inicio');
      return;
    }

    try {
      setLoading(true);

      const response = await nestjsApi.createDebitMandate({
        tenantId,
        debtorAccountId: formData.debtorAccountId,
        creditorAccountId: formData.creditorAccountId,
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        frequency: formData.frequency,
        startDate: formData.startDate,
        endDate: formData.endDate || undefined,
        description: formData.description || undefined,
        reference: formData.reference || undefined,
      });
      
      if (response.success) {
        showSuccess('Mandato de débito creado exitosamente');
        setFormData({
          debtorAccountId: '',
          creditorAccountId: '',
          amount: '',
          currency: 'ARS',
          frequency: 'MONTHLY',
          startDate: '',
          endDate: '',
          description: '',
          reference: '',
        });
        setShowForm(false);
        loadMandates(); // Recargar lista
      } else {
        showError(response.message || 'Error al crear el mandato de débito');
      }
    } catch (error: unknown) {
      console.error('Error creating debit mandate:', error);
      const ax = error as { response?: { status?: number; data?: { message?: string; error?: string; errors?: Array<{ field: string; errors: string[] }> } }; message?: string };
      const data = ax?.response?.data;
      const status = ax?.response?.status;
      let errorMessage = data?.message || data?.error || ax?.message || 'Error al crear el mandato de débito. Verifica los datos e intenta nuevamente.';
      if (data?.errors?.length) {
        const details = data.errors.map((e: { field: string; errors: string[] }) => `${e.field}: ${e.errors.join(', ')}`).join('; ');
        errorMessage = `${data.message || 'Validación fallida'}: ${details}`;
      } else if (status === 500) {
        errorMessage = (data?.message || data?.error || errorMessage) + ' (Comprueba que los IDs de cuenta deudora y acreedora existan para este tenant.)';
      }
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Débitos Automáticos</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 text-white bg-slate-700 rounded-lg transition-colors hover:bg-slate-800"
        >
          {showForm ? '✕ Cancelar' : '+ Nuevo Mandato'}
        </button>
      </div>

      {showForm && (
        <div className="p-6 bg-white rounded-lg border border-gray-200">
          <h3 className="mb-4 text-lg font-semibold text-gray-800">Nuevo Mandato de Débito</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Cuenta Deudora (ID) *
                </label>
                <input
                  type="text"
                  value={formData.debtorAccountId}
                  onChange={(e) => setFormData({ ...formData, debtorAccountId: e.target.value })}
                  placeholder="UUID de la cuenta"
                  className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Cuenta Acreedora (ID) *
                </label>
                <input
                  type="text"
                  value={formData.creditorAccountId}
                  onChange={(e) => setFormData({ ...formData, creditorAccountId: e.target.value })}
                  placeholder="UUID de la cuenta"
                  className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Monto *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
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
                  Frecuencia *
                </label>
                <select
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                  className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ONCE">Una vez</option>
                  <option value="DAILY">Diario</option>
                  <option value="WEEKLY">Semanal</option>
                  <option value="MONTHLY">Mensual</option>
                  <option value="QUARTERLY">Trimestral</option>
                  <option value="YEARLY">Anual</option>
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
                  Fecha de Fin
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Referencia
                </label>
                <input
                  type="text"
                  value={formData.reference}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                  placeholder="Número de referencia"
                  className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">
                Descripción
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripción del mandato"
                rows={3}
                className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
              />
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
                {loading ? 'Creando...' : 'Crear Mandato'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-hidden bg-white rounded-lg border border-gray-200">
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Mandatos Activos</h3>
          <button
            onClick={loadMandates}
            className="px-3 py-1 text-sm bg-gray-100 rounded-lg transition-colors hover:bg-gray-200"
          >
            🔄 Actualizar
          </button>
        </div>
        {loadingMandates ? (
          <div className="py-12 text-center">
            <div className="inline-block w-8 h-8 rounded-full border-b-2 border-slate-600 animate-spin"></div>
            <p className="mt-4 text-gray-600">Cargando mandatos...</p>
          </div>
        ) : mandates.length === 0 ? (
          <div className="py-12 text-center bg-gray-50">
            <p className="mb-2 text-gray-600">No hay mandatos disponibles</p>
            <p className="text-sm text-gray-500">
              Los mandatos de débito configurados aparecerán aquí
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                    Monto
                  </th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                    Frecuencia
                  </th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                    Ejecuciones
                  </th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                    Próximo Débito
                  </th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                    Fecha Creación
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {mandates.map((mandate) => (
                  <tr key={mandate.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900 whitespace-nowrap">
                      {new Intl.NumberFormat('es-AR', {
                        style: 'currency',
                        currency: mandate.currency || 'ARS',
                      }).format(mandate.amount)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                      {mandate.frequency === 'ONCE' ? 'Una vez' :
                       mandate.frequency === 'DAILY' ? 'Diario' :
                       mandate.frequency === 'WEEKLY' ? 'Semanal' :
                       mandate.frequency === 'MONTHLY' ? 'Mensual' :
                       mandate.frequency === 'QUARTERLY' ? 'Trimestral' :
                       mandate.frequency === 'YEARLY' ? 'Anual' : mandate.frequency}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          mandate.status === 'ACTIVE'
                            ? 'bg-slate-100 text-slate-800'
                            : mandate.status === 'PAUSED'
                            ? 'bg-yellow-100 text-yellow-800'
                            : mandate.status === 'CANCELLED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {mandate.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                      {mandate.debitsCount}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                      {mandate.nextDebitAt 
                        ? new Date(mandate.nextDebitAt).toLocaleDateString('es-AR')
                        : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                      {new Date(mandate.createdAt).toLocaleString('es-AR')}
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

