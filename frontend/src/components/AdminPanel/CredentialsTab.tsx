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

  // Mapeo tipo frontend → enum del backend (TenantType)
  const tenantTypeToBackend = (t: string) => {
    const map: Record<string, string> = {
      BANCO: 'BANK',
      FINANCIERA: 'FINANCIAL',
      EMPRESA: 'COMPANY',
      PAYMENT_SERVICE: 'PAYMENT_SERVICE',
    };
    return map[t] || t;
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await apiService.createTenant({
        name: tenantName,
        code: tenantCode,
        cuit: tenantCuit,
        type: tenantTypeToBackend(tenantType || 'BANCO'),
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
      <div>
        <h2 className="mb-1 text-xl font-semibold text-slate-800">
          Generar Credenciales API
        </h2>
        <p className="text-sm text-slate-600">
          Sigue los pasos. Las credenciales se usan en los headers X-API-Key, X-API-Secret y X-Tenant-ID.
        </p>
      </div>

      {/* Paso 1: Crear Tenant Random (Opcional) */}
      <div className="p-5 rounded-lg border border-slate-200 bg-slate-50/50">
        <div className="flex items-center mb-3">
          <span className="flex justify-center items-center mr-3 w-7 h-7 text-xs font-semibold text-slate-700 bg-slate-200 rounded-full">
            1
          </span>
          <h3 className="text-base font-medium text-slate-800">
            Paso 1: Crear Tenant Random (opcional)
          </h3>
        </div>

        <p className="mb-3 text-sm text-slate-600">
          <strong>Opción A:</strong> Crea un tenant con datos aleatorios. <strong>Opción B:</strong> Saltar al Paso 2.
        </p>

        <div className="flex gap-3">
          <button
            onClick={fillTestData}
            className="px-3 py-2 text-sm font-medium text-white bg-slate-700 rounded-md hover:bg-slate-800 transition-colors"
          >
            Crear Tenant Random
          </button>
          <button
            onClick={() => setStep(2)}
            type="button"
            className="px-3 py-2 text-sm font-medium text-slate-700 bg-slate-200 rounded-md hover:bg-slate-300 transition-colors"
          >
            Saltar al Paso 2
          </button>
        </div>

        <p className="mt-2 text-xs text-slate-500">
          Los datos random incluyen nombre, código, CUIT y tipo válidos para testing.
        </p>
      </div>

      {/* Paso 2: Crear Tenant */}
      <div className="p-5 rounded-lg border border-slate-200 bg-slate-50/50">
        <div className="flex items-center mb-3">
          <span className="flex justify-center items-center mr-3 w-7 h-7 text-xs font-semibold text-slate-700 bg-slate-200 rounded-full">
            2
          </span>
          <h3 className="text-base font-medium text-slate-800">Paso 2: Crear Tenant</h3>
        </div>

        <form onSubmit={handleCreateTenant} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block mb-1 text-sm font-medium text-slate-700">
                Nombre del Tenant
              </label>
              <input
                type="text"
                required
                value={tenantName || ''}
                onChange={e => setTenantName(e.target.value)}
                placeholder="Ej: Banco Demo"
                className="px-3 py-2 w-full rounded-md border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
              />
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium text-slate-700">
                Código del Tenant
              </label>
              <input
                type="text"
                required
                value={tenantCode || ''}
                onChange={e => setTenantCode(e.target.value)}
                placeholder="Ej: BANCO_DEMO_001"
                className="px-3 py-2 w-full rounded-md border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block mb-1 text-sm font-medium text-slate-700">
                CUIT (11 dígitos)
              </label>
              <input
                type="text"
                required
                value={tenantCuit || ''}
                onChange={e => setTenantCuit(e.target.value)}
                placeholder="Ej: 20123456789"
                className="px-3 py-2 w-full rounded-md border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
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
                className="px-3 py-2 w-full rounded-md border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
              >
                <option value="BANCO">Banco</option>
                <option value="FINANCIERA">Financiera</option>
                <option value="EMPRESA">Empresa</option>
                <option value="PAYMENT_SERVICE">Servicio de Pago</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 w-full text-sm font-medium text-white bg-slate-700 rounded-md hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Creando...' : 'Crear Tenant'}
          </button>
        </form>
      </div>

      {/* Paso 3: Generar API Keys */}
      <div className="p-5 rounded-lg border border-slate-200 bg-slate-50/50">
        <div className="flex items-center mb-3">
          <span className="flex justify-center items-center mr-3 w-7 h-7 text-xs font-semibold text-slate-700 bg-slate-200 rounded-full">
            3
          </span>
          <h3 className="text-base font-medium text-slate-800">Paso 3: Generar API Keys</h3>
        </div>

        <form onSubmit={handleGenerateKeys} className="space-y-4">
          <div>
            <label className="block mb-1 text-sm font-medium text-slate-700">
              ID del Tenant (se llena automáticamente)
            </label>
            <input
              type="text"
              readOnly
              value={generatedTenantId || ''}
              placeholder="Se llenará automáticamente después de crear el tenant"
              className="px-3 py-2 w-full text-slate-800 bg-slate-100 rounded-md border border-slate-300"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !generatedTenantId}
            className="px-4 py-2 w-full text-sm font-medium text-white bg-slate-700 rounded-md hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Generando...' : 'Generar API Keys'}
          </button>
        </form>

        {generatedApiKey && (
          <div id="generated-credentials" className="p-5 mt-6 rounded-lg border border-slate-200 bg-white shadow-sm">
            <h3 className="mb-2 text-base font-semibold text-slate-800">
              Credenciales generadas
            </h3>
            <p className="mb-4 text-sm text-slate-600">
              Específicas para el tenant seleccionado. Copia con los botones y usa la pestaña &quot;Testing APIs&quot; para probarlas.
            </p>

            <div className="space-y-3">
              <div className="flex justify-between items-center gap-4 p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                <div className="flex-1 min-w-0">
                  <label className="block mb-1 text-xs font-medium text-slate-600">API Key</label>
                  <code className="block p-2 font-mono text-sm text-slate-900 break-all bg-white rounded border border-slate-200">
                    {generatedApiKey}
                  </code>
                </div>
                <button
                  onClick={() => copyToClipboard(generatedApiKey, showToast)}
                  className="shrink-0 px-3 py-2 text-sm font-medium text-white bg-slate-700 rounded-md hover:bg-slate-800 transition-colors"
                >
                  Copiar
                </button>
              </div>

              <div className="flex justify-between items-center gap-4 p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                <div className="flex-1 min-w-0">
                  <label className="block mb-1 text-xs font-medium text-slate-600">API Secret</label>
                  <code className="block p-2 font-mono text-sm text-slate-900 break-all bg-white rounded border border-slate-200">
                    {generatedApiSecret}
                  </code>
                </div>
                <button
                  onClick={() => copyToClipboard(generatedApiSecret, showToast)}
                  className="shrink-0 px-3 py-2 text-sm font-medium text-white bg-slate-700 rounded-md hover:bg-slate-800 transition-colors"
                >
                  Copiar
                </button>
              </div>

              <div className="flex justify-between items-center gap-4 p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                <div className="flex-1 min-w-0">
                  <label className="block mb-1 text-xs font-medium text-slate-600">Tenant ID</label>
                  <code className="block p-2 font-mono text-sm text-slate-900 break-all bg-white rounded border border-slate-200">
                    {generatedTenantId}
                  </code>
                </div>
                <button
                  onClick={() => copyToClipboard(generatedTenantId, showToast)}
                  className="shrink-0 px-3 py-2 text-sm font-medium text-white bg-slate-700 rounded-md hover:bg-slate-800 transition-colors"
                >
                  Copiar
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={() => {
                  const allCredentials = `API Key: ${generatedApiKey}\nAPI Secret: ${generatedApiSecret}\nTenant ID: ${generatedTenantId}`;
                  copyToClipboard(allCredentials, showToast);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-slate-700 rounded-md hover:bg-slate-800 transition-colors"
              >
                Copiar todas las credenciales
              </button>
            </div>

            <div className="p-3 mt-4 rounded-md border border-slate-200 bg-slate-50">
              <h4 className="mb-1 text-sm font-medium text-slate-800">Próximos pasos</h4>
              <ul className="space-y-0.5 text-xs text-slate-600">
                <li>1. Ir a la pestaña &quot;Testing APIs&quot;</li>
                <li>2. Clic en &quot;Cargar Credenciales Generadas&quot;</li>
                <li>3. Configurar autenticación y probar en Swagger</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
