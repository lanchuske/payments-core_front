'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToastContext } from '@/contexts/ToastContext';
import { nestjsApi } from '@/lib/api/nestjs-client';

interface ReportFilters {
  startDate: string;
  endDate: string;
  accountId: string;
  format: 'json' | 'csv' | 'pdf';
}

interface AnalyticsMetrics {
  transactions: {
    total: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
  };
  volume: {
    total: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
    average: number;
  };
  performance: {
    successRate: number;
    failureRate: number;
    averageProcessingTime: number;
  };
  trends: {
    dailyGrowth: number;
    weeklyGrowth: number;
  };
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

export function ReportsTab() {
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<ReportFilters>({
    startDate: '',
    endDate: '',
    accountId: '',
    format: 'json',
  });
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { showSuccess, showError, showWarning } = useToastContext();

  const loadMetrics = useCallback(async (silent: boolean = false) => {
    try {
      setLoading(true);
      const tenantId = getTenantId();
      
      if (!tenantId) {
        if (!silent) {
          showWarning('Tenant ID no encontrado. Selecciona un tenant primero.');
        }
        return;
      }

      // Cargar métricas de analytics
      const analyticsResponse = await nestjsApi.getAnalytics(tenantId);
      
      // Procesar respuesta de analytics
      if (analyticsResponse.success && analyticsResponse.data) {
        setMetrics(analyticsResponse.data);
        if (!silent) {
          showSuccess('Métricas cargadas');
        }
      } else {
        if (!silent) {
          showWarning(analyticsResponse.message || 'No se pudieron cargar las métricas');
        }
      }
    } catch (error: unknown) {
      console.error('Error loading metrics:', error);
      if (!silent) {
        const errorMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message 
          || 'Error al cargar métricas';
        showError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }, [showSuccess, showError, showWarning]);

  // Cargar métricas al montar el componente
  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  // Auto-refresh cada 30 segundos si está habilitado
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      loadMetrics(true); // true = silent (sin toast)
    }, 30000); // 30 segundos

    return () => clearInterval(interval);
  }, [autoRefresh, loadMetrics]);

  // Escuchar cambios de tenant
  useEffect(() => {
    const handleTenantChange = () => {
      loadMetrics();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('tenantChanged', handleTenantChange);
      return () => window.removeEventListener('tenantChanged', handleTenantChange);
    }
  }, [loadMetrics]);

  const generateReport = async () => {
    if (!filters.startDate || !filters.endDate) {
      showError('Las fechas de inicio y fin son requeridas');
      return;
    }

    try {
      setLoading(true);
      const tenantId = getTenantId();
      
      if (!tenantId) {
        showError('Tenant ID no encontrado. Selecciona un tenant primero.');
        return;
      }

      const response = await nestjsApi.generateTransactionReport({
        tenantId,
        startDate: filters.startDate,
        endDate: filters.endDate,
        accountIds: filters.accountId ? [filters.accountId] : undefined,
      });
      
      if (response.success && response.data) {
        // Descargar el reporte según el formato
        if (filters.format === 'csv') {
          // Convertir a CSV y descargar
          const csv = convertToCSV(response.data);
          downloadFile(csv, `reporte-transacciones-${filters.startDate}-${filters.endDate}.csv`, 'text/csv');
        } else if (filters.format === 'json') {
          const json = JSON.stringify(response.data, null, 2);
          downloadFile(json, `reporte-transacciones-${filters.startDate}-${filters.endDate}.json`, 'application/json');
        } else if (filters.format === 'pdf') {
          showWarning('Formato PDF aún no implementado. Usa CSV o JSON.');
        }
        showSuccess('Reporte generado y descargado exitosamente');
      } else {
        showError(response.message || 'Error al generar el reporte');
      }
    } catch (error: unknown) {
      console.error('Error generating report:', error);
      const errorMessage = (error as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message 
        || (error as { message?: string })?.message 
        || 'Error al generar el reporte. Verifica los datos e intenta nuevamente.';
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const exportBcraReport = async (format: 'csv' | 'json') => {
    if (!filters.startDate || !filters.endDate) {
      showError('Las fechas de inicio y fin son requeridas');
      return;
    }

    try {
      setLoading(true);
      const tenantId = getTenantId();
      
      if (!tenantId) {
        showError('Tenant ID no encontrado. Selecciona un tenant primero.');
        return;
      }

      // Obtener información del tenant para el reporte BCRA
      let cuit = 'XX-XXXXXXXX-X';
      let name = 'Tenant Name';
      
      try {
        const tenantResponse = await nestjsApi.getTenantByTenantId(tenantId);
        if (tenantResponse.success && tenantResponse.data) {
          const tenant = tenantResponse.data.data || tenantResponse.data;
          cuit = tenant.cuit || 'XX-XXXXXXXX-X';
          name = tenant.name || 'Tenant Name';
        }
      } catch (error) {
        console.warn('No se pudo obtener información del tenant, usando valores por defecto:', error);
      }

      const blob = await nestjsApi.exportBcraReport(
        {
          tenantId,
          startDate: filters.startDate,
          endDate: filters.endDate,
          cuit,
          name,
        },
        format,
      );
      
      // Descargar el archivo
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte-bcra-${filters.startDate}-${filters.endDate}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      showSuccess('Reporte BCRA exportado exitosamente');
    } catch (error: unknown) {
      console.error('Error exporting BCRA report:', error);
      const errorMessage = (error as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message 
        || (error as { message?: string })?.message 
        || 'Error al exportar el reporte BCRA. Verifica los datos e intenta nuevamente.';
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  interface TransactionData {
    transactions?: Array<{
      createdAt: string | Date;
      type: string;
      amount: number | string;
      currency: string;
      status: string;
      referenceId?: string;
      id?: string;
    }>;
  }

  const convertToCSV = (data: TransactionData): string => {
    // Función helper para convertir datos a CSV
    if (!data || !data.transactions || !Array.isArray(data.transactions)) return '';
    const transactions = data.transactions;
    const headers = ['Fecha', 'Tipo', 'Monto', 'Moneda', 'Estado', 'Referencia'];
    
    // Escapar comas y comillas en los valores
    const escapeCSV = (value: unknown): string => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };
    
    const rows = transactions.map((t) => {
      return [
        new Date(t.createdAt).toLocaleDateString('es-AR'),
        escapeCSV(t.type),
        escapeCSV(t.amount),
        escapeCSV(t.currency),
        escapeCSV(t.status),
        escapeCSV(t.referenceId || t.id),
      ];
    });
    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Reportes y Analytics</h2>
        <div className="flex items-center space-x-3">
          <label className="flex items-center space-x-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="text-slate-700 rounded border-slate-300 focus:ring-slate-400"
            />
            <span>Auto-refresh (30s)</span>
          </label>
          <button
            onClick={() => loadMetrics()}
            disabled={loading}
            className="px-4 py-2 text-white bg-slate-700 rounded-lg transition-colors hover:bg-slate-800 disabled:opacity-50"
          >
            🔄 Actualizar Métricas
          </button>
        </div>
      </div>

      {/* Métricas en Tiempo Real */}
      <div className="p-6 bg-white rounded-lg border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Métricas en Tiempo Real</h3>
          {autoRefresh && (
            <span className="px-2 py-1 text-xs text-slate-700 bg-slate-100 rounded-full">
              🔄 Actualizando automáticamente
            </span>
          )}
        </div>
        {loading && !metrics ? (
          <div className="py-8 text-center">
            <p className="text-sm text-gray-600">Cargando métricas...</p>
          </div>
        ) : metrics ? (
          <div className="space-y-6">
            {/* Transacciones */}
            <div>
              <h4 className="mb-3 text-sm font-semibold text-gray-700">Transacciones</h4>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="mb-1 text-xs text-gray-600">Total</p>
                  <p className="text-2xl font-bold text-slate-800">{metrics.transactions?.total || 0}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="mb-1 text-xs text-gray-600">Hoy</p>
                  <p className="text-2xl font-bold text-slate-800">{metrics.transactions?.today || 0}</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <p className="mb-1 text-xs text-gray-600">Esta Semana</p>
                  <p className="text-2xl font-bold text-slate-800">{metrics.transactions?.thisWeek || 0}</p>
                </div>
                <div className="p-4 bg-indigo-50 rounded-lg">
                  <p className="mb-1 text-xs text-gray-600">Este Mes</p>
                  <p className="text-2xl font-bold text-indigo-600">{metrics.transactions?.thisMonth || 0}</p>
                </div>
              </div>
            </div>

            {/* Estados de Transacciones */}
            <div>
              <h4 className="mb-3 text-sm font-semibold text-gray-700">Por Estado</h4>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="mb-1 text-xs text-gray-600">Completadas</p>
                  <p className="text-2xl font-bold text-slate-800">
                    {metrics.transactions?.byStatus?.COMPLETED || 0}
                  </p>
                </div>
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <p className="mb-1 text-xs text-gray-600">Pendientes</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {metrics.transactions?.byStatus?.PENDING || 0}
                  </p>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg">
                  <p className="mb-1 text-xs text-gray-600">Procesando</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {metrics.transactions?.byStatus?.PROCESSING || 0}
                  </p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg">
                  <p className="mb-1 text-xs text-gray-600">Fallidas</p>
                  <p className="text-2xl font-bold text-red-600">
                    {metrics.transactions?.byStatus?.FAILED || 0}
                  </p>
                </div>
              </div>
            </div>

            {/* Volúmenes */}
            <div>
              <h4 className="mb-3 text-sm font-semibold text-gray-700">Volúmenes (ARS)</h4>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="mb-1 text-xs text-gray-600">Total</p>
                  <p className="text-xl font-bold text-slate-800">
                    ${(metrics.volume?.total || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="mb-1 text-xs text-gray-600">Hoy</p>
                  <p className="text-xl font-bold text-slate-800">
                    ${(metrics.volume?.today || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <p className="mb-1 text-xs text-gray-600">Esta Semana</p>
                  <p className="text-xl font-bold text-slate-800">
                    ${(metrics.volume?.thisWeek || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="p-4 bg-indigo-50 rounded-lg">
                  <p className="mb-1 text-xs text-gray-600">Este Mes</p>
                  <p className="text-xl font-bold text-indigo-600">
                    ${(metrics.volume?.thisMonth || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="mb-1 text-xs text-gray-600">Promedio</p>
                  <p className="text-xl font-bold text-gray-700">
                    ${(metrics.volume?.average || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>

            {/* Performance */}
            <div>
              <h4 className="mb-3 text-sm font-semibold text-gray-700">Performance</h4>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="mb-1 text-xs text-gray-600">Tasa de Éxito</p>
                  <p className="text-2xl font-bold text-slate-800">
                    {(metrics.performance?.successRate || 0).toFixed(2)}%
                  </p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg">
                  <p className="mb-1 text-xs text-gray-600">Tasa de Falla</p>
                  <p className="text-2xl font-bold text-red-600">
                    {(metrics.performance?.failureRate || 0).toFixed(2)}%
                  </p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="mb-1 text-xs text-gray-600">Tiempo Promedio</p>
                  <p className="text-2xl font-bold text-slate-800">
                    {(metrics.performance?.averageProcessingTime || 0).toFixed(2)}s
                  </p>
                </div>
              </div>
            </div>

            {/* Tendencias */}
            <div>
              <h4 className="mb-3 text-sm font-semibold text-gray-700">Tendencias</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className={`rounded-lg p-4 ${
                  (metrics.trends?.dailyGrowth || 0) >= 0 
                    ? 'bg-slate-50' 
                    : 'bg-red-50'
                }`}>
                  <p className="mb-1 text-xs text-gray-600">Crecimiento Diario</p>
                  <p className={`text-2xl font-bold ${
                    (metrics.trends?.dailyGrowth || 0) >= 0 
                      ? 'text-slate-800' 
                      : 'text-red-600'
                  }`}>
                    {(metrics.trends?.dailyGrowth || 0) >= 0 ? '+' : ''}
                    {(metrics.trends?.dailyGrowth || 0).toFixed(2)}%
                  </p>
                </div>
                <div className={`rounded-lg p-4 ${
                  (metrics.trends?.weeklyGrowth || 0) >= 0 
                    ? 'bg-slate-50' 
                    : 'bg-red-50'
                }`}>
                  <p className="mb-1 text-xs text-gray-600">Crecimiento Semanal</p>
                  <p className={`text-2xl font-bold ${
                    (metrics.trends?.weeklyGrowth || 0) >= 0 
                      ? 'text-slate-800' 
                      : 'text-red-600'
                  }`}>
                    {(metrics.trends?.weeklyGrowth || 0) >= 0 ? '+' : ''}
                    {(metrics.trends?.weeklyGrowth || 0).toFixed(2)}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-600">Haz clic en &quot;Actualizar Métricas&quot; para cargar los datos</p>
        )}
      </div>

      {/* Generar Reporte de Transacciones */}
      <div className="p-6 bg-white rounded-lg border border-gray-200">
        <h3 className="mb-4 text-lg font-semibold text-gray-800">Generar Reporte de Transacciones</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">
                Fecha de Inicio *
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
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
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">
                Formato
              </label>
              <select
                value={filters.format}
                onChange={(e) => setFilters({ ...filters, format: e.target.value as 'json' | 'csv' | 'pdf' })}
                className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
              >
                <option value="json">JSON</option>
                <option value="csv">CSV</option>
                <option value="pdf">PDF</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">
              Cuenta (ID) - Opcional
            </label>
            <input
              type="text"
              value={filters.accountId}
              onChange={(e) => setFilters({ ...filters, accountId: e.target.value })}
              placeholder="UUID de la cuenta (opcional)"
              className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={generateReport}
            disabled={loading}
            className="px-4 py-2 text-white bg-slate-700 rounded-lg transition-colors hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? 'Generando...' : 'Generar Reporte'}
          </button>
        </div>
      </div>

      {/* Reportes Regulatorios */}
      <div className="p-6 bg-white rounded-lg border border-gray-200">
        <h3 className="mb-4 text-lg font-semibold text-gray-800">Reportes Regulatorios (BCRA)</h3>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Genera reportes en formato BCRA para cumplimiento regulatorio.
          </p>
          <div className="flex space-x-3">
            <button
              onClick={() => exportBcraReport('csv')}
              disabled={loading}
              className="px-4 py-2 text-white bg-slate-700 rounded-lg transition-colors hover:bg-slate-800 disabled:opacity-50"
            >
              Exportar BCRA (CSV)
            </button>
            <button
              onClick={() => exportBcraReport('json')}
              disabled={loading}
              className="px-4 py-2 text-white bg-slate-700 rounded-lg transition-colors hover:bg-slate-800 disabled:opacity-50"
            >
              Exportar BCRA (JSON)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

