'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToastContext } from '@/contexts/ToastContext';
import { nestjsApi } from '@/lib/api/nestjs-client';

interface Tenant {
  id: string;
  tenantId: string;
  name: string;
  status?: string;
}

export function TenantSelector() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const { showWarning, showSuccess } = useToastContext();

  // Cargar tenant actual del localStorage
  useEffect(() => {
    const storedTenantId = typeof window !== 'undefined' 
      ? localStorage.getItem('tenantId') || ''
      : '';
    
    if (storedTenantId) {
      setSelectedTenantId(storedTenantId);
    }
  }, []);

  const handleTenantChange = useCallback((tenantId: string) => {
    setSelectedTenantId(tenantId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('tenantId', tenantId);
      // También actualizar en las credenciales guardadas si existen
      const storedCreds = localStorage.getItem('echeq-credentials');
      if (storedCreds) {
        try {
          const creds = JSON.parse(storedCreds);
          creds.tenantId = tenantId;
          localStorage.setItem('echeq-credentials', JSON.stringify(creds));
        } catch {
          // Ignorar errores de parsing
        }
      }
    }
    showSuccess(`Tenant seleccionado: ${tenantId}`);
    // Disparar evento personalizado para que otros componentes se actualicen
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tenantChanged', { detail: { tenantId } }));
    }
  }, [showSuccess]);

  const loadTenants = useCallback(async () => {
    try {
      setLoading(true);
      const response = await nestjsApi.getTenants({ 
        status: 'ACTIVE',
        limit: 100 
      });
      
      if (response.success && response.data) {
        const tenantsData = Array.isArray(response.data) 
          ? response.data 
          : [];
        setTenants(tenantsData);
        
        // Si no hay tenant seleccionado y hay tenants disponibles, seleccionar el primero
        if (!selectedTenantId && tenantsData.length > 0) {
          const firstTenant = tenantsData[0];
          const tenantIdToUse = firstTenant.tenantId || firstTenant.id;
          if (tenantIdToUse) {
            handleTenantChange(tenantIdToUse);
          }
        }
      }
    } catch (error: unknown) {
      console.error('Error loading tenants:', error);
      // No mostrar error si es un problema de autenticación (normal en algunos casos)
      if (
        error &&
        typeof error === 'object' &&
        'response' in error &&
        error.response &&
        typeof error.response === 'object' &&
        'status' in error.response &&
        error.response.status !== 401
      ) {
        showWarning('No se pudieron cargar los tenants');
      }
    } finally {
      setLoading(false);
    }
  }, [selectedTenantId, handleTenantChange, showWarning]);

  // Cargar lista de tenants
  useEffect(() => {
    loadTenants();
  }, [loadTenants]);

  if (tenants.length === 0) {
    return null; // No mostrar selector si no hay tenants
  }

  const selectedTenant = tenants.find(
    (t) => (t.tenantId || t.id) === selectedTenantId
  );
  const selectedDisplayName = selectedTenant
    ? selectedTenant.name || selectedTenant.tenantId || selectedTenant.id
    : selectedTenantId || '—';

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-slate-500">Operando con:</span>
      <select
        value={selectedTenantId}
        onChange={(e) => handleTenantChange(e.target.value)}
        disabled={loading}
        className="px-3 py-1.5 min-w-[180px] bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400 disabled:opacity-50"
        title={`Tenant actual: ${selectedDisplayName}`}
      >
        {loading ? (
          <option value="">Cargando...</option>
        ) : (
          tenants.map((tenant) => {
            const tenantIdValue = tenant.tenantId || tenant.id;
            const displayName = tenant.name || tenant.tenantId || tenant.id;
            return (
              <option key={tenant.id} value={tenantIdValue}>
                {displayName}
              </option>
            );
          })
        )}
      </select>
    </div>
  );
}
