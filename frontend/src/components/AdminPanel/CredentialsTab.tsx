'use client';

import { useState } from 'react';
import { Credentials } from '@/types';
import { apiService, setStoredCredentials } from '@/lib/api-migrated';
import { generateRandomData, copyToClipboard } from '@/lib/utils';
import { useToast } from '@/hooks/useToast';

interface CredentialsTabProps {
  onCredentialsGenerated: (credentials: Credentials) => void;
}

export function CredentialsTab({
  onCredentialsGenerated,
}: CredentialsTabProps) {
  const [, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const { showToast, showSuccess, showError } = useToast();

  // Form data
  const [tenantName, setTenantName] = useState('');
  const [tenantCode, setTenantCode] = useState('');
  const [tenantCuit, setTenantCuit] = useState('');
  const [tenantType, setTenantType] = useState('BANCO');

  // Generated data
  const [generatedTenantId, setGeneratedTenantId] = useState('');
  const [generatedApiKey, setGeneratedApiKey] = useState('');
  const [generatedApiSecret, setGeneratedApiSecret] = useState('');

  const fillTestData = () => {
    const testData = generateRandomData();
    setTenantName(testData.tenantName);
    setTenantCode(testData.tenantCode);
    setTenantCuit(testData.tenantCuit);
    setTenantType(testData.tenantType);
    showSuccess('✅ Datos de prueba cargados');
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await apiService.createTenant({
        name: tenantName,
        code: tenantCode,
        cuit: tenantCuit,
      });

      if (result.data.success && result.data.data) {
        const tenantData = result.data.data as { id?: string; tenantId?: string };
        const tenantId = tenantData.id || tenantData.tenantId;
        if (!tenantId || tenantId === 'tenantId') {
          showError('❌ La respuesta del servidor no incluyó el ID del tenant');
          return;
        }
        setGeneratedTenantId(tenantId);
        showSuccess('✅ Tenant creado exitosamente');
        setStep(3);
      } else {
        showError(`❌ Error: ${result.data.message}`);
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';
      showError(`❌ Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateKeys = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!generatedTenantId) {
      showError('❌ Primero crea un tenant en el Paso 2');
      return;
    }

    setLoading(true);

    try {
      // Primero intentar obtener las credenciales existentes
      console.log('🔍 [DEBUG] Intentando obtener credenciales existentes para tenant:', generatedTenantId);
      const existingCredsResult = await apiService.getTenantCredentials(generatedTenantId);
      
      let result;
      if (existingCredsResult.data.success && existingCredsResult.data.data?.apiKey) {
        // Si ya existen credenciales, usarlas
        console.log('✅ [DEBUG] Credenciales existentes encontradas');
        result = existingCredsResult;
      } else {
        // Si no existen, generar nuevas
        console.log('🔄 [DEBUG] No hay credenciales existentes, generando nuevas...');
        result = await apiService.generateKeys(generatedTenantId);
      }

      if (result.data.success && result.data.data) {
        const creds = result.data.data.sandbox_credentials || result.data.data;
        const credentialsToStore = {
          apiKey: creds.apiKey,
          apiSecret: creds.apiSecret,
          tenantId: creds.tenantId
        };
        
        console.log('💾 [DEBUG] Credenciales a mostrar:', credentialsToStore);
        setGeneratedApiKey(credentialsToStore.apiKey);
        setGeneratedApiSecret(credentialsToStore.apiSecret);
        setStoredCredentials(credentialsToStore);
        // Guardar tenantId en localStorage para uso en otros componentes
        if (typeof window !== 'undefined') {
          localStorage.setItem('tenantId', credentialsToStore.tenantId);
        }
        onCredentialsGenerated(credentialsToStore);
        showSuccess('✅ API Keys obtenidas exitosamente');
        
        // Auto-scroll hacia las credenciales generadas después de un pequeño delay
        setTimeout(() => {
          const credentialsSection = document.getElementById('generated-credentials');
          if (credentialsSection) {
            credentialsSection.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center' 
            });
          }
        }, 500);
      } else {
        showError(`❌ Error: ${result.data.message}`);
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';
      showError(`❌ Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // Funciones de consulta de tenants movidas al TenantAdminTab

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="mb-2 text-2xl font-bold text-gray-900">
          🔑 Generar Credenciales API - Guía Paso a Paso
        </h2>
        <p className="text-gray-800">
          Sigue estos pasos para generar tus credenciales de API. Las
          credenciales se usan en los headers X-API-Key, X-API-Secret y
          X-Tenant-ID.
        </p>
      </div>


      {/* Paso 1: Crear Tenant Random (Opcional) */}
      <div className="p-6 bg-white rounded-lg border border-gray-200">
        <div className="flex items-center mb-4">
          <span className="flex justify-center items-center mr-3 w-8 h-8 text-sm font-bold text-white bg-blue-500 rounded-full">
            1
          </span>
          <h3 className="text-lg font-semibold">
            🧪 Paso 1: Crear Tenant Random (Opcional)
          </h3>
        </div>

        <p className="mb-4 text-gray-600">
          <strong>Opción A:</strong> Crea un tenant con datos aleatorios para
          pruebas rápidas.
        </p>
        <p className="mb-4 text-gray-600">
          <strong>Opción B:</strong> Si prefieres usar datos reales, puedes
          saltar este paso e ir directamente al Paso 2.
        </p>

        <div className="flex space-x-4">
          <button
            onClick={fillTestData}
            className="px-4 py-2 text-white bg-blue-500 rounded-md transition-colors hover:bg-blue-600"
          >
            🎲 Crear Tenant Random
          </button>
          <button
            onClick={() => setStep(2)}
            className="px-4 py-2 text-white bg-gray-500 rounded-md transition-colors hover:bg-gray-600"
          >
            ⏭️ Saltar al Paso 2
          </button>
        </div>

        <p className="mt-2 text-sm text-gray-500">
          💡 <strong>Nota:</strong> Los datos random incluyen un nombre, código,
          CUIT y tipo de tenant válidos para testing.
        </p>
      </div>

      {/* Paso 2: Crear Tenant */}
      <div className="p-6 bg-white rounded-lg border border-gray-200">
        <div className="flex items-center mb-4">
          <span className="flex justify-center items-center mr-3 w-8 h-8 text-sm font-bold text-white bg-green-500 rounded-full">
            2
          </span>
          <h3 className="text-lg font-semibold">🏦 Paso 2: Crear Tenant</h3>
        </div>

        <form onSubmit={handleCreateTenant} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-900">
                Nombre del Tenant
              </label>
              <input
                type="text"
                required
                value={tenantName || ''}
                onChange={e => setTenantName(e.target.value)}
                placeholder="Ej: Banco Demo"
                className="px-3 py-2 w-full rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-900">
                Código del Tenant
              </label>
              <input
                type="text"
                required
                value={tenantCode || ''}
                onChange={e => setTenantCode(e.target.value)}
                placeholder="Ej: BANCO_DEMO_001"
                className="px-3 py-2 w-full rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-900">
                CUIT (11 dígitos)
              </label>
              <input
                type="text"
                required
                value={tenantCuit || ''}
                onChange={e => setTenantCuit(e.target.value)}
                placeholder="Ej: 20123456789"
                className="px-3 py-2 w-full rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-900">
                Tipo de Institución
              </label>
              <select
                required
                value={tenantType || 'BANCO'}
                onChange={e => setTenantType(e.target.value)}
                className="px-3 py-2 w-full rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="BANCO">Banco</option>
                <option value="FINANCIERA">Financiera</option>
                <option value="EMPRESA">Empresa</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 w-full text-white bg-green-500 rounded-md transition-colors hover:bg-green-600 disabled:opacity-50"
          >
            {loading ? '⏳ Creando...' : '✅ Crear Tenant'}
          </button>
        </form>
      </div>

      {/* Paso 3: Generar API Keys */}
      <div className="p-6 bg-white rounded-lg border border-gray-200">
        <div className="flex items-center mb-4">
          <span className="flex justify-center items-center mr-3 w-8 h-8 text-sm font-bold text-white bg-purple-500 rounded-full">
            3
          </span>
          <h3 className="text-lg font-semibold">🔑 Paso 3: Generar API Keys</h3>
        </div>

        <form onSubmit={handleGenerateKeys} className="space-y-4">
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-900">
              ID del Tenant (se llena automáticamente)
            </label>
            <input
              type="text"
              readOnly
              value={generatedTenantId || ''}
              placeholder="Se llenará automáticamente después de crear el tenant"
              className="px-3 py-2 w-full text-gray-800 bg-gray-50 rounded-md border border-gray-300"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !generatedTenantId}
            className="px-4 py-2 w-full text-white bg-purple-500 rounded-md transition-colors hover:bg-purple-600 disabled:opacity-50"
          >
            {loading ? '⏳ Generando...' : '🔑 Generar API Keys'}
          </button>
        </form>

        {generatedApiKey && (
          <div id="generated-credentials" className="p-6 mt-8 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border-2 border-green-300 shadow-xl animate-pulse">
            <div className="flex items-center mb-4">
              <span className="mr-3 text-2xl">🎉</span>
              <h3 className="text-xl font-bold text-green-800">
                ¡Credenciales Generadas Exitosamente!
              </h3>
            </div>
            <div className="p-3 mb-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-sm text-yellow-800">
                <strong>💡 Importante:</strong> Estas credenciales son específicas para el tenant seleccionado.
                Puedes copiarlas usando los botones de abajo y luego ir a la pestaña &quot;Testing APIs&quot; para probarlas.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-white rounded-lg border-2 border-blue-200 shadow-md transition-shadow hover:shadow-lg">
                <div className="flex-1 mr-4">
                  <label className="flex items-center mb-2 text-sm font-bold text-blue-700">
                    🔑 API Key
                  </label>
                  <code className="block p-2 font-mono text-sm text-gray-900 break-all bg-gray-50 rounded border">
                    {generatedApiKey}
                  </code>
                </div>
                <button
                  onClick={() => copyToClipboard(generatedApiKey, showToast)}
                  className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow-md transition-all duration-200 transform hover:bg-blue-700 hover:shadow-lg hover:scale-105"
                >
                  📋 Copiar
                </button>
              </div>

              <div className="flex justify-between items-center p-4 bg-white rounded-lg border-2 border-purple-200 shadow-md transition-shadow hover:shadow-lg">
                <div className="flex-1 mr-4">
                  <label className="flex items-center mb-2 text-sm font-bold text-purple-700">
                    🔐 API Secret
                  </label>
                  <code className="block p-2 font-mono text-sm text-gray-900 break-all bg-gray-50 rounded border">
                    {generatedApiSecret}
                  </code>
                </div>
                <button
                  onClick={() => copyToClipboard(generatedApiSecret, showToast)}
                  className="px-4 py-2 text-sm font-semibold text-white bg-purple-600 rounded-lg shadow-md transition-all duration-200 transform hover:bg-purple-700 hover:shadow-lg hover:scale-105"
                >
                  📋 Copiar
                </button>
              </div>

              <div className="flex justify-between items-center p-4 bg-white rounded-lg border-2 border-green-200 shadow-md transition-shadow hover:shadow-lg">
                <div className="flex-1 mr-4">
                  <label className="flex items-center mb-2 text-sm font-bold text-green-700">
                    🏢 Tenant ID
                  </label>
                  <code className="block p-2 font-mono text-sm text-gray-900 break-all bg-gray-50 rounded border">
                    {generatedTenantId}
                  </code>
                </div>
                <button
                  onClick={() => copyToClipboard(generatedTenantId, showToast)}
                  className="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg shadow-md transition-all duration-200 transform hover:bg-green-700 hover:shadow-lg hover:scale-105"
                >
                  📋 Copiar
                </button>
              </div>
            </div>

            {/* Botón para copiar todas las credenciales */}
            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  const allCredentials = `API Key: ${generatedApiKey}\nAPI Secret: ${generatedApiSecret}\nTenant ID: ${generatedTenantId}`;
                  copyToClipboard(allCredentials, showToast);
                }}
                className="px-6 py-3 font-bold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-lg transition-all duration-200 transform hover:from-blue-700 hover:to-purple-700 hover:shadow-xl hover:scale-105"
              >
                📋 Copiar Todas las Credenciales
              </button>
            </div>

            <div className="p-3 mt-4 bg-blue-50 rounded-md">
              <h4 className="mb-2 font-semibold text-blue-800">
                🚀 Próximos Pasos
              </h4>
              <ul className="space-y-1 text-sm text-blue-700">
                <li>
                  1. Ve a la pestaña <strong>&quot;Testing APIs&quot;</strong>
                </li>
                <li>
                  2. Haz clic en{' '}
                  <strong>&quot;Cargar Credenciales Generadas&quot;</strong>
                </li>
                <li>3. Configura la autenticación automática</li>
                <li>4. Prueba los endpoints en Swagger</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
