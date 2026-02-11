'use client';

import { useState, useEffect, useRef } from 'react';
import { LogEntry } from '@/types';
import { apiService } from '@/lib/api-migrated';
import { useToast } from '@/hooks/useToast';
import { config, getAdminKey } from '@/lib/config';

const STORAGE_TENANT_KEY = 'tenantId';

function getCurrentTenantId(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(STORAGE_TENANT_KEY) || '';
}

interface Tenant {
  id: string;
  tenantId?: string;
  name: string;
  code: string;
  cuit: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface LogsResponse {
  logs: LogEntry[];
  pagination: PaginationInfo;
  filters: {
    level: string | null;
    tenantId: string | null;
    search: string | null;
    fechaDesde: string | null;
    fechaHasta: string | null;
  };
}

export function LogsTab() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });
  const [tenants, setTenants] = useState<Tenant[]>([]);
  
  // Filtros
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [tenantFilter, setTenantFilter] = useState<string>('all');
  const [searchText, setSearchText] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);
  const [logSource, setLogSource] = useState<'database' | 'sandbox' | null>(null);
  const logsContainerRef = useRef<HTMLDivElement>(null);
  const { showSuccess, showError } = useToast();

  const fetchLogs = async (page = 1) => {
    const effectiveTenantId = tenantFilter !== 'all' ? tenantFilter : getCurrentTenantId();
    if (!effectiveTenantId) {
      setLogs([]);
      setPagination((prev) => ({ ...prev, total: 0, totalPages: 0 }));
      setLogSource(null);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        level: levelFilter !== 'all' ? levelFilter : '',
        tenantId: effectiveTenantId,
        search: searchText || '',
        fechaDesde: fechaDesde || '',
        fechaHasta: fechaHasta || ''
      });

      const result = await apiService.getLogs(params);
      if (result.data.success && result.data.data) {
        const data = result.data.data;
        setLogSource('database');

        // Mapear los logs del formato del backend al formato esperado por el frontend
        const mappedLogs = (data.logs || []).map((log: any) => ({
          file: log.file || 'system',
          timestamp: log.timestamp,
          message: log.message,
          level: log.level || 'info',
          ...(log.url && { url: log.url }),
          ...(log.method && { method: log.method }),
          ...(log.tenantId && { tenantId: log.tenantId }),
          ...(log.action && { action: log.action }),
        }));

        setLogs(mappedLogs);

        // Actualizar paginación basada en el total
        const totalPages = Math.ceil((data.total || 0) / 10);
        setPagination({
          page: page,
          limit: 10,
          total: data.total || 0,
          totalPages: totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        });

        setLastFetchTime(new Date());
      } else {
        showError(`Error cargando logs: ${result.data.message}`);
      }
    } catch (error: any) {
      console.error('Error en fetchLogs:', error);
      showError(`Error de conexión: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchTenants = async () => {
    try {
      const apiUrl = config.API_BASE_URL;
      const adminKey = getAdminKey();
      const url = `${apiUrl}/tenants/active${apiUrl.includes('?') ? '&' : '?'}adminKey=${encodeURIComponent(adminKey)}`;
      const response = await fetch(url);
      const result = await response.json();
      if (result.success && result.data && result.data.tenants) {
        const list = result.data.tenants;
        setTenants(list);
        const currentId = getCurrentTenantId();
        if (currentId) {
          const match = list.find((t: Tenant) => t.id === currentId || (t as Tenant).tenantId === currentId);
          if (match) setTenantFilter((match as Tenant).tenantId ?? match.id);
        }
      }
    } catch (error) {
      console.error('Error cargando tenants:', error);
    }
  };

  useEffect(() => {
    fetchLogs(1);
    fetchTenants();
  }, []);

  useEffect(() => {
    const currentId = getCurrentTenantId();
    if (currentId && tenants.length > 0) {
      const match = tenants.find(t => t.id === currentId || (t as Tenant).tenantId === currentId);
      const value = match ? ((match as Tenant).tenantId ?? match.id) : currentId;
      if (tenantFilter !== value) setTenantFilter(value);
    }
  }, [tenants]);

  useEffect(() => {
    const handleTenantChanged = () => {
      const currentId = getCurrentTenantId();
      setTenantFilter(currentId || 'all');
    };
    window.addEventListener('tenantChanged', handleTenantChanged);
    return () => window.removeEventListener('tenantChanged', handleTenantChanged);
  }, []);

  useEffect(() => {
    if (logsContainerRef.current) logsContainerRef.current.scrollTop = 0;
  }, [logs]);

  useEffect(() => {
    const timeoutId = setTimeout(() => fetchLogs(1), 300);
    return () => clearTimeout(timeoutId);
  }, [levelFilter, tenantFilter, searchText, fechaDesde, fechaHasta]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
  };

  const handlePageChange = (page: number) => {
    fetchLogs(page);
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop = 0;
    }
  };

  const clearFilters = () => {
    setLevelFilter('all');
    setSearchText('');
    setFechaDesde('');
    setFechaHasta('');
    setTenantFilter(getCurrentTenantId() || 'all');
  };

  // Formatear timestamp a GMT-3 (horario de Argentina)
  const formatTimestampGMT3 = (timestamp: string) => {
    const date = new Date(timestamp);
    // Convertir a GMT-3
    return date.toLocaleString('es-AR', { 
      timeZone: 'America/Argentina/Buenos_Aires',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'text-red-600 bg-red-500/20';
      case 'warn':
      case 'warning':
        return 'text-amber-600 bg-amber-500/20';
      case 'info':
        return 'text-sky-500 bg-sky-500/20';
      case 'debug':
        return 'text-slate-400 bg-slate-500/20';
      default:
        return 'text-slate-300 bg-slate-500/20';
    }
  };

  const getFileColor = (file: string) => {
    switch (file) {
      case 'error':
        return 'text-red-400';
      case 'audit':
        return 'text-amber-400';
      default:
        return 'text-sky-400';
    }
  };

  // Los filtros ya se aplican en el servidor, solo usamos los logs tal como vienen

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold text-slate-900">
          Logs en tiempo real
        </h2>
        <p className="text-sm text-slate-600">
          Monitorea los logs del sistema (GMT-3). Por defecto se usa el tenant de <strong>Operando con:</strong> del menú superior.
        </p>
      </div>

      {/* Estadísticas (hero) */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h3 className="text-lg font-semibold text-slate-900">Estadísticas</h3>
          {logSource === 'database' && (
            <span className="rounded bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-800">
              Desde BFF (por tenant)
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center">
            <div className="text-2xl font-bold text-slate-800">{pagination.total}</div>
            <div className="text-sm text-slate-600">Total en BD</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-red-50 p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{logs.filter(l => l.level === 'error').length}</div>
            <div className="text-sm text-slate-600">Errores (pág.)</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-amber-50 p-4 text-center">
            <div className="text-2xl font-bold text-amber-700">{logs.filter(l => l.level === 'warn').length}</div>
            <div className="text-sm text-slate-600">Warnings (pág.)</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center">
            <div className="text-2xl font-bold text-slate-800">{logs.filter(l => l.level === 'info').length}</div>
            <div className="text-sm text-slate-600">Info (pág.)</div>
          </div>
        </div>
        {(searchText || levelFilter !== 'all' || tenantFilter !== 'all' || fechaDesde || fechaHasta) && (
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm text-slate-700">
              Filtros activos:
              {searchText && <span className="ml-2 rounded bg-slate-200 px-2 py-0.5">Búsqueda</span>}
              {levelFilter !== 'all' && <span className="ml-2 rounded bg-amber-100 px-2 py-0.5">Nivel: {levelFilter}</span>}
              {tenantFilter !== 'all' && <span className="ml-2 rounded bg-emerald-100 px-2 py-0.5">Tenant</span>}
              {(fechaDesde || fechaHasta) && <span className="ml-2 rounded bg-violet-100 px-2 py-0.5">Fechas</span>}
            </p>
          </div>
        )}
      </div>

      {/* Controles y filtros */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => fetchLogs(pagination.page)}
            disabled={loading}
            className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? 'Cargando...' : 'Actualizar logs'}
          </button>
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Limpiar filtros
          </button>
          {lastFetchTime && (
            <span className="text-sm text-slate-500">
              Última actualización: {lastFetchTime.toLocaleString('es-AR', {
                timeZone: 'America/Argentina/Buenos_Aires',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
              })}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Buscar en logs</label>
            <input
              type="text"
              value={searchText}
              onChange={handleSearchChange}
              placeholder="Mensaje, acción, URL..."
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Nivel</label>
            <select
              value={levelFilter}
              onChange={e => setLevelFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              <option value="all">Todos</option>
              <option value="error">Error</option>
              <option value="warn">Warning</option>
              <option value="info">Info</option>
              <option value="debug">Debug</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Desde</label>
            <input
              type="datetime-local"
              value={fechaDesde}
              onChange={e => setFechaDesde(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Hasta</label>
            <input
              type="datetime-local"
              value={fechaHasta}
              onChange={e => setFechaHasta(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-600">
          <span>Mostrando {logs.length} de {pagination.total} logs</span>
          {searchText && <span className="text-slate-700">Buscando: &quot;{searchText}&quot;</span>}
          {pagination.totalPages > 1 && <span>Página {pagination.page} de {pagination.totalPages}</span>}
          {tenantFilter !== 'all' && (
            <span className="text-slate-700">
              Tenant: {tenants.find(t => (t as Tenant).tenantId === tenantFilter || t.id === tenantFilter)?.name ?? tenantFilter}
            </span>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-slate-900">Logs del sistema</h3>
        <div
          ref={logsContainerRef}
          className="max-h-96 overflow-y-auto rounded-lg bg-slate-900 p-4 font-mono text-sm text-emerald-400"
        >
          {logs.length === 0 ? (
            <div className="py-8 text-center text-slate-400">
              {loading
                ? 'Cargando logs...'
                : (tenantFilter === 'all' && !getCurrentTenantId())
                  ? 'Seleccioná un tenant (Operando con) para ver los logs del BFF.'
                  : searchText
                    ? `Sin resultados para "${searchText}"`
                    : 'No hay logs para este tenant'}
            </div>
          ) : (
            logs.map((log, index) => (
              <div key={`${log.timestamp}-${log.message}-${index}`} className="mb-2 border-l-2 border-emerald-500/60 p-2">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className={`rounded px-2 py-1 text-xs font-bold ${getFileColor(log.file)}`}>[{log.file.toUpperCase()}]</span>
                  <span className="text-xs text-slate-400">{formatTimestampGMT3(log.timestamp)}</span>
                  <span className={`rounded px-2 py-1 text-xs font-bold ${getLevelColor(log.level)}`}>{log.level.toUpperCase()}</span>
                  {log.tenantId && <span className="rounded bg-violet-900/80 px-2 py-1 text-xs text-violet-300">{log.tenantId}</span>}
                  {log.action && <span className="rounded bg-amber-900/80 px-2 py-1 text-xs text-amber-300">{log.action}</span>}
                </div>
                <div className="break-words text-emerald-400">{log.message}</div>
                {log.url && <div className="mt-1 text-xs text-sky-400">{log.method} {log.url}</div>}
              </div>
            ))
          )}
        </div>

        {pagination.totalPages > 1 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => handlePageChange(1)} disabled={pagination.page === 1} className="rounded bg-slate-600 px-3 py-1.5 text-sm text-white hover:bg-slate-700 disabled:opacity-50">Primera</button>
              <button type="button" onClick={() => handlePageChange(pagination.page - 1)} disabled={!pagination.hasPrev} className="rounded bg-slate-700 px-3 py-1.5 text-sm text-white hover:bg-slate-800 disabled:opacity-50">Anterior</button>
              <span className="rounded bg-slate-100 px-3 py-1.5 text-sm text-slate-700">{pagination.page} de {pagination.totalPages}</span>
              <button type="button" onClick={() => handlePageChange(pagination.page + 1)} disabled={!pagination.hasNext} className="rounded bg-slate-700 px-3 py-1.5 text-sm text-white hover:bg-slate-800 disabled:opacity-50">Siguiente</button>
              <button type="button" onClick={() => handlePageChange(pagination.totalPages)} disabled={pagination.page === pagination.totalPages} className="rounded bg-slate-600 px-3 py-1.5 text-sm text-white hover:bg-slate-700 disabled:opacity-50">Última</button>
            </div>
            <span className="text-sm text-slate-600">
              {((pagination.page - 1) * pagination.limit) + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
