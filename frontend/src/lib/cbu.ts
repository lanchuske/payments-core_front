/**
 * Utilidades para CBU (Clave Bancaria Uniforme) - Argentina
 * Estructura: 3 (banco) + 4 (sucursal) + 1 (DV1) + 13 (cuenta) + 1 (DV2) = 22 dígitos
 * Validación: dígitos verificadores con algoritmo módulo 10 (pesos 7, 1, 3, 9)
 */

const CBU_LENGTH = 22;
const WEIGHTS_BLOCK1 = [7, 1, 3, 9, 7, 1, 3]; // 7 dígitos (banco + sucursal)
const WEIGHTS_BLOCK2 = [7, 1, 3, 9, 7, 1, 3, 9, 7, 1, 3, 9, 7]; // 13 dígitos (cuenta)

/** Códigos de entidad bancaria (primeros 3 dígitos) -> nombre */
export const CBU_BANKS: Record<string, string> = {
  '011': 'Banco de la Nación Argentina',
  '014': 'Banco de la Provincia de Buenos Aires',
  '015': 'Industrial and Commercial Bank of China',
  '016': 'Citibank N.A.',
  '017': 'Banco Francés',
  '020': 'Banco de la Provincia de Córdoba',
  '027': 'Banco Supervielle',
  '034': 'Banco Patagonia',
  '044': 'Banco Hipotecario',
  '060': 'Banco del Tucumán',
  '065': 'Banco Municipal de Rosario',
  '072': 'Banco Santander Río',
  '083': 'Banco de la Ciudad de Buenos Aires',
  '086': 'Banco Santa Cruz',
  '093': 'Banco de la Pampa',
  '094': 'Banco de Corrientes',
  '097': 'Banco Provincia de Tierra del Fuego',
  '143': 'Brubank',
  '147': 'Banco Interfinanzas',
  '150': 'HSBC Bank Argentina',
  '158': 'Open Bank Argentina',
  '191': 'Banco Credicoop Cooperativo Limitado',
  '198': 'Banco de Valores',
  '247': 'Banco Roela',
  '254': 'Banco Mariva',
  '259': 'Banco Itaú Argentina',
  '262': 'Bank of America National Association',
  '266': 'BNP Paribas',
  '268': 'Banco Provincia de Misiones',
  '269': 'Banco Rioja Sociedad Anonima Unipersonal',
  '277': 'Banco Saenz',
  '281': 'Banco Meridian',
  '285': 'Banco Macro',
  '299': 'Banco Comafi',
  '301': 'Banco Piano',
  '305': 'Banco Julio',
  '309': 'Banco Rioja',
  '310': 'Banco del Sol',
  '311': 'Nuevo Banco del Chaco',
  '312': 'MBA Lazard Banco de Inversiones',
  '315': 'Banco de Formosa',
  '319': 'Banco CMF',
  '321': 'Banco de la República Oriental del Uruguay',
  '322': 'Banco Cetelem Argentina',
  '330': 'Nuevo Banco de Santa Fe',
  '331': 'Banco Caminos',
  '338': 'Banco de Servicios Financieros',
  '339': 'Banco Galicia',
  '340': 'Banco Columbia',
  '384': 'Wilobank',
  '386': 'Banco Bica',
  '389': 'Banco Columbia',
  '426': 'Banco Bacs Banco de Credito y Securitizacion',
  '428': 'Banco Coinag',
  '431': 'Banco Bindaria',
  '432': 'Banco de Comercio',
};

/**
 * Obtiene el nombre del banco a partir del código (primeros 3 dígitos del CBU).
 * Si el CBU tiene menos de 3 dígitos, devuelve null.
 */
export function getBankNameFromCBU(cbu: string): string | null {
  const digits = cbu.replace(/\D/g, '');
  if (digits.length < 3) return null;
  const code = digits.slice(0, 3);
  return CBU_BANKS[code] ?? `Entidad ${code}`;
}

export type CBUValidationResult = {
  valid: boolean;
  error?: string;
  /** Sugerencia legible cuando falla un dígito verificador */
  suggestion?: string;
  /** Dígito correcto para posición 8 (bloque banco/sucursal), si aplica */
  correctDigitPosition8?: number;
  /** Dígito correcto para posición 22 (bloque cuenta), si aplica */
  correctDigitPosition22?: number;
};

/**
 * Valida el CBU con dígitos verificadores (módulo 10).
 * Incluye sugerencias cuando falla: dígito correcto en posición 8 o 22.
 */
export function validateCBU(cbu: string): CBUValidationResult {
  const digits = cbu.replace(/\D/g, '');
  if (digits.length !== CBU_LENGTH) {
    return { valid: false, error: `El CBU debe tener exactamente ${CBU_LENGTH} dígitos` };
  }
  if (!/^\d+$/.test(digits)) {
    return { valid: false, error: 'El CBU solo debe contener números' };
  }

  // Bloque 1: dígitos 0-6, verificador en 7 (posición 8 para el usuario)
  let sum1 = 0;
  for (let i = 0; i < 7; i++) {
    sum1 += parseInt(digits[i], 10) * WEIGHTS_BLOCK1[i];
  }
  const check1 = (10 - (sum1 % 10)) % 10;
  const currentDigit8 = parseInt(digits[7], 10);
  if (check1 !== currentDigit8) {
    return {
      valid: false,
      error: 'Dígito verificador del bloque banco/sucursal inválido',
      suggestion: `El dígito en la posición 8 debería ser ${check1} (tenés ${currentDigit8}). Revisá banco y sucursal.`,
      correctDigitPosition8: check1,
    };
  }

  // Bloque 2: dígitos 8-20, verificador en 21 (posición 22 para el usuario)
  let sum2 = 0;
  for (let i = 0; i < 13; i++) {
    sum2 += parseInt(digits[8 + i], 10) * WEIGHTS_BLOCK2[i];
  }
  const check2 = (10 - (sum2 % 10)) % 10;
  const currentDigit22 = parseInt(digits[21], 10);
  if (check2 !== currentDigit22) {
    return {
      valid: false,
      error: 'Dígito verificador del bloque cuenta inválido',
      suggestion: `El dígito en la posición 22 debería ser ${check2} (tenés ${currentDigit22}). Revisá el número de cuenta.`,
      correctDigitPosition22: check2,
    };
  }

  return { valid: true };
}

/**
 * Cuántos dígitos faltan para completar 22.
 */
export function getMissingDigits(cbu: string): number {
  const digits = cbu.replace(/\D/g, '');
  return Math.max(0, CBU_LENGTH - digits.length);
}

export const CBU_LENGTH_CONST = CBU_LENGTH;
