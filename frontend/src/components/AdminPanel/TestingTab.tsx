'use client';

import { useState, useEffect, useCallback } from 'react';
import { Credentials } from '@/types';
import {
  apiService,
  getStoredCredentials,
  setStoredCredentials,
} from '@/lib/api-migrated';
import { copyToClipboard } from '@/lib/utils';
import { useToast } from '@/hooks/useToast';
import { getSwaggerUrl, config } from '@/lib/config';

const STORAGE_TENANT_KEY = 'tenantId';

function getCurrentTenantId(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(STORAGE_TENANT_KEY) || '';
}

interface TestingTabProps {
  credentials: Credentials | null;
  onCredentialsLoaded: (credentials: Credentials) => void;
}

export function TestingTab({
  credentials,
  onCredentialsLoaded,
}: TestingTabProps) {
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const { showSuccess, showError, showToast } = useToast();

  const applyStoredCredentialsForTenant = useCallback((currentTenantId: string) => {
    const stored = getStoredCredentials();
    if (!stored) return;
    if (stored.tenantId !== currentTenantId) return;
    setApiKey(stored.apiKey);
    setApiSecret(stored.apiSecret);
    setTenantId(stored.tenantId);
    onCredentialsLoaded(stored);
  }, [onCredentialsLoaded]);

  useEffect(() => {
    const id = getCurrentTenantId();
    if (id) setTenantId(id);
    applyStoredCredentialsForTenant(id);
  }, []);

  useEffect(() => {
    const handleTenantChanged = () => {
      const id = getCurrentTenantId();
      setTenantId(id);
      applyStoredCredentialsForTenant(id);
    };
    window.addEventListener('tenantChanged', handleTenantChanged);
    return () => window.removeEventListener('tenantChanged', handleTenantChanged);
  }, [applyStoredCredentialsForTenant]);

  useEffect(() => {
    if (credentials) {
      setApiKey(credentials.apiKey);
      setApiSecret(credentials.apiSecret);
      setTenantId(credentials.tenantId);
      if (typeof window !== 'undefined' && credentials.tenantId) {
        localStorage.setItem(STORAGE_TENANT_KEY, credentials.tenantId);
      }
    }
  }, [credentials]);

  const handleConfigureAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey || !apiSecret || !tenantId) {
      showError('Completa API Key, API Secret y Tenant ID');
      return;
    }
    setLoading(true);
    try {
      const testHeaders = {
        'X-API-Key': apiKey,
        'X-API-Secret': apiSecret,
        'X-Tenant-ID': tenantId,
        'Content-Type': 'application/json',
      };
      const apiBaseUrl = config.API_BASE_URL.endsWith('/')
        ? config.API_BASE_URL.slice(0, -1)
        : config.API_BASE_URL;
      const result = await fetch(`${apiBaseUrl}/validate`, {
        method: 'GET',
        headers: testHeaders,
      });
      if (result.ok) {
        const newCredentials = { apiKey, apiSecret, tenantId };
        setStoredCredentials(newCredentials);
        onCredentialsLoaded(newCredentials);
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_TENANT_KEY, tenantId);
          window.dispatchEvent(new CustomEvent('tenantChanged', { detail: { tenantId } }));
        }
        showSuccess('Credenciales válidas. Configuradas para Swagger y Operando con.', 4000);
      } else if (result.status === 401) {
        showError('Credenciales no válidas. Revisa API Key, Secret y Tenant ID.');
      } else {
        showError(`Error del core BFF: ${result.status} ${result.statusText}`);
      }
    } catch (error: unknown) {
      showError(`Error: ${error instanceof Error ? error.message : 'Conexión'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadGeneratedCredentials = () => {
    const storedCreds = getStoredCredentials();
    if (!storedCreds) {
      showError('No hay credenciales guardadas. Genera credenciales en "Credenciales API" o "Admin Tenants" primero.');
      return;
    }
    setApiKey(storedCreds.apiKey);
    setApiSecret(storedCreds.apiSecret);
    setTenantId(storedCreds.tenantId);
    onCredentialsLoaded(storedCreds);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_TENANT_KEY, storedCreds.tenantId);
      const credsJson = localStorage.getItem('echeq-credentials');
      if (credsJson) {
        try {
          const creds = JSON.parse(credsJson);
          creds.tenantId = storedCreds.tenantId;
          localStorage.setItem('echeq-credentials', JSON.stringify(creds));
        } catch {
          // ignore
        }
      }
      window.dispatchEvent(new CustomEvent('tenantChanged', { detail: { tenantId: storedCreds.tenantId } }));
    }
    showSuccess('Credenciales cargadas. Operando con este tenant.', 3000);
  };

  const handleTestConnection = async () => {
    if (!apiKey || !apiSecret || !tenantId) {
      showError('❌ Primero configura las credenciales');
      return;
    }

    setLoading(true);
    setTestResult(null);

    try {
      const result = await apiService.health();

      if (result.data.status?.toLowerCase() === 'ok') {
        setTestResult({
          success: true,
          message:
            'Conexión exitosa! El servicio está funcionando correctamente.',
          data: result.data,
        });
        showSuccess('✅ Conexión exitosa! El servicio está funcionando correctamente.', 3000);
      } else {
        setTestResult({
          success: false,
          message: 'Error en la conexión',
          data: result.data,
        });
        showError('❌ Error en la conexión');
      }
    } catch (error: any) {
      setTestResult({
        success: false,
        message: error.message,
        error: error,
      });
      showError(`❌ Error de conexión: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSwagger = () => {
    if (!credentials) {
      showError('Primero configura las credenciales en la pestaña "Testing APIs"');
      return;
    }
    
    // Crear URL con credenciales usando la función helper
    const urlWithCredentials = getSwaggerUrl(credentials);
    
    console.log('🔐 [SWAGGER] Abriendo Swagger UI con credenciales:', {
      apiKey: credentials.apiKey,
      apiSecret: credentials.apiSecret,
      tenantId: credentials.tenantId
    });
    
    // Abrir Swagger UI en nueva pestaña con credenciales
    window.open(urlWithCredentials, '_blank', 'noopener,noreferrer');
  };

  const generateCurlCommands = () => {
    const baseUrl = '/api/coelsa';

    const curlHealth = `curl -s -H "X-API-Key: ${apiKey}" \\
  -H "X-API-Secret: ${apiSecret}" \\
  -H "X-Tenant-ID: ${tenantId}" \\
  "${baseUrl}/health"`;

    const curlCheques = `curl -s -H "X-API-Key: ${apiKey}" \\
  -H "X-API-Secret: ${apiSecret}" \\
  -H "X-Tenant-ID: ${tenantId}" \\
  "${baseUrl}/Cheques/Cheque"`;

    const curlCuenta = `curl -s -X POST \\
  -H "X-API-Key: ${apiKey}" \\
  -H "X-API-Secret: ${apiSecret}" \\
  -H "X-Tenant-ID: ${tenantId}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "codigo_cuenta": "001",
    "denominacion": "Cuenta Demo",
    "cuit_emisor": "20123456789",
    "tipo_cuenta": "CORRIENTE",
    "estado": "ACTIVA"
  }' \\
  "${baseUrl}/Cuentas/Cuenta"`;

    return { curlHealth, curlCheques, curlCuenta };
  };

  const { curlHealth, curlCheques, curlCuenta } = generateCurlCommands();

  const currentTenantId = getCurrentTenantId();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold text-slate-900">
          Testing APIs
        </h2>
        <p className="text-sm text-slate-600">
          Usa el tenant de <strong>Operando con:</strong> del menú superior. Las credenciales se cargan automáticamente si están guardadas; &quot;Probar Credenciales&quot; valida contra el core BFF.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800">Tenant actual (Operando con)</h3>
          <span className="rounded bg-slate-200 px-2 py-1 font-mono text-sm text-slate-800">
            {currentTenantId || '—'}
          </span>
        </div>
        <p className="mb-4 text-sm text-slate-600">
          Carga las credenciales guardadas para este tenant o ingrésalas a mano y prueba contra el core BFF.
        </p>
        <button
          type="button"
          onClick={handleLoadGeneratedCredentials}
          className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Cargar credenciales guardadas
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-slate-800">
          Probar credenciales (core BFF)
        </h3>
        <p className="mb-4 text-sm text-slate-600">
          Los campos se rellenan con el tenant de Operando con. &quot;Probar Credenciales&quot; llama al endpoint de validación del core BFF con estas credenciales.
        </p>

        <form onSubmit={handleConfigureAccess} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">API Key</label>
              <input
                type="text"
                required
                value={apiKey || ''}
                onChange={e => setApiKey(e.target.value)}
                placeholder="sandbox_xxxx_xxxx_xxxx"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">API Secret</label>
              <input
                type="password"
                required
                value={apiSecret || ''}
                onChange={e => setApiSecret(e.target.value)}
                placeholder="secret_xxxx_xxxx_xxxx"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Tenant ID</label>
              <input
                type="text"
                required
                value={tenantId || ''}
                onChange={e => setTenantId(e.target.value)}
                placeholder="uuid o código del tenant"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Probando...' : 'Probar credenciales (core BFF)'}
          </button>
        </form>
      </div>

      {/* Estado de Conexión */}
      {credentials && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">
            ✅ Acceso Configurado
          </h3>
          <p className="text-slate-700 mb-4">
            Las credenciales han sido configuradas. Ahora puedes usar el Swagger
            con autenticación automática.
          </p>

          <div className="flex space-x-4">
            <button
              onClick={handleTestConnection}
              disabled={loading}
              className="px-4 py-2 bg-slate-700 text-white rounded-md hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              {loading ? '⏳ Probando...' : '🧪 Probar Conexión'}
            </button>
          </div>
        </div>
      )}

      {/* Resultado de Prueba */}
      {testResult && (
        <div
          className={`border rounded-lg p-4 ${testResult.success ? 'bg-slate-50 border-slate-200' : 'bg-red-50 border-red-200'}`}
        >
          <h4
            className={`font-semibold mb-2 ${testResult.success ? 'text-slate-800' : 'text-red-800'}`}
          >
            {testResult.success ? '✅ Prueba Exitosa' : '❌ Prueba Fallida'}
          </h4>
          <p
            className={`text-sm ${testResult.success ? 'text-slate-700' : 'text-red-700'}`}
          >
            {testResult.message}
          </p>
          {testResult.data && (
            <pre className="mt-2 text-xs bg-gray-800 text-white p-2 rounded overflow-x-auto">
              {JSON.stringify(testResult.data, null, 2)}
            </pre>
          )}
        </div>
      )}

      {/* Comandos cURL */}
      {credentials && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">
            💻 Comandos para Terminal
          </h3>

          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Health Check</h4>
              <div className="bg-gray-800 p-3 rounded-md">
                <pre className="text-sm text-white overflow-x-auto">{curlHealth}</pre>
                       <button
                         onClick={() => copyToClipboard(curlHealth, showToast)}
                         className="mt-2 px-3 py-1 bg-slate-700 text-white rounded-md hover:bg-slate-800 transition-colors text-sm"
                       >
                         📋 Copiar
                       </button>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">Listar Cheques</h4>
              <div className="bg-gray-800 p-3 rounded-md">
                <pre className="text-sm text-white overflow-x-auto">{curlCheques}</pre>
                       <button
                         onClick={() => copyToClipboard(curlCheques, showToast)}
                         className="mt-2 px-3 py-1 bg-slate-700 text-white rounded-md hover:bg-slate-800 transition-colors text-sm"
                       >
                         📋 Copiar
                       </button>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">Crear Cuenta</h4>
              <div className="bg-gray-800 p-3 rounded-md">
                <pre className="text-sm text-white overflow-x-auto">{curlCuenta}</pre>
                       <button
                         onClick={() => copyToClipboard(curlCuenta, showToast)}
                         className="mt-2 px-3 py-1 bg-slate-700 text-white rounded-md hover:bg-slate-800 transition-colors text-sm"
                       >
                         📋 Copiar
                       </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Swagger UI Embebido */}
      {credentials && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">
            📖 Documentación Interactiva (Swagger UI)
          </h3>
          <p className="text-gray-800 mb-4">
            La documentación completa de la API está disponible en el panel de Swagger a continuación. 
            Las credenciales configuradas se aplicarán automáticamente.
          </p>
          
          <div className="border border-gray-300 rounded-lg overflow-hidden">
            <div className="p-4 text-center">
              <p className="text-gray-800 mb-4">
                Para acceder a la documentación interactiva de la API, visita:
              </p>
              <button 
                onClick={handleOpenSwagger}
                className="inline-flex items-center px-4 py-2 bg-slate-700 text-white rounded-md hover:bg-slate-800 transition-colors"
              >
                📚 Abrir Swagger UI
              </button>
              <p className="text-sm text-gray-700 mt-2">
                Las credenciales se aplicarán automáticamente en la interfaz de Swagger UI
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
