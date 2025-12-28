'use client';

import { useState, useEffect } from 'react';
import { TenantData, Credentials } from '@/types';
import { apiService, getStoredCredentials } from '@/lib/api-migrated';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useToast } from '@/hooks/useToast';
import { TenantAdminTab } from './TenantAdminTab';

export function DataTab() {
  const [tenantId, setTenantId] = useState('');
  const [tenantData, setTenantData] = useState<TenantData | null>(null);
  const [loading, setLoading] = useState(false);
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const { showSuccess, showError, showWarning } = useToast();
  
  // Administración de tenants
  const [adminKey, setAdminKey] = useState('');
  const [tenantsList, setTenantsList] = useState<any[]>([]);
  const [selectedTenants, setSelectedTenants] = useState<string[]>([]);
  const [showTenantModal, setShowTenantModal] = useState(false);
  const [selectedTenantDetails, setSelectedTenantDetails] = useState<any>(null);

  useEffect(() => {
    const storedCreds = getStoredCredentials();
    if (storedCreds) {
      setCredentials(storedCreds);
      setTenantId(storedCreds.tenantId);
    }
  }, []);

  const loadTenantData = async () => {
    if (!tenantId.trim()) {
      showError('Por favor ingresa un ID de tenant válido');
      return;
    }

    setLoading(true);
    try {
      const result = await apiService.getTenantData(tenantId);
      if (result.data.success && result.data.data) {
        setTenantData(result.data.data);
        showSuccess('Datos del tenant cargados exitosamente');
      } else {
        showError(`Error cargando datos: ${result.data.message}`);
      }
    } catch (error: any) {
      showError(`Error de conexión: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const requestDeleteTenantData = () => {
    if (!tenantId.trim()) {
      showError('Por favor ingresa un ID de tenant válido');
      return;
    }

    showWarning('⚠️ ¿Estás seguro de que quieres borrar todos los datos y logs de este tenant?\n\nEsto NO borrará las credenciales ni el tenant, solo los datos generados.\n\nHaz clic en "Confirmar Borrado" para proceder.');
    setShowDeleteConfirmation(true);
  };

  const confirmDeleteTenantData = async () => {
    setShowDeleteConfirmation(false);
    setLoading(true);
    try {
      const result = await apiService.deleteTenantData(tenantId);
      if (result.data.success) {
        setTenantData(null);
        showSuccess('Datos del tenant borrados exitosamente');
      } else {
        showError(`Error borrando datos: ${result.data.message}`);
      }
    } catch (error: any) {
      showError(`Error de conexión: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const cancelDeleteTenantData = () => {
    setShowDeleteConfirmation(false);
    showSuccess('Operación cancelada');
  };

  const loadStoredCredentials = () => {
    const storedCreds = getStoredCredentials();
    if (storedCreds) {
      setTenantId(storedCreds.tenantId);
      showSuccess('✅ Credenciales cargadas, ahora puedes cargar los datos');
    } else {
      showError('❌ No hay credenciales almacenadas');
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          🗃️ Datos del Tenant
        </h2>
        <p className="text-gray-800">
          Visualiza los datos generados para el tenant actualmente logueado.
        </p>
      </div>

      {/* Controles */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">
          🔍 Cargar Datos del Tenant
        </h3>

        <div className="flex items-center gap-4 mb-4">
          <input
            type="text"
            value={tenantId || ''}
            onChange={e => setTenantId(e.target.value)}
            placeholder="Ingresa el ID del tenant"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={loadStoredCredentials}
            className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 transition-colors"
          >
            📥 Cargar desde Credenciales
          </button>
          <button
            onClick={loadTenantData}
            disabled={loading || !tenantId?.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            {loading ? '⏳ Cargando...' : '📊 Cargar Datos'}
          </button>
        </div>

        {credentials && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-700">
              <strong>✅ Credenciales disponibles:</strong>{' '}
              {credentials.tenantId}
            </p>
          </div>
        )}
      </div>

      {/* Datos del Tenant */}
      {tenantData && (
        <div className="space-y-6">
          {/* Información del Tenant */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">
              🏢 Información del Tenant
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-3 bg-gray-50 rounded-md">
                <label className="text-sm font-medium text-gray-900">ID</label>
                <p className="text-gray-900 font-mono text-sm">
                  {tenantData.tenant.id}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-md">
                <label className="text-sm font-medium text-gray-900">
                  Nombre
                </label>
                <p className="text-gray-900">{tenantData.tenant.name}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-md">
                <label className="text-sm font-medium text-gray-900">
                  Código
                </label>
                <p className="text-gray-900 font-mono text-sm">
                  {tenantData.tenant.code}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-md">
                <label className="text-sm font-medium text-gray-900">
                  CUIT
                </label>
                <p className="text-gray-900 font-mono text-sm">
                  {tenantData.tenant.cuit}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-md">
                <label className="text-sm font-medium text-gray-900">
                  Estado
                </label>
                <span className="inline-block px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                  {tenantData.tenant.status}
                </span>
              </div>
              <div className="p-3 bg-gray-50 rounded-md">
                <label className="text-sm font-medium text-gray-900">
                  Creado
                </label>
                <p className="text-gray-900 text-sm">
                  {formatDate(tenantData.tenant.created_at)}
                </p>
              </div>
            </div>
          </div>

          {/* Estadísticas */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">📊 Estadísticas</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {tenantData.estadisticas.total_cheques}
                </div>
                <div className="text-sm text-gray-800">Total Cheques</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(tenantData.estadisticas.total_monto)}
                </div>
                <div className="text-sm text-gray-800">Monto Total</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">
                  {tenantData.estadisticas.cheques_emitidos}
                </div>
                <div className="text-sm text-gray-800">Emitidos</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {tenantData.estadisticas.cheques_activos}
                </div>
                <div className="text-sm text-gray-800">Activos</div>
              </div>
            </div>
          </div>

          {/* Cheques */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">💳 Cheques</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Monto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Beneficiario
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tenantData.cheques.map((cheque, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {cheque.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(cheque.monto)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            cheque.estado === 'Emitido'
                              ? 'bg-yellow-100 text-yellow-800'
                              : cheque.estado === 'Activo'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {cheque.estado}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {cheque.beneficiario}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(cheque.fecha_emision)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cuentas */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">🏦 Cuentas</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      CUIT
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      CBU
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Saldo
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tenantData.cuentas.map((cuenta, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {cuenta.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {cuenta.cuit}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {cuenta.cbu}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            cuenta.estado === 'ACTIVE'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {cuenta.estado}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(cuenta.saldo)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Endosos */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">📝 Endosos</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cheque ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Endosante
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Endosatario
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tenantData.endosos.map((endoso, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {endoso.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {endoso.cheque_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {endoso.endosante}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {endoso.endosatario}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(endoso.fecha)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Acciones */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">⚙️ Acciones</h3>
            <div className="flex space-x-4">
              <button
                onClick={requestDeleteTenantData}
                disabled={loading}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                {loading ? '⏳ Borrando...' : '🗑️ Borrar Datos del Tenant'}
              </button>
              <button
                onClick={() => loadTenantData()}
                disabled={loading}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 transition-colors"
              >
                {loading ? '⏳ Cargando...' : '🔄 Recargar Datos'}
              </button>
            </div>

            {/* Confirmación de borrado */}
            {showDeleteConfirmation && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center mb-3">
                  <span className="text-2xl mr-3">⚠️</span>
                  <h4 className="text-lg font-semibold text-yellow-800">Confirmar Borrado</h4>
                </div>
                <p className="text-yellow-700 mb-4">
                  Esta acción borrará todos los datos y logs del tenant <strong>{tenantId}</strong>.
                  <br />
                  <strong>No se pueden deshacer los cambios.</strong>
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={confirmDeleteTenantData}
                    disabled={loading}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    {loading ? '⏳ Borrando...' : '✅ Confirmar Borrado'}
                  </button>
                  <button
                    onClick={cancelDeleteTenantData}
                    disabled={loading}
                    className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 disabled:opacity-50 transition-colors"
                  >
                    ❌ Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {!tenantData && !loading && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-center py-8">
            <div className="text-gray-400 text-6xl mb-4">📊</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No hay datos cargados
            </h3>
            <p className="text-gray-800 mb-4">
              Ingresa un ID de tenant y haz clic en "Cargar Datos" para ver la
              información.
            </p>
            {credentials && (
              <button
                onClick={loadStoredCredentials}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                📥 Usar Credenciales Almacenadas
              </button>
            )}
          </div>
        </div>
      )}

      {/* Administración de Tenants */}
      <TenantAdminTab />
    </div>
  );
}
