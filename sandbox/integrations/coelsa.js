const axios = require('axios');
const crypto = require('crypto');
const logger = require('../services/logger');

class CoelsaService {
  constructor(tenantId = null) {
    this.tenantId = tenantId;
    this.config = null;
    this.client = null;

    // Configuración desde variables de entorno
    // NOTA: En modo sandbox, estas credenciales NO son requeridas ya que el sandbox emula a COELSA.
    // Las credenciales reales de COELSA se configuran por banco en la BD (tabla CoelsaConfig).
    // Estas variables de entorno solo son un fallback opcional.
    this.defaultConfig = {
      baseURL: process.env.COELSA_API_URL || process.env.SANDBOX_URL || 'http://localhost:3000/api/sandbox/coelsa',
      apiKey: process.env.COELSA_API_KEY,
      apiSecret: process.env.COELSA_API_SECRET,
      privateKey: process.env.COELSA_PRIVATE_KEY,
      certificate: process.env.COELSA_CERTIFICATE,
      timeout: 30000,
      maxRetries: 3,
      retryDelay: 1000,
      backoffMultiplier: 2,
    };
    
    // Validar configuración solo si NO estamos en modo sandbox
    // En sandbox, las credenciales se obtendrán de la BD por tenant o se simularán
    const isSandbox = this.defaultConfig.baseURL.includes('sandbox') || 
                      process.env.SANDBOX_MODE === 'true' ||
                      process.env.NODE_ENV === 'development';
    
    if (!isSandbox && (!this.defaultConfig.apiKey || !this.defaultConfig.apiSecret)) {
      console.warn('⚠️ COELSA_API_KEY y COELSA_API_SECRET no están configuradas. ' +
                   'Las credenciales deben configurarse por banco en la BD (tabla CoelsaConfig).');
    }

    // Cache para idempotencia
    this.requestCache = new Map();
  }

  /**
   * Inicializar configuración del tenant
   */
  async initialize(tenantId = null) {
    if (tenantId) {
      this.tenantId = tenantId;
    }

    if (this.tenantId) {
      try {
        const { CoelsaConfig } = require('../models');
        this.config = await CoelsaConfig.findOne({
          where: {
            tenant_id: this.tenantId,
            is_active: true,
          },
        });
      } catch (error) {
        console.warn(
          'No se pudo cargar configuración de COELSA para tenant:',
          this.tenantId
        );
      }
    }

    // Usar configuración del tenant o configuración por defecto
    const config = this.config
      ? this.config.getConfigForService()
      : this.defaultConfig;

    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'ECHEQ-Platform/1.0',
      },
    });

    // Interceptor para agregar autenticación y firma digital
    this.client.interceptors.request.use(this.addAuthHeaders.bind(this));

    // Interceptor para manejo de errores y reintentos
    this.client.interceptors.response.use(
      this.handleResponse.bind(this),
      this.handleError.bind(this)
    );
  }

  /**
   * Agregar headers de autenticación y firma digital
   */
  addAuthHeaders(config) {
    const configData = this.config
      ? this.config.getConfigForService()
      : this.defaultConfig;

    if (configData.apiKey && configData.apiSecret) {
      const timestamp = Date.now();
      const requestId = require('uuid').v4();

      // Generar firma HMAC
      const hmacSignature = this.generateHmacSignature(
        config.method,
        config.url,
        timestamp,
        config.data,
        configData.apiSecret
      );

      // Generar firma digital si hay certificado
      const digitalSignature = this.generateDigitalSignature(
        config.method,
        config.url,
        timestamp,
        config.data,
        configData.privateKey
      );

      config.headers['X-API-Key'] = configData.apiKey;
      config.headers['X-Timestamp'] = timestamp;
      config.headers['X-Request-ID'] = requestId;
      config.headers['X-Signature'] = hmacSignature;

      if (digitalSignature) {
        config.headers['X-Digital-Signature'] = digitalSignature;
      }

      // Agregar certificado si está disponible
      if (configData.certificate) {
        config.headers['X-Certificate'] = configData.certificate;
      }

      // Log de la petición
      logger.coelsa('COELSA API Request', {
        method: config.method,
        url: config.url,
        requestId,
        timestamp,
        hasDigitalSignature: !!digitalSignature,
        tenantId: this.tenantId,
      });
    }
    return config;
  }

  /**
   * Generar firma HMAC para autenticación
   */
  generateHmacSignature(method, url, timestamp, data = null, apiSecret = null) {
    const secret = apiSecret || this.defaultConfig.apiSecret;
    const payload = {
      method: method.toUpperCase(),
      url: url,
      timestamp: timestamp,
      data: data ? JSON.stringify(data) : '',
    };

    const message = `${payload.method}:${payload.url}:${payload.timestamp}:${payload.data}`;
    return crypto.createHmac('sha256', secret).update(message).digest('hex');
  }

  /**
   * Generar firma digital con certificado privado
   */
  generateDigitalSignature(
    method,
    url,
    timestamp,
    data = null,
    privateKey = null
  ) {
    if (!this.privateKey) {
      return null;
    }

    try {
      const payload = {
        method: method.toUpperCase(),
        url: url,
        timestamp: timestamp,
        data: data ? JSON.stringify(data) : '',
      };

      const message = `${payload.method}:${payload.url}:${payload.timestamp}:${payload.data}`;

      // Crear firma digital
      const sign = crypto.createSign('SHA256');
      sign.update(message);
      const signature = sign.sign(this.privateKey, 'base64');

      return signature;
    } catch (error) {
      logger.error('❌ Error generando firma digital:', error);
      return null;
    }
  }

  /**
   * Manejar respuesta exitosa
   */
  handleResponse(response) {
    logger.coelsa('COELSA API Response', {
      status: response.status,
      url: response.config.url,
      requestId: response.config.headers['X-Request-ID'],
      responseTime: response.headers['x-response-time'] || 'unknown',
    });

    return response;
  }

  /**
   * Manejar errores y reintentos
   */
  async handleError(error) {
    const config = error.config;
    const requestId = config?.headers?.['X-Request-ID'];

    logger.error('❌ COELSA API Error', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: config?.url,
      method: config?.method,
      requestId,
      error: error.message,
    });

    // Verificar si es un error de red o timeout
    if (
      error.code === 'ECONNABORTED' ||
      error.code === 'ENOTFOUND' ||
      !error.response
    ) {
      // Reintentar automáticamente
      if (config && !config._retry && config._retryCount < this.maxRetries) {
        config._retry = true;
        config._retryCount = (config._retryCount || 0) + 1;

        const delay =
          this.retryDelay *
          Math.pow(this.backoffMultiplier, config._retryCount - 1);

        logger.info(
          `🔄 Reintentando petición COELSA (${config._retryCount}/${this.maxRetries})`,
          {
            url: config.url,
            requestId,
            delay: `${delay}ms`,
          }
        );

        await new Promise(resolve => setTimeout(resolve, delay));

        return this.client.request(config);
      }
    }

    // Para errores 4xx, no reintentar
    if (
      error.response &&
      error.response.status >= 400 &&
      error.response.status < 500
    ) {
      logger.warn('⚠️ Error de cliente COELSA (no se reintenta)', {
        status: error.response.status,
        url: config?.url,
        requestId,
      });
    }

    return Promise.reject(error);
  }

  /**
   * Validar ECHEQ
   */
  async validateEcheq(echeqNumber) {
    try {
      // Usar el sandbox para todas las operaciones
      const response = await this.client.post('/simulate', {
        operation: 'validacion_echeq',
        data: { number: echeqNumber },
      });

      return {
        success: true,
        data: response.data,
        valid: response.data.valid || false,
        details: response.data.details || {},
      };
    } catch (error) {
      console.error('Error validating ECHEQ:', error.message);
      return {
        success: false,
        error: error.message,
        valid: false,
        details: {},
      };
    }
  }

  /**
   * Procesar custodia de ECHEQ
   */
  async processCustody(echeqData) {
    try {
      // Usar el sandbox para todas las operaciones
      const response = await this.client.post('/simulate', {
        operation: 'custodia',
        data: {
          number: echeqData.number,
          amount: echeqData.amount,
          currency: echeqData.currency,
          issue_date: echeqData.issue_date,
          due_date: echeqData.due_date,
          issuer: echeqData.issuer,
          beneficiary: echeqData.beneficiary,
          customer_id: echeqData.customer_id,
        },
      });

      return {
        success: true,
        data: response.data,
        custody_id: response.data.custody_id,
        status: response.data.status,
      };
    } catch (error) {
      console.error('Error processing custody:', error.message);
      return {
        success: false,
        error: error.message,
        custody_id: null,
        status: 'ERROR',
      };
    }
  }

  /**
   * Procesar descuento de ECHEQ
   */
  async processDiscount(discountData) {
    try {
      // Usar el sandbox para todas las operaciones
      const response = await this.client.post('/simulate', {
        operation: 'descuento',
        data: {
          echeq_number: discountData.echeq_number,
          amount: discountData.amount,
          currency: discountData.currency,
          due_date: discountData.due_date,
          customer_id: discountData.customer_id,
        },
      });

      return {
        success: true,
        data: response.data,
        discount_id: response.data.discount_id,
        status: response.data.status,
      };
    } catch (error) {
      console.error('Error processing discount:', error.message);
      return {
        success: false,
        error: error.message,
        discount_id: null,
        status: 'ERROR',
      };
    }
  }

  /**
   * Obtener estado de ECHEQ
   */
  async getEcheqStatus(echeqNumber) {
    try {
      const response = await this.client.get(`/echeq/status/${echeqNumber}`);

      return {
        success: true,
        data: response.data,
        state: response.data.state,
        details: response.data.details || {},
      };
    } catch (error) {
      logger.error('Error obteniendo estado de ECHEQ:', error.message);
      return {
        success: false,
        error: error.message,
        state: 'UNKNOWN',
        details: {},
      };
    }
  }

  /**
   * Obtener estado de custodia
   */
  async getCustodyStatus(echeqNumber) {
    try {
      const response = await this.client.get(
        `/echeq/custody/status/${echeqNumber}`
      );

      return {
        success: true,
        data: response.data,
        custody_state: response.data.custody_state,
        details: response.data.details || {},
      };
    } catch (error) {
      logger.error('Error obteniendo estado de custodia:', error.message);
      return {
        success: false,
        error: error.message,
        custody_state: 'UNKNOWN',
        details: {},
      };
    }
  }

  /**
   * Obtener estado de descuento
   */
  async getDiscountStatus(echeqNumber) {
    try {
      const response = await this.client.get(
        `/echeq/discount/status/${echeqNumber}`
      );

      return {
        success: true,
        data: response.data,
        discount_state: response.data.discount_state,
        details: response.data.details || {},
      };
    } catch (error) {
      logger.error('Error obteniendo estado de descuento:', error.message);
      return {
        success: false,
        error: error.message,
        discount_state: 'UNKNOWN',
        details: {},
      };
    }
  }

  /**
   * Emitir ECHEQ
   */
  async emitEcheq(echeqData) {
    try {
      // Verificar idempotencia
      const requestId = require('uuid').v4();
      if (this.requestCache.has(requestId)) {
        return this.requestCache.get(requestId);
      }

      // Usar el sandbox para todas las operaciones
      const response = await this.client.post('/simulate', {
        operation: 'emision',
        data: {
          emisor: echeqData.issuer,
          beneficiario: echeqData.beneficiary,
          monto: echeqData.amount,
          fecha_emision: echeqData.issue_date,
          fecha_vencimiento: echeqData.due_date,
          moneda: echeqData.currency || 'ARS',
          clausula: echeqData.clause || 'A LA ORDEN',
          request_id: requestId,
        },
      });

      const result = {
        success: true,
        data: response.data,
        echeq_id: response.data.echeq_id,
        codigo_visualizacion: response.data.codigo_visualizacion,
        status: 'EMITIDO',
      };

      // Cachear resultado para idempotencia
      this.requestCache.set(requestId, result);
      setTimeout(() => this.requestCache.delete(requestId), 60000); // Limpiar en 1 minuto

      return result;
    } catch (error) {
      logger.error('Error emitiendo ECHEQ:', error.message);
      return {
        success: false,
        error: error.message,
        echeq_id: null,
        status: 'ERROR',
      };
    }
  }

  /**
   * Aceptar ECHEQ
   */
  async acceptEcheq(echeqNumber, beneficiaryData) {
    try {
      // Usar el sandbox para todas las operaciones
      const response = await this.client.post('/simulate', {
        operation: 'aceptacion',
        data: {
          numero_echeq: echeqNumber,
          beneficiario: beneficiaryData.cuit,
          fecha_aceptacion: new Date().toISOString(),
          request_id: require('uuid').v4(),
        },
      });

      return {
        success: true,
        data: response.data,
        status: 'ACEPTADO',
      };
    } catch (error) {
      logger.error('Error aceptando ECHEQ:', error.message);
      return {
        success: false,
        error: error.message,
        status: 'ERROR',
      };
    }
  }

  /**
   * Repudiar ECHEQ
   */
  async rejectEcheq(echeqNumber, beneficiaryData, reason) {
    try {
      // Usar el sandbox para todas las operaciones
      const response = await this.client.post('/simulate', {
        operation: 'repudio',
        data: {
          numero_echeq: echeqNumber,
          beneficiario: beneficiaryData.cuit,
          motivo: reason,
          fecha_repudio: new Date().toISOString(),
          request_id: require('uuid').v4(),
        },
      });

      return {
        success: true,
        data: response.data,
        status: 'REPUDIADO',
      };
    } catch (error) {
      logger.error('Error repudiando ECHEQ:', error.message);
      return {
        success: false,
        error: error.message,
        status: 'ERROR',
      };
    }
  }

  /**
   * Endosar ECHEQ
   */
  async endorseEcheq(echeqNumber, endorsementData) {
    try {
      // Usar el sandbox para todas las operaciones
      const response = await this.client.post('/simulate', {
        operation: 'endoso',
        data: {
          numero_echeq: echeqNumber,
          tipo_endoso: endorsementData.type, // NOM, NEG, S/G, ENP
          nuevo_beneficiario: endorsementData.new_beneficiary,
          fecha_endoso: new Date().toISOString(),
          clausula: endorsementData.clause,
          request_id: require('uuid').v4(),
        },
      });

      return {
        success: true,
        data: response.data,
        endoso_id: response.data.endoso_id,
        status: 'ENDOSADO',
      };
    } catch (error) {
      logger.error('Error endosando ECHEQ:', error.message);
      return {
        success: false,
        error: error.message,
        status: 'ERROR',
      };
    }
  }

  /**
   * Depositar ECHEQ
   */
  async depositEcheq(echeqNumber, depositData) {
    try {
      // Usar el sandbox para todas las operaciones
      const response = await this.client.post('/simulate', {
        operation: 'deposito',
        data: {
          numero_echeq: echeqNumber,
          banco_depositario: depositData.bank_code,
          cuenta_deposito: depositData.account_number,
          fecha_deposito: new Date().toISOString(),
          request_id: require('uuid').v4(),
        },
      });

      return {
        success: true,
        data: response.data,
        deposito_id: response.data.deposito_id,
        status: 'DEPOSITADO',
      };
    } catch (error) {
      logger.error('Error depositando ECHEQ:', error.message);
      return {
        success: false,
        error: error.message,
        status: 'ERROR',
      };
    }
  }

  /**
   * Pagar ECHEQ
   */
  async payEcheq(echeqNumber, paymentData) {
    try {
      // Usar el sandbox para todas las operaciones
      const response = await this.client.post('/simulate', {
        operation: 'pago',
        data: {
          numero_echeq: echeqNumber,
          fecha_pago: new Date().toISOString(),
          monto_pagado: paymentData.amount,
          request_id: require('uuid').v4(),
        },
      });

      return {
        success: true,
        data: response.data,
        pago_id: response.data.pago_id,
        status: 'PAGADO',
      };
    } catch (error) {
      logger.error('Error pagando ECHEQ:', error.message);
      return {
        success: false,
        error: error.message,
        status: 'ERROR',
      };
    }
  }

  /**
   * Rechazar pago de ECHEQ
   */
  async rejectPayment(echeqNumber, rejectionData) {
    try {
      // Usar el sandbox para todas las operaciones
      const response = await this.client.post('/simulate', {
        operation: 'rechazo_pago',
        data: {
          numero_echeq: echeqNumber,
          motivo_rechazo: rejectionData.reason,
          fecha_rechazo: new Date().toISOString(),
          request_id: require('uuid').v4(),
        },
      });

      return {
        success: true,
        data: response.data,
        rechazo_id: response.data.rechazo_id,
        status: 'PAGO_RECHAZADO',
      };
    } catch (error) {
      logger.error('Error rechazando pago de ECHEQ:', error.message);
      return {
        success: false,
        error: error.message,
        status: 'ERROR',
      };
    }
  }

  /**
   * Solicitar devolución
   */
  async requestReturn(echeqNumber, returnData) {
    try {
      // Usar el sandbox para todas las operaciones
      const response = await this.client.post('/simulate', {
        operation: 'devolucion',
        data: {
          numero_echeq: echeqNumber,
          solicitante: returnData.requester,
          motivo: returnData.reason,
          fecha_solicitud: new Date().toISOString(),
          request_id: require('uuid').v4(),
        },
      });

      return {
        success: true,
        data: response.data,
        devolucion_id: response.data.devolucion_id,
        status: 'DEVOLUCION_SOLICITADA',
      };
    } catch (error) {
      logger.error('Error solicitando devolución:', error.message);
      return {
        success: false,
        error: error.message,
        status: 'ERROR',
      };
    }
  }

  /**
   * Emitir certificado CAC
   */
  async emitCAC(echeqNumber, cacData) {
    try {
      // Usar el sandbox para todas las operaciones
      const response = await this.client.post('/simulate', {
        operation: 'certificado_cac',
        data: {
          numero_echeq: echeqNumber,
          beneficiario_final: cacData.final_beneficiary,
          fecha_emision: new Date().toISOString(),
          request_id: require('uuid').v4(),
        },
      });

      return {
        success: true,
        data: response.data,
        cac_id: response.data.cac_id,
        codigo_cac: response.data.codigo_cac,
        status: 'CAC_EMITIDO',
      };
    } catch (error) {
      logger.error('Error emitiendo CAC:', error.message);
      return {
        success: false,
        error: error.message,
        status: 'ERROR',
      };
    }
  }

  /**
   * Consultar certificado CAC
   */
  async getCAC(cacCode) {
    try {
      // Usar el sandbox para todas las operaciones
      const response = await this.client.post('/simulate', {
        operation: 'consulta_cac',
        data: { codigo_cac: cacCode },
      });

      return {
        success: true,
        data: response.data,
        cac_valid: response.data.valid || false,
        details: response.data.details || {},
      };
    } catch (error) {
      logger.error('Error consultando CAC:', error.message);
      return {
        success: false,
        error: error.message,
        cac_valid: false,
        details: {},
      };
    }
  }

  /**
   * Obtener lista de ECHEQs
   */
  async getEcheqList(filters = {}) {
    try {
      // Usar el sandbox para todas las operaciones
      const response = await this.client.post('/simulate', {
        operation: 'lista_cheques',
        data: filters,
      });

      return {
        success: true,
        data: response.data,
        total: response.data.total || 0,
        items: response.data.items || [],
      };
    } catch (error) {
      logger.error('Error obteniendo lista de ECHEQs:', error.message);
      return {
        success: false,
        error: error.message,
        total: 0,
        items: [],
      };
    }
  }

  /**
   * Verificar conexión con COELSA
   */
  async checkConnection() {
    try {
      // Verificar si estamos en modo sandbox
      const isSandbox =
        this.baseURL.includes('sandbox') ||
        process.env.NODE_ENV === 'development' ||
        process.env.NODE_ENV === 'production';

      // En modo sandbox, simular conexión exitosa sin intentar conectar al simulador
      if (isSandbox) {
        logger.info('🔧 Modo sandbox detectado - simulando conexión COELSA');
        return {
          connected: true,
          status: 'SANDBOX',
          timestamp: new Date().toISOString(),
          version: 'sandbox-1.0.0',
          environment: 'sandbox',
        };
      }

      // Solo intentar conectar si no estamos en sandbox
      const response = await this.client.get('/health');

      return {
        connected: true,
        status: 'OK',
        timestamp: new Date().toISOString(),
        version: response.data.version || 'unknown',
      };
    } catch (error) {
      logger.error('Error verificando conexión con COELSA:', error.message);
      return {
        connected: false,
        status: 'ERROR',
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  /**
   * Simular operación para testing
   */
  async simulateOperation(operationType, data) {
    // Simulación para testing cuando no hay conexión real con COELSA
    return new Promise(resolve => {
      setTimeout(() => {
        switch (operationType) {
          case 'VALIDATE':
            resolve({
              success: true,
              valid: true,
              details: {
                issuer: 'Banco Test',
                amount: data.amount,
                due_date: data.due_date,
              },
            });
            break;
          case 'CUSTODY':
            resolve({
              success: true,
              custody_id: `CUST-${Date.now()}`,
              status: 'IN_CUSTODY',
            });
            break;
          case 'DISCOUNT':
            resolve({
              success: true,
              discount_id: `DISC-${Date.now()}`,
              status: 'APPROVED',
            });
            break;
          default:
            resolve({
              success: false,
              error: 'Unknown operation type',
            });
        }
      }, 1000); // Simular delay de red
    });
  }
}

module.exports = new CoelsaService();
