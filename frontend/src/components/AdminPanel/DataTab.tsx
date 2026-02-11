'use client';

import { useState, useEffect, useCallback } from 'react';
import { TenantData, Credentials } from '@/types';
import { apiService, getStoredCredentials } from '@/lib/api-migrated';
import { nestjsApi } from '@/lib/api/nestjs-client';
import { formatCurrency, formatDate, copyToClipboard } from '@/lib/utils';
import { useToast } from '@/hooks/useToast';
import { useAdminAuth } from '@/contexts/AdminAuthContext';

const STORAGE_TENANT_KEY = 'tenantId';

function getCurrentTenantId(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(STORAGE_TENANT_KEY) || '';
}

export function DataTab() {
  const { adminKey } = useAdminAuth();
  const [tenantId, setTenantId] = useState('');
  const [tenantData, setTenantData] = useState<TenantData | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [showStatsOnly, setShowStatsOnly] = useState(false);
  const { showSuccess, showError, showWarning, showToast } = useToast();

  // Sincronizar con el tenant del menú "Operando con:"
  const syncTenantFromStorage = useCallback(() => {
    const id = getCurrentTenantId();
    setTenantId(id);
    const creds = getStoredCredentials();
    if (creds) setCredentials(creds);
  }, []);

  useEffect(() => {
    syncTenantFromStorage();
  }, [syncTenantFromStorage]);

  useEffect(() => {
    const handleTenantChanged = () => syncTenantFromStorage();
    window.addEventListener('tenantChanged', handleTenantChanged);
    return () => window.removeEventListener('tenantChanged', handleTenantChanged);
  }, [syncTenantFromStorage]);

  const loadTenantData = async () => {
    const id = tenantId.trim() || getCurrentTenantId();
    if (!id) {
      showError('Selecciona un tenant en "Operando con:" o carga credenciales');
      return;
    }
    setTenantId(id);
    setLoading(true);
    setShowStatsOnly(false);
    try {
      const result = await apiService.getTenantData(id);
      if (result.data.success && result.data.data) {
        setTenantData(result.data.data);
        showSuccess('Datos del tenant cargados');
      } else {
        showError(`Error: ${result.data.message || 'Respuesta inválida'}`);
      }
    } catch (error: unknown) {
      showError(`Error: ${error instanceof Error ? error.message : 'Conexión'}`);
    } finally {
      setLoading(false);
    }
  };

  const loadStoredCredentials = () => {
    const storedCreds = getStoredCredentials();
    if (storedCreds) {
      setCredentials(storedCreds);
      setTenantId(storedCreds.tenantId);
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_TENANT_KEY, storedCreds.tenantId);
        window.dispatchEvent(new CustomEvent('tenantChanged', { detail: { tenantId: storedCreds.tenantId } }));
      }
      showSuccess('Credenciales cargadas');
    } else {
      showError('No hay credenciales almacenadas');
    }
  };

  const handleShowCredentials = () => {
    const creds = getStoredCredentials();
    if (creds) {
      setCredentials(creds);
      setShowCredentialsModal(true);
    } else {
      showError('No hay credenciales. Genera o carga credenciales primero.');
    }
  };

  const handleShowStats = async () => {
    const id = tenantId.trim() || getCurrentTenantId();
    if (!id) {
      showError('Selecciona un tenant en "Operando con:"');
      return;
    }
    setTenantId(id);
    setLoading(true);
    setShowStatsOnly(true);
    try {
      const result = await apiService.getTenantData(id);
      if (result.data.success && result.data.data) {
        setTenantData(result.data.data);
      } else {
        showError(result.data.message || 'Error cargando estadísticas');
      }
    } catch (error: unknown) {
      showError(error instanceof Error ? error.message : 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTransactions = async () => {
    const id = tenantId.trim() || getCurrentTenantId();
    if (!id) {
      showError('Selecciona un tenant en "Operando con:"');
      return;
    }
    if (!adminKey) {
      showError('Se requiere sesión de administrador');
      return;
    }
    setDownloading(true);
    try {
      const response = await nestjsApi.getTransactions({
        tenantId: id,
        adminKey,
        limit: 10000,
        page: 1,
      });
      const raw = response?.data;
      const list = Array.isArray(raw) ? raw : (raw?.transactions ?? raw?.data ?? []);
      const headers = ['id', 'type', 'status', 'amount', 'currency', 'fromAccountId', 'toAccountId', 'description', 'createdAt', 'updatedAt'];
      const csvRows = [headers.join(',')];
      for (const row of list) {
        const values = headers.map(h => {
          const v = row[h] ?? row[h === 'createdAt' ? 'created_at' : h === 'updatedAt' ? 'updated_at' : h];
          const s = String(v ?? '');
          return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
        });
        csvRows.push(values.join(','));
      }
      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transacciones_${id}_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showSuccess(`Descargadas ${list.length} transacciones`);
    } catch (error: unknown) {
      showError(error instanceof Error ? error.message : 'Error al descargar');
    } finally {
      setDownloading(false);
    }
  };

  const requestDeleteTenantData = () => {
    const id = tenantId.trim() || getCurrentTenantId();
    if (!id) {
      showError('Selecciona un tenant');
      return;
    }
    setTenantId(id);
    showWarning('¿Borrar todos los datos y logs de este tenant? No se borrarán credenciales ni el tenant.');
    setShowDeleteConfirmation(true);
  };

  const confirmDeleteTenantData = async () => {
    setShowDeleteConfirmation(false);
    const id = tenantId.trim() || getCurrentTenantId();
    if (!id) return;
    setLoading(true);
    try {
      const result = await apiService.deleteTenantData(id);
      if (result.data.success) {
        setTenantData(null);
        showSuccess('Datos del tenant borrados');
      } else {
        showError(result.data.message || 'Error borrando');
      }
    } catch (error: unknown) {
      showError(error instanceof Error ? error.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  const cancelDeleteTenantData = () => {
    setShowDeleteConfirmation(false);
  };

  const currentTenantId = tenantId || getCurrentTenantId();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold text-slate-900">
          Datos del Tenant
        </h2>
        <p className="text-sm text-slate-600">
          Usa el tenant seleccionado en <strong>Operando con:</strong> del menú superior.
        </p>
      </div>

      {/* Tenant actual y acciones */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-slate-500">Tenant actual:</span>
            <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-sm text-slate-800">
              {currentTenantId || '—'}
            </span>
            {credentials && (
              <span className="text-xs text-emerald-600">Credenciales disponibles</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={loadStoredCredentials}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cargar desde credenciales
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleShowCredentials}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Ver credenciales
          </button>
          <button
            type="button"
            onClick={handleShowStats}
            disabled={loading || !currentTenantId}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {loading && showStatsOnly ? 'Cargando...' : 'Estadísticas'}
          </button>
          <button
            type="button"
            onClick={handleDownloadTransactions}
            disabled={downloading || !currentTenantId || !adminKey}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {downloading ? 'Descargando...' : 'Descargar transacciones'}
          </button>
          <button
            type="button"
            onClick={loadTenantData}
            disabled={loading || !currentTenantId}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {loading && !showStatsOnly ? 'Cargando...' : 'Cargar todos los datos'}
          </button>
        </div>
      </div>

      {/* Modal credenciales */}
      {showCredentialsModal && credentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowCredentialsModal(false)}>
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="mb-4 text-lg font-semibold text-slate-900">Credenciales</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-500">tenantId</label>
                <div className="mt-1 flex gap-2">
                  <code className="flex-1 truncate rounded bg-slate-100 px-2 py-1.5 text-sm">{credentials.tenantId}</code>
                  <button type="button" onClick={() => copyToClipboard(credentials.tenantId, showToast)} className="rounded bg-slate-200 px-2 py-1 text-sm hover:bg-slate-300">Copiar</button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500">apiKey</label>
                <div className="mt-1 flex gap-2">
                  <code className="flex-1 truncate rounded bg-slate-100 px-2 py-1.5 text-sm">{credentials.apiKey}</code>
                  <button type="button" onClick={() => copyToClipboard(credentials.apiKey, showToast)} className="rounded bg-slate-200 px-2 py-1 text-sm hover:bg-slate-300">Copiar</button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500">apiSecret</label>
                <div className="mt-1 flex gap-2">
                  <code className="flex-1 truncate rounded bg-slate-100 px-2 py-1.5 text-sm">{credentials.apiSecret}</code>
                  <button type="button" onClick={() => copyToClipboard(credentials.apiSecret, showToast)} className="rounded bg-slate-200 px-2 py-1 text-sm hover:bg-slate-300">Copiar</button>
                </div>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button type="button" onClick={() => setShowCredentialsModal(false)} className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Solo estadísticas (vista reducida) */}
      {showStatsOnly && tenantData && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">Estadísticas del tenant</h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center">
              <div className="text-2xl font-bold text-slate-800">{tenantData.estadisticas.total_cheques}</div>
              <div className="text-sm text-slate-600">Total cheques</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center">
              <div className="text-2xl font-bold text-slate-800">{formatCurrency(tenantData.estadisticas.total_monto)}</div>
              <div className="text-sm text-slate-600">Monto total</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-amber-50 p-4 text-center">
              <div className="text-2xl font-bold text-amber-700">{tenantData.estadisticas.cheques_emitidos}</div>
              <div className="text-sm text-slate-600">Emitidos</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center">
              <div className="text-2xl font-bold text-slate-800">{tenantData.estadisticas.cheques_activos}</div>
              <div className="text-sm text-slate-600">Activos</div>
            </div>
          </div>
          <button type="button" onClick={() => setShowStatsOnly(false)} className="mt-4 text-sm text-slate-600 underline hover:text-slate-800">Cerrar y cargar datos completos</button>
        </div>
      )}

      {/* Datos completos del Tenant (oculto si solo se muestran estadísticas) */}
      {tenantData && !showStatsOnly && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">Información del tenant</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-lg bg-slate-50 p-3">
                <label className="text-sm font-medium text-slate-700">ID</label>
                <p className="font-mono text-sm text-slate-900">{tenantData.tenant.id}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <label className="text-sm font-medium text-slate-700">Nombre</label>
                <p className="text-slate-900">{tenantData.tenant.name}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <label className="text-sm font-medium text-slate-700">Código</label>
                <p className="font-mono text-sm text-slate-900">{tenantData.tenant.code}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <label className="text-sm font-medium text-slate-700">CUIT</label>
                <p className="font-mono text-sm text-slate-900">{tenantData.tenant.cuit}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <label className="text-sm font-medium text-slate-700">Estado</label>
                <span className="inline-block rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-800">{tenantData.tenant.status}</span>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <label className="text-sm font-medium text-slate-700">Creado</label>
                <p className="text-sm text-slate-900">{formatDate(tenantData.tenant.created_at)}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">Estadísticas</h3>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center">
                <div className="text-2xl font-bold text-slate-800">{tenantData.estadisticas.total_cheques}</div>
                <div className="text-sm text-slate-600">Total cheques</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center">
                <div className="text-2xl font-bold text-slate-800">{formatCurrency(tenantData.estadisticas.total_monto)}</div>
                <div className="text-sm text-slate-600">Monto total</div>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-center">
                <div className="text-2xl font-bold text-amber-700">{tenantData.estadisticas.cheques_emitidos}</div>
                <div className="text-sm text-slate-600">Emitidos</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center">
                <div className="text-2xl font-bold text-slate-800">{tenantData.estadisticas.cheques_activos}</div>
                <div className="text-sm text-slate-600">Activos</div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">Cheques</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Monto</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Estado</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Beneficiario</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {tenantData.cheques.map((cheque, index) => (
                    <tr key={index}>
                      <td className="whitespace-nowrap px-6 py-4 font-mono text-sm text-slate-900">{cheque.id}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-900">{formatCurrency(cheque.monto)}</td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${cheque.estado === 'Emitido' ? 'bg-amber-100 text-amber-800' : cheque.estado === 'Activo' ? 'bg-slate-100 text-slate-800' : 'bg-slate-100 text-slate-800'}`}>
                          {cheque.estado}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 font-mono text-sm text-slate-900">{cheque.beneficiario}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-900">{formatDate(cheque.fecha_emision)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">Cuentas</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">CUIT</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">CBU</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Estado</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Saldo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {tenantData.cuentas.map((cuenta, index) => (
                    <tr key={index}>
                      <td className="whitespace-nowrap px-6 py-4 font-mono text-sm text-slate-900">{cuenta.id}</td>
                      <td className="whitespace-nowrap px-6 py-4 font-mono text-sm text-slate-900">{cuenta.cuit}</td>
                      <td className="whitespace-nowrap px-6 py-4 font-mono text-sm text-slate-900">{cuenta.cbu}</td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${cuenta.estado === 'ACTIVE' ? 'bg-slate-100 text-slate-800' : 'bg-slate-100 text-slate-800'}`}>{cuenta.estado}</span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-900">{formatCurrency(cuenta.saldo)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">Endosos</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Cheque ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Endosante</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Endosatario</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {tenantData.endosos.map((endoso, index) => (
                    <tr key={index}>
                      <td className="whitespace-nowrap px-6 py-4 font-mono text-sm text-slate-900">{endoso.id}</td>
                      <td className="whitespace-nowrap px-6 py-4 font-mono text-sm text-slate-900">{endoso.cheque_id}</td>
                      <td className="whitespace-nowrap px-6 py-4 font-mono text-sm text-slate-900">{endoso.endosante}</td>
                      <td className="whitespace-nowrap px-6 py-4 font-mono text-sm text-slate-900">{endoso.endosatario}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-900">{formatDate(endoso.fecha)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">Acciones</h3>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={requestDeleteTenantData} disabled={loading} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
                {loading ? 'Borrando...' : 'Borrar datos del tenant'}
              </button>
              <button type="button" onClick={() => loadTenantData()} disabled={loading} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                {loading ? 'Cargando...' : 'Recargar datos'}
              </button>
            </div>
            {showDeleteConfirmation && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
                <h4 className="mb-2 font-semibold text-amber-800">Confirmar borrado</h4>
                <p className="mb-4 text-amber-700">Se borrarán todos los datos y logs del tenant. No se pueden deshacer.</p>
                <div className="flex gap-3">
                  <button type="button" onClick={confirmDeleteTenantData} disabled={loading} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">Confirmar</button>
                  <button type="button" onClick={cancelDeleteTenantData} className="rounded-lg bg-slate-500 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600">Cancelar</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {!tenantData && !loading && !showStatsOnly && (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="mb-2 text-slate-600">Selecciona un tenant en <strong>Operando con:</strong> en el menú superior y usa los botones de arriba.</p>
          <p className="mb-4 text-sm text-slate-500">Ver credenciales, estadísticas, descargar transacciones o cargar todos los datos.</p>
          <button type="button" onClick={loadStoredCredentials} className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
            Cargar desde credenciales
          </button>
        </div>
      )}

    </div>
  );
}
