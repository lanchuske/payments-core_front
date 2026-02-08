/**
 * BFF Client Service
 * 
 * Servicio HTTP para comunicarse con payments-core-bff API.
 * Reemplaza el acceso directo a la base de datos con llamadas HTTP al BFF.
 * 
 * @module services/bffClient
 */

const axios = require('axios');
const logger = require('./logger');

class BFFClient {
  constructor() {
    // URL del BFF; Nest usa globalPrefix 'api/coelsa', por eso las rutas son /api/coelsa/tenants, etc.
    const bffOrigin = process.env.CORE_BFF_URL || 'http://localhost:3002';
    this.baseURL = bffOrigin.replace(/\/$/, '') + '/api/coelsa';
    this.timeout = parseInt(process.env.CORE_BFF_TIMEOUT || '30000');
    
    // Cache para tokens y tenant IDs por request
    this.requestContext = null;

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    // Interceptor para agregar autenticación y headers
    this.client.interceptors.request.use(
      (config) => {
        // Agregar token JWT si está disponible
        const token = this.getAuthToken(config);
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        
        // Agregar tenant ID si está disponible
        const tenantId = this.getTenantId(config);
        if (tenantId) {
          config.headers['x-tenant-id'] = tenantId;
        }

        // Log en desarrollo
        if (process.env.NODE_ENV === 'development') {
          logger.debug(`[BFF Client] ${config.method?.toUpperCase()} ${config.url}`);
        }

        return config;
      },
      (error) => {
        logger.error('[BFF Client] Error en request interceptor:', error);
        return Promise.reject(error);
      }
    );

    // Interceptor para manejo de respuestas y errores
    this.client.interceptors.response.use(
      (response) => {
        // Log en desarrollo
        if (process.env.NODE_ENV === 'development') {
          logger.debug(`[BFF Client] ${response.status} ${response.config.url}`);
        }
        return response;
      },
      (error) => {
        logger.error('[BFF Client] Error en respuesta:', {
          url: error.config?.url,
          method: error.config?.method,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message,
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Establecer contexto de request (para middleware)
   * @param {Object} context - Contexto con user, tenantId, etc.
   */
  setRequestContext(context) {
    this.requestContext = context;
  }

  /**
   * Limpiar contexto de request
   */
  clearRequestContext() {
    this.requestContext = null;
  }

  /**
   * Obtener token de autenticación
   * @param {Object} config - Config de axios
   * @returns {string|null}
   */
  getAuthToken(config) {
    // Si hay contexto de request, usar token de ahí
    if (this.requestContext?.token) {
      return this.requestContext.token;
    }
    
    // Si hay token en headers de la request original, usarlo
    if (config?.headers?.authorization) {
      return config.headers.authorization.replace(/^Bearer /, '');
    }
    
    // Intentar obtener de variables de entorno (para API keys)
    if (process.env.BFF_API_KEY) {
      return process.env.BFF_API_KEY;
    }
    
    return null;
  }

  /**
   * Obtener tenant ID
   * @param {Object} config - Config de axios
   * @returns {string|null}
   */
  getTenantId(config) {
    // Si hay contexto de request, usar tenantId de ahí
    if (this.requestContext?.tenantId) {
      return this.requestContext.tenantId;
    }
    
    // Si hay tenantId en headers de la request original, usarlo
    if (config?.headers?.['x-tenant-id']) {
      return config.headers['x-tenant-id'];
    }
    
    return null;
  }

  // ========== TENANTS ==========

  /**
   * Listar tenants
   * @param {Object} params - Parámetros de query (page, limit, status, type)
   * @returns {Promise<Object>}
   */
  async getTenants(params = {}) {
    const response = await this.client.get('/tenants', { params });
    return response.data;
  }

  /**
   * Obtener tenant por ID
   * @param {string} id - ID del tenant
   * @returns {Promise<Object>}
   */
  async getTenant(id) {
    const response = await this.client.get(`/tenants/${id}`);
    return response.data;
  }

  /**
   * Crear tenant
   * @param {Object} data - Datos del tenant
   * @returns {Promise<Object>}
   */
  async createTenant(data) {
    const response = await this.client.post('/tenants/public', data);
    return response.data;
  }

  /**
   * Crear tenant (admin - requiere autenticación)
   * @param {Object} data - Datos del tenant
   * @returns {Promise<Object>}
   */
  async createTenantAdmin(data) {
    const response = await this.client.post('/tenants', data);
    return response.data;
  }

  /**
   * Actualizar tenant
   * @param {string} id - ID del tenant
   * @param {Object} data - Datos a actualizar
   * @returns {Promise<Object>}
   */
  async updateTenant(id, data) {
    const response = await this.client.patch(`/tenants/${id}`, data);
    return response.data;
  }

  /**
   * Eliminar tenant
   * @param {string} id - ID del tenant
   * @returns {Promise<Object>}
   */
  async deleteTenant(id) {
    const response = await this.client.delete(`/tenants/${id}`);
    return response.data;
  }

  /**
   * Obtener credenciales del tenant
   * @param {string} id - ID del tenant
   * @returns {Promise<Object>}
   */
  async getTenantCredentials(id) {
    const response = await this.client.get(`/tenants/${id}/credentials`);
    return response.data;
  }

  /**
   * Generar/regenerar credenciales del tenant
   * @param {string} id - ID del tenant
   * @returns {Promise<Object>}
   */
  async generateTenantCredentials(id) {
    const response = await this.client.post(`/tenants/${id}/credentials`);
    return response.data;
  }

  // ========== COELSA CERTIFICADOS ==========

  /**
   * Listar certificados
   * @param {Object} params - Parámetros de query
   * @returns {Promise<Object>}
   */
  async getCertificados(params = {}) {
    const response = await this.client.get('/Certificados/Emitir', { params });
    return response.data;
  }

  /**
   * Emitir certificado
   * @param {Object} data - Datos del certificado
   * @returns {Promise<Object>}
   */
  async emitirCertificado(data) {
    const response = await this.client.post('/Certificados/Emitir', data);
    return response.data;
  }

  /**
   * Emitir certificado final
   * @param {Object} data - Datos del certificado final
   * @returns {Promise<Object>}
   */
  async emitirCertificadoFinal(data) {
    const response = await this.client.post('/Certificados/EmitirFinal', data);
    return response.data;
  }

  /**
   * Anular certificado
   * @param {Object} data - Datos de anulación
   * @returns {Promise<Object>}
   */
  async anularCertificado(data) {
    const response = await this.client.post('/Certificados/Anular', data);
    return response.data;
  }

  // ========== COELSA CESION (ASSIGNMENT) ==========

  /**
   * Listar cesiones
   * @param {Object} params - Parámetros de query
   * @returns {Promise<Object>}
   */
  async getCesiones(params = {}) {
    const response = await this.client.get('/Cesion/Emitir', { params });
    return response.data;
  }

  /**
   * Emitir cesión
   * @param {Object} data - Datos de la cesión
   * @returns {Promise<Object>}
   */
  async emitirCesion(data) {
    const response = await this.client.post('/Cesion/Emitir', data);
    return response.data;
  }

  /**
   * Solicitar cesión
   * @param {Object} data - Datos de la solicitud
   * @returns {Promise<Object>}
   */
  async solicitarCesion(data) {
    const response = await this.client.post('/Cesion/Solicitar', data);
    return response.data;
  }

  /**
   * Admitir cesión
   * @param {Object} data - Datos de admisión
   * @returns {Promise<Object>}
   */
  async admitirCesion(data) {
    const response = await this.client.post('/Cesion/Admitir', data);
    return response.data;
  }

  /**
   * Anular cesión
   * @param {Object} data - Datos de anulación
   * @returns {Promise<Object>}
   */
  async anularCesion(data) {
    const response = await this.client.post('/Cesion/Anular', data);
    return response.data;
  }

  /**
   * Repudiar cesión
   * @param {Object} data - Datos de repudio
   * @returns {Promise<Object>}
   */
  async repudiarCesion(data) {
    const response = await this.client.post('/Cesion/Repudiar', data);
    return response.data;
  }

  // ========== COELSA AVALES (GUARANTEE) ==========

  /**
   * Listar avales
   * @param {Object} params - Parámetros de query
   * @returns {Promise<Object>}
   */
  async getAvales(params = {}) {
    const response = await this.client.get('/Avales/Solicitar', { params });
    return response.data;
  }

  /**
   * Solicitar aval
   * @param {Object} data - Datos del aval
   * @returns {Promise<Object>}
   */
  async solicitarAval(data) {
    const response = await this.client.post('/Avales/Solicitar', data);
    return response.data;
  }

  /**
   * Admitir aval
   * @param {Object} data - Datos de admisión
   * @returns {Promise<Object>}
   */
  async admitirAval(data) {
    const response = await this.client.post('/Avales/Admitir', data);
    return response.data;
  }

  /**
   * Anular aval
   * @param {Object} data - Datos de anulación
   * @returns {Promise<Object>}
   */
  async anularAval(data) {
    const response = await this.client.post('/Avales/Anular', data);
    return response.data;
  }

  /**
   * Repudiar aval
   * @param {Object} data - Datos de repudio
   * @returns {Promise<Object>}
   */
  async repudiarAval(data) {
    const response = await this.client.post('/Avales/Repudiar', data);
    return response.data;
  }

  // ========== COELSA MANDATOS ==========

  /**
   * Listar mandatos de cobro
   * @param {Object} params - Parámetros de query
   * @returns {Promise<Object>}
   */
  async getMandatosCobro(params = {}) {
    const response = await this.client.get('/Mandatos/Cobro/Emitir', { params });
    return response.data;
  }

  /**
   * Emitir mandato de cobro
   * @param {Object} data - Datos del mandato
   * @returns {Promise<Object>}
   */
  async emitirMandatoCobro(data) {
    const response = await this.client.post('/Mandatos/Cobro/Emitir', data);
    return response.data;
  }

  /**
   * Admitir mandato de cobro
   * @param {Object} data - Datos de admisión
   * @returns {Promise<Object>}
   */
  async admitirMandatoCobro(data) {
    const response = await this.client.post('/Mandatos/Cobro/Admitir', data);
    return response.data;
  }

  /**
   * Listar mandatos de negociación
   * @param {Object} params - Parámetros de query
   * @returns {Promise<Object>}
   */
  async getMandatosNegociacion(params = {}) {
    const response = await this.client.get('/Mandatos/Negociacion/Emitir', { params });
    return response.data;
  }

  /**
   * Emitir mandato de negociación
   * @param {Object} data - Datos del mandato
   * @returns {Promise<Object>}
   */
  async emitirMandatoNegociacion(data) {
    const response = await this.client.post('/Mandatos/Negociacion/Emitir', data);
    return response.data;
  }

  /**
   * Admitir mandato de negociación
   * @param {Object} data - Datos de admisión
   * @returns {Promise<Object>}
   */
  async admitirMandatoNegociacion(data) {
    const response = await this.client.post('/Mandatos/Negociacion/Admitir', data);
    return response.data;
  }

  /**
   * Anular mandato
   * @param {Object} data - Datos de anulación
   * @returns {Promise<Object>}
   */
  async anularMandato(data) {
    const response = await this.client.post('/Mandatos/Anular', data);
    return response.data;
  }

  /**
   * Repudiar mandato
   * @param {Object} data - Datos de repudio
   * @returns {Promise<Object>}
   */
  async repudiarMandato(data) {
    const response = await this.client.post('/Mandatos/Repudiar', data);
    return response.data;
  }

  /**
   * Revocar mandato
   * @param {Object} data - Datos de revocación
   * @returns {Promise<Object>}
   */
  async revocarMandato(data) {
    const response = await this.client.post('/Mandatos/Revocar', data);
    return response.data;
  }

  // ========== COELSA NOTIFICACIONES ==========

  /**
   * Listar notificaciones pendientes
   * @param {Object} params - Parámetros de query
   * @returns {Promise<Object>}
   */
  async getNotificacionesPendientes(params = {}) {
    const response = await this.client.get('/Notificationes/Pendientes', { params });
    return response.data;
  }

  /**
   * Listar todas las notificaciones
   * @param {Object} params - Parámetros de query
   * @returns {Promise<Object>}
   */
  async getNotificaciones(params = {}) {
    const response = await this.client.get('/Notificationes', { params });
    return response.data;
  }

  /**
   * Crear notificación
   * @param {Object} data - Datos de la notificación
   * @returns {Promise<Object>}
   */
  async crearNotificacion(data) {
    const response = await this.client.post('/Notificationes/Crear', data);
    return response.data;
  }

  /**
   * Confirmar notificación
   * @param {Object} data - Datos de confirmación
   * @returns {Promise<Object>}
   */
  async confirmarNotificacion(data) {
    const response = await this.client.post('/Notificationes/Confirmar', data);
    return response.data;
  }

  /**
   * Marcar notificación como leída
   * @param {Object} data - Datos de marcado
   * @returns {Promise<Object>}
   */
  async marcarNotificacionLeida(data) {
    const response = await this.client.post('/Notificationes/MarcarLeida', data);
    return response.data;
  }

  // ========== COELSA CHEQUES ==========

  /**
   * Listar cheques
   * @param {Object} params - Parámetros de query
   * @returns {Promise<Object>}
   */
  async getCheques(params = {}) {
    const response = await this.client.get('/Cheques', { params });
    return response.data;
  }

  /**
   * Obtener cheque por número
   * @param {string} numero - Número del cheque
   * @returns {Promise<Object>}
   */
  async getCheque(numero) {
    const response = await this.client.get(`/Cheques/${numero}`);
    return response.data;
  }

  /**
   * Crear cheque
   * @param {Object} data - Datos del cheque
   * @returns {Promise<Object>}
   */
  async createCheque(data) {
    const response = await this.client.post('/Cheques', data);
    return response.data;
  }

  /**
   * Admitir cheque
   * @param {string} numero - Número del cheque
   * @param {Object} data - Datos de admisión
   * @returns {Promise<Object>}
   */
  async admitirCheque(numero, data) {
    const response = await this.client.post(`/Cheques/${numero}/admitir`, data);
    return response.data;
  }

  // ========== COELSA CUENTAS ==========

  /**
   * Listar cuentas
   * @param {Object} params - Parámetros de query
   * @returns {Promise<Object>}
   */
  async getCuentas(params = {}) {
    const response = await this.client.get('/Cuentas', { params });
    return response.data;
  }

  /**
   * Obtener cuenta por ID
   * @param {string} id - ID de la cuenta
   * @returns {Promise<Object>}
   */
  async getCuenta(id) {
    const response = await this.client.get(`/Cuentas/${id}`);
    return response.data;
  }

  /**
   * Crear cuenta
   * @param {Object} data - Datos de la cuenta
   * @returns {Promise<Object>}
   */
  async createCuenta(data) {
    const response = await this.client.post('/Cuentas', data);
    return response.data;
  }

  // ========== COELSA ENDOSOS ==========

  /**
   * Listar endosos
   * @param {Object} params - Parámetros de query
   * @returns {Promise<Object>}
   */
  async getEndosos(params = {}) {
    const response = await this.client.get('/Endosos', { params });
    return response.data;
  }

  /**
   * Emitir endoso
   * @param {Object} data - Datos del endoso
   * @returns {Promise<Object>}
   */
  async emitirEndoso(data) {
    const response = await this.client.post('/Endosos/Emitir', data);
    return response.data;
  }

  /**
   * Admitir endoso
   * @param {Object} data - Datos de admisión
   * @returns {Promise<Object>}
   */
  async admitirEndoso(data) {
    const response = await this.client.post('/Endosos/Admitir', data);
    return response.data;
  }

  /**
   * Repudiar endoso
   * @param {Object} data - Datos de repudio
   * @returns {Promise<Object>}
   */
  async repudiarEndoso(data) {
    const response = await this.client.post('/Endosos/Repudiar', data);
    return response.data;
  }

  // ========== AUTH ==========

  /**
   * Login
   * @param {Object} credentials - Credenciales (email, password)
   * @returns {Promise<Object>}
   */
  async login(credentials) {
    const response = await this.client.post('/auth/login', credentials);
    return response.data;
  }

  /**
   * Validar token
   * @param {string} token - Token JWT
   * @returns {Promise<Object>}
   */
  async validateToken(token) {
    const response = await this.client.get('/auth/validate', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  }

  // ========== LOGS ==========

  /**
   * Crear log del sistema
   * @param {Object} data - Datos del log
   * @returns {Promise<Object>}
   */
  async createLog(data) {
    const response = await this.client.post('/logs', data);
    return response.data;
  }

  /**
   * Listar logs
   * @param {Object} params - Parámetros de query
   * @returns {Promise<Object>}
   */
  async getLogs(params = {}) {
    const response = await this.client.get('/logs', { params });
    return response.data;
  }

  // ========== MÉTODO GENÉRICO ==========

  /**
   * Realizar request genérico al BFF
   * @param {Object} config - Configuración de axios
   * @returns {Promise<Object>}
   */
  async request(config) {
    const response = await this.client.request(config);
    return response.data;
  }
}

// Exportar instancia singleton
module.exports = new BFFClient();

