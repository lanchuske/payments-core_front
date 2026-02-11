'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { nestjsApi } from '@/lib/api/nestjs-client';
import { useToastContext } from '@/contexts/ToastContext';
import {
  getBankNameFromCBU,
  validateCBU,
  getMissingDigits,
  CBU_LENGTH_CONST,
} from '@/lib/cbu';

const getTenantId = (): string => {
  if (typeof window === 'undefined') return '';
  const tenantId = localStorage.getItem('tenantId');
  if (tenantId) return tenantId;
  const currentTenantId = localStorage.getItem('current_tenant_id');
  if (currentTenantId) return currentTenantId;
  try {
    const storedCreds = localStorage.getItem('echeq-credentials');
    if (storedCreds) {
      const creds = JSON.parse(storedCreds);
      if (creds.tenantId) return creds.tenantId;
    }
  } catch {
    // ignore
  }
  return '';
};

type AccountRow = {
  id: string;
  tenantId: string;
  cbu: string;
  accountNumber: string;
  accountType?: string;
  currency?: string;
  bank?: string;
  branch?: string;
  status?: string;
};

export function AccountsTab() {
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showCbuHelp, setShowCbuHelp] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    cbu: '',
    accountNumber: '',
    bank: 'Banco Demo',
    branch: 'Sucursal 1',
  });
  const { showSuccess, showError } = useToastContext();

  const loadAccounts = useCallback(async () => {
    const tenantId = getTenantId();
    if (!tenantId) {
      setAccounts([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await nestjsApi.getAccounts(tenantId);
      const data = (res as { data?: AccountRow[] })?.data ?? res as AccountRow[] | undefined;
      setAccounts(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Error loading accounts:', e);
      showError('Error al cargar cuentas');
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const cbuDigits = formData.cbu.replace(/\D/g, '');
  const missingDigits = useMemo(() => getMissingDigits(formData.cbu), [formData.cbu]);
  const bankName = useMemo(() => getBankNameFromCBU(formData.cbu), [formData.cbu]);
  const cbuValidation = useMemo(
    () => (cbuDigits.length === CBU_LENGTH_CONST ? validateCBU(formData.cbu) : null),
    [formData.cbu, cbuDigits.length],
  );

  // Auto-completar campo Banco cuando el CBU tiene 3+ dígitos y el nombre es conocido
  useEffect(() => {
    if (!bankName || bankName.startsWith('Entidad ')) return;
    setFormData((prev) => {
      if (prev.bank === 'Banco Demo' || prev.bank === '' || prev.bank === bankName) {
        return { ...prev, bank: bankName };
      }
      return prev;
    });
  }, [bankName]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const tenantId = getTenantId();
    if (!tenantId) {
      showError('Selecciona un tenant');
      return;
    }
    if (cbuDigits.length !== CBU_LENGTH_CONST) {
      showError(`CBU debe tener exactamente ${CBU_LENGTH_CONST} dígitos (faltan ${missingDigits})`);
      return;
    }
    const validation = validateCBU(formData.cbu);
    if (!validation.valid) {
      showError(validation.error ?? 'CBU inválido');
      return;
    }
    try {
      setCreating(true);
      await nestjsApi.createAccount({
        tenantId,
        cbu: formData.cbu,
        accountNumber: formData.accountNumber || formData.cbu.slice(0, 10),
        bank: formData.bank,
        branch: formData.branch,
      });
      showSuccess('Cuenta creada correctamente');
      setFormData({ cbu: '', accountNumber: '', bank: 'Banco Demo', branch: 'Sucursal 1' });
      setShowForm(false);
      loadAccounts();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      showError(ax?.response?.data?.message || 'Error al crear la cuenta');
    } finally {
      setCreating(false);
    }
  };

  const tenantId = getTenantId();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Cuentas del tenant</h2>
          {tenantId && (
            <p className="mt-0.5 text-sm text-slate-500">
              Tenant actual: <span className="font-medium text-slate-700">{tenantId}</span>
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 text-white bg-slate-700 rounded-lg hover:bg-slate-800"
        >
          {showForm ? '✕ Cancelar' : '+ Crear cuenta'}
        </button>
      </div>

      {!tenantId && (
        <p className="text-amber-700 bg-amber-50 p-3 rounded-lg">
          Selecciona un tenant en el selector superior para listar y crear cuentas.
        </p>
      )}

      {showForm && tenantId && (
        <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="mb-4 text-lg font-semibold text-gray-800">Nueva cuenta</h3>
          <form onSubmit={handleCreate} className="space-y-4 max-w-md">
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">CBU (22 dígitos) *</label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={formData.cbu}
                onChange={(e) => setFormData({ ...formData, cbu: e.target.value.replace(/\D/g, '').slice(0, CBU_LENGTH_CONST) })}
                placeholder="Ej: 0160000000000000000000"
                className={`w-full px-3 py-2 border rounded-lg ${
                  formData.cbu.length === CBU_LENGTH_CONST && cbuValidation && !cbuValidation.valid
                    ? 'border-red-500 bg-red-50'
                    : formData.cbu.length === CBU_LENGTH_CONST && cbuValidation?.valid
                      ? 'border-slate-500 bg-slate-50/50'
                      : 'border-gray-300'
                }`}
                maxLength={CBU_LENGTH_CONST}
              />
              <div className="mt-1.5 space-y-1">
                {missingDigits > 0 && cbuDigits.length > 0 && (
                  <p className="text-sm text-amber-700">
                    Faltan <strong>{missingDigits}</strong> dígito{missingDigits !== 1 ? 's' : ''} ({cbuDigits.length}/{CBU_LENGTH_CONST}).
                  </p>
                )}
                {bankName && (
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Banco:</span> {bankName}
                  </p>
                )}
                {cbuValidation && !cbuValidation.valid && (
                  <div className="space-y-1" role="alert">
                    <p className="text-sm text-red-600 font-medium">{cbuValidation.error}</p>
                    {cbuValidation.suggestion && (
                      <p className="text-sm text-gray-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
                        💡 {cbuValidation.suggestion}
                      </p>
                    )}
                  </div>
                )}
                {cbuValidation?.valid && (
                  <p className="text-sm text-slate-700">CBU válido (dígitos verificadores correctos).</p>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white">
              <button
                type="button"
                onClick={() => setShowCbuHelp(!showCbuHelp)}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg"
              >
                <span>Ayuda para cargar el CBU</span>
                <span className="text-gray-400">{showCbuHelp ? '▼' : '▶'}</span>
              </button>
              {showCbuHelp && (
                <div className="px-3 pb-3 pt-0 text-sm text-gray-600 border-t border-gray-100 space-y-2">
                  <p><strong>Estructura (22 dígitos):</strong></p>
                  <ul className="list-disc list-inside space-y-0.5 text-gray-600">
                    <li>Posiciones 1-3: código del banco</li>
                    <li>Posiciones 4-7: sucursal</li>
                    <li>Posición 8: dígito verificador (banco/sucursal)</li>
                    <li>Posiciones 9-21: número de cuenta</li>
                    <li>Posición 22: dígito verificador (cuenta)</li>
                  </ul>
                  <p><strong>Dónde encontrarlo:</strong> home banking, reverso de la tarjeta de débito, cajero automático o sucursal.</p>
                  <p><strong>Consejo:</strong> copiá y pegá el CBU desde tu banco para evitar errores de tipeo.</p>
                </div>
              )}
            </div>

            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">Número de cuenta</label>
              <input
                type="text"
                value={formData.accountNumber}
                onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                placeholder="Opcional"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">Banco (se completa con el CBU o editalo)</label>
              <input
                type="text"
                value={formData.bank}
                onChange={(e) => setFormData({ ...formData, bank: e.target.value })}
                placeholder={bankName ?? 'Ej: Banco Demo'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">Sucursal</label>
              <input
                type="text"
                value={formData.branch}
                onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={creating || (cbuDigits.length === CBU_LENGTH_CONST && cbuValidation && !cbuValidation.valid)}
                className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? 'Creando...' : 'Crear cuenta'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-200 rounded-lg">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div>
        <h3 className="mb-2 text-lg font-semibold text-gray-800">Cuentas existentes</h3>
        {loading ? (
          <p className="text-gray-500">Cargando...</p>
        ) : accounts.length === 0 ? (
          <p className="text-gray-500">No hay cuentas para este tenant. Crea una con el botón &quot;+ Crear cuenta&quot;.</p>
        ) : (
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">CBU</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nº cuenta</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Banco</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {accounts.map((a) => (
                  <tr key={a.id}>
                    <td className="px-4 py-2 text-sm font-mono text-gray-700" title={a.id}>{a.id.slice(0, 8)}…</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{a.cbu}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{a.accountNumber}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{a.bank || '-'}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{a.status || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-sm text-gray-500">
        Usa el <strong>ID</strong> de una cuenta (copiándolo desde la tabla o desde DevTools) como &quot;Cuenta Deudora&quot; o &quot;Cuenta Acreedora&quot; en Débitos Automáticos.
      </p>
    </div>
  );
}
