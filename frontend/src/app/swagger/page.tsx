'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getSwaggerUrl } from '@/lib/config';

function SwaggerContent() {
  const searchParams = useSearchParams();

  useEffect(() => {
    // Verificar que estamos en el cliente
    if (typeof window === 'undefined') return;
    
    // Cargar Swagger UI dinámicamente
    const loadSwaggerUI = async () => {
      try {
        // Cargar CSS
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui.css';
        document.head.appendChild(link);

        // Cargar JS
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-bundle.js';
        script.onload = () => {
          // Leer credenciales de los parámetros de URL
          const apiKey = searchParams.get('apiKey');
          const apiSecret = searchParams.get('apiSecret');
          const tenantId = searchParams.get('tenantId');
          
          console.log('🔍 [SWAGGER] Parámetros de URL encontrados:', {
            apiKey: apiKey ? apiKey.substring(0, 10) + '...' : 'No encontrado',
            apiSecret: apiSecret ? apiSecret.substring(0, 10) + '...' : 'No encontrado',
            tenantId: tenantId ? tenantId.substring(0, 10) + '...' : 'No encontrado'
          });
          
          // @ts-ignore - SwaggerUIBundle está disponible globalmente
          // Usar getSwaggerUrl del config para obtener la URL correcta
          const swaggerUrl = getSwaggerUrl();
          const swaggerJsonUrl = swaggerUrl.replace('/docs', '/docs-json');
          console.log('🔍 [SWAGGER] URL configurada:', swaggerJsonUrl);
          const ui = window.SwaggerUIBundle({
            url: swaggerJsonUrl,
            dom_id: '#swagger-ui',
            presets: [
              // @ts-ignore
              window.SwaggerUIBundle.presets.apis,
              // @ts-ignore
              window.SwaggerUIBundle.presets.standalone
            ],
            onComplete: function() {
              console.log('✅ [SWAGGER] Swagger UI cargado con autenticación automática');
              if (apiKey && apiSecret && tenantId) {
                console.log('🔐 [SWAGGER] Pre-autorizando credenciales automáticamente...');
                ui.preauthorizeApiKey("CoelsaApiKey", apiKey);
                ui.preauthorizeApiKey("CoelsaApiSecret", apiSecret);
                ui.preauthorizeApiKey("CoelsaTenantId", tenantId);
                console.log('🔐 [SWAGGER] Credenciales pre-autorizadas en Swagger UI.');
              } else {
                console.warn('⚠️ [SWAGGER] No se encontraron credenciales válidas en URL para pre-autorizar.');
              }
            }
          });
        };
        document.head.appendChild(script);

        return () => {
          // Cleanup
          if (document.head.contains(link)) {
            document.head.removeChild(link);
          }
          if (document.head.contains(script)) {
            document.head.removeChild(script);
          }
        };
      } catch (error) {
        console.error('Error cargando Swagger UI:', error);
      }
    };

    loadSwaggerUI();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            📚 COELSA Sandbox API Documentation
          </h1>
          <div id="swagger-ui" className="swagger-ui"></div>
        </div>
      </div>
    </div>
  );
}

export default function SwaggerPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando documentación...</p>
        </div>
      </div>
    }>
      <SwaggerContent />
    </Suspense>
  );
}
