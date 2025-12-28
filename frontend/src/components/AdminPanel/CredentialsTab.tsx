'use client';

import { useState } from 'react';
import { Credentials, Tenant } from '@/types';
import { apiService, setStoredCredentials } from '@/lib/api-migrated';
import { generateRandomData, copyToClipboard } from '@/lib/utils';
import { useToast } from '@/hooks/useToast';

interface CredentialsTabProps {
  onCredentialsGenerated: (credentials: Credentials) => void;
}

export function CredentialsTab({
  onCredentialsGenerated,
}: CredentialsTabProps) {
  const [step, setStep] = useState(1);
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
        setGeneratedTenantId(result.data.data.id);
        showSuccess('✅ Tenant creado exitosamente');
        setStep(3);
      } else {
        showError(`❌ Error: ${result.data.message}`);
      }
    } catch (error: any) {
      showError(`❌ Error: ${error.message}`);
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
    } catch (error: any) {
      showError(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Funciones de consulta de tenants movidas al TenantAdminTab

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          🔑 Generar Credenciales API - Guía Paso a Paso
        </h2>
        <p className="text-gray-800">
          Sigue estos pasos para generar tus credenciales de API. Las
          credenciales se usan en los headers X-API-Key, X-API-Secret y
          X-Tenant-ID.
        </p>
      </div>


      {/* Paso 1: Crear Tenant Random (Opcional) */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <span className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">
            1
          </span>
          <h3 className="text-lg font-semibold">
            🧪 Paso 1: Crear Tenant Random (Opcional)
          </h3>
        </div>

        <p className="text-gray-600 mb-4">
          <strong>Opción A:</strong> Crea un tenant con datos aleatorios para
          pruebas rápidas.
        </p>
        <p className="text-gray-600 mb-4">
          <strong>Opción B:</strong> Si prefieres usar datos reales, puedes
          saltar este paso e ir directamente al Paso 2.
        </p>

        <div className="flex space-x-4">
          <button
            onClick={fillTestData}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            🎲 Crear Tenant Random
          </button>
          <button
            onClick={() => setStep(2)}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
          >
            ⏭️ Saltar al Paso 2
          </button>
        </div>

        <p className="text-sm text-gray-500 mt-2">
          💡 <strong>Nota:</strong> Los datos random incluyen un nombre, código,
          CUIT y tipo de tenant válidos para testing.
        </p>
      </div>

      {/* Paso 2: Crear Tenant */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <span className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">
            2
          </span>
          <h3 className="text-lg font-semibold">🏦 Paso 2: Crear Tenant</h3>
        </div>

        <form onSubmit={handleCreateTenant} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Nombre del Tenant
              </label>
              <input
                type="text"
                required
                value={tenantName || ''}
                onChange={e => setTenantName(e.target.value)}
                placeholder="Ej: Banco Demo"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Código del Tenant
              </label>
              <input
                type="text"
                required
                value={tenantCode || ''}
                onChange={e => setTenantCode(e.target.value)}
                placeholder="Ej: BANCO_DEMO_001"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                CUIT (11 dígitos)
              </label>
              <input
                type="text"
                required
                value={tenantCuit || ''}
                onChange={e => setTenantCuit(e.target.value)}
                placeholder="Ej: 20123456789"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Tipo de Institución
              </label>
              <select
                required
                value={tenantType || 'BANCO'}
                onChange={e => setTenantType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            className="w-full px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 transition-colors"
          >
            {loading ? '⏳ Creando...' : '✅ Crear Tenant'}
          </button>
        </form>
      </div>

      {/* Paso 3: Generar API Keys */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <span className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">
            3
          </span>
          <h3 className="text-lg font-semibold">🔑 Paso 3: Generar API Keys</h3>
        </div>

        <form onSubmit={handleGenerateKeys} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              ID del Tenant (se llena automáticamente)
            </label>
            <input
              type="text"
              readOnly
              value={generatedTenantId || ''}
              placeholder="Se llenará automáticamente después de crear el tenant"
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-800"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !generatedTenantId}
            className="w-full px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 disabled:opacity-50 transition-colors"
          >
            {loading ? '⏳ Generando...' : '🔑 Generar API Keys'}
          </button>
        </form>

        {generatedApiKey && (
          <div id="generated-credentials" className="mt-8 p-6 bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-300 rounded-xl shadow-xl animate-pulse">
            <div className="flex items-center mb-4">
              <span className="text-2xl mr-3">🎉</span>
              <h3 className="text-xl font-bold text-green-800">
                ¡Credenciales Generadas Exitosamente!
              </h3>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-yellow-800 text-sm">
                <strong>💡 Importante:</strong> Estas credenciales son específicas para el tenant seleccionado. 
                Puedes copiarlas usando los botones de abajo y luego ir a la pestaña "Testing APIs" para probarlas.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-white rounded-lg border-2 border-blue-200 shadow-md hover:shadow-lg transition-shadow">
                <div className="flex-1 mr-4">
                  <label className="text-sm font-bold text-blue-700 flex items-center mb-2">
                    🔑 API Key
                  </label>
                  <code className="block text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded border break-all">
                    {generatedApiKey}
                  </code>
                </div>
                <button
                  onClick={() => copyToClipboard(generatedApiKey, showToast)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 text-sm font-semibold shadow-md hover:shadow-lg transform hover:scale-105"
                >
                  📋 Copiar
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-white rounded-lg border-2 border-purple-200 shadow-md hover:shadow-lg transition-shadow">
                <div className="flex-1 mr-4">
                  <label className="text-sm font-bold text-purple-700 flex items-center mb-2">
                    🔐 API Secret
                  </label>
                  <code className="block text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded border break-all">
                    {generatedApiSecret}
                  </code>
                </div>
                <button
                  onClick={() => copyToClipboard(generatedApiSecret, showToast)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all duration-200 text-sm font-semibold shadow-md hover:shadow-lg transform hover:scale-105"
                >
                  📋 Copiar
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-white rounded-lg border-2 border-green-200 shadow-md hover:shadow-lg transition-shadow">
                <div className="flex-1 mr-4">
                  <label className="text-sm font-bold text-green-700 flex items-center mb-2">
                    🏢 Tenant ID
                  </label>
                  <code className="block text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded border break-all">
                    {generatedTenantId}
                  </code>
                </div>
                <button
                  onClick={() => copyToClipboard(generatedTenantId, showToast)}
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
                  const allCredentials = `API Key: ${generatedApiKey}\nAPI Secret: ${generatedApiSecret}\nTenant ID: ${generatedTenantId}`;
                  copyToClipboard(allCredentials, showToast);
                }}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-bold shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                📋 Copiar Todas las Credenciales
              </button>
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-md">
              <h4 className="font-semibold text-blue-800 mb-2">
                🚀 Próximos Pasos
              </h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>
                  1. Ve a la pestaña <strong>"Testing APIs"</strong>
                </li>
                <li>
                  2. Haz clic en{' '}
                  <strong>"Cargar Credenciales Generadas"</strong>
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
