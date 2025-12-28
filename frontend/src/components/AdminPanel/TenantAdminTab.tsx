'use client';

import { useState } from 'react';
import { Tenant, Credentials } from '@/types';
import { apiService, setStoredCredentials } from '@/lib/api-migrated';
import { copyToClipboard } from '@/lib/utils';
import { useToast } from '@/hooks/useToast';

interface TenantAdminTabProps {
  onCredentialsGenerated?: (credentials: Credentials) => void;
}

export function TenantAdminTab({ onCredentialsGenerated }: TenantAdminTabProps) {
  const [loading, setLoading] = useState(false);
  const [adminKey, setAdminKey] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [tenantsList, setTenantsList] = useState<Tenant[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [generatedCredentials, setGeneratedCredentials] = useState<Credentials | null>(null);
  const [viewMode, setViewMode] = useState<'active' | 'trash'>('active'); // Toggle entre activos y papelera
  const { showSuccess, showError, showToast } = useToast();

  const handleLoadTenants = async (mode: 'active' | 'trash' = 'active') => {
    if (adminKey !== 'admin1234') {
      showError('Clave de administrador incorrecta');
      return;
    }

    setLoading(true);

    try {
      const result = mode === 'active' 
        ? await apiService.getActiveTenants()
        : await apiService.getInactiveTenants();

      console.log('🔍 [DEBUG] Resultado de getActiveTenants/getInactiveTenants:', result);

      if (result.data.success && result.data.data) {
        // El backend puede devolver {data: {tenants: [...]}} o {data: [...]}
        let tenantsArray: Tenant[] = [];
        const dataValue = result.data.data;
        
        if (Array.isArray(dataValue)) {
          // Si data es directamente un array
          tenantsArray = dataValue;
        } else if (typeof dataValue === 'object' && dataValue !== null) {
          // Si data es un objeto, verificar si tiene tenants o data
          const dataObj = dataValue as Record<string, unknown>;
          if ('tenants' in dataObj && Array.isArray(dataObj.tenants)) {
            // Si data tiene una propiedad tenants con el array
            tenantsArray = dataObj.tenants as Tenant[];
          } else if ('data' in dataObj && Array.isArray(dataObj.data)) {
            // Si hay un nivel adicional de anidación
            tenantsArray = dataObj.data as Tenant[];
          }
        }
        
        console.log('🔍 [DEBUG] Tenants extraídos:', tenantsArray);
        
        setTenantsList(tenantsArray);
        setIsAuthenticated(true);
        setViewMode(mode);
        showSuccess(`Tenants ${mode === 'active' ? 'activos' : 'en papelera'} cargados exitosamente (${tenantsArray.length})`, 2000);
      } else {
        console.error('🔍 [DEBUG] Error en respuesta:', result.data);
        showError(`Error cargando tenants: ${result.data.message || 'Respuesta inválida del servidor'}`);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      showError(`Error de conexión: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadTenantCredentials = async (tenant: Tenant) => {
    if (adminKey !== 'admin1234') {
      showError('Clave de administrador incorrecta');
      return;
    }

    setLoading(true);
    setSelectedTenant(tenant);

    try {
      const result = await apiService.getTenantCredentials(tenant.id);

      if (result.data.success && 'data' in result.data && result.data.data) {
        const responseData = result.data.data as Record<string, unknown>;
        
        // Extraer las credenciales desde la respuesta del backend NestJS
        let creds: Credentials;
        const sandboxCreds = responseData.sandbox_credentials as Record<string, unknown> | undefined;
        if (sandboxCreds && typeof sandboxCreds === 'object' && Object.keys(sandboxCreds).length > 0) {
          creds = {
            apiKey: String(sandboxCreds.apiKey || ''),
            apiSecret: String(sandboxCreds.apiSecret || ''),
            tenantId: String(sandboxCreds.tenantId || '')
          };
        } else {
          // Credenciales directas del backend NestJS
          creds = {
            apiKey: String(responseData.apiKey || ''),
            apiSecret: String(responseData.apiSecret || ''),
            tenantId: String(responseData.tenantId || '')
          };
        }
        
        setGeneratedCredentials(creds);
        setStoredCredentials(creds);
        if (onCredentialsGenerated) {
          onCredentialsGenerated(creds);
        }
        showSuccess('Credenciales recuperadas exitosamente', 2000);
        
        // Auto-scroll hacia las credenciales generadas
        setTimeout(() => {
          const credentialsSection = document.getElementById('admin-generated-credentials');
          if (credentialsSection) {
            credentialsSection.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center' 
            });
          }
        }, 500);
      } else {
        console.log('🔍 [DEBUG] Error en respuesta:', result.data);
        const errorMessage = 'message' in result.data ? String(result.data.message) : 'Error desconocido';
        showError(`Error recuperando credenciales: ${errorMessage}`);
      }
    } catch (error: unknown) {
      console.error('🔍 [DEBUG] Error en catch:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      showError(`Error de conexión: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLoadTenants();
    }
  };

  const handleDeleteTenant = async (tenant: Tenant) => {
    if (adminKey !== 'admin1234') {
      showError('Clave de administrador incorrecta');
      return;
    }

    if (!confirm(`¿Estás seguro de que quieres mover a papelera el tenant "${tenant.name}"?\n\nPodrás restaurarlo desde la papelera.`)) {
      return;
    }

    setLoading(true);

    try {
      const result = await apiService.deleteTenant(tenant.id, adminKey);

      if (result.data.success) {
        showSuccess(`Tenant "${tenant.name}" movido a papelera exitosamente`, 3000);
        // Recargar la lista de tenants
        handleLoadTenants(viewMode);
      } else {
        const errorMessage = 'message' in result.data ? String(result.data.message) : 'Error desconocido';
        showError(`Error moviendo tenant a papelera: ${errorMessage}`);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      showError(`Error de conexión: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreTenant = async (tenant: Tenant) => {
    if (adminKey !== 'admin1234') {
      showError('Clave de administrador incorrecta');
      return;
    }

    if (!confirm(`¿Estás seguro de que quieres restaurar el tenant "${tenant.name}"?`)) {
      return;
    }

    setLoading(true);

    try {
      const result = await apiService.restoreTenant(tenant.id, adminKey);

      if (result.data.success) {
        showSuccess(`Tenant "${tenant.name}" restaurado exitosamente`, 3000);
        // Recargar la lista de tenants de papelera
        handleLoadTenants('trash');
      } else {
        const errorMessage = 'message' in result.data ? String(result.data.message) : 'Error desconocido';
        showError(`Error restaurando tenant: ${errorMessage}`);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      showError(`Error de conexión: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePermanentDeleteTenant = async (tenant: Tenant) => {
    if (adminKey !== 'admin1234') {
      showError('Clave de administrador incorrecta');
      return;
    }

    if (!confirm(`⚠️ ADVERTENCIA: ¿Estás seguro de que quieres ELIMINAR PERMANENTEMENTE el tenant "${tenant.name}"?\n\n❌ Esta acción NO se puede deshacer.\n❌ Se perderán todos los datos asociados.\n\n¿Continuar con la eliminación permanente?`)) {
      return;
    }

    // Segunda confirmación para acción destructiva
    if (!confirm(`🚨 ÚLTIMA CONFIRMACIÓN: Esta es una acción IRREVERSIBLE.\n\nTenant: "${tenant.name}"\nID: ${tenant.id}\n\n¿Proceder con la eliminación PERMANENTE?`)) {
      return;
    }

    setLoading(true);

    try {
      const result = await apiService.permanentDeleteTenant(tenant.id, adminKey);

      if (result.data.success) {
        showSuccess(`Tenant "${tenant.name}" eliminado permanentemente`, 3000);
        // Recargar la lista de tenants de papelera
        handleLoadTenants('trash');
      } else {
        const errorMessage = 'message' in result.data ? String(result.data.message) : 'Error desconocido';
        showError(`Error eliminando tenant permanentemente: ${errorMessage}`);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      showError(`Error de conexión: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          🔐 Administración de Tenants
        </h2>
        <p className="text-gray-800">
          Panel exclusivo para administradores. Consulta y gestiona las credenciales de todos los tenants del sistema.
        </p>
      </div>

      {/* Sección de Autenticación de Admin */}
      <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <span className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">
            🔒
          </span>
          <h3 className="text-lg font-semibold text-red-800">
            Acceso Restringido - Solo Administradores
          </h3>
        </div>
        
        <p className="text-red-700 mb-4">
          Esta sección requiere credenciales de administrador para acceder a la gestión de tenants y credenciales del sistema.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-red-700 mb-2">
              Clave de Administrador:
            </label>
            <div className="flex items-center gap-4">
              <input
                type="password"
                placeholder="Ingresa la clave de administrador"
                value={adminKey || ''}
                onChange={e => setAdminKey(e.target.value)}
                onKeyPress={handleAdminKeyPress}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => handleLoadTenants('active')}
                disabled={loading || !adminKey}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {loading ? '⏳ Cargando...' : '🔐 Acceder'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Tenants */}
      {(() => {
        console.log('🔍 [DEBUG] Renderizado - isAuthenticated:', isAuthenticated, 'tenantsList.length:', tenantsList.length);
        return isAuthenticated && tenantsList.length > 0;
      })() && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {viewMode === 'active' ? '📋 Tenants Activos' : '🗑️ Papelera'} ({tenantsList.length})
              </h3>
              {/* Toggle entre Activos y Papelera */}
              <div className="flex bg-gray-100 rounded-md p-1">
                <button
                  onClick={() => handleLoadTenants('active')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'active'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  ✅ Activos
                </button>
                <button
                  onClick={() => handleLoadTenants('trash')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'trash'
                      ? 'bg-white text-red-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  🗑️ Papelera
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setTenantsList([]);
                  setGeneratedCredentials(null);
                  setSelectedTenant(null);
                }}
                className="px-3 py-1 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors text-sm"
              >
                🔄 Limpiar
              </button>
              <button
                onClick={() => {
                  setIsAuthenticated(false);
                  setAdminKey('');
                  setTenantsList([]);
                  setGeneratedCredentials(null);
                  setSelectedTenant(null);
                }}
                className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors text-sm"
              >
                🚪 Cerrar Sesión
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tenantsList.map(tenant => (
              <div
                key={tenant.id}
                className={`border rounded-lg p-4 transition-all duration-200 ${
                  selectedTenant?.id === tenant.id
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <h4 className="font-semibold text-gray-900 text-sm">
                    {tenant.name}
                  </h4>
                  {selectedTenant?.id === tenant.id && (
                    <span className="px-2 py-1 bg-blue-500 text-white text-xs rounded-full">
                      Activo
                    </span>
                  )}
                </div>
                
                <div className="space-y-1 text-xs text-gray-800 mb-3">
                  <p><strong>ID:</strong> <span className="font-mono">{tenant.id}</span></p>
                  <p><strong>Código:</strong> {tenant.code}</p>
                  <p><strong>CUIT:</strong> {tenant.cuit}</p>
                  {/* Use tenant.status if available, otherwise use is_active */}
                  <p><strong>Estado:</strong> <span className={(tenant.status === 'ACTIVE' || tenant.is_active) ? "text-green-600" : "text-red-600"}>{(tenant.status === 'ACTIVE' || tenant.is_active) ? "Activo" : "Inactivo"}</span></p>
                  <p><strong>Creado:</strong> {new Date(tenant.createdAt).toLocaleString('es-AR')}</p>
                </div>
                
                <div className="flex gap-2">
                  {viewMode === 'active' ? (
                    <>
                      <button
                        onClick={() => handleLoadTenantCredentials(tenant)}
                        disabled={loading}
                        className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm font-medium"
                      >
                        {loading && selectedTenant?.id === tenant.id ? '⏳ Cargando...' : '🔑 Obtener Credenciales'}
                      </button>
                      <button
                        onClick={() => handleDeleteTenant(tenant)}
                        disabled={loading}
                        className="px-3 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50 transition-colors text-sm font-medium"
                        title="Mover a papelera"
                      >
                        🗑️
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleRestoreTenant(tenant)}
                        disabled={loading}
                        className="flex-1 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors text-sm font-medium"
                        title="Restaurar tenant"
                      >
                        ♻️ Restaurar
                      </button>
                      <button
                        onClick={() => handlePermanentDeleteTenant(tenant)}
                        disabled={loading}
                        className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors text-sm font-medium"
                        title="Eliminar permanentemente"
                      >
                        ❌
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Credenciales Generadas */}
      {generatedCredentials && selectedTenant && (
        <div id="admin-generated-credentials" className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-300 rounded-xl shadow-xl p-6">
          <div className="flex items-center mb-4">
            <span className="text-2xl mr-3">🎉</span>
            <h3 className="text-xl font-bold text-green-800">
              Credenciales del Tenant: {selectedTenant.name}
            </h3>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <p className="text-yellow-800 text-sm">
              <strong>⚠️ Confidencial:</strong> Estas credenciales son específicas del tenant seleccionado. 
              Manéjalas con cuidado y no las compartas con usuarios no autorizados.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-white rounded-lg border-2 border-blue-200 shadow-md">
              <div className="flex-1 mr-4">
                <label className="text-sm font-bold text-blue-700 flex items-center mb-2">
                  🔑 API Key
                </label>
                <code className="block text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded border break-all">
                  {generatedCredentials.apiKey}
                </code>
              </div>
              <button
                onClick={() => copyToClipboard(generatedCredentials.apiKey, showToast)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 text-sm font-semibold shadow-md hover:shadow-lg transform hover:scale-105"
              >
                📋 Copiar
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-white rounded-lg border-2 border-purple-200 shadow-md">
              <div className="flex-1 mr-4">
                <label className="text-sm font-bold text-purple-700 flex items-center mb-2">
                  🔐 API Secret
                </label>
                <code className="block text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded border break-all">
                  {generatedCredentials.apiSecret}
                </code>
              </div>
              <button
                onClick={() => copyToClipboard(generatedCredentials.apiSecret, showToast)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all duration-200 text-sm font-semibold shadow-md hover:shadow-lg transform hover:scale-105"
              >
                📋 Copiar
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-white rounded-lg border-2 border-green-200 shadow-md">
              <div className="flex-1 mr-4">
                <label className="text-sm font-bold text-green-700 flex items-center mb-2">
                  🏢 Tenant ID
                </label>
                <code className="block text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded border break-all">
                  {generatedCredentials.tenantId}
                </code>
              </div>
              <button
                onClick={() => copyToClipboard(generatedCredentials.tenantId, showToast)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 text-sm font-semibold shadow-md hover:shadow-lg transform hover:scale-105"
              >
                📋 Copiar
              </button>
            </div>
          </div>

          {/* Botón para copiar todas las credenciales */}
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                const allCredentials = `API Key: ${generatedCredentials.apiKey}\nAPI Secret: ${generatedCredentials.apiSecret}\nTenant ID: ${generatedCredentials.tenantId}`;
                copyToClipboard(allCredentials, showToast);
              }}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-bold shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              📋 Copiar Todas las Credenciales
            </button>
          </div>

        </div>
      )}
    </div>
  );
}