'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToastContext } from '@/contexts/ToastContext';
import { nestjsApi } from '@/lib/api/nestjs-client';
import { useAdminAuth } from '@/contexts/AdminAuthContext';

interface Transaction {
  id: string;
  type: string;
  status: string;
  amount: number;
  currency: string;
  fromAccountId?: string;
  toAccountId?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export function TransactionsTab() {
  const { adminKey, logout } = useAdminAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    limit: 50,
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const { showWarning, showError } = useToastContext();

  const loadTransactions = useCallback(async () => {
    if (!adminKey) return;

    try {
      setLoading(true);
      // Obtener tenantId del localStorage (se guarda cuando se generan credenciales)
      const storedCreds = typeof window !== 'undefined' 
        ? JSON.parse(localStorage.getItem('echeq-credentials') || '{}')
        : {};
      const tenantId = typeof window !== 'undefined' 
        ? localStorage.getItem('tenantId') || storedCreds.tenantId || ''
        : '';
      
      if (!tenantId) {
        showWarning('No se encontró tenantId. Genera credenciales primero.');
        setTransactions([]);
        setLoading(false);
        return;
      }
      
      const response = await nestjsApi.getTransactions({
        tenantId,
        type: filters.type || undefined,
        status: filters.status || undefined,
        limit: filters.limit,
        page,
        adminKey,
      });
      
      // Aceptar respuesta del BFF ({ data, total, page, limit }) o formato con success
      if ((response.success !== false && response.data) || response.data) {
        const transactionsData = Array.isArray(response.data)
          ? response.data
          : (response.data.transactions || response.data.data || []);
        setTransactions(transactionsData);
        
        // Intentar obtener información de paginación
        const totalVal = (response as { total?: number }).total ?? (response.data && typeof response.data === 'object' && 'total' in response.data ? (response.data as { total: number }).total : undefined);
        if (totalVal !== undefined) {
          setTotal(totalVal);
          setTotalPages(Math.ceil(totalVal / filters.limit));
        } else if (response.data && typeof response.data === 'object' && response.data.pagination) {
          setTotal(response.data.pagination.total || transactionsData.length);
          setTotalPages(response.data.pagination.totalPages || 1);
        } else {
          setTotal(transactionsData.length);
          setTotalPages(1);
        }
      } else {
        setTransactions([]);
        showWarning(response.message || 'No se pudieron cargar las transacciones');
      }
    } catch (error: unknown) {
      console.error('Error loading transactions:', error);
      let errorMessage = 'Error al cargar transacciones. Verifica tu conexión e intenta nuevamente.';
      
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
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [filters, page, showWarning, showError, adminKey]);

  useEffect(() => {
    if (adminKey) {
      loadTransactions();
    }
  }, [loadTransactions, adminKey]);

  // Escuchar cambios de tenant
  useEffect(() => {
    const handleTenantChange = () => {
      loadTransactions();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('tenantChanged', handleTenantChange);
      return () => window.removeEventListener('tenantChanged', handleTenantChange);
    }
  }, [loadTransactions]);

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency || 'ARS',
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      PROCESSING: 'bg-slate-100 text-slate-800',
      COMPLETED: 'bg-slate-100 text-slate-800',
      FAILED: 'bg-red-100 text-red-800',
      CANCELLED: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      ECHEQ: '📄',
      TRANSFER: '🔄',
      DIGITAL_PAYMENT: '💳',
      DEBIT: '📅',
      COUPON: '🎫',
      REFUND: '↩️',
    };
    return icons[type] || '💵';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Transacciones</h2>
        <div className="flex gap-2">
          <button
            onClick={loadTransactions}
            className="px-4 py-2 text-white bg-slate-700 rounded-lg transition-colors hover:bg-slate-800"
          >
            🔄 Actualizar
          </button>
          <button
            onClick={() => {
              logout();
              setTransactions([]);
            }}
            className="px-4 py-2 text-white bg-gray-500 rounded-lg transition-colors hover:bg-gray-600"
          >
            🚪 Cerrar Sesión
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="p-4 space-y-4 bg-gray-50 rounded-lg">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">
              Tipo
            </label>
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              <option value="ECHEQ">ECHEQ</option>
              <option value="TRANSFER">Transferencia</option>
              <option value="DIGITAL_PAYMENT">Pago Digital</option>
              <option value="DEBIT">Débito</option>
            </select>
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">
              Estado
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              <option value="PENDING">Pendiente</option>
              <option value="PROCESSING">Procesando</option>
              <option value="COMPLETED">Completado</option>
              <option value="FAILED">Fallido</option>
            </select>
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">
              Límite
            </label>
            <select
              value={filters.limit}
              onChange={(e) => setFilters({ ...filters, limit: Number(e.target.value) })}
              className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
            >
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de transacciones */}
      {loading ? (
        <div className="py-12 text-center">
          <div className="inline-block w-8 h-8 rounded-full border-b-2 border-slate-600 animate-spin"></div>
          <p className="mt-4 text-gray-600">Cargando transacciones...</p>
        </div>
      ) : transactions.length === 0 ? (
        <div className="py-12 text-center bg-gray-50 rounded-lg">
          <p className="mb-2 text-gray-600">No hay transacciones disponibles</p>
          <p className="text-sm text-gray-500">
            Las transacciones aparecerán aquí cuando se realicen operaciones
          </p>
        </div>
      ) : (
        <div className="overflow-hidden bg-white rounded-lg border border-gray-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                    Tipo
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
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="mr-2 text-xl">{getTypeIcon(transaction.type)}</span>
                        <span className="text-sm font-medium text-gray-900">
                          {transaction.type}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-gray-900">
                        {formatCurrency(transaction.amount, transaction.currency)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(
                          transaction.status,
                        )}`}
                      >
                        {transaction.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                      {new Date(transaction.createdAt).toLocaleString('es-AR')}
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap">
                      <button
                        onClick={() => setSelectedTransaction(transaction)}
                        className="font-medium text-slate-700 hover:text-slate-900"
                      >
                        Ver Detalle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center px-6 py-4 bg-gray-50 border-t border-gray-200">
              <div className="text-sm text-gray-700">
                Mostrando {((page - 1) * filters.limit) + 1} a {Math.min(page * filters.limit, total)} de {total} transacciones
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 rounded-lg border border-gray-300 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                <span className="px-3 py-1 text-sm text-gray-700">
                  Página {page} de {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 rounded-lg border border-gray-300 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal de detalle */}
      {selectedTransaction && (
        <div className="flex fixed inset-0 z-50 justify-center items-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">Detalle de Transacción</h3>
              <button
                onClick={() => setSelectedTransaction(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">ID</label>
                <p className="font-mono text-sm text-gray-900">{selectedTransaction.id}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Tipo</label>
                  <p className="text-sm text-gray-900">{selectedTransaction.type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Estado</label>
                  <p className="text-sm text-gray-900">{selectedTransaction.status}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Monto</label>
                  <p className="text-sm font-semibold text-gray-900">
                    {formatCurrency(selectedTransaction.amount, selectedTransaction.currency)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Fecha</label>
                  <p className="text-sm text-gray-900">
                    {new Date(selectedTransaction.createdAt).toLocaleString('es-AR')}
                  </p>
                </div>
              </div>
              {selectedTransaction.description && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Descripción</label>
                  <p className="text-sm text-gray-900">{selectedTransaction.description}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
