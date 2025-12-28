'use client';

import { useState } from 'react';
import { Credentials } from '@/types';
import { useToast } from '@/hooks/useToast';
import { getSwaggerUrl } from '@/lib/config';

interface DocumentationTabProps {
  credentials: Credentials | null;
}

export function DocumentationTab({ credentials }: DocumentationTabProps) {
  const { showError } = useToast();

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

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          📚 Documentación de la API (Swagger UI)
        </h2>
        <p className="text-gray-800">
          Explora todos los endpoints disponibles y pruébalos directamente desde
          aquí. Las credenciales configuradas se aplicarán automáticamente.
        </p>
      </div>

      {!credentials && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-800 mb-2">
            ⚠️ Credenciales Requeridas
          </h3>
          <p className="text-yellow-700">
            Para acceder a la documentación interactiva, primero debes
            configurar tus credenciales en la pestaña "Testing APIs".
          </p>
        </div>
      )}

      {credentials && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-700">
              <strong>✅ Credenciales configuradas:</strong> Las credenciales se
              aplicarán automáticamente a todas las peticiones.
            </p>
            <div className="mt-2 text-xs text-green-600">
              <p>
                <strong>API Key:</strong> {credentials.apiKey}
              </p>
              <p>
                <strong>Tenant ID:</strong> {credentials.tenantId}
              </p>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
            <div className="mb-4">
              <div className="text-6xl mb-4">📖</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Documentación Interactiva
              </h3>
              <p className="text-gray-800 mb-4">
                Haz clic en "Abrir Swagger UI" para acceder a la documentación completa
                de la API con autenticación automática.
              </p>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={handleOpenSwagger}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                📚 Abrir Swagger UI
              </button>
              
              <p className="text-sm text-gray-600">
                Se abrirá en una nueva pestaña con las credenciales configuradas
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
