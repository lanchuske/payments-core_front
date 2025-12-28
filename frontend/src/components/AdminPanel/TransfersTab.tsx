'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToastContext } from '@/contexts/ToastContext';
import { nestjsApi } from '@/lib/api/nestjs-client';

interface TransferForm {
  fromAccountId: string;
  toAccountId: string;
  destinationCbu: string;
  amount: string;
  currency: string;
  description: string;
  beneficiaryName: string;
  beneficiaryCuit: string;
}

interface Transfer {
  id: string;
  type: string;
  status: string;
  amount: number;
  currency: string;
  destinationCbu?: string;
  beneficiaryName?: string;
  beneficiaryCuit?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export function TransfersTab() {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loadingTransfers, setLoadingTransfers] = useState(true);
  const [formData, setFormData] = useState<TransferForm>({
    fromAccountId: '',
    toAccountId: '',
    destinationCbu: '',
    amount: '',
    currency: 'ARS',
    description: '',
    beneficiaryName: '',
    beneficiaryCuit: '',
  });
  const { showError, showSuccess } = useToastContext();

  const loadTransfers = useCallback(async () => {
    try {
      setLoadingTransfers(true);
      const storedCreds = typeof window !== 'undefined' 
        ? JSON.parse(localStorage.getItem('echeq-credentials') || '{}')
        : {};
      const tenantId = typeof window !== 'undefined' 
        ? localStorage.getItem('tenantId') || storedCreds.tenantId || ''
        : '';
      
      if (!tenantId) {
        setTransfers([]);
        setLoadingTransfers(false);
        return;
      }
      
      const response = await nestjsApi.getTransfers({
        tenantId,
        limit: 50,
      });
      
      if (response.success && response.data) {
        const transfersData = Array.isArray(response.data) 
          ? response.data 
          : (response.data.transfers || response.data.data || []);
        setTransfers(transfersData);
      } else {
        setTransfers([]);
      }
    } catch (error: unknown) {
      console.error('Error loading transfers:', error);
      setTransfers([]);
    } finally {
      setLoadingTransfers(false);
    }
  }, []);

  useEffect(() => {
    loadTransfers();
  }, [loadTransfers]);

  // Escuchar cambios de tenant
  useEffect(() => {
    const handleTenantChange = () => {
      loadTransfers();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('tenantChanged', handleTenantChange);
      return () => window.removeEventListener('tenantChanged', handleTenantChange);
    }
  }, [loadTransfers]);

  const validateCbu = (cbu: string): boolean => {
    // Validación básica de CBU (22 dígitos)
    return /^\d{22}$/.test(cbu);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar tenantId
    const storedCreds = typeof window !== 'undefined' 
      ? JSON.parse(localStorage.getItem('echeq-credentials') || '{}')
      : {};
    const tenantId = typeof window !== 'undefined' 
      ? localStorage.getItem('tenantId') || storedCreds.tenantId || ''
      : '';
    
    if (!tenantId) {
      showError('Tenant ID no encontrado. Genera credenciales primero.');
      return;
    }

    if (!validateCbu(formData.destinationCbu)) {
      showError('CBU inválido. Debe tener 22 dígitos');
      return;
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      showError('El monto debe ser mayor a 0');
      return;
    }

    if (!formData.fromAccountId) {
      showError('La cuenta de origen es requerida');
      return;
    }

    try {
      setLoading(true);

      const response = await nestjsApi.createTransfer({
        tenantId: tenantId!,
        fromAccountId: formData.fromAccountId,
        toAccountId: formData.toAccountId,
        destinationCbu: formData.destinationCbu,
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        description: formData.description,
        beneficiaryName: formData.beneficiaryName,
        beneficiaryCuit: formData.beneficiaryCuit,
      });
      
      if (response.success) {
        showSuccess('Transferencia creada exitosamente');
        setFormData({
          fromAccountId: '',
          toAccountId: '',
          destinationCbu: '',
          amount: '',
          currency: 'ARS',
          description: '',
          beneficiaryName: '',
          beneficiaryCuit: '',
        });
        setShowForm(false);
        loadTransfers(); // Recargar lista
      } else {
        showError(response.message || 'Error al crear la transferencia');
        return;
      }
    } catch (error: unknown) {
      console.error('Error creating transfer:', error);
      let errorMessage = 'Error al crear la transferencia. Verifica los datos e intenta nuevamente.';
      
      if (
        error &&
        typeof error === 'object' &&
        'response' in error &&
        error.response &&
        typeof error.response === 'object' &&
        'data' in error.response &&
        error.response.data &&
        typeof error.response.data === 'object' &&
        'message' in error.response.data &&
        typeof error.response.data.message === 'string'
      ) {
        errorMessage = error.response.data.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Transferencias Bancarias</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 text-white bg-blue-600 rounded-lg transition-colors hover:bg-blue-700"
        >
          {showForm ? '✕ Cancelar' : '+ Nueva Transferencia'}
        </button>
      </div>

      {showForm && (
        <div className="p-6 bg-white rounded-lg border border-gray-200">
          <h3 className="mb-4 text-lg font-semibold text-gray-800">Nueva Transferencia</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  CBU/CVU Destino *
                </label>
                <input
                  type="text"
                  value={formData.destinationCbu}
                  onChange={(e) => setFormData({ ...formData, destinationCbu: e.target.value })}
                  placeholder="0000000000000000000000"
                  maxLength={22}
                  className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">22 dígitos</p>
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
                  Nombre del Beneficiario
                </label>
                <input
                  type="text"
                  value={formData.beneficiaryName}
                  onChange={(e) => setFormData({ ...formData, beneficiaryName: e.target.value })}
                  placeholder="Nombre completo"
                  className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  CUIT del Beneficiario
                </label>
                <input
                  type="text"
                  value={formData.beneficiaryCuit}
                  onChange={(e) => setFormData({ ...formData, beneficiaryCuit: e.target.value })}
                  placeholder="XX-XXXXXXXX-X"
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
                placeholder="Descripción de la transferencia"
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
                className="px-4 py-2 text-white bg-blue-600 rounded-lg transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Procesando...' : 'Crear Transferencia'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-hidden bg-white rounded-lg border border-gray-200">
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Historial de Transferencias</h3>
          <button
            onClick={loadTransfers}
            className="px-3 py-1 text-sm bg-gray-100 rounded-lg transition-colors hover:bg-gray-200"
          >
            🔄 Actualizar
          </button>
        </div>
        {loadingTransfers ? (
          <div className="py-12 text-center">
            <div className="inline-block w-8 h-8 rounded-full border-b-2 border-blue-600 animate-spin"></div>
            <p className="mt-4 text-gray-600">Cargando transferencias...</p>
          </div>
        ) : transfers.length === 0 ? (
          <div className="py-12 text-center bg-gray-50">
            <p className="mb-2 text-gray-600">No hay transferencias disponibles</p>
            <p className="text-sm text-gray-500">
              Las transferencias realizadas aparecerán aquí
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                    CBU Destino
                  </th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                    Beneficiario
                  </th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                    Monto
                  </th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                    Fecha
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transfers.map((transfer) => (
                  <tr key={transfer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono text-sm text-gray-900 whitespace-nowrap">
                      {transfer.destinationCbu || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                      {transfer.beneficiaryName || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900 whitespace-nowrap">
                      {new Intl.NumberFormat('es-AR', {
                        style: 'currency',
                        currency: transfer.currency || 'ARS',
                      }).format(transfer.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          transfer.status === 'COMPLETED'
                            ? 'bg-green-100 text-green-800'
                            : transfer.status === 'FAILED'
                            ? 'bg-red-100 text-red-800'
                            : transfer.status === 'PROCESSING'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {transfer.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                      {new Date(transfer.createdAt).toLocaleString('es-AR')}
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
