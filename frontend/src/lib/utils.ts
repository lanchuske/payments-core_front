// Utilidades para el panel de administración

// Funciones de modal y alert removidas - ahora se usan toasts

export const copyToClipboard = async (text: string, showToast?: (message: string, type: 'success' | 'error' | 'warning' | 'info', duration?: number) => void) => {
  try {
    await navigator.clipboard.writeText(text);
    if (showToast) {
      showToast('✅ Copiado al portapapeles', 'success', 3000);
    } else {
      // Fallback: usar console.log si no hay showToast disponible
      console.log('✅ Copiado al portapapeles');
    }
  } catch (err) {
    if (showToast) {
      showToast('❌ Error al copiar al portapapeles', 'error', 3000);
    } else {
      // Fallback: usar console.error si no hay showToast disponible
      console.error('❌ Error al copiar al portapapeles');
    }
  }
};

export const generateRandomData = () => {
  const randomSuffix = Math.random().toString(36).substr(2, 5).toUpperCase();
  return {
    tenantName: `Banco Demo Sandbox ${randomSuffix}`,
    tenantCode: `BANCO_DEMO_${randomSuffix}`,
    tenantCuit: `20${Math.floor(Math.random() * 100000000)}9`,
    tenantType: 'BANCO',
  };
};

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(amount);
};

/**
 * Formatea una fecha usando timezone de Argentina (hardcoded para Sandbox)
 * Política: Sandbox siempre usa America/Argentina/Buenos_Aires
 */
export const formatDate = (date: string | Date) => {
  return new Date(date).toLocaleString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires', // Timezone hardcoded para Sandbox
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};
