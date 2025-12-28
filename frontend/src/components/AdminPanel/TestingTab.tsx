'use client';

import { useState, useEffect } from 'react';
import { Credentials } from '@/types';
import {
  apiService,
  getStoredCredentials,
  setStoredCredentials,
} from '@/lib/api-migrated';
import { copyToClipboard } from '@/lib/utils';
import { useToast } from '@/hooks/useToast';
import { getSwaggerUrl, config } from '@/lib/config';

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

  useEffect(() => {
    if (credentials) {
      setApiKey(credentials.apiKey);
      setApiSecret(credentials.apiSecret);
      setTenantId(credentials.tenantId);
    }
  }, [credentials]);

  const handleConfigureAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🔍 handleConfigureAccess ejecutado');
    
    if (!apiKey || !apiSecret || !tenantId) {
      console.log('❌ Campos vacíos');
      showError('Por favor, completa todos los campos de credenciales');
      return;
    }

    console.log('⏳ Iniciando validación de credenciales...');
    setLoading(true);
    
    try {
      // Probar las credenciales usando un endpoint que requiera autenticación
      console.log('🌐 Validando credenciales con endpoint autenticado...');
      
      // Crear headers con las credenciales para probar
      const testHeaders = {
        'X-API-Key': apiKey,
        'X-API-Secret': apiSecret,
        'X-Tenant-ID': tenantId,
        'Content-Type': 'application/json'
      };
      
      // Usar el endpoint de validación que requiere autenticación
      // Usar la función centralizada de configuración para obtener la URL correcta del BFF
      const apiBaseUrl = config.API_BASE_URL.endsWith('/') 
        ? config.API_BASE_URL.slice(0, -1) 
        : config.API_BASE_URL;
      const result = await fetch(`${apiBaseUrl}/validate`, {
        method: 'GET',
        headers: testHeaders
      });
      
      console.log('📊 Resultado de validación:', result.status);
      
      if (result.ok) {
        console.log('✅ Credenciales válidas');
        const newCredentials = { apiKey, apiSecret, tenantId };
        setStoredCredentials(newCredentials);
        onCredentialsLoaded(newCredentials);
        showSuccess('✅ Credenciales válidas y configuradas! Ahora puedes usar el Swagger con autenticación automática.', 4000);
      } else if (result.status === 401) {
        console.log('❌ Credenciales inválidas - No autorizado');
        showError('❌ Las credenciales no son válidas. Verifica los datos e intenta nuevamente.');
      } else {
        console.log('❌ Error en validación:', result.status);
        showError(`❌ Error validando credenciales: ${result.status} ${result.statusText}`);
      }
    } catch (error: any) {
      console.log('❌ Error en validación:', error);
      showError(`❌ Error validando credenciales: ${error.message}`);
    } finally {
      setLoading(false);
      console.log('🏁 Validación completada');
    }
  };

  const handleLoadGeneratedCredentials = () => {
    const storedCreds = getStoredCredentials();
    if (!storedCreds) {
      showError('❌ No hay credenciales generadas. Ve a la pestaña "Credenciales API" y genera las credenciales primero.');
      return;
    }

    setApiKey(storedCreds.apiKey);
    setApiSecret(storedCreds.apiSecret);
    setTenantId(storedCreds.tenantId);
    onCredentialsLoaded(storedCreds);
    showSuccess('✅ Credenciales cargadas exitosamente desde el almacenamiento local', 3000);
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

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          🧪 Testing APIs
        </h2>
        <p className="text-gray-800">
          Configura tus credenciales de API para probar los endpoints y acceder
          a la documentación de Swagger con autenticación automática.
        </p>
      </div>

      {/* Credenciales Guardadas */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <span className="text-2xl mr-3">📥</span>
          <h3 className="text-lg font-semibold text-blue-800">
            Credenciales Guardadas
          </h3>
        </div>
        <p className="text-blue-700 mb-4">
          Carga credenciales que ya tienes guardadas en el navegador.
        </p>
        <button
          onClick={handleLoadGeneratedCredentials}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          📥 Cargar Credenciales Guardadas
        </button>
      </div>

      {/* Credenciales Manuales */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <span className="text-2xl mr-3">🔍</span>
          <h3 className="text-lg font-semibold text-green-800">
            Probar Credenciales Manuales
          </h3>
        </div>
        <p className="text-green-700 mb-4">
          Ingresa credenciales específicas para probar su validez.
        </p>
        
        <form onSubmit={handleConfigureAccess} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                API Key
              </label>
              <input
                type="text"
                required
                value={apiKey || ''}
                onChange={e => setApiKey(e.target.value)}
                placeholder="sandbox_xxxx_xxxx_xxxx"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                API Secret
              </label>
              <input
                type="password"
                required
                value={apiSecret || ''}
                onChange={e => setApiSecret(e.target.value)}
                placeholder="secret_xxxx_xxxx_xxxx"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Tenant ID
              </label>
              <input
                type="text"
                required
                value={tenantId || ''}
                onChange={e => setTenantId(e.target.value)}
                placeholder="uuid-tenant-id"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '⏳ Probando...' : '🔍 Probar Credenciales'}
          </button>
        </form>
      </div>

      {/* Estado de Conexión */}
      {credentials && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-800 mb-4">
            ✅ Acceso Configurado
          </h3>
          <p className="text-green-700 mb-4">
            Las credenciales han sido configuradas. Ahora puedes usar el Swagger
            con autenticación automática.
          </p>

          <div className="flex space-x-4">
            <button
              onClick={handleTestConnection}
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              {loading ? '⏳ Probando...' : '🧪 Probar Conexión'}
            </button>
          </div>
        </div>
      )}

      {/* Resultado de Prueba */}
      {testResult && (
        <div
          className={`border rounded-lg p-4 ${testResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}
        >
          <h4
            className={`font-semibold mb-2 ${testResult.success ? 'text-green-800' : 'text-red-800'}`}
          >
            {testResult.success ? '✅ Prueba Exitosa' : '❌ Prueba Fallida'}
          </h4>
          <p
            className={`text-sm ${testResult.success ? 'text-green-700' : 'text-red-700'}`}
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
                         className="mt-2 px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm"
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
                         className="mt-2 px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm"
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
                         className="mt-2 px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm"
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
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
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
