'use client';

import { useState, useEffect, useRef } from 'react';
import { LogEntry } from '@/types';
import { apiService } from '@/lib/api-migrated';
import { useToast } from '@/hooks/useToast';
import { config } from '@/lib/config';

interface Tenant {
  id: string;
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
  const logsContainerRef = useRef<HTMLDivElement>(null);
  const { showSuccess, showError } = useToast();

  const fetchLogs = async (page = 1) => {
    setLoading(true);
    try {
      // Construir parámetros de query
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        level: levelFilter !== 'all' ? levelFilter : '',
        tenantId: tenantFilter !== 'all' ? tenantFilter : '',
        search: searchText || '',
        fechaDesde: fechaDesde || '',
        fechaHasta: fechaHasta || ''
      });

      const result = await apiService.getLogs(params);
      console.log('📊 API Response:', result.data);
      if (result.data.success && result.data.data) {
        const data = result.data.data;
        console.log('📊 Logs recibidos:', data.logs?.length, 'logs');
        console.log('📊 Total:', data.total);
        
        // Mapear los logs del formato del backend al formato esperado por el frontend
        const mappedLogs = (data.logs || []).map((log: any) => ({
          file: log.file || 'system',
          timestamp: log.timestamp,
          message: log.message,
          level: log.level || 'info'
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
      const response = await fetch(`${apiUrl}/tenants/active`);
      const result = await response.json();
      console.log('📊 Tenants recibidos:', result);
      if (result.success && result.data && result.data.tenants) {
        setTenants(result.data.tenants);
        console.log('✅ Tenants cargados:', result.data.tenants.length);
      }
    } catch (error) {
      console.error('❌ Error cargando tenants:', error);
    }
  };

  useEffect(() => {
    fetchLogs(1);
    fetchTenants();
  }, []);

  useEffect(() => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop = 0;
    }
  }, [logs]);

  // Aplicar filtros cuando cambien
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchLogs(1);
    }, 300); // Debounce de 300ms

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
    setTenantFilter('all');
    setSearchText('');
    setFechaDesde('');
    setFechaHasta('');
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
        return 'text-red-600 bg-red-50';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50';
      case 'info':
        return 'text-blue-600 bg-blue-50';
      default:
        return 'text-gray-800 bg-gray-50';
    }
  };

  const getFileColor = (file: string) => {
    switch (file) {
      case 'error':
        return 'text-red-500';
      case 'audit':
        return 'text-yellow-500';
      default:
        return 'text-blue-500';
    }
  };

  // Los filtros ya se aplican en el servidor, solo usamos los logs tal como vienen

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          📊 Logs en Tiempo Real
        </h2>
        <p className="text-gray-800">
          Monitorea los logs del sistema en tiempo real para debugging y monitoreo (GMT-3).
        </p>
      </div>

      {/* Controles */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <button
            onClick={() => fetchLogs(pagination.page)}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            {loading ? '⏳ Cargando...' : '🔄 Actualizar Logs'}
          </button>
          
          <button
            onClick={clearFilters}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
          >
            🗑️ Limpiar Filtros
          </button>

          {lastFetchTime && (
            <span className="text-sm text-gray-500">
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

        {/* Filtros Avanzados */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          {/* Búsqueda */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              🔍 Buscar en logs:
            </label>
            <input
              type="text"
              value={searchText}
              onChange={handleSearchChange}
              placeholder="Buscar por mensaje, acción, URL..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filtro por Nivel */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              📊 Filtrar por nivel:
            </label>
            <select
              value={levelFilter}
              onChange={e => setLevelFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos</option>
              <option value="error">Error</option>
              <option value="warn">Warning</option>
              <option value="info">Info</option>
              <option value="debug">Debug</option>
            </select>
          </div>

          {/* Filtro por Tenant */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              🏢 Filtrar por tenant:
            </label>
            <select
              value={tenantFilter}
              onChange={e => setTenantFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos los tenants</option>
              {tenants.map(tenant => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name} ({tenant.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filtros de Fecha */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              📅 Desde:
            </label>
            <input
              type="datetime-local"
              value={fechaDesde}
              onChange={e => setFechaDesde(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              📅 Hasta:
            </label>
            <input
              type="datetime-local"
              value={fechaHasta}
              onChange={e => setFechaHasta(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Información de resultados */}
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-600">
          <span>
            Mostrando {logs.length} de {pagination.total} logs totales
          </span>
          {searchText && (
            <span className="text-blue-600">
              🔍 Buscando: "{searchText}"
            </span>
          )}
          {pagination.totalPages > 1 && (
            <span>
              Página {pagination.page} de {pagination.totalPages}
            </span>
          )}
          {tenantFilter !== 'all' && (
            <span className="text-green-600">
              🏢 Tenant: {tenants.find(t => t.id === tenantFilter)?.name}
            </span>
          )}
        </div>
      </div>

      {/* Logs Container */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Logs del Sistema</h3>

        <div
          ref={logsContainerRef}
          className="bg-gray-900 text-green-400 p-4 rounded-md font-mono text-sm max-h-96 overflow-y-auto"
        >
          {logs.length === 0 ? (
            <div className="text-gray-500 text-center py-8">
              {loading ? 'Cargando logs...' : 
               searchText ? `No se encontraron logs que coincidan con "${searchText}"` :
               'No hay logs disponibles'}
            </div>
          ) : (
            logs.map((log, index) => (
              <div key={`${log.timestamp}-${log.message}-${index}`} className="mb-2 p-2 border-l-2 border-green-400">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span
                    className={`px-2 py-1 rounded text-xs font-bold ${getFileColor(log.file)}`}
                  >
                    [{log.file.toUpperCase()}]
                  </span>
                  <span className="text-gray-400 text-xs">
                    {formatTimestampGMT3(log.timestamp)}
                  </span>
                  <span
                    className={`px-2 py-1 rounded text-xs font-bold ${getLevelColor(log.level)}`}
                  >
                    {log.level.toUpperCase()}
                  </span>
                  {log.tenantId && (
                    <span className="text-purple-400 text-xs bg-purple-900 px-2 py-1 rounded">
                      🏢 {log.tenantId}
                    </span>
                  )}
                  {log.action && (
                    <span className="text-yellow-400 text-xs bg-yellow-900 px-2 py-1 rounded">
                      🎯 {log.action}
                    </span>
                  )}
                </div>
                <div className="text-green-400 break-words">{log.message}</div>
                {log.url && (
                  <div className="text-blue-400 text-xs mt-1">
                    🔗 {log.method} {log.url}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Controles de Paginación */}
        {pagination.totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(1)}
                disabled={pagination.page === 1}
                className="px-3 py-1 text-sm bg-gray-500 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600"
              >
                ⏮️ Primera
              </button>
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={!pagination.hasPrev}
                className="px-3 py-1 text-sm bg-blue-500 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600"
              >
                ⬅️ Anterior
              </button>
              <span className="px-3 py-1 text-sm bg-gray-100 rounded">
                {pagination.page} de {pagination.totalPages}
              </span>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={!pagination.hasNext}
                className="px-3 py-1 text-sm bg-blue-500 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600"
              >
                Siguiente ➡️
              </button>
              <button
                onClick={() => handlePageChange(pagination.totalPages)}
                disabled={pagination.page === pagination.totalPages}
                className="px-3 py-1 text-sm bg-gray-500 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600"
              >
                Última ⏭️
              </button>
            </div>
            <div className="text-sm text-gray-600">
              {((pagination.page - 1) * pagination.limit) + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} logs
            </div>
          </div>
        )}
      </div>

      {/* Estadísticas */}
      {pagination.total > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">
            📈 Estadísticas de Logs
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {pagination.total}
              </div>
              <div className="text-sm text-gray-800">
                Total en BD
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {logs.filter(log => log.level === 'error').length}
              </div>
              <div className="text-sm text-gray-800">Errores (página)</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {logs.filter(log => log.level === 'warn').length}
              </div>
              <div className="text-sm text-gray-800">Warnings (página)</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {logs.filter(log => log.level === 'info').length}
              </div>
              <div className="text-sm text-gray-800">Info (página)</div>
            </div>
          </div>
          {(searchText || levelFilter !== 'all' || tenantFilter !== 'all' || fechaDesde || fechaHasta) && (
            <div className="mt-4 p-3 bg-blue-50 rounded-md">
              <p className="text-sm text-blue-700">
                🔍 Filtros activos: 
                {searchText && <span className="ml-2 bg-blue-200 px-2 py-1 rounded">Búsqueda: "{searchText}"</span>}
                {levelFilter !== 'all' && <span className="ml-2 bg-yellow-200 px-2 py-1 rounded">Nivel: {levelFilter}</span>}
                {tenantFilter !== 'all' && <span className="ml-2 bg-green-200 px-2 py-1 rounded">Tenant: {tenants.find(t => t.id === tenantFilter)?.name}</span>}
                {(fechaDesde || fechaHasta) && <span className="ml-2 bg-purple-200 px-2 py-1 rounded">Rango de fechas</span>}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
