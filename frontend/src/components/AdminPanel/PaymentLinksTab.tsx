'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToastContext } from '@/contexts/ToastContext';
import { nestjsApi } from '@/lib/api/nestjs-client';

interface PaymentLinkForm {
  amount: string;
  currency: string;
  description: string;
  reference: string;
  expiresAt: string;
  maxUses: string;
  successUrl: string;
  cancelUrl: string;
}

interface PaymentLink {
  id: string;
  token: string;
  status: string;
  amount: number;
  currency: string;
  description?: string;
  reference?: string;
  expiresAt?: string;
  maxUses?: number;
  usesCount: number;
  createdAt: string;
  url?: string;
}

/**
 * Helper para obtener el tenantId del localStorage de forma consistente
 */
const getTenantId = (): string => {
  if (typeof window === 'undefined') return '';
  
  // Intentar múltiples fuentes
  const tenantId = localStorage.getItem('tenantId');
  if (tenantId) return tenantId;
  
  const currentTenantId = localStorage.getItem('current_tenant_id');
  if (currentTenantId) return currentTenantId;
  
  // Intentar desde credenciales guardadas
  try {
    const storedCreds = localStorage.getItem('echeq-credentials');
    if (storedCreds) {
      const creds = JSON.parse(storedCreds);
      if (creds.tenantId) return creds.tenantId;
    }
    } catch {
      // Ignorar errores de parsing
    }
  
  return '';
};

export function PaymentLinksTab() {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paymentLinks, setPaymentLinks] = useState<PaymentLink[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(true);
  const [formData, setFormData] = useState<PaymentLinkForm>({
    amount: '',
    currency: 'ARS',
    description: '',
    reference: '',
    expiresAt: '',
    maxUses: '',
    successUrl: '',
    cancelUrl: '',
  });
  const [createdLink, setCreatedLink] = useState<{ url: string; qrCode: string } | null>(null);
  const { showSuccess, showError } = useToastContext();

  const loadPaymentLinks = useCallback(async () => {
    try {
      setLoadingLinks(true);
      const tenantId = getTenantId();
      
      if (!tenantId) {
        setPaymentLinks([]);
        setLoadingLinks(false);
        return;
      }
      
      const response = await nestjsApi.getPaymentLinks(tenantId);
      
      if (response.success && response.data) {
        const linksData = Array.isArray(response.data) 
          ? response.data 
          : (response.data.paymentLinks || response.data.data || []);
        setPaymentLinks(linksData);
      } else {
        setPaymentLinks([]);
      }
    } catch (error: unknown) {
      console.error('Error loading payment links:', error);
      setPaymentLinks([]);
      showError('Error al cargar los payment links');
    } finally {
      setLoadingLinks(false);
    }
  }, [showError]);

  useEffect(() => {
    loadPaymentLinks();
  }, [loadPaymentLinks]);

  // Escuchar cambios de tenant
  useEffect(() => {
    const handleTenantChange = () => {
      loadPaymentLinks();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('tenantChanged', handleTenantChange);
      return () => window.removeEventListener('tenantChanged', handleTenantChange);
    }
  }, [loadPaymentLinks]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const tenantId = getTenantId();
    
    if (!tenantId) {
      showError('Tenant ID no encontrado. Selecciona un tenant primero.');
      return;
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      showError('El monto debe ser mayor a 0');
      return;
    }

    // Validar URLs si se proporcionan
    if (formData.successUrl && !isValidUrl(formData.successUrl)) {
      showError('La URL de éxito no es válida');
      return;
    }

    if (formData.cancelUrl && !isValidUrl(formData.cancelUrl)) {
      showError('La URL de cancelación no es válida');
      return;
    }

    // Validar maxUses si se proporciona
    if (formData.maxUses && (parseInt(formData.maxUses, 10) < 1)) {
      showError('El máximo de usos debe ser mayor a 0');
      return;
    }

    try {
      setLoading(true);

      const response = await nestjsApi.createPaymentLink({
        tenantId,
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        description: formData.description,
        reference: formData.reference,
        expiresAt: formData.expiresAt || undefined,
        maxUses: formData.maxUses ? parseInt(formData.maxUses, 10) : undefined,
        successUrl: formData.successUrl || undefined,
        cancelUrl: formData.cancelUrl || undefined,
      });

      const raw = response as { success?: boolean; data?: { data?: { url?: string; qrCode?: string }; url?: string; qrCode?: string }; url?: string; qrCode?: string; message?: string };
      const linkData = raw?.data?.data ?? raw?.data ?? raw;
      const url = linkData?.url ?? '';
      const qrCode = linkData?.qrCode ?? '';

      if (url || qrCode || raw?.success) {
        setCreatedLink({ url, qrCode });
        showSuccess('Payment Link creado exitosamente');
        setFormData({
          amount: '',
          currency: 'ARS',
          description: '',
          reference: '',
          expiresAt: '',
          maxUses: '',
          successUrl: '',
          cancelUrl: '',
        });
        setShowForm(false);
        loadPaymentLinks();
      } else {
        showError(raw?.message || 'Error al crear el payment link');
      }
    } catch (error: unknown) {
      console.error('Error creating payment link:', error);
      const errorMessage = (error as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message 
        || (error as { message?: string })?.message 
        || 'Error al crear el payment link. Verifica los datos e intenta nuevamente.';
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showSuccess('Copiado al portapapeles');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      showError('Error al copiar al portapapeles');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Payment Links</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 text-white bg-blue-600 rounded-lg transition-colors hover:bg-blue-700"
        >
          {showForm ? '✕ Cancelar' : '+ Crear Payment Link'}
        </button>
      </div>

      {showForm && (
        <div className="p-6 bg-white rounded-lg border border-gray-200">
          <h3 className="mb-4 text-lg font-semibold text-gray-800">Nuevo Payment Link</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Monto *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Moneda *
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ARS">ARS - Peso Argentino</option>
                  <option value="USD">USD - Dólar</option>
                </select>
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Referencia
                </label>
                <input
                  type="text"
                  value={formData.reference}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                  placeholder="Número de factura, orden, etc."
                  className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Fecha de Expiración
                </label>
                <input
                  type="datetime-local"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                  className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Máximo de Usos
                </label>
                <input
                  type="number"
                  value={formData.maxUses}
                  onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                  placeholder="Sin límite"
                  min="1"
                  className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">
                Descripción
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripción del pago"
                rows={3}
                className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  URL de Éxito
                </label>
                <input
                  type="url"
                  value={formData.successUrl}
                  onChange={(e) => setFormData({ ...formData, successUrl: e.target.value })}
                  placeholder="https://..."
                  className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  URL de Cancelación
                </label>
                <input
                  type="url"
                  value={formData.cancelUrl}
                  onChange={(e) => setFormData({ ...formData, cancelUrl: e.target.value })}
                  placeholder="https://..."
                  className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 transition-colors hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-white bg-blue-600 rounded-lg transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Creando...' : 'Crear Payment Link'}
              </button>
            </div>
          </form>
        </div>
      )}

      {createdLink && (
        <div className="p-6 bg-green-50 rounded-lg border border-green-200">
          <h3 className="mb-4 text-lg font-semibold text-green-800">✅ Payment Link Creado</h3>
          <div className="space-y-4">
            <div>
              <label className="block mb-1 text-sm font-medium text-green-700">URL del Link</label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={createdLink.url}
                  readOnly
                  className="flex-1 px-3 py-2 bg-white rounded-lg border border-green-300"
                />
                <button
                  onClick={() => copyToClipboard(createdLink.url)}
                  className="px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700"
                >
                  Copiar
                </button>
              </div>
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium text-green-700">Código QR</label>
              <div className="flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={createdLink.qrCode} alt="QR Code" className="w-48 h-48 rounded-lg border border-green-300" />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-hidden bg-white rounded-lg border border-gray-200">
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Payment Links Activos</h3>
          <button
            onClick={loadPaymentLinks}
            className="px-3 py-1 text-sm bg-gray-100 rounded-lg transition-colors hover:bg-gray-200"
          >
            🔄 Actualizar
          </button>
        </div>
        {loadingLinks ? (
          <div className="py-12 text-center">
            <div className="inline-block w-8 h-8 rounded-full border-b-2 border-blue-600 animate-spin"></div>
            <p className="mt-4 text-gray-600">Cargando payment links...</p>
          </div>
        ) : paymentLinks.length === 0 ? (
          <div className="py-12 text-center bg-gray-50">
            <p className="mb-2 text-gray-600">No hay payment links disponibles</p>
            <p className="text-sm text-gray-500">
              Los payment links creados aparecerán aquí
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                    Token
                  </th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                    Monto
                  </th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                    Usos
                  </th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                    Expira
                  </th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                    Fecha
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paymentLinks.map((link) => (
                  <tr key={link.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono text-sm text-gray-900 whitespace-nowrap">
                      {link.token.substring(0, 20)}...
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900 whitespace-nowrap">
                      {new Intl.NumberFormat('es-AR', {
                        style: 'currency',
                        currency: link.currency || 'ARS',
                      }).format(link.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          link.status === 'PAID'
                            ? 'bg-green-100 text-green-800'
                            : link.status === 'EXPIRED'
                            ? 'bg-red-100 text-red-800'
                            : link.status === 'CANCELLED'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {link.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                      {link.usesCount} / {link.maxUses || '∞'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                      {link.expiresAt 
                        ? new Date(link.expiresAt).toLocaleDateString('es-AR')
                        : 'Sin expiración'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                      {new Date(link.createdAt).toLocaleString('es-AR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

