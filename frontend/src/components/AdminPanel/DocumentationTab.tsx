'use client';

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
    const urlWithCredentials = getSwaggerUrl(credentials);
    window.open(urlWithCredentials, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          📚 Documentación de la API
        </h2>
        <p className="text-gray-700">
          La plataforma expone dos conjuntos de APIs. Abajo se describe cada uno y el enlace a la documentación interactiva (Swagger).
        </p>
      </div>

      {!credentials && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h3 className="font-semibold text-amber-800 mb-2">
            ⚠️ Credenciales requeridas
          </h3>
          <p className="text-amber-700 text-sm">
            Para abrir Swagger UI con autenticación, configura credenciales en la pestaña &quot;Testing APIs&quot;.
          </p>
        </div>
      )}

      {/* Emulador COELSA */}
      <section className="rounded-xl border border-slate-200 bg-slate-50/50 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-100/80">
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <span className="text-2xl">🧾</span>
            Emulador COELSA
          </h3>
          <p className="text-sm text-slate-600 mt-1">
            API que emula el estándar COELSA para cheques electrónicos y operaciones asociadas.
          </p>
        </div>
        <div className="p-5 space-y-3 text-sm text-slate-700">
          <p>
            Incluye los módulos compatibles con el ecosistema COELSA: cuentas emisoras (Cuentas/Cuenta),
            cheques (emisión, consulta, custodia), endosos, cesión, avales, certificados, mandatos y notificaciones.
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-600">
            <li>Cuentas (alta/consulta de cuenta emisora)</li>
            <li>Cheques (emisión, admisión, custodia, estadísticas)</li>
            <li>Endosos, Cesión, Avales, Certificados</li>
            <li>Mandatos y Notificaciones</li>
            <li>Seguridad (validación de acceso)</li>
          </ul>
          <p className="text-slate-500 pt-1">
            En Swagger aparecen bajo rutas como <code className="bg-slate-200 px-1 rounded">/api/coelsa/...</code> y tags COELSA.
          </p>
        </div>
      </section>

      {/* Core transaccional */}
      <section className="rounded-xl border border-slate-200 bg-slate-50/50 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-100/50">
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <span className="text-2xl">💳</span>
            Core transaccional
          </h3>
          <p className="text-sm text-slate-600 mt-1">
            API de pagos y operaciones de la plataforma: transacciones, transferencias, cuentas internas, reportes y más.
          </p>
        </div>
        <div className="p-5 space-y-3 text-sm text-slate-700">
          <p>
            Incluye transacciones unificadas, transferencias (internas y a CBU/CVU), cuentas del tenant (api/accounts),
            débitos automáticos, payment links, conciliación, reportes y métricas, balances y webhooks.
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-600">
            <li>Transacciones (creación, consulta, estados)</li>
            <li>Transferencias (origen/destino, CBU externo)</li>
            <li>Cuentas (listado/alta por tenant)</li>
            <li>Débitos automáticos (mandatos)</li>
            <li>Payment Links y pagos digitales</li>
            <li>Conciliación y Reportes / Analytics</li>
            <li>Balances, Tenants, Logs</li>
          </ul>
          <p className="text-slate-500 pt-1">
            En Swagger aparecen bajo rutas <code className="bg-slate-200 px-1 rounded">api/transactions</code>, <code className="bg-slate-200 px-1 rounded">api/transfers</code>, <code className="bg-slate-200 px-1 rounded">api/accounts</code>, <code className="bg-slate-200 px-1 rounded">api/reconciliation</code>, <code className="bg-slate-200 px-1 rounded">api/reports</code>, etc.
          </p>
        </div>
      </section>

      {/* Acceso a Swagger */}
      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Documentación interactiva (Swagger UI)
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Swagger incluye tanto el <strong>Emulador COELSA</strong> como el <strong>Core transaccional</strong>. Podés filtrar por tags o buscar por ruta para ver solo una parte.
        </p>
        {credentials && (
          <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800">
            <strong>Credenciales configuradas:</strong> API Key, Tenant ID y Secret se aplicarán en las peticiones desde Swagger.
          </div>
        )}
        <button
          onClick={handleOpenSwagger}
          className="w-full sm:w-auto px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
        >
          📚 Abrir Swagger UI (todas las APIs)
        </button>
      </section>
    </div>
  );
}
