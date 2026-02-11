'use client';

import { useState } from 'react';
import { useAdminAuth } from '@/contexts/AdminAuthContext';

interface AdminLoginViewProps {
  title?: string;
  description?: string;
}

export function AdminLoginView({
  title = 'Acceso de administrador',
  description = 'Ingresá la clave de administrador para acceder a esta sección. La sesión se mantendrá mientras tengas el panel abierto.',
}: AdminLoginViewProps) {
  const { login } = useAdminAuth();
  const [key, setKey] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (login(key)) {
      return;
    }
    setError('Clave incorrecta');
  };

  return (
    <div className="p-8 max-w-md mx-auto">
      <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/50">
        <h2 className="text-lg font-semibold text-slate-800 mb-1">{title}</h2>
        <p className="text-sm text-slate-600 mb-4">{description}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="admin-key" className="block text-sm font-medium text-slate-700 mb-1">
              Clave de administrador
            </label>
            <input
              id="admin-key"
              type="password"
              value={key}
              onChange={(e) => { setKey(e.target.value); setError(''); }}
              placeholder="Ingresá la clave"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
              autoFocus
            />
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
          </div>
          <button
            type="submit"
            disabled={!key.trim()}
            className="w-full py-2 text-sm font-medium text-white bg-slate-700 rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            Acceder
          </button>
        </form>
      </div>
    </div>
  );
}
