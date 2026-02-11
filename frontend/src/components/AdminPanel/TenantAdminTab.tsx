'use client';

import { useState } from 'react';
import { Tenant, Credentials } from '@/types';
import { apiService, setStoredCredentials } from '@/lib/api-migrated';
import { copyToClipboard } from '@/lib/utils';
import { useToast } from '@/hooks/useToast';
import { useAdminAuth } from '@/contexts/AdminAuthContext';

interface TenantAdminTabProps {
  onCredentialsGenerated?: (credentials: Credentials) => void;
}

export function TenantAdminTab({ onCredentialsGenerated }: TenantAdminTabProps) {
  const { adminKey, logout } = useAdminAuth();
  const [loading, setLoading] = useState(false);
  const [tenantsList, setTenantsList] = useState<Tenant[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [generatedCredentials, setGeneratedCredentials] = useState<Credentials | null>(null);
  const [viewMode, setViewMode] = useState<'active' | 'trash'>('active');
  const { showSuccess, showError, showToast } = useToast();

  const handleLoadTenants = async (mode: 'active' | 'trash' = 'active') => {
    if (!adminKey) return;

    setLoading(true);

    try {
      const result = mode === 'active' 
        ? await apiService.getActiveTenants(adminKey)
        : await apiService.getInactiveTenants(adminKey);

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

        setTenantsList(tenantsArray);
        setViewMode(mode);
        showSuccess(`Tenants ${mode === 'active' ? 'activos' : 'en papelera'} cargados exitosamente (${tenantsArray.length})`, 2000);
      } else {
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
    if (!adminKey) return;

    const tenantId = (tenant as Tenant & { tenantId?: string }).id || (tenant as Tenant & { tenantId?: string }).tenantId;
    if (!tenantId || tenantId === 'tenantId') {
      showError('ID del tenant no disponible');
      return;
    }

    setLoading(true);
    setSelectedTenant(tenant);

    try {
      const result = await apiService.getTenantCredentials(tenantId);

      if (result.data.success && 'data' in result.data && result.data.data) {
        const responseData = result.data.data as Record<string, unknown>;
        
        // Extraer las credenciales desde la respuesta del backend NestJS
        let creds: Credentials;
        const sandboxCreds = responseData.sandbox_credentials as Record<string, unknown> | undefined;
        if (sandboxCreds && typeof sandboxCreds === 'object' && Object.keys(sandboxCreds).length > 0) {
          creds = {
            apiKey: String(sandboxCreds.apiKey || sandboxCreds.api_key || ''),
            apiSecret: String(sandboxCreds.apiSecret || sandboxCreds.api_secret || ''),
            tenantId: String(sandboxCreds.tenantId || sandboxCreds.tenant_id || '')
          };
        } else {
          // Credenciales directas del backend (camelCase o snake_case)
          creds = {
            apiKey: String(responseData.apiKey || responseData.api_key || ''),
            apiSecret: String(responseData.apiSecret || responseData.api_secret || ''),
            tenantId: String(responseData.tenantId || responseData.tenant_id || '')
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

  const handleGenerateTenantCredentials = async (tenant: Tenant) => {
    if (!adminKey) return;

    const tenantId = (tenant as Tenant & { tenantId?: string }).id || (tenant as Tenant & { tenantId?: string }).tenantId;
    if (!tenantId || tenantId === 'tenantId') {
      showError('ID del tenant no disponible');
      return;
    }

    setLoading(true);
    setSelectedTenant(tenant);

    try {
      const result = await apiService.generateKeys(tenantId);

      if (result.data && typeof result.data === 'object' && 'data' in result.data && result.data.data) {
        const responseData = (result.data as { data: Record<string, unknown> }).data;
        const sandboxCreds = responseData.sandbox_credentials as Record<string, unknown> | undefined;
        const creds: Credentials = sandboxCreds && typeof sandboxCreds === 'object' && Object.keys(sandboxCreds).length > 0
          ? {
              apiKey: String(sandboxCreds.apiKey || sandboxCreds.api_key || ''),
              apiSecret: String(sandboxCreds.apiSecret || sandboxCreds.api_secret || ''),
              tenantId: String(sandboxCreds.tenantId || sandboxCreds.tenant_id || tenantId)
            }
          : {
              apiKey: String(responseData.apiKey || responseData.api_key || ''),
              apiSecret: String(responseData.apiSecret || responseData.api_secret || ''),
              tenantId: String(responseData.tenantId || responseData.tenant_id || tenantId)
            };
        setGeneratedCredentials(creds);
        setStoredCredentials(creds);
        if (onCredentialsGenerated) onCredentialsGenerated(creds);
        showSuccess('Credenciales generadas exitosamente', 2000);
        setTimeout(() => {
          const el = document.getElementById('admin-generated-credentials');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 500);
      } else {
        const msg = (result.data as { message?: string })?.message || 'Error al generar credenciales';
        showError(msg);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      showError(`Error generando credenciales: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTenant = async (tenant: Tenant) => {
    if (!adminKey) return;

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
    if (!adminKey) return;

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
    if (!adminKey) return;

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
      <div>
        <h2 className="mb-1 text-xl font-semibold text-slate-800">
          Admin Tenants
        </h2>
        <p className="text-sm text-slate-600">
          Panel exclusivo para administradores. Consulta y gestiona las credenciales de todos los tenants del sistema.
        </p>
      </div>

      {/* Cargar lista de tenants */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => handleLoadTenants('active')}
          disabled={loading || !adminKey}
          className="px-4 py-2 text-sm font-medium text-white bg-slate-700 rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Cargando...' : 'Cargar tenants activos'}
        </button>
        <button
          onClick={() => handleLoadTenants('trash')}
          disabled={loading || !adminKey}
          className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-200 rounded-lg hover:bg-slate-300 disabled:opacity-50 transition-colors"
        >
          Cargar papelera
        </button>
      </div>

      {/* Lista de Tenants */}
      {tenantsList.length > 0 && (
        <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap justify-between items-center gap-4 mb-5">
            <div className="flex gap-4 items-center">
              <h3 className="text-base font-semibold text-slate-800">
                {viewMode === 'active' ? 'Tenants activos' : 'Papelera'} ({tenantsList.length})
              </h3>
              {/* Toggle entre Activos y Papelera */}
              <div className="flex p-1 bg-slate-100 rounded-md">
                <button
                  onClick={() => handleLoadTenants('active')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'active'
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Activos
                </button>
                <button
                  onClick={() => handleLoadTenants('trash')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'trash'
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Papelera
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
                className="px-3 py-1 text-sm font-medium text-slate-700 bg-slate-200 rounded-md transition-colors hover:bg-slate-300"
              >
                Limpiar
              </button>
              <button
                onClick={() => {
                  logout();
                  setTenantsList([]);
                  setGeneratedCredentials(null);
                  setSelectedTenant(null);
                }}
                className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-slate-200 rounded-md transition-colors hover:bg-slate-300"
              >
                Cerrar sesión
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {tenantsList.map(tenant => (
              <div
                key={tenant.id}
                className={`rounded-xl border p-4 transition-all duration-200 ${
                  selectedTenant?.id === tenant.id
                    ? 'border-slate-400 bg-slate-50 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                }`}
              >
                <div className="flex justify-between items-start gap-2 mb-3">
                  <h4 className="text-sm font-semibold text-slate-800 truncate">
                    {tenant.name}
                  </h4>
                  {selectedTenant?.id === tenant.id && (
                    <span className="shrink-0 px-2 py-0.5 text-xs font-medium text-slate-600 bg-slate-200 rounded-full">
                      Seleccionado
                    </span>
                  )}
                </div>

                <div className="mb-4 space-y-1.5 text-xs text-slate-600">
                  <p><strong>ID:</strong> <span className="font-mono">{tenant.id}</span></p>
                  <p><strong>Código:</strong> {tenant.code}</p>
                  <p><strong>CUIT:</strong> {tenant.cuit}</p>
                  {/* Estado: API puede enviar status ('ACTIVE'|'INACTIVE') o is_active/isActive */}
                  {(() => {
                    const active = tenant.status === 'ACTIVE' || tenant.is_active === true || tenant.isActive === true;
                    return (
                      <p><strong>Estado:</strong> <span className={active ? "text-slate-700" : "text-slate-500"}>{active ? "Activo" : "Inactivo"}</span></p>
                    );
                  })()}
                  <p><strong>Creado:</strong> {new Date(tenant.createdAt).toLocaleString('es-AR')}</p>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {viewMode === 'active' ? (
                    <>
                      <button
                        onClick={() => handleLoadTenantCredentials(tenant)}
                        disabled={loading}
                        className="flex-1 min-w-0 px-3 py-2 text-sm font-medium text-white bg-slate-700 rounded-lg transition-colors hover:bg-slate-800 disabled:opacity-50"
                        title="Obtener credenciales existentes"
                      >
                        {loading && selectedTenant?.id === tenant.id ? 'Cargando…' : 'Obtener credenciales'}
                      </button>
                      <button
                        onClick={() => handleGenerateTenantCredentials(tenant)}
                        disabled={loading}
                        className="flex-1 min-w-0 px-3 py-2 text-sm font-medium text-slate-700 bg-slate-200 rounded-lg transition-colors hover:bg-slate-300 disabled:opacity-50"
                        title="Generar nuevas credenciales (API Key y Secret)"
                      >
                        Generar credenciales
                      </button>
                      <button
                        onClick={() => handleDeleteTenant(tenant)}
                        disabled={loading}
                        className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
                        title="Mover a papelera"
                      >
                        <span className="sr-only">Mover a papelera</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleRestoreTenant(tenant)}
                        disabled={loading}
                        className="flex-1 min-w-0 px-3 py-2 text-sm font-medium text-white bg-slate-700 rounded-lg transition-colors hover:bg-slate-800 disabled:opacity-50"
                        title="Restaurar tenant"
                      >
                        Restaurar
                      </button>
                      <button
                        onClick={() => handlePermanentDeleteTenant(tenant)}
                        disabled={loading}
                        className="px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-lg transition-colors hover:bg-red-700 disabled:opacity-50"
                        title="Eliminar permanentemente"
                      >
                        Eliminar
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
        <div id="admin-generated-credentials" className="p-5 rounded-lg border border-slate-200 bg-white shadow-sm">
          <h3 className="mb-2 text-base font-semibold text-slate-800">
            Credenciales: {selectedTenant.name}
          </h3>
          <p className="mb-4 text-sm text-slate-600">
            Confidenciales. No compartir con usuarios no autorizados.
          </p>

          <div className="space-y-3">
            <div className="flex justify-between items-center gap-4 p-3 rounded-lg border border-slate-200 bg-slate-50/50">
              <div className="flex-1 min-w-0">
                <label className="block mb-1 text-xs font-medium text-slate-600">API Key</label>
                <code className="block p-2 font-mono text-sm text-slate-900 break-all bg-white rounded border border-slate-200">
                  {generatedCredentials.apiKey}
                </code>
              </div>
              <button
                onClick={() => copyToClipboard(generatedCredentials.apiKey, showToast)}
                className="shrink-0 px-3 py-2 text-sm font-medium text-white bg-slate-700 rounded-md hover:bg-slate-800 transition-colors"
              >
                Copiar
              </button>
            </div>

            <div className="flex justify-between items-center gap-4 p-3 rounded-lg border border-slate-200 bg-slate-50/50">
              <div className="flex-1 min-w-0">
                <label className="block mb-1 text-xs font-medium text-slate-600">API Secret</label>
                <code className="block p-2 font-mono text-sm text-slate-900 break-all bg-white rounded border border-slate-200">
                  {generatedCredentials.apiSecret}
                </code>
              </div>
              <button
                onClick={() => copyToClipboard(generatedCredentials.apiSecret, showToast)}
                className="shrink-0 px-3 py-2 text-sm font-medium text-white bg-slate-700 rounded-md hover:bg-slate-800 transition-colors"
              >
                Copiar
              </button>
            </div>

            <div className="flex justify-between items-center gap-4 p-3 rounded-lg border border-slate-200 bg-slate-50/50">
              <div className="flex-1 min-w-0">
                <label className="block mb-1 text-xs font-medium text-slate-600">Tenant ID</label>
                <code className="block p-2 font-mono text-sm text-slate-900 break-all bg-white rounded border border-slate-200">
                  {generatedCredentials.tenantId}
                </code>
              </div>
              <button
                onClick={() => copyToClipboard(generatedCredentials.tenantId, showToast)}
                className="shrink-0 px-3 py-2 text-sm font-medium text-white bg-slate-700 rounded-md hover:bg-slate-800 transition-colors"
              >
                Copiar
              </button>
            </div>
          </div>

          <div className="mt-4">
            <button
              onClick={() => {
                const allCredentials = `API Key: ${generatedCredentials.apiKey}\nAPI Secret: ${generatedCredentials.apiSecret}\nTenant ID: ${generatedCredentials.tenantId}`;
                copyToClipboard(allCredentials, showToast);
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-slate-700 rounded-md hover:bg-slate-800 transition-colors"
            >
              Copiar todas las credenciales
            </button>
          </div>
        </div>
      )}
    </div>
  );
}