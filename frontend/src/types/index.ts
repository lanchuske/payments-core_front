// Tipos para el sistema ECHEQ Sandbox

export interface Tenant {
  id: string;
  name: string;
  code: string;
  cuit: string;
  /** Backend puede enviar snake_case (is_active) o camelCase (isActive) */
  is_active?: boolean;
  isActive?: boolean;
  status?: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt?: string;
}

export interface Credentials {
  apiKey: string;
  apiSecret: string;
  tenantId: string;
}

export interface LogEntry {
  file: string;
  timestamp: string;
  message: string;
  level: 'info' | 'error' | 'warning';
  url?: string;
  method?: string;
  tenantId?: string;
  action?: string;
}

export interface TenantData {
  tenant: Tenant;
  cheques: Cheque[];
  cuentas: Cuenta[];
  endosos: Endoso[];
  estadisticas: Estadisticas;
}

export interface Cheque {
  id: string;
  monto: number;
  estado: string;
  fecha_emision: string;
  beneficiario: string;
}

export interface Cuenta {
  id: string;
  cuit: string;
  cbu: string;
  estado: string;
  saldo: number;
}

export interface Endoso {
  id: string;
  cheque_id: string;
  endosante: string;
  endosatario: string;
  fecha: string;
}

export interface Estadisticas {
  total_cheques: number;
  total_monto: number;
  cheques_emitidos: number;
  cheques_activos: number;
  total_endosos: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
