/**
 * API Service - Migrado para usar Backend NestJS
 * Este archivo reemplaza la conexión directa a la base de datos
 * por llamadas al backend NestJS
 */

import { nestjsApi } from './api/nestjs-client';
import {
  Tenant,
  Credentials,
} from '@/types';
import { getApiUrl } from './config';

// Funciones para manejar credenciales COELSA (se mantienen para UI)
export const getStoredCredentials = (): Credentials | null => {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem('echeq-credentials');
  return stored ? JSON.parse(stored) : null;
};

export const setStoredCredentials = (credentials: Credentials): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('echeq-credentials', JSON.stringify(credentials));
};

export const clearStoredCredentials = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('echeq-credentials');
};

// Función para obtener token de autenticación
export const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
};

export const setAuthToken = (token: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('auth_token', token);
};

export const clearAuthToken = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('auth_token');
};

/**
 * API Service migrado - Todas las llamadas van al backend NestJS
 */
export const apiService = {
  // === HEALTH CHECK ===
  health: async () => {
    try {
      const data = await nestjsApi.healthCheck();
      return { data: { success: true, ...data } };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      return { data: { success: false, error: errorMessage } };
    }
  },

  // === TENANT MANAGEMENT ===
  
  /**
   * Obtener todos los tenants (paginado)
   */
  getTenants: async (page: number = 1, limit: number = 10) => {
    try {
      const response = await nestjsApi.getTenants({ page, limit });
      return {
        data: {
          success: true,
          data: response.data,
          total: response.total,
          page: response.page,
          limit: response.limit,
        }
      };
    } catch (error: unknown) {
      console.error('Error getting tenants:', error);
      const errorMessage = error instanceof Error 
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message || error.message
        : 'Error desconocido';
      return {
        data: {
          success: false,
          message: errorMessage || 'Error al obtener tenants',
          data: [],
        }
      };
    }
  },

  /**
   * Obtener tenants activos
   */
  getActiveTenants: async () => {
    try {
      const response = await nestjsApi.getActiveTenants();
      console.log('🔍 [DEBUG] Respuesta completa de getActiveTenants:', response);
      
      // El endpoint /tenants?status=ACTIVE devuelve ListTenantsResponseDto:
      // { success: true, data: TenantDto[], total: number, page: number, limit: number }
      let tenantsArray: Tenant[] = [];
      
      if (response && response.data) {
        if (Array.isArray(response.data)) {
          // Si data es directamente un array (formato ListTenantsResponseDto)
          tenantsArray = response.data as Tenant[];
        } else {
          // Si data tiene una propiedad tenants con el array (formato del endpoint /active)
          const dataObj = response.data as { tenants?: Tenant[] };
          if (dataObj.tenants && Array.isArray(dataObj.tenants)) {
            tenantsArray = dataObj.tenants;
          }
        }
      }
      
      console.log('🔍 [DEBUG] Tenants extraídos:', tenantsArray.length, tenantsArray);
      
      return {
        data: {
          success: response.success !== false,
          data: tenantsArray,
        }
      };
    } catch (error: unknown) {
      console.error('❌ Error getting active tenants:', error);
      const errorMessage = error instanceof Error 
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message || error.message
        : 'Error desconocido';
      return {
        data: {
          success: false,
          message: errorMessage,
          data: [],
        }
      };
    }
  },

  /**
   * Obtener tenants inactivos
   */
  getInactiveTenants: async () => {
    try {
      // El backend NestJS usa status filter
      const response = await nestjsApi.getTenants({ status: 'INACTIVE' });
      console.log('🔍 [DEBUG] Respuesta completa de getInactiveTenants:', response);
      
      // El endpoint /tenants?status=INACTIVE devuelve ListTenantsResponseDto:
      // { success: true, data: TenantDto[], total: number, page: number, limit: number }
      let tenantsArray: Tenant[] = [];
      
      if (response && response.data) {
        if (Array.isArray(response.data)) {
          // Si data es directamente un array (formato ListTenantsResponseDto)
          tenantsArray = response.data as Tenant[];
        } else {
          // Si data tiene una propiedad tenants con el array
          const dataObj = response.data as { tenants?: Tenant[] };
          if (dataObj.tenants && Array.isArray(dataObj.tenants)) {
            tenantsArray = dataObj.tenants;
          }
        }
      }
      
      console.log('🔍 [DEBUG] Tenants inactivos extraídos:', tenantsArray.length, tenantsArray);
      
      return {
        data: {
          success: response.success !== false,
          data: tenantsArray,
        }
      };
    } catch (error: unknown) {
      console.error('❌ Error getting inactive tenants:', error);
      const errorMessage = error instanceof Error 
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message || error.message
        : 'Error desconocido';
      return {
        data: {
          success: false,
          message: errorMessage,
          data: [],
        }
      };
    }
  },

  /**
   * Crear un nuevo tenant
   */
  createTenant: async (tenantData: Partial<Tenant> & {
    tenantId?: string;
    type?: string;
    domain?: string;
    coelsaConfig?: Record<string, unknown>;
    limits?: Record<string, unknown>;
  }) => {
    try {
      const response = await nestjsApi.createTenant({
        tenantId: tenantData.tenantId || tenantData.code || '',
        name: tenantData.name || '',
        type: tenantData.type,
        status: tenantData.status,
        domain: tenantData.domain,
        coelsaConfig: tenantData.coelsaConfig,
        limits: tenantData.limits,
      });
      return {
        data: {
          success: true,
          message: 'Tenant creado exitosamente',
          data: response.data,
        }
      };
    } catch (error: unknown) {
      console.error('Error creating tenant:', error);
      const errorMessage = error instanceof Error 
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message || error.message
        : 'Error desconocido';
      return {
        data: {
          success: false,
          message: errorMessage || 'Error al crear tenant',
        }
      };
    }
  },

  /**
   * Obtener credenciales de un tenant
   * Nota: Este endpoint puede necesitar adaptación en el backend NestJS
   */
  getTenantCredentials: async (tenantId: string) => {
    try {
      const response = await nestjsApi.getTenantCredentials(tenantId);
      return { data: response };
    } catch (error: unknown) {
      console.error('Error getting tenant credentials:', error);
      const errorMessage = error instanceof Error 
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message || error.message
        : 'Error desconocido';
      return {
        data: {
          success: false,
          message: errorMessage || 'Error al obtener credenciales',
        }
      };
    }
  },

  /**
   * Generar nuevas credenciales para un tenant
   */
  generateKeys: async (tenantId: string) => {
    try {
      const response = await nestjsApi.generateTenantCredentials(tenantId);
      return { data: response };
    } catch (error: unknown) {
      console.error('Error generating keys:', error);
      const errorMessage = error instanceof Error 
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message || error.message
        : 'Error desconocido';
      return {
        data: {
          success: false,
          message: errorMessage || 'Error al generar credenciales',
        }
      };
    }
  },

  /**
   * Eliminar un tenant
   */
  deleteTenant: async (tenantId: string, adminKey: string = 'admin1234') => {
    try {
      // Mover a papelera (desactivar) usando endpoint con clave de administrador
      await nestjsApi.updateTenantStatusAdmin(tenantId, 'INACTIVE', adminKey);
      return {
        data: {
          success: true,
          message: 'Tenant movido a papelera exitosamente',
        }
      };
    } catch (error: unknown) {
      console.error('Error moving tenant to trash:', error);
      const errorMessage = error instanceof Error 
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message || error.message
        : 'Error desconocido';
      return {
        data: {
          success: false,
          message: errorMessage || 'Error al mover tenant a papelera',
        }
      };
    }
  },

  /**
   * Restaurar un tenant
   */
  restoreTenant: async (tenantId: string, adminKey: string = 'admin1234') => {
    try {
      // Restaurar tenant (activar) usando endpoint con clave de administrador
      await nestjsApi.updateTenantStatusAdmin(tenantId, 'ACTIVE', adminKey);
      return {
        data: {
          success: true,
          message: 'Tenant restaurado exitosamente',
        }
      };
    } catch (error: unknown) {
      console.error('Error restoring tenant:', error);
      const errorMessage = error instanceof Error 
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message || error.message
        : 'Error desconocido';
      return {
        data: {
          success: false,
          message: errorMessage || 'Error al restaurar tenant',
        }
      };
    }
  },

  /**
   * Eliminar permanentemente un tenant
   * Usa el endpoint DELETE /api/coelsa/tenants/:id/admin del sandbox
   */
  permanentDeleteTenant: async (tenantId: string, adminKey: string = 'admin1234') => {
    try {
      const result = await nestjsApi.deleteTenantAdmin(tenantId, adminKey);
      return { data: result };
    } catch (error: unknown) {
      console.error('Error permanently deleting tenant:', error);
      const errorMessage = error instanceof Error 
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message || error.message
        : 'Error desconocido';
      return {
        data: {
          success: false,
          message: errorMessage || 'Error al eliminar permanentemente el tenant',
        }
      };
    }
  },

  // === LOGS Y DATA ===

  /**
   * Obtener logs del sistema con filtros
   */
  getLogs: async (params: URLSearchParams) => {
    try {
      // Construir URL con parámetros de query usando getApiUrl del config
      const queryString = params.toString();
      const url = `${getApiUrl('logs')}${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Error obteniendo logs');
      }
      
      return { data };
    } catch (error: unknown) {
      console.error('Error getting logs:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      return {
        data: {
          success: false,
          message: errorMessage || 'Error al obtener logs',
        }
      };
    }
  },

  /**
   * Obtener datos de un tenant
   */
  getTenantData: async (tenantId: string) => {
    try {
      const response = await nestjsApi.getTenantData(tenantId);
      return { data: response };
    } catch (error: unknown) {
      console.error('Error getting tenant data:', error);
      const errorMessage = error instanceof Error 
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message || error.message
        : 'Error desconocido';
      return {
        data: {
          success: false,
          message: errorMessage || 'Error al obtener datos del tenant',
        }
      };
    }
  },

  /**
   * Eliminar datos de un tenant
   */
  deleteTenantData: async (tenantId: string) => {
    try {
      const response = await nestjsApi.deleteTenantData(tenantId);
      return { data: response };
    } catch (error: unknown) {
      console.error('Error deleting tenant data:', error);
      const errorMessage = error instanceof Error 
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message || error.message
        : 'Error desconocido';
      return {
        data: {
          success: false,
          message: errorMessage || 'Error al eliminar datos del tenant',
        }
      };
    }
  },

  // === SWAGGER ===

  /**
   * Obtener especificación Swagger
   */
  getSwaggerSpec: async () => {
    try {
      const response = await nestjsApi.getSwaggerSpec();
      return { data: response };
    } catch (error: unknown) {
      console.error('Error getting swagger spec:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      return {
        data: {
          success: false,
          message: errorMessage || 'Error al obtener especificación Swagger',
        }
      };
    }
  },
};

export default apiService;

