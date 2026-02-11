/**
 * Cliente API para consumir el backend NestJS
 * Reemplaza las conexiones directas a la base de datos
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { config, getAdminKey } from '../config';

// Tipos de respuesta estándar del backend NestJS
export interface NestJSResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// Configuración del cliente
// Usar config.API_BASE_URL que tiene detección automática (Azure, localhost)
const API_BASE_URL = config.API_BASE_URL;

class NestJSApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 segundos
    });

    // Interceptor para agregar token de autenticación
    this.client.interceptors.request.use(
      (config) => {
        // Obtener token de localStorage si existe
        const token = typeof window !== 'undefined' 
          ? localStorage.getItem('auth_token') 
          : null;
        
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Log de requests en desarrollo
        if (process.env.NODE_ENV === 'development') {
          console.log(`[NestJS API] ${config.method?.toUpperCase()} ${config.url}`);
        }

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Interceptor para manejar respuestas y errores
    this.client.interceptors.response.use(
      (response) => {
        return response;
      },
      (error) => {
        // Log de errores en desarrollo
        if (process.env.NODE_ENV === 'development') {
          console.error('[NestJS API Error]', {
            url: error.config?.url,
            method: error.config?.method,
            status: error.response?.status,
            data: error.response?.data,
          });
        }

        // Manejar errores específicos
        if (error.response?.status === 401) {
          // Token inválido o expirado
          if (typeof window !== 'undefined') {
            localStorage.removeItem('auth_token');
            // Opcional: redirigir a login
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // === TENANTS ===
  
  async getTenants(params?: {
    page?: number;
    limit?: number;
    status?: string;
    type?: string;
    adminKey?: string;
  }): Promise<PaginatedResponse<any>> {
    // adminKey requerido por proxy: sandbox usa admin123 por defecto (no admin1234)
    const adminKey = params?.adminKey ?? getAdminKey();
    const mergedParams = { ...params, adminKey };
    const response = await this.client.get('/tenants', { params: mergedParams });
    return response.data;
  }

  async createTenant(data: {
    tenantId: string;
    name: string;
    code?: string;
    cuit?: string;
    type?: string;
    status?: string;
    domain?: string;
    coelsaConfig?: any;
    limits?: any;
  }): Promise<NestJSResponse<any>> {
    const response = await this.client.post('/tenants/public', data);
    return response.data;
  }

  async getTenantById(id: string): Promise<NestJSResponse<any>> {
    const response = await this.client.get(`/tenants/${id}`);
    return response.data;
  }

  async getTenantByTenantId(tenantId: string): Promise<NestJSResponse<any>> {
    const response = await this.client.get(`/tenants/by-tenant-id/${tenantId}`);
    return response.data;
  }

  async getActiveTenants(adminKey?: string): Promise<NestJSResponse<any[]>> {
    const params: Record<string, string | number> = {
      status: 'ACTIVE',
      limit: 50,
      adminKey: adminKey ?? getAdminKey(),
    };
    const response = await this.client.get('/tenants', { params });
    return response.data;
  }

  async getTenantStats(): Promise<NestJSResponse<any>> {
    const response = await this.client.get('/tenants/stats');
    return response.data;
  }

  async updateTenant(id: string, data: any): Promise<NestJSResponse<any>> {
    const response = await this.client.patch(`/tenants/${id}`, data);
    return response.data;
  }

  async updateTenantStatus(id: string, status: 'ACTIVE' | 'INACTIVE'): Promise<NestJSResponse<any>> {
    const response = await this.client.patch(`/tenants/${id}/status`, { status });
    return response.data;
  }

  async updateTenantStatusAdmin(id: string, status: 'ACTIVE' | 'INACTIVE', adminKey: string): Promise<NestJSResponse<any>> {
    const response = await this.client.patch(`/tenants/${id}/status/admin`, { status, adminKey });
    return response.data;
  }

  async deleteTenantAdmin(id: string, adminKey: string): Promise<NestJSResponse<any>> {
    const response = await this.client.delete(`/tenants/${id}/admin`, { data: { adminKey } });
    return response.data;
  }

  async deleteTenant(id: string): Promise<NestJSResponse<void>> {
    const response = await this.client.delete(`/tenants/${id}`);
    return response.data;
  }

  // ==========================================
  // Credenciales
  // ==========================================

  async getTenantCredentials(id: string): Promise<NestJSResponse<any>> {
    if (!id || id === 'tenantId' || id === 'undefined') {
      return Promise.reject(new Error('ID de tenant inválido'));
    }
    const response = await this.client.get(`/tenants/${id}/credentials`);
    return response.data;
  }

  async generateTenantCredentials(id: string): Promise<NestJSResponse<any>> {
    if (!id || id === 'tenantId' || id === 'undefined') {
      return Promise.reject(new Error('ID de tenant inválido'));
    }
    const response = await this.client.post(`/tenants/${id}/credentials`);
    return response.data;
  }

  // ==========================================
  // Datos y Logs
  // ==========================================

  async getTenantData(id: string): Promise<NestJSResponse<any>> {
    const response = await this.client.get(`/tenants/by-tenant-id/${id}/data`);
    return response.data;
  }

  async deleteTenantData(id: string): Promise<NestJSResponse<any>> {
    const response = await this.client.delete(`/tenants/by-tenant-id/${id}/data`);
    return response.data;
  }

  async getTenantLogs(id: string): Promise<NestJSResponse<any>> {
    const response = await this.client.get(`/tenants/${id}/logs`);
    return response.data;
  }

  async restoreTenant(id: string): Promise<NestJSResponse<any>> {
    const response = await this.client.post(`/tenants/${id}/restore`);
    return response.data;
  }

  async getSwaggerSpec(): Promise<any> {
    const response = await this.client.get('/swagger.json');
    return response.data;
  }

  // === ECHEQS / CHEQUES ===

  async getCheques(params?: {
    page?: number;
    limit?: number;
    status?: string;
    issuer_cuit?: string;
    beneficiary_cuit?: string;
    date_from?: string;
    date_to?: string;
    amount_min?: number;
    amount_max?: number;
  }): Promise<PaginatedResponse<any>> {
    const response = await this.client.get('/coelsa/Cheques/Cheque', { params });
    return response.data;
  }

  async getChequeByNumber(numero: string): Promise<NestJSResponse<any>> {
    const response = await this.client.get(`/coelsa/Cheques/Cheque/${numero}`);
    return response.data;
  }

  async getChequesByCuit(cuit: string, params?: {
    page?: number;
    limit?: number;
    estado?: string;
    fecha_desde?: string;
    fecha_hasta?: string;
  }): Promise<PaginatedResponse<any>> {
    const response = await this.client.get(`/coelsa/Cheques/ByCuit/${cuit}`, { params });
    return response.data;
  }

  async createCheque(data: any): Promise<NestJSResponse<any>> {
    const response = await this.client.post('/coelsa/Cheques/Cheque', data);
    return response.data;
  }

  async admitirCheque(data: any): Promise<NestJSResponse<any>> {
    const response = await this.client.post('/coelsa/Cheques/Emitido/Admitir', data);
    return response.data;
  }

  async acceptCheque(numero: string, data?: any): Promise<NestJSResponse<any>> {
    const response = await this.client.post(`/coelsa/Cheques/${numero}/accept`, data || {});
    return response.data;
  }

  async rejectCheque(numero: string, data: { motivo: string; observaciones?: string }): Promise<NestJSResponse<any>> {
    const response = await this.client.post(`/coelsa/Cheques/${numero}/reject`, data);
    return response.data;
  }

  async endorseCheque(numero: string, data: { nuevo_beneficiario_cuit: string; observaciones?: string }): Promise<NestJSResponse<any>> {
    const response = await this.client.post(`/coelsa/Cheques/${numero}/endorse`, data);
    return response.data;
  }

  async payCheque(numero: string, data?: { metodo_pago?: string; referencia?: string }): Promise<NestJSResponse<any>> {
    const response = await this.client.post(`/coelsa/Cheques/${numero}/pay`, data || {});
    return response.data;
  }

  // === CUENTAS ===

  async getCuentas(params?: any): Promise<NestJSResponse<any[]>> {
    const response = await this.client.get('/coelsa/Cuentas/Cuenta', { params });
    return response.data;
  }

  async getCuentaByCbuCuit(cbu: string, cuit: string): Promise<NestJSResponse<any>> {
    const response = await this.client.get(`/coelsa/Cuentas/Cuenta/${cbu}/${cuit}`);
    return response.data;
  }

  async createCuenta(data: any): Promise<NestJSResponse<any>> {
    const response = await this.client.post('/coelsa/Cuentas/Cuenta', data);
    return response.data;
  }

  // === CUSTODIA ===

  async ponerEnCustodia(data: any): Promise<NestJSResponse<any>> {
    const response = await this.client.post('/coelsa/Custodia/Poner', data);
    return response.data;
  }

  async retirarDeCustodia(data: any): Promise<NestJSResponse<any>> {
    const response = await this.client.post('/coelsa/Custodia/Retirar', data);
    return response.data;
  }

  async getEstadoCustodia(params?: any): Promise<NestJSResponse<any>> {
    const response = await this.client.get('/coelsa/Custodia/Estado', { params });
    return response.data;
  }

  // === ENDOSOS ===

  async crearEndosoNegociacion(data: any): Promise<NestJSResponse<any>> {
    const response = await this.client.post('/coelsa/Endosos/Negociacion', data);
    return response.data;
  }

  async crearEndosoNominal(data: any): Promise<NestJSResponse<any>> {
    const response = await this.client.post('/coelsa/Endosos/Nominal', data);
    return response.data;
  }

  async crearEndosoProcuracion(data: any): Promise<NestJSResponse<any>> {
    const response = await this.client.post('/coelsa/Endosos/Procuracion', data);
    return response.data;
  }

  async crearEndosoSinGarantia(data: any): Promise<NestJSResponse<any>> {
    const response = await this.client.post('/coelsa/Endosos/SinGarantia', data);
    return response.data;
  }

  async anularEndoso(data: any): Promise<NestJSResponse<any>> {
    const response = await this.client.post('/coelsa/Endosos/Anular', data);
    return response.data;
  }

  // === SEGURIDAD ===

  async obtenerToken(data: { username: string; password: string }): Promise<NestJSResponse<any>> {
    const response = await this.client.post('/coelsa/Seguridad/Token', data);
    return response.data;
  }

  async validarToken(): Promise<NestJSResponse<any>> {
    const response = await this.client.get('/coelsa/Seguridad/Validar');
    return response.data;
  }

  async revocarToken(): Promise<NestJSResponse<any>> {
    const response = await this.client.post('/coelsa/Seguridad/Revocar', {});
    return response.data;
  }

  // === HEALTH CHECK ===

  async healthCheck(): Promise<any> {
    // Usar /nestjs/health que está excluido del prefijo global api/coelsa
    // Construir URL absoluta sin el prefijo /api/coelsa
    const baseUrlWithoutPrefix = API_BASE_URL.replace('/api/coelsa', '');
    const healthUrl = `${baseUrlWithoutPrefix}/nestjs/health`;
    // Usar axios directamente porque necesitamos una URL absoluta diferente a la baseURL del cliente
    const response = await axios.get(healthUrl, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  }

  // === TRANSACTIONS ===

  async getTransactions(params?: {
    tenantId?: string;
    type?: string;
    status?: string;
    fromAccountId?: string;
    toAccountId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
    adminKey?: string;
  }): Promise<NestJSResponse<any>> {
    const adminKey = params?.adminKey ?? getAdminKey();
    const mergedParams = { ...params, adminKey };
    const response = await this.client.get('api/transactions', {
      params: mergedParams,
    });
    return response.data;
  }

  async getTransaction(
    id: string,
    tenantId?: string,
    adminKey?: string,
  ): Promise<NestJSResponse<any>> {
    const response = await this.client.get(`api/transactions/${id}`, {
      params: { tenantId, adminKey: adminKey ?? getAdminKey() },
    });
    return response.data;
  }

  async createTransaction(data: any): Promise<NestJSResponse<any>> {
    const response = await this.client.post('api/transactions', data, {
      params: { adminKey: getAdminKey() },
    });
    return response.data;
  }

  // === TRANSFERS ===

  async createTransfer(data: {
    tenantId: string;
    fromAccountId: string;
    toAccountId?: string;
    destinationCbu?: string;
    amount: number;
    currency: string;
    description?: string;
    beneficiaryName?: string;
    beneficiaryCuit?: string;
  }): Promise<NestJSResponse<any>> {
    const response = await this.client.post('api/transfers', data, {
      params: { adminKey: getAdminKey() },
    });
    return response.data;
  }

  async getTransfers(params?: {
    tenantId?: string;
    fromAccountId?: string;
    toAccountId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
    adminKey?: string;
  }): Promise<NestJSResponse<any>> {
    const mergedParams = { ...params, adminKey: params?.adminKey ?? getAdminKey() };
    const response = await this.client.get('api/transfers', { params: mergedParams });
    return response.data;
  }

  // === PAYMENT LINKS ===

  async createPaymentLink(data: {
    tenantId: string;
    amount: number;
    currency: string;
    description?: string;
    reference?: string;
    expiresAt?: string;
    maxUses?: number;
    successUrl?: string;
    cancelUrl?: string;
    payerInfo?: any;
  }): Promise<NestJSResponse<any>> {
    const response = await this.client.post('api/digital-payments/payment-links/with-qr', data, {
      params: { adminKey: getAdminKey() },
    });
    return response.data;
  }

  async getPaymentLinks(tenantId: string, status?: string): Promise<NestJSResponse<any>> {
    const response = await this.client.get('api/digital-payments/payment-links', {
      params: { tenantId, status, adminKey: getAdminKey() },
    });
    return response.data;
  }

  /** Links de recepción OPP (onboarding): OPPs notificadas/aceptadas con su link para el receptor */
  async getOppReceiveLinks(tenantId: string): Promise<
    NestJSResponse<
      {
        id: string;
        beneficiarioNombre: string;
        amount: string;
        currency: string;
        status: string;
        linkToken: string | null;
        linkTokenUsedAt: string | null;
        createdAt: string;
      }[]
    >
  > {
    const response = await this.client.get('api/digital-payments/opp-receive-links', {
      params: { tenantId, adminKey: getAdminKey() },
    });
    return response.data;
  }

  // === DEBITS ===

  async createDebitMandate(data: {
    tenantId: string;
    debtorAccountId: string;
    creditorAccountId: string;
    amount: number;
    currency: string;
    frequency: string;
    startDate: string;
    endDate?: string;
    description?: string;
    reference?: string;
    maxRejections?: number;
    metadata?: any;
  }): Promise<NestJSResponse<any>> {
    const response = await this.client.post('api/debits/mandates', data, {
      params: { adminKey: getAdminKey() },
    });
    return response.data;
  }

  async getDebitMandates(tenantId: string, status?: string): Promise<NestJSResponse<any>> {
    const response = await this.client.get('api/debits/mandates', {
      params: { tenantId, status, adminKey: getAdminKey() },
    });
    return response.data;
  }

  // === ACCOUNTS (cuentas por tenant, para mandatos y admin) ===

  async getAccounts(tenantId: string): Promise<NestJSResponse<{ id: string; cbu: string; accountNumber: string; tenantId: string }[]>> {
    const response = await this.client.get('api/accounts', {
      params: { tenantId, adminKey: getAdminKey() },
    });
    return response.data;
  }

  async createAccount(data: {
    tenantId: string;
    cbu: string;
    accountNumber?: string;
    accountType?: string;
    bank?: string;
    branch?: string;
  }): Promise<NestJSResponse<{ id: string; cbu: string; accountNumber: string; tenantId: string }>> {
    const response = await this.client.post('api/accounts', data, {
      params: { adminKey: getAdminKey() },
    });
    return response.data;
  }

  // === RECONCILIATION ===

  async createReconciliation(data: {
    tenantId: string;
    accountId: string;
    startDate: string;
    endDate: string;
    currency?: string;
    initialBalance?: number;
    type?: string;
    metadata?: any;
  }): Promise<NestJSResponse<any>> {
    const response = await this.client.post('api/reconciliation', data, {
      params: { adminKey: getAdminKey() },
    });
    return response.data;
  }

  async uploadBankStatement(
    reconciliationId: string,
    file: File,
    format: string = 'CSV',
    amountTolerance?: number,
    dateToleranceDays?: number,
  ): Promise<NestJSResponse<any>> {
    const formData = new FormData();
    formData.append('file', file);
    const params: Record<string, string> = { format, adminKey: getAdminKey() };
    if (amountTolerance !== undefined) params.amountTolerance = amountTolerance.toString();
    if (dateToleranceDays !== undefined) params.dateToleranceDays = dateToleranceDays.toString();
    const response = await this.client.post(
      `api/reconciliation/${reconciliationId}/upload`,
      formData,
      { params },
    );
    return response.data;
  }

  async getReconciliations(tenantId: string, accountId?: string): Promise<NestJSResponse<any>> {
    const response = await this.client.get('api/reconciliation', {
      params: { tenantId, accountId, adminKey: getAdminKey() },
    });
    return response.data;
  }

  // === REPORTS ===

  async getRealtimeMetrics(tenantId: string): Promise<NestJSResponse<any>> {
    const response = await this.client.get('api/reports/metrics/realtime', {
      params: { tenantId, adminKey: getAdminKey() },
    });
    return response.data;
  }

  async getAnalytics(tenantId: string): Promise<NestJSResponse<any>> {
    const response = await this.client.get('api/reports/analytics', {
      params: { tenantId, adminKey: getAdminKey() },
    });
    return response.data;
  }

  async generateTransactionReport(data: {
    tenantId: string;
    startDate: string;
    endDate: string;
    accountIds?: string[];
  }): Promise<NestJSResponse<any>> {
    const response = await this.client.post('api/reports/transactions', data, {
      params: { adminKey: getAdminKey() },
    });
    return response.data;
  }

  async exportBcraReport(
    data: {
      tenantId: string;
      startDate: string;
      endDate: string;
      cuit: string;
      name: string;
    },
    format: 'csv' | 'json',
  ): Promise<Blob> {
    const response = await this.client.post(
      `api/reports/regulatory/bcra/export/${format}`,
      data,
      {
        params: { adminKey: getAdminKey() },
        responseType: 'blob',
      },
    );
    return response.data;
  }

  // === MÉTODO GENÉRICO ===

  async request<T = any>(config: AxiosRequestConfig): Promise<T> {
    const response = await this.client.request<T>(config);
    return response.data;
  }
}

// Exportar instancia singleton
export const nestjsApi = new NestJSApiClient();
export default nestjsApi;

