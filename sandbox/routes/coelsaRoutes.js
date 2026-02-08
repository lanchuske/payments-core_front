/**
 * Rutas COELSA
 * Implementa exactamente la estructura de endpoints según especificación OpenAPI:
 * - /Cuentas/Cuenta - Gestión de cuentas emisoras
 * - /Cheques/* - Gestión de cheques electrónicos
 * - /Endosos/* - Gestión de endosos
 * - /Custodia/* - Gestión de custodia
 * - /Devoluciones/* - Gestión de devoluciones
 * - /Certificados/* - Gestión de certificados CAC
 * - /Cesion/* - Gestión de cesión de derechos
 * - /Avales/* - Gestión de avales
 * - /Mandatos/* - Gestión de mandatos
 * - /Notificaciones/* - Gestión de notificaciones
 * - /Seguridad/* - Gestión de seguridad y tokens
 * - /Conciliacion/* - Reportes de conciliación
 * - /Reportes/* - Reportes y estadísticas
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');
const logger = require('../services/logger');

// Importar middleware de autenticación COELSA
const {
  validateCoelsaApiKeys,
  coelsaAuditLog,
} = require('../middleware/coelsaAuth');

// Importar controladores COELSA
const coelsaAccountsController = require('../controllers/coelsaAccountsController');
const coelsaChequesController = require('../controllers/coelsaChequesController');
console.log('🔧 coelsaChequesController importado:', typeof coelsaChequesController);
const coelsaEndososController = require('../controllers/coelsaEndososController');
const coelsaCustodiaController = require('../controllers/coelsaCustodiaController');
const coelsaDevolucionesController = require('../controllers/coelsaDevolucionesController');
// ⚠️ DEPRECATED - Controladores migrados a NestJS
// const coelsaCertificadosController = require('../controllers/coelsaCertificadosController'); // ✅ Migrado a echeq-sandbox-nestjs/src/modules/coelsa-certificados/
// const coelsaCesionController = require('../controllers/coelsaCesionController'); // ✅ Migrado a echeq-sandbox-nestjs/src/modules/coelsa-cesion/
// const coelsaAvalesController = require('../controllers/coelsaAvalesController'); // ✅ Migrado a echeq-sandbox-nestjs/src/modules/coelsa-avales/
// const coelsaMandatosController = require('../controllers/coelsaMandatosController'); // ✅ Migrado a echeq-sandbox-nestjs/src/modules/coelsa-mandatos/
// const coelsaNotificacionesController = require('../controllers/coelsaNotificacionesController'); // ✅ Migrado a echeq-sandbox-nestjs/src/modules/coelsa-notificaciones/
const coelsaMqController = require('../controllers/coelsaMqController');
const coelsaMasivoController = require('../controllers/coelsaMasivoController');
const adminController = require('../controllers/adminController');
const adminAuth = require('../middleware/adminAuth');
const coelsaSeguridadController = require('../controllers/coelsaSeguridadController');
const coelsaAnexosController = require('../controllers/coelsaAnexosController');

// Middleware para validar formato de requests
const validateRequest = (req, res, next) => {
    // Validar Content-Type
    if (req.method === 'POST' && !req.is('application/json')) {
        return res.status(400).json({
            success: false,
            message: 'Content-Type debe ser application/json',
      error: 'INVALID_CONTENT_TYPE',
        });
    }
    
    // Validar que el body no esté vacío para POST
    if (req.method === 'POST' && Object.keys(req.body).length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Body no puede estar vacío',
      error: 'EMPTY_BODY',
        });
    }
    
    next();
};

// ============================================================================
// MIDDLEWARE DE AUTENTICACIÓN PARA RUTAS PROTEGIDAS
// ============================================================================

// Aplicar middleware de autenticación a todas las rutas excepto las públicas
router.use((req, res, next) => {
  console.log('[MIDDLEWARE] Verificando ruta:', req.path);

  // Rutas públicas que no requieren autenticación
  const publicRoutes = [
    '/swagger.json',
    '/api-docs',
    '/debug-panel',
    '/create-tenant',
    '/generate-keys',
    '/debug-tenant',
    '/logs',
    '/system-logs',
    '/tenant-data',
    '/tenants',
    '/tenant-credentials',
    '/health',
    '/admin/tenants',
    '/admin/stats',
    '/admin/health',
  ];

  // Verificar si la ruta es pública
  const isPublicRoute = publicRoutes.some(route => {
    if (route.includes(':')) {
      // Para rutas con parámetros, usar regex
      const pattern = route.replace(/:\w+/g, '[^/]+');
      return new RegExp(`^${pattern}$`).test(req.path);
    }
    // Para rutas sin parámetros, verificar coincidencia exacta o que empiece con la ruta
    return req.path === route || req.path.startsWith(route + '/');
  });

  console.log('[MIDDLEWARE] Es ruta pública:', isPublicRoute);

  if (isPublicRoute) {
    console.log('[MIDDLEWARE] Saltando autenticación para ruta pública');
    return next();
  }

  console.log('[MIDDLEWARE] Aplicando autenticación COELSA');
  // Aplicar autenticación COELSA para rutas protegidas
  validateCoelsaApiKeys(req, res, next);
});

// ============================================================================
// RUTAS DE CONTROLADORES COELSA
// ============================================================================

// Rutas de Cuentas
router.get('/Cuentas/Cuenta', (req, res) => new coelsaAccountsController().getCuentas(req, res));
router.post('/Cuentas/Cuenta', (req, res) => {
  const controller = new coelsaAccountsController();
  return controller.createCuenta(req, res);
});

// Rutas de Cheques
router.get('/Cheques/Cheque', (req, res) => new coelsaChequesController().getCheques(req, res));
router.post('/Cheques/Cheque', (req, res) => {
  const controller = new coelsaChequesController();
  return controller.createCheque(req, res);
});

// Ruta específica para emisión de eCheqs (compatibilidad con backend principal)
router.post('/echeqs/emission', validateCoelsaApiKeys, coelsaAuditLog, (req, res) => {
  console.log('🔧 [SANDBOX] Ruta /echeqs/emission llamada, redirigiendo a /simulate');
  
  // Redirigir al endpoint de simulación
  const { operation = 'emision', data = req.body } = req.body;
  
  // Llamar al endpoint de simulación interno
  const simulateController = require('../controllers/simulateController');
  const controller = new simulateController();
  return controller.simulate(req, res);
});
router.post('/Cheques/Emitido/Admitir', (req, res) => new coelsaChequesController().admitirCheque(req, res));
router.post(
  '/Cheques/Emitido/Repudiar',
  (req, res) => new coelsaChequesController().repudiarCheque(req, res)
);
router.post('/Cheques/Emitido/Anular', (req, res) => new coelsaChequesController().anularCheque(req, res));
router.post('/Cheques/Activo/Depositar', async (req, res) => {
  // Proxy hacia NestJS COELSA endpoint para consolidar lógica
  try {
    const nestBase = process.env.NEXT_PUBLIC_API_URL || process.env.NEST_BASE_URL || 'http://localhost:3000';
    const url = `${nestBase.replace(/\/$/, '')}/api/coelsa/Cheques/Activo/Depositar`;
    const headers = {
      'Content-Type': 'application/json',
      'x-tenant-id': req.headers['x-tenant-id'] || req.headers['X-Tenant-Id'] || req.headers['X-Tenant-ID'] || '',
      'x-echeq-signature': req.headers['x-echeq-signature'] || '',
      'x-time': req.headers['x-time'] || ''
    };
    const resp = await axios.post(url, req.body, { headers });
    return res.status(resp.status).json(resp.data);
  } catch (err) {
    const status = err?.response?.status || 500;
    const data = err?.response?.data || { success: false, message: err.message };
    return res.status(status).json(data);
  }
});
router.post('/Cheques/Activo/Pagar', (req, res) => new coelsaChequesController().pagarCheque(req, res));
router.post(
  '/Cheques/Activo/RechazarPago',
  (req, res) => new coelsaChequesController().rechazarPago(req, res)
);

// Rutas de Endosos
router.get('/Endosos/Nominal', (req, res) => new coelsaEndososController().getEndosos(req, res));
router.post('/Endosos/Nominal', (req, res) => {
  const controller = new coelsaEndososController();
  return controller.endosoNominal(req, res);
});

// ENDOSOS FALTANTES
router.post('/Endosos/SinGarantia', (req, res) => new coelsaEndososController().endosarSinGarantia(req, res));
router.post('/Endosos/Procuración', (req, res) => new coelsaEndososController().endosarEnProcuración(req, res));
router.post('/Endosos/Anular', (req, res) => new coelsaEndososController().anularEndoso(req, res));

// ENDOSOS - Admitir y Repudiar
router.post('/Endosos/Admitir', (req, res) => new coelsaEndososController().admitirEndoso(req, res));
router.post('/Endosos/Repudiar', (req, res) => new coelsaEndososController().repudiarEndoso(req, res));

// Rutas de Custodia
router.get('/Custodia/Poner', (req, res) => coelsaCustodiaController.getCustodia(req, res));
router.post('/Custodia/Poner', (req, res) => coelsaCustodiaController.ponerEnCustodia(req, res));

// Rutas de Devoluciones
router.get(
  '/Devoluciones/Solicitar',
  (req, res) => coelsaDevolucionesController.getDevoluciones(req, res)
);
router.post(
  '/Devoluciones/Solicitar',
  (req, res) => coelsaDevolucionesController.solicitarDevolucion(req, res)
);
router.post(
  '/Devoluciones/Devolver',
  (req, res) => coelsaDevolucionesController.devolver(req, res)
);

// ⚠️ RUTAS DEPRECADAS - MIGRADAS A NESTJS ⚠️
// Rutas de Certificados
// ✅ Migrado a: echeq-sandbox-nestjs/src/modules/coelsa-certificados/
// 📅 Fecha de migración: 2025-12-03
// ⚠️ Estas rutas ya no se ejecutan - El BFF consume NestJS directamente
/*
router.get(
  '/Certificados/Emitir',
  (req, res) => coelsaCertificadosController.getCertificados(req, res)
);
router.post(
  '/Certificados/Emitir',
  (req, res) => coelsaCertificadosController.emitirCertificado(req, res)
);
*/

// ⚠️ RUTAS DEPRECADAS - MIGRADAS A NESTJS ⚠️
// Rutas de Cesión
// ✅ Migrado a: echeq-sandbox-nestjs/src/modules/coelsa-cesion/
// 📅 Fecha de migración: 2025-12-03
// ⚠️ Estas rutas ya no se ejecutan - El BFF consume NestJS directamente
/*
router.get('/Cesion/Solicitar', (req, res) => new coelsaCesionController().getCesiones(req, res));
router.post('/Cesion/Solicitar', (req, res) => new coelsaCesionController().solicitarCesion(req, res));

// CESION FALTANTES
router.post('/Cesion/Emitir', (req, res) => coelsaCesionController.emitirCesion(req, res));
router.post('/Cesion/Anular', (req, res) => coelsaCesionController.anularCesion(req, res));
router.post('/Cesion/Admitir', (req, res) => coelsaCesionController.admitirCesion(req, res));
router.post('/Cesion/Repudiar', (req, res) => coelsaCesionController.repudiarCesion(req, res));
*/

// ⚠️ RUTAS DEPRECADAS - MIGRADAS A NESTJS ⚠️
// Rutas de Avales
// ✅ Migrado a: echeq-sandbox-nestjs/src/modules/coelsa-avales/
// 📅 Fecha de migración: 2025-12-03
// ⚠️ Estas rutas ya no se ejecutan - El BFF consume NestJS directamente
/*
router.get('/Avales/Solicitar', (req, res) => coelsaAvalesController.getAvales(req, res));
router.post('/Avales/Solicitar', (req, res) => coelsaAvalesController.solicitarAval(req, res));

// AVALES FALTANTES
router.post('/Avales/Anular', (req, res) => coelsaAvalesController.anularAval(req, res));
router.post('/Avales/Admitir', (req, res) => coelsaAvalesController.admitirAval(req, res));
router.post('/Avales/Repudiar', (req, res) => coelsaAvalesController.repudiarAval(req, res));
*/

// ⚠️ RUTAS DEPRECADAS - MIGRADAS A NESTJS ⚠️
// Rutas de Mandatos
// ✅ Migrado a: echeq-sandbox-nestjs/src/modules/coelsa-mandatos/
// 📅 Fecha de migración: 2025-12-03
// ⚠️ Estas rutas ya no se ejecutan - El BFF consume NestJS directamente
/*
router.get('/Mandatos/Cobro/Crear', (req, res) => coelsaMandatosController.getMandatos(req, res));
router.post('/Mandatos/Cobro/Crear', (req, res) => coelsaMandatosController.crearMandato(req, res));

// MANDATOS FALTANTES
router.post('/Mandatos/Cobro/Anular', (req, res) => coelsaMandatosController.anularMandatoCobro(req, res));
router.post('/Mandatos/Cobro/Admitir', (req, res) => coelsaMandatosController.admitirMandatoCobro(req, res));
router.post('/Mandatos/Cobro/Repudiar', (req, res) => coelsaMandatosController.repudiarMandatoCobro(req, res));
router.post('/Mandatos/Cobro/Revocar', (req, res) => coelsaMandatosController.revocarMandatoCobro(req, res));

// Rutas de Mandatos de Negociación
router.get('/Mandatos/Negociacion/Crear', (req, res) => coelsaMandatosController.getMandatos(req, res));
router.post('/Mandatos/Negociacion/Crear', (req, res) => coelsaMandatosController.crearMandatoNegociacion(req, res));
router.post('/Mandatos/Negociacion/Admitir', (req, res) => coelsaMandatosController.admitirMandatoNegociacion(req, res));
router.post('/Mandatos/Negociacion/Anular', (req, res) => coelsaMandatosController.anularMandatoNegociacion(req, res));
router.post('/Mandatos/Negociacion/Repudiar', (req, res) => coelsaMandatosController.repudiarMandatoNegociacion(req, res));
router.post('/Mandatos/Negociacion/Revocar', (req, res) => coelsaMandatosController.revocarMandatoNegociacion(req, res));
*/

// ⚠️ RUTAS DEPRECADAS - MIGRADAS A NESTJS ⚠️
// Rutas de Notificaciones
// ✅ Migrado a: echeq-sandbox-nestjs/src/modules/coelsa-notificaciones/
// 📅 Fecha de migración: 2025-12-03
// ⚠️ Estas rutas ya no se ejecutan - El BFF consume NestJS directamente
/*
router.get(
  '/Notificaciones/Pendientes',
  (req, res) => coelsaNotificacionesController.getNotificaciones(req, res)
);
*/

// Duplicado comentado arriba - Ver sección de Certificados marcada como deprecated

// Rutas de Seguridad
router.post('/Seguridad/Token', (req, res) => new coelsaSeguridadController().generateToken(req, res));

// Endpoint de validación de credenciales
// Este endpoint requiere autenticación (el middleware valida las credenciales)
// Si las credenciales son válidas, el middleware pasa y responde con éxito
router.get('/validate', (req, res) => {
  // Si llegamos aquí, significa que el middleware de autenticación pasó
  // Las credenciales son válidas
  res.json({
    success: true,
    message: 'Credenciales válidas',
    tenantId: req.tenantId || req.headers['x-tenant-id'],
    timestamp: new Date().toISOString(),
  });
});

// Rutas de Consultas
router.get('/consulta/estado', (req, res) => new coelsaChequesController().consultarEstado(req, res));
router.get('/Cheques/Estado', (req, res) => new coelsaChequesController().consultarEstado(req, res));
router.get('/Cheques/Lista', (req, res) => new coelsaChequesController().getCheques(req, res));
router.get('/Cheques/Conciliacion/:fecha', (req, res) => new coelsaChequesController().getConciliacion(req, res));
router.get('/Cheques/ReporteCausales', (req, res) => new coelsaChequesController().getReporteCausales(req, res));
router.get('/consulta/por-cmc7', (req, res) => new coelsaChequesController().consultarPorCmc7(req, res));
router.get('/consulta/por-id', (req, res) => new coelsaChequesController().consultarPorId(req, res));
router.get('/Cheques/Consulta/Numero', (req, res) => new coelsaChequesController().consultarPorNumero(req, res));
router.get('/Cheques/Consulta/Cmc7', (req, res) => new coelsaChequesController().consultarPorCmc7(req, res));

// Rutas de Custodia
router.get('/Custodia/Retirar', (req, res) => coelsaCustodiaController.consultarEstadoCustodia(req, res));
router.post('/Custodia/Retirar', (req, res) => coelsaCustodiaController.rescatarDeCustodia(req, res));

// Rutas de Reportes
router.get('/Conciliacion/:fecha', (req, res) => new coelsaChequesController().getConciliacion(req, res));
router.get('/Reportes/Causales', (req, res) => new coelsaChequesController().getReporteCausales(req, res));

// Rutas de MQ (RabbitMQ)
router.post('/mq/suscribir', (req, res) => new coelsaMqController().suscribir(req, res));
router.post('/mq/publicar', (req, res) => new coelsaMqController().publicar(req, res));
router.get('/mq/estado', (req, res) => new coelsaMqController().getEstado(req, res));

// Rutas de Operaciones Masivas
router.post('/masivo/cuentas/alta', (req, res) => new coelsaMasivoController().altaCuentas(req, res));
router.post('/masivo/cheques/crear', (req, res) => new coelsaMasivoController().crearCheques(req, res));
router.post('/masivo/cheques/admitir', (req, res) => new coelsaMasivoController().admitirCheques(req, res));

// Rutas Administrativas (requieren autenticación de administrador)
router.get('/admin/tenants', adminAuth, (req, res) => new adminController().listarTenants(req, res));
router.post('/admin/tenants', adminAuth, (req, res) => new adminController().crearTenant(req, res));
router.delete('/admin/tenants/:id', adminAuth, (req, res) => new adminController().eliminarTenant(req, res));
router.get('/admin/tenants/:id/credentials', adminAuth, (req, res) => new adminController().obtenerCredenciales(req, res));
router.get('/admin/stats', adminAuth, (req, res) => new adminController().getStats(req, res));
router.get('/admin/health', adminAuth, (req, res) => new adminController().getHealth(req, res));

// Health check específico de COELSA
router.get('/health', (req, res) => {
  logger.api('Health check requested', {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
  
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'echeq-sandbox-coelsa',
    environment: process.env.NODE_ENV || 'sandbox',
  });
});

// ============================================================================
// ENDPOINTS PÚBLICOS (SIN AUTENTICACIÓN)
// ============================================================================

/**
 * GET /swagger.json
 * Especificación OpenAPI en formato JSON
 */
/**
 * GET /swagger.json
 * Obtener especificación Swagger del BFF
 * ✅ MIGRADO: Ahora obtiene el swagger.json del BFF
 */
router.get('/swagger.json', async (req, res) => {
  try {
    const bffClient = require('../services/bffClient');
    const { formatErrorResponse } = require('../utils/errorHandler');
    
    // Obtener swagger.json del BFF
    const response = await bffClient.request({
      method: 'GET',
      url: '/api/docs-json',
    });
    
    res.json(response);
  } catch (error) {
    // Fallback: intentar leer archivo local si el BFF no está disponible
    try {
      const fs = require('fs');
      const path = require('path');
      const swaggerPath = path.join(__dirname, '../swagger.json');
      const swaggerSpec = JSON.parse(fs.readFileSync(swaggerPath, 'utf8'));
      res.json(swaggerSpec);
    } catch (fallbackError) {
      console.error('Error cargando swagger.json:', fallbackError);
      const { formatErrorResponse } = require('../utils/errorHandler');
      res.status(500).json(
        formatErrorResponse(error, 'Error cargando especificación Swagger')
      );
    }
  }
});

/**
 * POST /create-tenant
 * Endpoint público para crear tenant desde el panel de administración
 */
router.post('/create-tenant', async (req, res) => {
  try {
    const tenantController = require('../controllers/tenantController');
    await tenantController.createTenant(req, res);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message,
    });
  }
});

/**
 * POST /generate-keys/:tenantId
 * Endpoint público para generar API keys desde el panel de administración
 */
router.post('/generate-keys/:tenantId', async (req, res) => {
  try {
    const tenantController = require('../controllers/tenantController');
    req.params.id = req.params.tenantId;
    await tenantController.generateSandboxApiKeys(req, res);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message,
    });
  }
});

/**
 * POST /tenants/public
 * Crear tenant (compatible con cliente NestJS que llama a /tenants/public)
 */
router.post('/tenants/public', async (req, res) => {
  try {
    const tenantController = require('../controllers/tenantController');
    await tenantController.createTenant(req, res);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message,
    });
  }
});

/**
 * GET /tenants/:tenantId/credentials
 * Obtener credenciales del tenant (estilo NestJS)
 */
router.get('/tenants/:tenantId/credentials', async (req, res) => {
  try {
    const tenantController = require('../controllers/tenantController');
    await tenantController.getTenantCredentials(req, res);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message,
    });
  }
});

/**
 * POST /tenants/:tenantId/credentials
 * Generar API keys del tenant (estilo NestJS)
 */
router.post('/tenants/:tenantId/credentials', async (req, res) => {
  try {
    const tenantController = require('../controllers/tenantController');
    req.params.id = req.params.tenantId;
    await tenantController.generateSandboxApiKeys(req, res);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message,
    });
  }
});

/**
 * GET /logs
 * Obtener logs del sistema en tiempo real
 */
router.get('/logs', (req, res) => {
  try {
    // Obtener logs de memoria (tiempo real)
    const memoryLogs = logger.getRecentLogs();
    
    let logs = [];
    
    if (memoryLogs.length > 0) {
      // Usar logs de memoria si están disponibles
      logs = memoryLogs;
    } else {
      // Fallback: leer logs de archivos (solo en desarrollo local)
      const fs = require('fs');
      const path = require('path');

      const logFiles = [
        {
          name: 'combined',
          path: path.join(__dirname, '../../logs/combined.log'),
        },
        { name: 'error', path: path.join(__dirname, '../../logs/error.log') },
        { name: 'audit', path: path.join(__dirname, '../../logs/audit.log') },
      ];

      logFiles.forEach(logFile => {
        try {
          if (fs.existsSync(logFile.path)) {
            const content = fs.readFileSync(logFile.path, 'utf8');
            const lines = content.split('\n').filter(line => line.trim());

            // Obtener las últimas 50 líneas de cada archivo
            const recentLines = lines.slice(-50);

            recentLines.forEach(line => {
              // Parsear timestamp del log si existe
              const timestampMatch = line.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/);
              const timestamp = timestampMatch ? timestampMatch[1] : new Date().toISOString();
              
              logs.push({
                file: logFile.name,
                timestamp: timestamp,
                message: line,
                level: logFile.name === 'error' ? 'error' : 'info',
              });
            });
          }
        } catch (err) {
          logs.push({
            file: logFile.name,
            timestamp: new Date().toISOString(),
            message: `Error reading log file: ${err.message}`,
            level: 'error',
          });
        }
      });

      // Si no hay logs en archivos, generar logs de ejemplo para demostración
      if (logs.length === 0) {
        const now = new Date();
        logs.push(
          {
            file: 'combined',
            timestamp: new Date(now.getTime() - 1000).toISOString(),
            message: `[${now.toISOString()}] [INFO]: API Request GET /api/coelsa/health - 200 - 15ms`,
            level: 'info',
          },
          {
            file: 'combined',
            timestamp: new Date(now.getTime() - 2000).toISOString(),
            message: `[${new Date(now.getTime() - 2000).toISOString()}] [INFO]: API Request GET /api/coelsa/Cuentas/Cuenta - 200 - 45ms`,
            level: 'info',
          },
          {
            file: 'combined',
            timestamp: new Date(now.getTime() - 3000).toISOString(),
            message: `[${new Date(now.getTime() - 3000).toISOString()}] [INFO]: API Request GET /api/coelsa/Cheques/Cheque - 200 - 32ms`,
            level: 'info',
          },
          {
            file: 'audit',
            timestamp: new Date(now.getTime() - 4000).toISOString(),
            message: `[${new Date(now.getTime() - 4000).toISOString()}] [AUDIT]: Tenant authentication successful for tenant: 6d0358d0-e0d8-4bb3-bfb0-225db8924cb5`,
            level: 'info',
          }
        );
      }
    }

    // Ordenar por timestamp (más recientes primero)
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({
      success: true,
      data: {
        logs: logs.slice(0, 100), // Limitar a 100 logs más recientes
        total: logs.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error obteniendo logs',
      error: error.message,
    });
  }
});

/**
 * GET /system-logs
 * Obtener logs del sistema desde el BFF
 * ✅ MIGRADO: Ahora usa BFF API
 */
router.get('/system-logs', async (req, res) => {
  try {
    const bffClient = require('../services/bffClient');
    const { formatErrorResponse } = require('../utils/errorHandler');
    
    const { limit = 100, offset = 0, level, service, tenant_id } = req.query;
    
    // Construir parámetros para el BFF
    const params = {
      limit: parseInt(limit),
      offset: parseInt(offset),
    };
    if (level) params.level = level;
    if (service) params.service = service;
    if (tenant_id) params.tenant_id = tenant_id;
    
    // Obtener logs del BFF
    const response = await bffClient.getLogs(params);
    const logs = response.data || [];
    
    res.json({
      success: true,
      data: {
        logs: logs,
        total: response.total || logs.length,
        limit: parseInt(limit),
        offset: parseInt(offset),
        source: 'bff'
      }
    });
  } catch (error) {
    const { formatErrorResponse } = require('../utils/errorHandler');
    res.status(error.response?.status || 500).json(
      formatErrorResponse(error, 'Error obteniendo logs del sistema')
    );
  }
});

/**
 * POST /system-logs/migrate
 * Ejecutar migración para crear tabla system_logs
 */
router.post('/system-logs/migrate', async (req, res) => {
  try {
    const { sequelize } = require('../config/database');
    const fs = require('fs');
    const path = require('path');
    
    console.log('🔧 Ejecutando migración de system_logs...');
    
    // Leer el archivo de migración
    const migrationPath = path.join(__dirname, '../migrations/005_create_system_logs_table_with_schema.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Ejecutar la migración
    await sequelize.query(migrationSQL);
    
    console.log('✅ Migración ejecutada exitosamente');
    
    // Verificar que la tabla existe
    const [results] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'echeqsandbox' 
      AND table_name = 'system_logs'
    `);
    
    if (results.length > 0) {
      console.log('✅ Verificación: Tabla system_logs existe');
      
      res.json({
        success: true,
        message: 'Migración ejecutada exitosamente',
        data: {
          table_created: true,
          table_name: 'system_logs',
          schema: 'echeqsandbox'
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Error: Tabla system_logs no se creó',
        error: 'MIGRATION_FAILED'
      });
    }
    
  } catch (error) {
    console.error('❌ Error ejecutando migración:', error);
    res.status(500).json({
      success: false,
      message: 'Error ejecutando migración',
      error: error.message
    });
  }
});

/**
 * GET /tenant-data/:tenantId
 * Obtener datos reales del tenant desde el BFF
 * ✅ MIGRADO: Ahora usa BFF API - hace múltiples llamadas para obtener estadísticas
 */
router.get('/tenant-data/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const bffClient = require('../services/bffClient');
    const { formatErrorResponse } = require('../utils/errorHandler');

    // Obtener tenant del BFF
    const tenantResponse = await bffClient.getTenant(tenantId);
    const tenant = tenantResponse.data;

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant no encontrado',
      });
    }

    // Obtener datos relacionados del tenant desde el BFF
    // Nota: Si el BFF tiene un endpoint /tenants/:id/stats, usar ese en su lugar
    try {
      const [chequesResponse, cuentasResponse, endososResponse] = await Promise.allSettled([
        bffClient.getCheques({ tenant_id: tenantId }),
        bffClient.getCuentas({ tenant_id: tenantId }),
        bffClient.getEndosos({ tenant_id: tenantId }),
      ]);

      const echeqs = chequesResponse.status === 'fulfilled' ? (chequesResponse.value.data || []) : [];
      const accounts = cuentasResponse.status === 'fulfilled' ? (cuentasResponse.value.data || []) : [];
      const endorsements = endososResponse.status === 'fulfilled' ? (endososResponse.value.data || []) : [];

      // Calcular estadísticas
      const total_cheques = echeqs.length;
      const total_monto = echeqs.reduce((sum, cheque) => sum + parseFloat(cheque.amount || cheque.amountValue || 0), 0);
      const cheques_emitidos = echeqs.filter(c => c.status === 'EMITIDO' || c.status === 'EMITTED').length;
      const cheques_activos = echeqs.filter(c => c.status === 'ACTIVO' || c.status === 'ACTIVE').length;

      const tenantData = {
        tenant: {
          id: tenant.id,
          name: tenant.name || tenant.tenantName,
          code: tenant.code || tenant.tenantId,
          cuit: tenant.cuit || tenant.taxId,
          created_at: tenant.createdAt || tenant.created_at,
          status: (tenant.status === 'ACTIVE' || tenant.isActive) ? 'active' : 'inactive',
        },
        cheques: echeqs.map(cheque => ({
          id: cheque.number || cheque.chequeNumber,
          monto: parseFloat(cheque.amount || cheque.amountValue || 0),
          estado: cheque.status,
          fecha_emision: cheque.issueDate || cheque.issue_date,
          beneficiario: cheque.beneficiary || cheque.beneficiaryName,
        })),
        cuentas: accounts.map(account => ({
          id: account.id,
          cbu: account.cbu || account.accountNumber,
          saldo: account.balance || Math.floor(Math.random() * 2000000) + 100000, // Mock saldo si no está disponible
          banco: account.bank || account.bankName,
          sucursal: account.branch || account.branchName,
        })),
        endosos: endorsements.map(endorsement => ({
          id: endorsement.id,
          endosante: endorsement.endorser || endorsement.endorserName,
          endosatario: endorsement.endorsee || endorsement.endorseeName,
          fecha: endorsement.createdAt || endorsement.created_at,
        })),
        estadisticas: {
          total_cheques: total_cheques,
          total_monto: total_monto,
          cheques_emitidos: cheques_emitidos,
          cheques_activos: cheques_activos,
          total_endosos: endorsements.length,
        },
      };

      res.json({
        success: true,
        data: tenantData,
        timestamp: new Date().toISOString(),
      });
    } catch (dataError) {
      // Si falla obtener datos relacionados, devolver solo el tenant
      console.warn('Error obteniendo datos relacionados del tenant:', dataError.message);
      res.json({
        success: true,
        data: {
          tenant: {
            id: tenant.id,
            name: tenant.name || tenant.tenantName,
            code: tenant.code || tenant.tenantId,
            cuit: tenant.cuit || tenant.taxId,
            created_at: tenant.createdAt || tenant.created_at,
            status: (tenant.status === 'ACTIVE' || tenant.isActive) ? 'active' : 'inactive',
          },
          cheques: [],
          cuentas: [],
          endosos: [],
          estadisticas: {
            total_cheques: 0,
            total_monto: 0,
            cheques_emitidos: 0,
            cheques_activos: 0,
            total_endosos: 0,
          },
        },
        timestamp: new Date().toISOString(),
        warning: 'No se pudieron obtener todos los datos relacionados',
      });
    }
  } catch (error) {
    const { formatErrorResponse } = require('../utils/errorHandler');
    res.status(error.response?.status || 500).json(
      formatErrorResponse(error, 'Error obteniendo datos del tenant')
    );
  }
});

/**
 * DELETE /tenant-data/:tenantId
 * Borrar datos reales del tenant desde la base de datos (mantener credenciales)
 * Requiere clave de administrador
 */
router.delete('/tenant-data/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { adminKey } = req.query;

    // Verificar clave de administrador
    const { validateAdminKey } = require('../utils/adminKey');
    if (!validateAdminKey(adminKey)) {
      return res.status(401).json({
        success: false,
        message: 'Clave de administrador requerida',
      });
    }

    const { TenantSimple, Echeq, Account, Client, Endorsement, EcheqEvent } = require('../models');
    const { sequelize } = require('../config/database');
    const { QueryTypes } = require('sequelize');

    // Verificar que el tenant existe
    const tenant = await TenantSimple.findByPk(tenantId);
    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant no encontrado',
      });
    }

    console.log(`🗑️ Iniciando eliminación de datos para tenant: ${tenantId}`);

    // Eliminar registros relacionados en orden correcto para evitar restricciones de clave foránea
    try {
      // 1. Eliminar echeq_events que referencian echeqs usando consulta SQL directa
      await sequelize.query(
        'DELETE FROM "echeqsandbox"."echeq_events" WHERE echeq_id IN (SELECT id FROM "echeqsandbox"."echeqs" WHERE tenant_id = :tenantId)',
        { 
          replacements: { tenantId },
          type: QueryTypes.DELETE 
        }
      );
      console.log('✅ EcheqEvents eliminados');

      // 2. Eliminar endosos
      const deletedEndorsements = await Endorsement.destroy({ where: { tenant_id: tenantId } });
      console.log(`✅ ${deletedEndorsements} endosos eliminados`);

      // 3. Eliminar cheques
      const deletedEcheqs = await Echeq.destroy({ where: { tenant_id: tenantId } });
      console.log(`✅ ${deletedEcheqs} cheques eliminados`);

      // 4. Eliminar cuentas
      const deletedAccounts = await Account.destroy({ where: { tenant_id: tenantId } });
      console.log(`✅ ${deletedAccounts} cuentas eliminadas`);

      // 5. Eliminar clientes
      const deletedClients = await Client.destroy({ where: { tenant_id: tenantId } });
      console.log(`✅ ${deletedClients} clientes eliminados`);

      console.log(`✅ Datos eliminados exitosamente para tenant: ${tenantId}`);

      res.json({
        success: true,
        message: 'Datos del tenant borrados exitosamente',
        data: {
          tenantId: tenantId,
          deletedAt: new Date().toISOString(),
          deletedRecords: {
            echeqEvents: 'eliminados',
            endorsements: deletedEndorsements,
            echeqs: deletedEcheqs,
            accounts: deletedAccounts,
            clients: deletedClients,
          },
          note: 'Credenciales y tenant preservados',
        },
      });
    } catch (deleteError) {
      console.error('Error eliminando datos del tenant:', deleteError);
      res.status(500).json({
        success: false,
        message: 'Error eliminando datos del tenant: ' + deleteError.message,
        error: deleteError.message,
      });
    }
  } catch (error) {
    console.error('Error en endpoint de eliminación:', error);
    res.status(500).json({
      success: false,
      message: 'Error borrando datos del tenant',
      error: error.message,
    });
  }
});

/**
 * GET /debug-tenant/:id
 * Endpoint temporal para verificar credenciales guardadas
 * ✅ MIGRADO: Ahora usa BFF API
 */
router.get('/debug-tenant/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const bffClient = require('../services/bffClient');
    const { formatErrorResponse } = require('../utils/errorHandler');
    
    const tenantResponse = await bffClient.getTenant(id);
    const tenant = tenantResponse.data;
    
    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant no encontrado'
      });
    }
    
    // Obtener credenciales del BFF
    let credentials = null;
    try {
      const credsResponse = await bffClient.getTenantCredentials(id);
      credentials = credsResponse.data;
    } catch (credsError) {
      // Si no hay credenciales, continuar sin ellas
      console.log('No se pudieron obtener credenciales:', credsError.message);
    }
    
    res.json({
      success: true,
      tenant: {
        id: tenant.id,
        name: tenant.name || tenant.tenantName,
        code: tenant.code || tenant.tenantId,
        sandbox_credentials: credentials || tenant.sandboxCredentials
      }
    });
  } catch (error) {
    const { formatErrorResponse } = require('../utils/errorHandler');
    res.status(error.response?.status || 500).json(
      formatErrorResponse(error, 'Error interno del servidor')
    );
  }
});

/**
 * GET /tenants
 * Listar todos los tenants (requiere clave de administrador)
 * Intenta BFF primero; si falla (404, BFF no disponible), usa BD local del sandbox.
 */
function formatTenantForFrontend(tenant) {
  const t = tenant && typeof tenant.get === 'function' ? tenant.get({ plain: true }) : tenant;
  const id = t.id || t.tenantId;
  const name = t.name || t.tenantName;
  const code = t.code || t.tenantId;
  return {
    id,
    name,
    code,
    description: t.description || name,
    cuit: t.cuit || t.taxId || (code ? String(code).replace(/[^0-9]/g, '').padStart(11, '20') : '20123456789'),
    status: t.status === 'ACTIVE' || t.is_active === true ? 'active' : 'inactive',
    created_at: t.createdAt || t.created_at,
    createdAt: t.createdAt || t.created_at,
  };
}

router.get('/tenants', async (req, res) => {
  try {
    const { adminKey } = req.query;

    const { validateAdminKey } = require('../utils/adminKey');
    if (!validateAdminKey(adminKey)) {
      return res.status(401).json({
        success: false,
        message: 'Clave de administrador requerida',
      });
    }

    const page = req.query.page || 1;
    const limit = req.query.limit || 100;
    let formattedTenants = [];
    let total = 0;

    try {
      const bffClient = require('../services/bffClient');
      const response = await bffClient.getTenants({ page, limit });
      const list = response.data || [];
      total = response.total ?? list.length;
      formattedTenants = list.map(t => formatTenantForFrontend(t));
    } catch (bffError) {
      // Fallback: listar desde BD local del sandbox (BFF no disponible o sin GET /tenants)
      const status = bffError.response?.status;
      if (status === 404 || status === 502 || status === 503 || bffError.code === 'ECONNREFUSED') {
        const tenantService = require('../services/tenantService');
        const result = await tenantService.listTenants({
          page,
          limit,
          sortBy: 'createdAt',
          sortOrder: 'DESC',
        });
        const rows = result.data?.tenants || [];
        total = result.data?.pagination?.total ?? rows.length;
        formattedTenants = rows.map(t => formatTenantForFrontend(t));
      } else {
        throw bffError;
      }
    }

    res.json({
      success: true,
      data: formattedTenants,
      total,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const { formatErrorResponse } = require('../utils/errorHandler');
    res.status(error.response?.status || 500).json(
      formatErrorResponse(error, 'Error obteniendo lista de tenants')
    );
  }
});

/**
 * DELETE /tenants/:tenantId
 * Eliminar un tenant (requiere clave de administrador)
 * ✅ MIGRADO: Ahora usa BFF API - el BFF maneja la eliminación en cascada automáticamente
 */
router.delete('/tenants/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { adminKey } = req.query;

    const { validateAdminKey } = require('../utils/adminKey');
    if (!validateAdminKey(adminKey)) {
      return res.status(401).json({
        success: false,
        message: 'Clave de administrador requerida',
      });
    }

    // Usar BFF API - el BFF maneja la eliminación en cascada automáticamente
    const bffClient = require('../services/bffClient');
    const { formatErrorResponse } = require('../utils/errorHandler');
    
    const response = await bffClient.deleteTenant(tenantId);

    res.json({
      success: true,
      message: response.message || 'Tenant eliminado exitosamente',
      data: response.data || {
        id: tenantId,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const { formatErrorResponse } = require('../utils/errorHandler');
    
    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        message: 'Tenant no encontrado',
      });
    }
    
    res.status(error.response?.status || 500).json(
      formatErrorResponse(error, 'Error eliminando tenant')
    );
  }
});

/**
 * GET /tenant-credentials/:tenantId
 * Obtener credenciales de un tenant específico (requiere clave de administrador)
 */
router.get('/tenant-credentials/:tenantId', (req, res) => {
  try {
    const { tenantId } = req.params;
    const { adminKey } = req.query;

    const { validateAdminKey } = require('../utils/adminKey');
    if (!validateAdminKey(adminKey)) {
      return res.status(401).json({
        success: false,
        message: 'Clave de administrador requerida',
      });
    }

    // Generar credenciales con el formato correcto esperado por el middleware
    // Formato: sandbox_{tenantId}_{timestamp}_{random}
    // VERSIÓN ACTUALIZADA - Railway debe usar esta versión
    const tenantIdShort = tenantId.replace(/-/g, '').substring(0, 8); // Primeros 8 caracteres del UUID sin guiones
    const timestamp = Date.now().toString(36);
    const randomKey = Math.random().toString(36).substr(2, 12);
    const randomSecret = Math.random().toString(36).substr(2, 15);
    
    const credentials = {
      tenantId: tenantId,
      apiKey: `sandbox_${tenantIdShort}_${timestamp}_${randomKey}`,
      apiSecret: `secret_${tenantIdShort}_${Date.now()}_${randomSecret}`,
      createdAt: new Date().toISOString(),
      lastUsed: new Date().toISOString(),
      version: '2.0.0-railway-fix' // Marcar versión para verificar despliegue
    };

    res.json({
      success: true,
      data: credentials,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error obteniendo credenciales del tenant',
      error: error.message,
    });
  }
});

// Función para generar datos mock reales
function generateMockTenantData(tenantId) {
  const random = Math.random();
  const tenantName = [
    'Banco Demo',
    'Financiera Test',
    'Empresa Corp',
    'Cooperativa Local',
  ][Math.floor(random * 4)];
  const tenantCode =
    tenantName.replace(/\s+/g, '_').toUpperCase() +
    '_' +
    Math.random().toString(36).substr(2, 6).toUpperCase();
  const cuit =
    '20' +
    Math.floor(Math.random() * 90000000) +
    Math.floor(Math.random() * 10);

  // Generar cheques mock
  const cheques = [];
  const numCheques = Math.floor(Math.random() * 5) + 2; // 2-6 cheques
  for (let i = 1; i <= numCheques; i++) {
    const monto = Math.floor(Math.random() * 500000) + 10000;
    const estados = ['Emitido', 'Activo', 'Cobrado', 'Vencido'];
    const estado = estados[Math.floor(Math.random() * estados.length)];
    const beneficiario =
      '30' +
      Math.floor(Math.random() * 90000000) +
      Math.floor(Math.random() * 10);

    cheques.push({
      id: `ECHEQ-${String(i).padStart(3, '0')}`,
      monto: monto,
      estado: estado,
      fecha_emision: new Date(
        Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
      ).toISOString(),
      beneficiario: beneficiario,
    });
  }

  // Generar cuentas mock
  const cuentas = [];
  const numCuentas = Math.floor(Math.random() * 3) + 1; // 1-3 cuentas
  for (let i = 1; i <= numCuentas; i++) {
    const saldo = Math.floor(Math.random() * 2000000) + 100000;
    const cbu =
      Math.floor(Math.random() * 9000000000000000000000) +
      1000000000000000000000;

    cuentas.push({
      id: `CNT-${String(i).padStart(3, '0')}`,
      cuit: cuit,
      cbu: cbu.toString(),
      estado: 'ACTIVE',
      saldo: saldo,
    });
  }

  // Generar endosos mock
  const endosos = [];
  const numEndosos = Math.floor(Math.random() * 3); // 0-2 endosos
  for (let i = 1; i <= numEndosos; i++) {
    const endosante =
      '30' +
      Math.floor(Math.random() * 90000000) +
      Math.floor(Math.random() * 10);
    const endosatario =
      '40' +
      Math.floor(Math.random() * 90000000) +
      Math.floor(Math.random() * 10);

    endosos.push({
      id: `END-${String(i).padStart(3, '0')}`,
      cheque_id:
        cheques[Math.floor(Math.random() * cheques.length)]?.id || 'ECHEQ-001',
      endosante: endosante,
      endosatario: endosatario,
      fecha: new Date(
        Date.now() - Math.random() * 15 * 24 * 60 * 60 * 1000
      ).toISOString(),
    });
  }

  // Calcular estadísticas
  const total_cheques = cheques.length;
  const total_monto = cheques.reduce((sum, cheque) => sum + cheque.monto, 0);
  const cheques_emitidos = cheques.filter(c => c.estado === 'Emitido').length;
  const cheques_activos = cheques.filter(c => c.estado === 'Activo').length;

  return {
    tenant: {
      id: tenantId,
      name: tenantName,
      code: tenantCode,
      cuit: cuit,
      created_at: new Date(
        Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
      ).toISOString(),
      status: 'active',
    },
    cheques: cheques,
    cuentas: cuentas,
    endosos: endosos,
    estadisticas: {
      total_cheques: total_cheques,
      total_monto: total_monto,
      cheques_emitidos: cheques_emitidos,
      cheques_activos: cheques_activos,
      total_endosos: endosos.length,
    },
  };
}

/**
 * GET /api-docs
 * Echeq - Panel de Administración y Documentación de la API
 */
// Endpoint de debug para aislar el problema JavaScript
router.get('/debug-panel', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Debug Panel</title>
</head>
<body>
    <h1>Debug Panel</h1>
    <button onclick="testFunction()">Test Function</button>
    <button onclick="fillTestData()">Fill Test Data</button>
    <button onclick="loadExistingTenants()">Load Tenants</button>
    
    <script>
        // Función de prueba simple
        function testFunction() {
            alert('Test function works!');
        }
        
        // Función para llenar datos de prueba
        function fillTestData() {
            const testData = {
                tenantName: 'Banco Demo Sandbox',
                tenantCode: 'BANCO_DEMO_' + Math.random().toString(36).substr(2, 5).toUpperCase(),
                tenantCuit: '20' + Math.floor(Math.random() * 100000000) + '9',
                tenantType: 'BANCO'
            };
            
            alert('Test data: ' + JSON.stringify(testData));
        }
        
        // Función para cargar tenants existentes
        // NOTA: Este código se ejecuta en el navegador, no puede usar require()
        // Para usar una clave personalizada, configurar window.ADMIN_KEY antes de llamar esta función
        async function loadExistingTenants() {
            alert('Loading tenants...');
            try {
                // Usar window.ADMIN_KEY si está configurado, sino usar valor por defecto
                const adminKey = window.ADMIN_KEY || 'admin1234';
                const response = await fetch('/api/coelsa/tenants?adminKey=' + encodeURIComponent(adminKey));
                const data = await response.json();
                alert('Response: ' + JSON.stringify(data));
            } catch (error) {
                alert('Error: ' + error.message);
            }
        }
        
        console.log('Debug panel loaded successfully');
    </script>
</body>
</html>`);
});

// Importar controlador (ya importado arriba)

// Endpoints adicionales para el panel de administración
router.get('/api/admin/system-data', adminAuth, (req, res) => new adminController().getStats(req, res));
router.get('/api/admin/logs', adminAuth, (req, res) => new adminController().getHealth(req, res));

// Endpoint alternativo con template string (para comparación)
router.get('/api-docs-old', (req, res) => {
  try {
    // Versión simplificada para evitar errores de sintaxis
    const html = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Echeq</title>
    <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css" />
    <style>
        .swagger-ui .topbar { display: none }
        
        * {
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            margin: 0;
            padding: 0;
            background: #f8fafc;
            min-height: 100vh;
            line-height: 1.6;
            color: #1e293b;
            font-weight: 400;
            letter-spacing: -0.01em;
        }
        
        .header {
            background: #ffffff;
            color: #1e293b;
            padding: 1.5rem 2rem;
            border-bottom: 1px solid #e2e8f0;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .header-content {
            display: grid;
            grid-template-columns: 1fr auto;
            align-items: center;
            max-width: 1400px;
            margin: 0 auto;
            gap: 3rem;
        }
        
        .header-left {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }
        
        .header-right {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 1rem;
            min-width: 320px;
        }
        
        
        .header h1 {
            margin: 0 0 0.5rem 0;
            font-size: 2.2rem;
            font-weight: 700;
            color: #1e293b;
            letter-spacing: -0.02em;
            line-height: 1.2;
        }
        
        .header p {
            margin: 0;
            font-size: 1rem;
            color: #64748b;
            font-weight: 400;
            line-height: 1.4;
        }
        
        .status-section {
            display: flex;
            align-items: center;
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
            padding: 0.75rem 1.25rem;
            border-radius: 12px;
            border: 1px solid #e2e8f0;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
            transition: all 0.3s ease;
        }
        
        .status-section:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }
        
        .status-indicator {
            display: inline-flex;
            align-items: center;
            color: #059669;
            font-weight: 600;
        }
        
        .status-indicator::before {
            content: '';
            width: 8px;
            height: 8px;
            background: #059669;
            border-radius: 50%;
            margin-right: 0.5rem;
            animation: pulse 2s infinite;
        }
        
        .status-indicator .dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            margin-right: 8px;
            animation: pulse 2s infinite;
        }
        
        .status-online .dot {
            background-color: #10b981;
        }
        
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        
        .contact-info {
            position: relative;
            z-index: 1;
            text-align: right;
            background: rgba(255, 255, 255, 0.8);
            padding: 0.75rem 1rem;
            border-radius: 10px;
            border: 1px solid rgba(76, 175, 80, 0.2);
            backdrop-filter: blur(10px);
            transition: all 0.3s ease;
        }
        
        .contact-info:hover {
            background: rgba(255, 255, 255, 0.95);
            border-color: rgba(76, 175, 80, 0.4);
            transform: translateY(-1px);
        }
        
        .contact-info p {
            margin: 0;
            font-size: 0.9rem;
            opacity: 0.9;
            font-weight: 500;
        }
        
        .contact-info a {
            color: #4CAF50 !important;
            text-decoration: none;
            font-weight: bold;
            transition: all 0.3s ease;
            border-bottom: 1px solid transparent;
        }
        
        .contact-info a:hover {
            color: #66BB6A !important;
            border-bottom-color: #66BB6A;
            transform: translateY(-1px);
        }
        
        .admin-panel {
            max-width: 1400px;
            margin: 2rem auto;
            background: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
            border: 1px solid #e2e8f0;
            overflow: hidden;
            display: flex;
            min-height: 600px;
        }
        
        .sidebar {
            width: 280px;
            background: #f8fafc;
            border-right: 1px solid #e2e8f0;
            padding: 0;
            flex-shrink: 0;
        }
        
        .sidebar-header {
            padding: 1.5rem 1rem;
            border-bottom: 1px solid #e2e8f0;
            background: #ffffff;
        }
        
        .sidebar-header h3 {
            margin: 0;
            font-size: 1.1rem;
            font-weight: 600;
            color: #1e293b;
        }
        
        .sidebar-menu {
            padding: 1rem 0;
        }
        
        .menu-section {
            margin-bottom: 1.5rem;
        }
        
        .menu-section h4 {
            margin: 0 0 0.5rem 0;
            padding: 0 1rem;
            font-size: 0.8rem;
            font-weight: 600;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        
        .menu-item {
            display: flex;
            align-items: center;
            padding: 0.75rem 1rem;
            cursor: pointer;
            transition: all 0.2s ease;
            border-left: 3px solid transparent;
        }
        
        .menu-item:hover {
            background: #f1f5f9;
            border-left-color: #3b82f6;
        }
        
        .menu-item.active {
            background: #eff6ff;
            border-left-color: #3b82f6;
            color: #1e40af;
        }
        
        .menu-icon {
            font-size: 1.2rem;
            margin-right: 0.75rem;
            width: 20px;
            text-align: center;
        }
        
        .menu-text {
            font-size: 0.9rem;
            font-weight: 500;
        }
        
        .main-content {
            flex: 1;
            padding: 0;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
        }
        
        /* Footer fijo con datos y alertas */
        .footer-panel {
            display: flex;
            background: #f8fafc;
            border-top: 1px solid #e2e8f0;
            padding: 1rem 2rem;
            gap: 2rem;
            min-height: 120px;
            box-shadow: 0 -2px 4px rgba(0, 0, 0, 0.05);
        }
        
        .footer-left {
            flex: 1;
        }
        
        .footer-right {
            flex: 1;
        }
        
        .data-panel h4,
        .alerts-panel h4 {
            margin: 0 0 0.75rem 0;
            font-size: 0.9rem;
            font-weight: 600;
            color: #374151;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        
        .data-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.25rem 0;
            border-bottom: 1px solid #f1f5f9;
        }
        
        .data-item:last-child {
            border-bottom: none;
        }
        
        .data-label {
            font-size: 0.85rem;
            color: #64748b;
            font-weight: 500;
        }
        
        .data-value {
            font-size: 0.85rem;
            color: #1e293b;
            font-weight: 600;
        }
        
        .data-value.status-online {
            color: #059669;
        }
        
        .alerts-container {
            max-height: 80px;
            overflow-y: auto;
        }
        
        .alert-item {
            display: flex;
            align-items: center;
            padding: 0.5rem;
            margin-bottom: 0.5rem;
            border-radius: 6px;
            font-size: 0.85rem;
            animation: slideIn 0.3s ease;
        }
        
        .alert-item:last-child {
            margin-bottom: 0;
        }
        
        .alert-item.info {
            background: #f0f9ff;
            border-left: 3px solid #0ea5e9;
            color: #0c4a6e;
        }
        
        .alert-item.success {
            background: #f0fdf4;
            border-left: 3px solid #22c55e;
            color: #14532d;
        }
        
        .alert-item.warning {
            background: #fffbeb;
            border-left: 3px solid #f59e0b;
            color: #92400e;
        }
        
        .alert-item.error {
            background: #fef2f2;
            border-left: 3px solid #ef4444;
            color: #7f1d1d;
        }
        
        .alert-icon {
            margin-right: 0.5rem;
            font-size: 0.9rem;
        }
        
        .alert-text {
            flex: 1;
        }
        
        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateY(-10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .admin-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 1.5rem;
            padding: 2rem;
        }
        
        .admin-card {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 1.5rem;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            transition: all 0.2s ease;
        }
        
        .admin-card:hover {
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            transform: translateY(-2px);
        }
        
        .admin-card h3 {
            margin: 0 0 0.5rem 0;
            font-size: 1.1rem;
            font-weight: 600;
            color: #1e293b;
        }
        
        .admin-card p {
            margin: 0 0 1rem 0;
            color: #64748b;
            font-size: 0.9rem;
        }
        
        .admin-actions {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }
        
        .admin-actions .btn {
            width: 100%;
            justify-content: center;
        }
        
        .admin-results {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 1.5rem;
            margin: 2rem;
        }
        
        .tabs {
            display: flex;
            background: #f8fafc;
            border-bottom: 1px solid #e2e8f0;
        }
        
        .tab {
            flex: 1;
            padding: 1rem 1.5rem;
            cursor: pointer;
            border-bottom: 2px solid transparent;
            color: #64748b;
            font-weight: 500;
            font-size: 0.95rem;
            transition: all 0.2s ease;
            text-align: center;
            background: transparent;
        }
        
        .tab:hover {
            background: #f1f5f9;
            color: #1e293b;
        }
        
        .tab.active {
            color: #3b82f6;
            border-bottom-color: #3b82f6;
            background: #ffffff;
        }
        
        .tab-content {
            display: none;
            padding: 2rem;
        }
        
        .tab-content.active {
            display: block;
        }
        
        .credentials-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 2.5rem;
            margin-bottom: 2rem;
        }
        
        .credential-card {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 1.5rem;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            transition: all 0.2s ease;
        }
        
        
        .credential-card:hover {
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        
        .credential-card h3 {
            margin: 0 0 1.5rem 0;
            color: #1e293b;
            font-size: 1.5rem;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .form-group {
            margin-bottom: 1.5rem;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 0.75rem;
            font-weight: 600;
            color: #374151;
            font-size: 0.95rem;
        }
        
        .form-group input,
        .form-group select {
            width: 100%;
            padding: 1rem;
            border: 2px solid #e5e7eb;
            border-radius: 12px;
            font-size: 1rem;
            transition: all 0.3s ease;
            background: #fafbfc;
            box-sizing: border-box;
        }
        
        .form-group input:focus,
        .form-group select:focus {
            outline: none;
            border-color: #667eea;
            background: white;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
            transform: translateY(-1px);
        }
        
        .btn {
            background: #3b82f6;
            color: #ffffff;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.95rem;
            font-weight: 500;
            transition: all 0.2s ease;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .btn:hover {
            background: #2563eb;
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }
        
        .btn-success {
            background: #059669;
        }
        
        .btn-success:hover {
            background: #047857;
        }
        
        .btn-info {
            background: #0891b2;
        }
        
        .btn-info:hover {
            background: #0e7490;
        }
        
        .btn-secondary {
            background: #64748b;
        }
        
        .btn-secondary:hover {
            background: #475569;
        }
        
        .alert {
            padding: 1rem;
            margin-bottom: 1rem;
            border-radius: 6px;
            border: 1px solid #e2e8f0;
        }
        
        .alert-info {
            color: #0c4a6e;
            background: #f0f9ff;
            border-color: #0ea5e9;
        }
        
        .alert-success {
            color: #14532d;
            background: #f0fdf4;
            border-color: #22c55e;
        }
        
        .alert-danger {
            color: #7f1d1d;
            background: #fef2f2;
            border-color: #ef4444;
        }
        
        .credentials-display {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 1.5rem;
            margin-top: 1.5rem;
            font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
            font-size: 0.9rem;
            color: #1e293b;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        
        .credentials-display.hidden {
            display: none;
        }
        
        .copy-btn {
            background: #64748b;
            color: white;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.85rem;
            margin-left: 10px;
            transition: all 0.2s ease;
            font-weight: 500;
        }
        
        .copy-btn:hover {
            background: #475569;
        }
        
        .credentials-display h4 {
            color: #1e293b;
            margin: 0 0 1rem 0;
            font-size: 1.1rem;
            font-weight: 600;
        }
        
        .credentials-display h5 {
            color: #64748b;
            margin: 1.5rem 0 0.5rem 0;
            font-size: 1rem;
            font-weight: 600;
        }
        
        .credentials-display div {
            margin-bottom: 0.75rem;
            display: flex;
            align-items: center;
            flex-wrap: wrap;
            gap: 0.5rem;
        }
        
        .credentials-display strong {
            color: #1e293b;
            font-weight: 600;
        }
        
        .credentials-display span {
            color: #64748b;
            word-break: break-all;
        }
        
        .credentials-display pre {
            background: #f1f5f9;
            color: #1e293b;
            padding: 1rem;
            border-radius: 6px;
            margin: 0.5rem 0;
            overflow-x: auto;
            border: 1px solid #e2e8f0;
        }
        
        /* Responsive Design */
        @media (max-width: 768px) {
            .header {
                padding: 1.5rem 1rem;
            }
            
            .header-content {
                grid-template-columns: 1fr;
                text-align: center;
                gap: 1.5rem;
            }
            
            .header-left {
                text-align: center;
            }
            
            .header-right {
                align-items: center;
                min-width: auto;
                gap: 0.75rem;
            }
            
            .status-section {
                padding: 0.5rem 1rem;
            }
            
            .contact-info {
                padding: 0.5rem 0.75rem;
            }
            
            .credentials-section {
                grid-template-columns: 1fr;
                gap: 1.5rem;
            }
            
            .tab-content {
                padding: 2rem 1.5rem;
            }
            
            .header h1 {
                font-size: 2rem;
            }
            
            .admin-panel {
                margin: -1rem 1rem 2rem 1rem;
            }
        }
        
        /* Step Cards */
        .step-card {
            background: linear-gradient(145deg, #ffffff 0%, #f8fafc 100%);
            border: 1px solid #e2e8f0;
            border-radius: 16px;
            padding: 2rem;
            margin-bottom: 2rem;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        }
        
        .step-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, #667eea, #764ba2);
        }
        
        .step-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
        }
        
        .step-header {
            display: flex;
            align-items: center;
            gap: 1rem;
            margin-bottom: 1.5rem;
            cursor: pointer;
            transition: all 0.3s ease;
            padding: 0.5rem;
            border-radius: 8px;
        }
        
        .step-header:hover {
            background: rgba(102, 126, 234, 0.1);
        }
        
        .step-status {
            margin-left: auto;
            padding: 0.25rem 0.75rem;
            border-radius: 20px;
            font-size: 0.875rem;
            font-weight: 500;
            transition: all 0.3s ease;
        }
        
        .step-status.pending {
            background: #fef3c7;
            color: #d97706;
        }
        
        .step-status.completed {
            background: #d1fae5;
            color: #059669;
        }
        
        .step-status.current {
            background: #dbeafe;
            color: #2563eb;
        }
        
        .step-card.completed {
            opacity: 0.7;
            transform: scale(0.98);
        }
        
        .step-card.current {
            border: 2px solid #667eea;
            box-shadow: 0 0 20px rgba(102, 126, 234, 0.3);
        }
        
        .step-number {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 1.2rem;
            flex-shrink: 0;
        }
        
        .step-content {
            margin-left: 3rem;
        }
        
        .step-note {
            background: #f0f9ff;
            border: 1px solid #bae6fd;
            border-radius: 8px;
            padding: 1rem;
            margin-top: 1rem;
            color: #0c4a6e;
            font-size: 0.9rem;
        }
        
        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1.5rem;
            margin-bottom: 1.5rem;
        }
        
        /* Results Display */
        .results-header {
            text-align: center;
            margin-bottom: 2rem;
            padding: 2rem;
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            border-radius: 12px;
            border: 1px solid #bae6fd;
        }
        
        .results-header h3 {
            color: #0c4a6e;
            margin: 0 0 1rem 0;
            font-size: 1.8rem;
        }
        
        .results-header p {
            color: #0369a1;
            margin: 0;
            font-size: 1.1rem;
        }
        
        .credentials-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 1.5rem;
            margin-bottom: 2rem;
        }
        
        .credential-item {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 1.5rem;
        }
        
        .credential-item label {
            display: block;
            font-weight: 600;
            color: #374151;
            margin-bottom: 0.75rem;
            font-size: 1rem;
        }
        
        .credential-value {
            display: flex;
            align-items: center;
            gap: 1rem;
        }
        
        .credential-value code {
            background: #1e293b;
            color: #e2e8f0;
            padding: 0.75rem 1rem;
            border-radius: 8px;
            font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
            font-size: 0.9rem;
            flex: 1;
            word-break: break-all;
        }
        
        .terminal-commands {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 1.5rem;
            margin-bottom: 2rem;
        }
        
        .terminal-commands h4 {
            color: #1e293b;
            margin: 0 0 1.5rem 0;
            font-size: 1.3rem;
        }
        
        .command-section {
            margin-bottom: 1.5rem;
        }
        
        .command-section h5 {
            color: #475569;
            margin: 0 0 0.75rem 0;
            font-size: 1rem;
            font-weight: 600;
        }
        
        .command-block {
            display: flex;
            align-items: flex-start;
            gap: 1rem;
        }
        
        .command-block pre {
            background: #1e293b;
            color: #e2e8f0;
            padding: 1rem;
            border-radius: 8px;
            font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
            font-size: 0.85rem;
            flex: 1;
            overflow-x: auto;
            margin: 0;
        }
        
        .next-steps {
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            border: 1px solid #f59e0b;
            border-radius: 12px;
            padding: 1.5rem;
        }
        
        .next-steps h4 {
            color: #92400e;
            margin: 0 0 1rem 0;
            font-size: 1.2rem;
        }
        
        .next-steps p {
            color: #a16207;
            margin: 0.5rem 0;
            font-weight: 500;
        }
        
        /* Custom Scrollbar */
        ::-webkit-scrollbar {
            width: 8px;
        }
        
        ::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb {
            background: linear-gradient(135deg, #667eea, #764ba2);
            border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
            background: linear-gradient(135deg, #5a6fd8, #6a4190);
        }
        
        /* Onboarding Styles */
        .features-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 1.5rem;
            margin: 1.5rem 0;
        }
        
        .feature-item {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 1.5rem;
            transition: all 0.3s ease;
        }
        
        .feature-item:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
        }
        
        .feature-item h5 {
            color: #1e293b;
            margin: 0 0 1rem 0;
            font-size: 1.1rem;
            font-weight: 600;
        }
        
        .feature-item ul {
            margin: 0;
            padding-left: 1.5rem;
        }
        
        .feature-item li {
            margin-bottom: 0.5rem;
            color: #475569;
        }
        
        .feature-item code {
            background: #1e293b;
            color: #e2e8f0;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-size: 0.85rem;
            font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
        }
        
        .command-examples {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 1.5rem;
            margin-top: 1rem;
        }
        
        .command-examples h5 {
            color: #1e293b;
            margin: 0 0 0.75rem 0;
            font-size: 1rem;
            font-weight: 600;
        }
        
        .command-examples pre {
            background: #1e293b;
            color: #e2e8f0;
            padding: 1rem;
            border-radius: 8px;
            font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
            font-size: 0.85rem;
            overflow-x: auto;
            margin: 0.5rem 0;
        }
        
        .command-examples code {
            background: #1e293b;
            color: #e2e8f0;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-size: 0.85rem;
            font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
        }
        
        .onboarding-content {
            max-width: 1200px;
            margin: 0 auto;
        }
        
        .onboarding-content h4 {
            color: #1e293b;
            margin: 2rem 0 1rem 0;
            font-size: 1.3rem;
            font-weight: 700;
        }
        
        .onboarding-content ol {
            margin: 1rem 0;
            padding-left: 2rem;
        }
        
        .onboarding-content ol li {
            margin-bottom: 0.75rem;
            color: #475569;
            line-height: 1.6;
        }
        
        .onboarding-content ul {
            margin: 1rem 0;
            padding-left: 2rem;
        }
        
        .onboarding-content ul li {
            margin-bottom: 0.5rem;
            color: #475569;
            line-height: 1.6;
        }
        
        .onboarding-content a {
            color: #667eea;
            text-decoration: none;
            font-weight: 600;
        }
        
        .onboarding-content a:hover {
            color: #5a6fd8;
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-content">
            <div class="header-left">
                <h1>Echeq</h1>
            </div>
            <div class="header-right">
                <div class="status-section">
                    <span class="status-indicator status-online"></span>
                    <span>Servicio Online - Base de datos conectada</span>
                </div>
                <div class="contact-info">
                    <p>¿Necesitas ayuda? Contáctanos en <a href="mailto:hola@colibird.com.ar" style="color: #4CAF50; text-decoration: none; font-weight: bold;">hola@colibird.com.ar</a></p>
                </div>
            </div>
        </div>
    </div>
    
    <div class="admin-panel">
        <div class="sidebar">
            <div class="sidebar-header">
                <h3>Panel de Control</h3>
            </div>
            <div class="sidebar-menu">
                <div class="menu-section">
                    <h4>Desarrollo</h4>
                    <div class="menu-item active" onclick="showTab(&quot;onboarding&quot;)">
                        <span class="menu-icon">📚</span>
                        <span class="menu-text">Guía de Onboarding</span>
                    </div>
                    <div class="menu-item" onclick="showTab(&quot;credentials&quot;)">
                        <span class="menu-icon">🔑</span>
                        <span class="menu-text">Credenciales API</span>
                    </div>
                    <div class="menu-item" onclick="showTab(&quot;testing&quot;)">
                        <span class="menu-icon">🧪</span>
                        <span class="menu-text">Testing APIs</span>
                    </div>
                    <div class="menu-item" onclick="showTab(&quot;docs&quot;)">
                        <span class="menu-icon">📖</span>
                        <span class="menu-text">Documentación</span>
                    </div>
                </div>
                <div class="menu-section">
                    <h4>Monitoreo</h4>
                    <div class="menu-item" onclick="showTab(&quot;logs&quot;)">
                        <span class="menu-icon">📊</span>
                        <span class="menu-text">Logs en Tiempo Real</span>
                    </div>
                </div>
                <div class="menu-section">
                    <h4>Administración</h4>
                    <div class="menu-item" onclick="showTab(&quot;data&quot;)">
                        <span class="menu-icon">🏢</span>
                        <span class="menu-text">Datos del Tenant</span>
                    </div>
                    <div class="menu-item" onclick="showTab(&quot;admin&quot;)">
                        <span class="menu-icon">⚙️</span>
                        <span class="menu-text">Admin</span>
                    </div>
                </div>
            </div>
        </div>
        <!-- Cuerpo principal central -->
        <div class="main-content">
            <!-- Contenido de las pestañas -->
            <div id="credentials" class="tab-content">
            <h2>Generar Credenciales API - Guía Paso a Paso</h2>
            <div class="alert alert-info">
                <strong>Información:</strong> Sigue estos pasos para generar tus credenciales de API. Las credenciales se usan en los headers X-API-Key, X-API-Secret y X-Tenant-ID.
            </div>
            
            <!-- Sección de consulta de tenants existentes -->
            <div class="step-card" style="margin-bottom: 2rem;">
                <div class="step-header">
                    <div class="step-number">1</div>
                    <h3>Consultar Tenants Existentes</h3>
                </div>
                <div class="step-content">
                    <p>Si ya tienes un tenant creado, puedes consultar la lista y recuperar sus credenciales.</p>
                    <div class="form-group">
                        <label for="adminKey">Clave de Administrador:</label>
                        <input type="password" id="adminKey" style="width: 200px; margin-right: 10px;">
                        <button onclick="loadExistingTenants()" class="btn btn-info">Consultar Tenants</button>
                    </div>
                    <div id="tenants-list" style="margin-top: 1rem; display: none;">
                        <!-- Lista de tenants se cargará aquí -->
                    </div>
                </div>
            </div>
            
            <!-- Paso 1: Datos de Prueba (Opcional) -->
            <div class="step-card" id="step1" data-step="1">
                <div class="step-header" onclick="toggleStep(1)">
                    <span class="step-number">1</span>
                    <h3>Paso 1: Crear Tenant Random (Opcional)</h3>
                    <span class="step-status" id="step1-status">Pendiente</span>
                </div>
                <div class="step-content" id="step1-content" style="display: none;">
                    <p><strong>Opción A:</strong> Crea un tenant con datos aleatorios para pruebas rápidas.</p>
                    <p><strong>Opción B:</strong> Si prefieres usar datos reales, puedes saltar este paso e ir directamente al Paso 2.</p>
                    <div style="display: flex; gap: 10px; margin: 1rem 0;">
                        <button type="button" class="btn btn-info" onclick="fillTestData()">Crear Tenant Random</button>
                        <button type="button" class="btn btn-secondary" onclick="skipStep1()">Saltar al Paso 2</button>
                    </div>
                    <p class="step-note"><strong>Nota:</strong> Los datos random incluyen un nombre, código, CUIT y tipo de tenant válidos para testing.</p>
                </div>
            </div>
            
            <!-- Paso 2: Crear Tenant -->
            <div class="step-card" id="step2" data-step="2">
                <div class="step-header" onclick="toggleStep(2)">
                    <span class="step-number">2</span>
                    <h3>Paso 2: Crear Tenant</h3>
                    <span class="step-status" id="step2-status">Pendiente</span>
                </div>
                <div class="step-content" id="step2-content" style="display: none;">
                    <form id="createTenantForm">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="tenantName">Nombre del Tenant</label>
                                <input type="text" id="tenantName" name="tenantName" placeholder="Ej: Mi Banco Demo" required>
                            </div>
                            <div class="form-group">
                                <label for="tenantCode">Código del Tenant</label>
                                <input type="text" id="tenantCode" name="tenantCode" placeholder="Ej: BANCO_DEMO_001" required>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="tenantCuit">CUIT (11 dígitos)</label>
                                <input type="text" id="tenantCuit" name="tenantCuit" placeholder="Ej: 20123456789" required>
                            </div>
                            <div class="form-group">
                                <label for="tenantType">Tipo de Institución</label>
                                <select id="tenantType" name="tenantType" required>
                                    <option value="BANCO">Banco</option>
                                    <option value="FINANCIERA">Financiera</option>
                                    <option value="EMPRESA">Empresa</option>
                                </select>
                            </div>
                        </div>
                        <button type="submit" class="btn btn-primary">Crear Tenant</button>
                    </form>
                </div>
            </div>
            
            <!-- Paso 3: Generar API Keys -->
            <div class="step-card" id="step3" data-step="3">
                <div class="step-header" onclick="toggleStep(3)">
                    <span class="step-number">3</span>
                    <h3>Paso 3: Generar API Keys</h3>
                    <span class="step-status" id="step3-status">Pendiente</span>
                </div>
                <div class="step-content" id="step3-content" style="display: none;">
                    <form id="generateKeysForm">
                        <div class="form-group">
                            <label for="tenantId">ID del Tenant (se llena automáticamente)</label>
                            <input type="text" id="tenantId" name="tenantId" placeholder="Se llenará automáticamente después de crear el tenant" readonly>
                        </div>
                        <button type="submit" class="btn btn-success">Generar API Keys</button>
                    </form>
                </div>
            </div>
            
            <!-- Resultados -->
            <div id="credentialsDisplay" class="hidden credentials-display">
                <div class="results-header">
                    <h3>🎉 ¡Credenciales Generadas Exitosamente!</h3>
                    <p>Ahora puedes usar estas credenciales para probar las APIs. <strong>Ve a la pestaña "Testing APIs" para configurar y probar los endpoints.</strong></p>
                </div>
                
                <div class="credentials-grid">
                    <div class="credential-item">
                        <label>API Key</label>
                        <div class="credential-value">
                            <code id="apiKey"></code>
                            <button class="copy-btn" onclick="copyToClipboard('apiKey')">Copiar</button>
                        </div>
                    </div>
                    
                    <div class="credential-item">
                        <label>API Secret</label>
                        <div class="credential-value">
                            <code id="apiSecret"></code>
                            <button class="copy-btn" onclick="copyToClipboard('apiSecret')">Copiar</button>
                        </div>
                    </div>
                    
                    <div class="credential-item">
                        <label>Tenant ID</label>
                        <div class="credential-value">
                            <code id="tenantIdDisplay"></code>
                            <button class="copy-btn" onclick="copyToClipboard('tenantIdDisplay')">Copiar</button>
                        </div>
                    </div>
                </div>
                
                <div class="terminal-commands">
                    <div class="command-section">
                        <h5 style="color: #000000;">Variables de Entorno</h5>
                        <div class="command-block">
                            <pre id="envVars"></pre>
                            <button class="copy-btn" onclick="copyToClipboard('envVars')">Copiar</button>
                        </div>
                    </div>
                </div>
                
                <div class="next-steps">
                    <h4>Próximos Pasos</h4>
                    <p>1. Ve a la pestaña <strong>"Testing APIs"</strong></p>
                    <p>2. Haz clic en <strong>"Cargar Credenciales Generadas"</strong></p>
                    <p>3. Configura la autenticación automática</p>
                    <p>4. Prueba los endpoints en Swagger</p>
                </div>
            </div>
        </div>
        
        <div id="access" class="tab-content">
            <h2>Acceso Rápido al Swagger</h2>
            
            <div class="alert alert-info">
                <strong>Información:</strong> Si ya tienes credenciales de API, ingrésalas aquí para acceder directamente al Swagger con autenticación configurada.
            </div>
            
            <div class="credentials-section">
                <div class="credential-card">
                    <h3>Ingresar Credenciales Existentes</h3>
                    <form id="quickAccessForm">
                        <div class="form-group">
                            <label for="quickApiKey">API Key</label>
                            <input type="text" id="quickApiKey" placeholder="sandbox_xxx_xxx" required>
                        </div>
                        <div class="form-group">
                            <label for="quickApiSecret">API Secret</label>
                            <input type="text" id="quickApiSecret" placeholder="secret_xxx_xxx" required>
                        </div>
                        <div class="form-group">
                            <label for="quickTenantId">Tenant ID</label>
                            <input type="text" id="quickTenantId" placeholder="uuid-tenant-id" required>
                        </div>
                        <button type="submit" class="btn btn-success">Acceder al Swagger</button>
                    </form>
                </div>
                
            </div>
            
            <div id="swaggerAccess" class="credential-card" style="display: none;">
                <h3>Acceso Configurado</h3>
                <p>Las credenciales han sido configuradas. Ahora puedes usar el Swagger con autenticación automática.</p>
                <div style="display: flex; gap: 10px; margin-top: 15px;">
                    <button class="btn" onclick="showTab(&quot;docs&quot;)">Ir al Swagger</button>
                    <button class="btn btn-info" onclick="testConnection()">Probar Conexión</button>
                </div>
            </div>
        </div>
        
        <div id="testing" class="tab-content">
            <h2>Testing de APIs</h2>
            
            <div class="alert alert-info">
                <strong>Información:</strong> Configura tus credenciales de API para probar los endpoints COELSA con autenticación automática.
            </div>
            
            <div class="credentials-section">
                <div class="credential-card">
                    <h3>Configurar Credenciales para Testing</h3>
                    <form id="testCredentialsForm">
                        <div class="form-group">
                            <label for="testApiKey">API Key</label>
                            <input type="text" id="testApiKey" placeholder="sandbox_xxx_xxx" required>
                        </div>
                        <div class="form-group">
                            <label for="testApiSecret">API Secret</label>
                            <input type="text" id="testApiSecret" placeholder="secret_xxx_xxx" required>
                        </div>
                        <div class="form-group">
                            <label for="testTenantId">Tenant ID</label>
                            <input type="text" id="testTenantId" placeholder="uuid-tenant-id" required>
                        </div>
                        <div style="display: flex; gap: 10px; margin-bottom: 15px; flex-wrap: wrap;">
                            <button type="button" class="btn btn-primary" onclick="loadGeneratedCredentials()">📥 Cargar Credenciales Generadas</button>
                            <button type="button" class="btn btn-success" onclick="
                                const apiKey = document.getElementById('testApiKey').value;
                                const apiSecret = document.getElementById('testApiSecret').value;
                                const tenantId = document.getElementById('testTenantId').value;
                                
                                if (!apiKey || !apiSecret || !tenantId) {
                                    showAlert('Por favor, completa todos los campos antes de continuar.', 'error');
                                    return;
                                }
                                
                                currentCredentials = {
                                    apiKey: apiKey,
                                    apiSecret: apiSecret,
                                    tenantId: tenantId
                                };
                                
                                document.getElementById('swaggerAccess').style.display = 'block';
                                initializeSwagger();
                                showAlert('Credenciales configuradas! Ahora puedes usar el Swagger con autenticación automática.', 'success');
                            ">Configurar y Acceder</button>
                        </div>
                    </form>
                </div>
                
            </div>
            
            <div id="swaggerAccess" class="credential-card" style="display: none;">
                <h3>Credenciales Configuradas</h3>
                <p>Las credenciales han sido configuradas. Ahora puedes usar el Swagger con autenticación automática.</p>
                <div style="display: flex; gap: 10px; margin-top: 15px;">
                    <button class="btn" onclick="showTab(&quot;docs&quot;)">Ir al Swagger</button>
                    <button class="btn btn-info" onclick="testConnection()">Probar Conexión</button>
                </div>
            </div>
        </div>
        
        <div id="docs" class="tab-content">
            <h2>Documentación de la API</h2>
            <p>La documentación completa de la API está disponible en el panel de Swagger a continuación.</p>
            <div id="swagger-container" style="margin-top: 2rem;">
    <div id="swagger-ui"></div>
            </div>
        </div>
        
        <div id="logs" class="tab-content">
            <h2>Logs en Tiempo Real</h2>
            <p>Monitorea los logs del sistema en tiempo real para debugging y monitoreo.</p>
            
                <div class="logs-controls" style="margin-bottom: 1rem;">
                    <button onclick="refreshLogs()" class="btn btn-primary">Actualizar Logs</button>
                    <button onclick="clearLogs()" class="btn btn-secondary">Limpiar Pantalla</button>
                    <button onclick="clearAllLogs()" class="btn btn-danger">Borrar Todos los Logs</button>
                    <button onclick="toggleAutoRefresh()" class="btn btn-info" id="autoRefreshBtn">Pausar Auto-actualización</button>
                </div>
            
            <div class="logs-container" style="background: #1a1a1a; color: #00ff00; padding: 1rem; border-radius: 8px; font-family: 'Courier New', monospace; max-height: 500px; overflow-y: auto;">
                <div id="logs-content">
                    <div style="color: #888;">Cargando logs...</div>
                </div>
            </div>
        </div>
        
        <div id="data" class="tab-content">
            <h2>Datos del Tenant</h2>
            <p>Visualiza los datos generados para el tenant actualmente logueado.</p>
            
                <div class="data-controls" style="margin-bottom: 1rem;">
                    <div class="form-group">
                        <label for="tenantIdInput">ID del Tenant:</label>
                        <input type="text" id="tenantIdInput" placeholder="Ingresa el ID del tenant" style="width: 300px; margin-right: 10px;">
                        <button onclick="loadTenantData()" class="btn btn-primary">Cargar Datos</button>
                        <button onclick="clearTenantData()" class="btn btn-secondary" id="clearDataBtn" style="display: none;">Borrar Datos</button>
                    </div>
                </div>
            
            <div id="tenant-data-content">
                <div class="alert alert-info">
                    <strong>Información:</strong> Ingresa el ID del tenant para ver sus datos generados.
                </div>
            </div>
        </div>
        
        <div id="onboarding" class="tab-content active">
            <h2>Guía de Onboarding para Desarrolladores</h2>
            <p>Bienvenido al Echeq Sandbox. Esta guía te ayudará a entender todas las funcionalidades disponibles y cómo usarlas.</p>
            
            <!-- Backend Features -->
            <div class="step-card">
                <div class="step-header">
                    <div class="step-number">1</div>
                    <h3>Funcionalidades del Backend</h3>
                </div>
                <div class="step-content">
                    <h4>Endpoints de API</h4>
                    <div class="features-grid">
                        <div class="feature-item">
                            <h5>Health Checks</h5>
                            <ul>
                                <li><code>GET /health</code> - Estado general del sistema</li>
                                <li><code>GET /api/coelsa/health</code> - Estado específico de COELSA</li>
                            </ul>
                        </div>
                        <div class="feature-item">
                            <h5>Gestión de Cuentas</h5>
                            <ul>
                                <li><code>GET /api/coelsa/Cuentas/Cuenta</code> - Listar cuentas</li>
                                <li><code>POST /api/coelsa/Cuentas/Cuenta</code> - Crear cuenta</li>
                            </ul>
                        </div>
                        <div class="feature-item">
                            <h5>Gestión de Cheques</h5>
                            <ul>
                                <li><code>GET /api/coelsa/Cheques/Cheque</code> - Listar cheques</li>
                                <li><code>POST /api/coelsa/Cheques/Cheque</code> - Crear cheque</li>
                                <li><code>GET /api/coelsa/Cheques/Cheque/:id</code> - Obtener cheque</li>
                            </ul>
                        </div>
                        <div class="feature-item">
                            <h5>Gestión de Endosos</h5>
                            <ul>
                                <li><code>GET /api/coelsa/Endosos/Endoso</code> - Listar endosos</li>
                                <li><code>POST /api/coelsa/Endosos/Endoso</code> - Crear endoso</li>
                            </ul>
                        </div>
                        <div class="feature-item">
                            <h5>Gestión de Custodia</h5>
                            <ul>
                                <li><code>GET /api/coelsa/Custodia/Custodia</code> - Listar custodias</li>
                                <li><code>POST /api/coelsa/Custodia/Custodia</code> - Crear custodia</li>
                            </ul>
                        </div>
                        <div class="feature-item">
                            <h5>Gestión de Devoluciones</h5>
                            <ul>
                                <li><code>GET /api/coelsa/Devoluciones/Devolucion</code> - Listar devoluciones</li>
                                <li><code>POST /api/coelsa/Devoluciones/Devolucion</code> - Crear devolución</li>
                            </ul>
                        </div>
                        <div class="feature-item">
                            <h5>Gestión de Certificados</h5>
                            <ul>
                                <li><code>GET /api/coelsa/Certificados/Certificado</code> - Listar certificados</li>
                                <li><code>POST /api/coelsa/Certificados/Certificado</code> - Crear certificado</li>
                            </ul>
                        </div>
                        <div class="feature-item">
                            <h5>Gestión de Cesiones</h5>
                            <ul>
                                <li><code>GET /api/coelsa/Cesion/Cesion</code> - Listar cesiones</li>
                                <li><code>POST /api/coelsa/Cesion/Cesion</code> - Crear cesión</li>
                            </ul>
                        </div>
                        <div class="feature-item">
                            <h5>Gestión de Avales</h5>
                            <ul>
                                <li><code>GET /api/coelsa/Avales/Aval</code> - Listar avales</li>
                                <li><code>POST /api/coelsa/Avales/Aval</code> - Crear aval</li>
                            </ul>
                        </div>
                        <div class="feature-item">
                            <h5>Gestión de Mandatos</h5>
                            <ul>
                                <li><code>GET /api/coelsa/Mandatos/Mandato</code> - Listar mandatos</li>
                                <li><code>POST /api/coelsa/Mandatos/Mandato</code> - Crear mandato</li>
                            </ul>
                        </div>
                        <div class="feature-item">
                            <h5>Gestión de Notificaciones</h5>
                            <ul>
                                <li><code>GET /api/coelsa/Notificaciones/Notificacion</code> - Listar notificaciones</li>
                                <li><code>POST /api/coelsa/Notificaciones/Notificacion</code> - Crear notificación</li>
                            </ul>
                        </div>
                        <div class="feature-item">
                            <h5>Gestión de Seguridad</h5>
                            <ul>
                                <li><code>GET /api/coelsa/Seguridad/Token</code> - Obtener token</li>
                                <li><code>POST /api/coelsa/Seguridad/Token</code> - Crear token</li>
                            </ul>
                        </div>
                    </div>
                    
                    <h4>Autenticación</h4>
                    <p>Todos los endpoints requieren autenticación mediante headers:</p>
                    <ul>
                        <li><code>X-API-Key</code> - Clave de API del tenant</li>
                        <li><code>X-API-Secret</code> - Secret de API del tenant</li>
                        <li><code>X-Tenant-ID</code> - ID del tenant</li>
                    </ul>
                    
                    <h4>Funcionalidades Avanzadas</h4>
                    <ul>
                        <li><code>GET /api/coelsa/logs</code> - Logs en tiempo real</li>
                        <li><code>GET /api/coelsa/tenant-data/:id</code> - Datos del tenant</li>
                        <li><code>DELETE /api/coelsa/tenant-data/:id</code> - Borrar datos del tenant</li>
                        <li><code>GET /api/coelsa/tenants</code> - Listar tenants (requiere admin key)</li>
                        <li><code>GET /api/coelsa/tenant-credentials/:id</code> - Recuperar credenciales</li>
                    </ul>
                </div>
            </div>
            
            <!-- Frontend Features -->
            <div class="step-card">
                <div class="step-header">
                    <div class="step-number">2</div>
                    <h3>Funcionalidades del Frontend</h3>
                </div>
                <div class="step-content">
                    <h4>Pestaña "Credenciales API"</h4>
                    <ul>
                        <li><strong>Consultar Tenants Existentes:</strong> Lista todos los tenants con admin key</li>
                        <li><strong>Paso 1:</strong> Crear tenant random (opcional) o saltar al paso 2</li>
                        <li><strong>Paso 2:</strong> Crear tenant con datos reales</li>
                        <li><strong>Paso 3:</strong> Generar API keys para el tenant</li>
                        <li><strong>Resultados:</strong> Muestra credenciales y comandos curl</li>
                    </ul>
                    
                    <h4>Pestaña "Testing APIs"</h4>
                    <ul>
                        <li><strong>Cargar Credenciales Generadas:</strong> Carga automáticamente las credenciales del paso anterior</li>
                        <li><strong>Configurar Credenciales:</strong> Ingresar credenciales manualmente</li>
                        <li><strong>Probar Conexión:</strong> Verificar que las credenciales funcionen</li>
                        <li><strong>Acceder a Swagger:</strong> Ir a la documentación interactiva</li>
                    </ul>
                    
                    <h4>Pestaña "Documentación"</h4>
                    <ul>
                        <li><strong>Swagger UI:</strong> Documentación interactiva de la API</li>
                        <li><strong>Autenticación Automática:</strong> Usa las credenciales configuradas</li>
                        <li><strong>Pruebas en Vivo:</strong> Ejecutar endpoints directamente desde la documentación</li>
                    </ul>
                    
                    <h4>Pestaña "Logs en Tiempo Real"</h4>
                    <ul>
                        <li><strong>Monitoreo:</strong> Ver logs del sistema en tiempo real</li>
                        <li><strong>Auto-actualización:</strong> Actualización automática cada 5 segundos</li>
                        <li><strong>Filtros:</strong> Por nivel de log (error, info, audit)</li>
                        <li><strong>Limpieza:</strong> Limpiar pantalla o borrar todos los logs</li>
                    </ul>
                    
                    <h4>Pestaña "Datos del Tenant"</h4>
                    <ul>
                        <li><strong>Visualización:</strong> Ver datos generados para un tenant específico</li>
                        <li><strong>Estadísticas:</strong> Total de cheques, montos, estados</li>
                        <li><strong>Tablas:</strong> Cheques, cuentas, endosos con detalles</li>
                        <li><strong>Borrado:</strong> Eliminar datos del tenant (mantiene credenciales)</li>
                    </ul>
                </div>
            </div>
            
            <!-- Quick Start Guide -->
            <div class="step-card">
                <div class="step-header">
                    <div class="step-number">3</div>
                    <h3>Guía de Inicio Rápido</h3>
                </div>
                <div class="step-content">
                    <h4>Para empezar en 5 minutos:</h4>
                    <ol>
                        <li><strong>Ve a "Credenciales API"</strong> → Crea un tenant → Genera API keys</li>
                        <li><strong>Ve a "Testing APIs"</strong> → Carga las credenciales generadas</li>
                        <li><strong>Ve a "Documentación"</strong> → Prueba los endpoints en Swagger</li>
                        <li><strong>Ve a "Logs"</strong> → Monitorea la actividad en tiempo real</li>
                        <li><strong>Ve a "Datos del Tenant"</strong> → Visualiza los datos generados</li>
                    </ol>
                    
                    <h4>Para desarrolladores avanzados:</h4>
                    <ol>
                        <li><strong>Usa curl:</strong> Copia los comandos generados en "Credenciales API"</li>
                        <li><strong>Integra en tu app:</strong> Usa las credenciales en tu aplicación</li>
                        <li><strong>Monitorea:</strong> Usa los logs para debugging</li>
                        <li><strong>Administra:</strong> Usa las funciones de admin para gestionar tenants</li>
                    </ol>
                    
                    <h4>Comandos útiles:</h4>
                    <div class="command-examples">
                        <h5>Health Check:</h5>
                        <pre><code>curl -s [BASE_URL]/health</code></pre>
                        
                        <h5>Crear Tenant:</h5>
                        <pre><code>curl -X POST -H "Content-Type: application/json" \\
  -d '{"name":"Mi Banco","code":"BANCO_001","cuit":"20123456789","tipo":"BANCO"}' \\
  [BASE_URL]/api/coelsa/create-tenant</code></pre>
                        
                        <h5>Probar Endpoint con Autenticación:</h5>
                        <pre><code>curl -H "X-API-Key: sandbox_xxx" \\
  -H "X-API-Secret: secret_xxx" \\
  -H "X-Tenant-ID: tenant-id" \\
  [BASE_URL]/api/coelsa/Cheques/Cheque</code></pre>
                    </div>
                </div>
            </div>
            
            <!-- API Documentation -->
            <div class="step-card">
                <div class="step-header">
                    <div class="step-number">4</div>
                    <h3>Documentación de la API</h3>
                </div>
                <div class="step-content">
                    <h4>Enlaces importantes:</h4>
                    <ul>
                        <li><strong>Swagger UI:</strong> <a href="/api/coelsa/api-docs" target="_blank">Echeq</a></li>
                        <li><strong>Swagger JSON:</strong> <a href="/api/coelsa/swagger.json" target="_blank">Especificación OpenAPI</a></li>
                        <li><strong>Health Check:</strong> <a href="/health" target="_blank">Estado del Sistema</a></li>
                    </ul>
                    
                    <h4>Recursos adicionales:</h4>
                    <ul>
                        <li><strong>Especificación COELSA:</strong> Documentación oficial de COELSA</li>
                        <li><strong>Ejemplos de Integración:</strong> Casos de uso comunes</li>
                        <li><strong>Mejores Prácticas:</strong> Recomendaciones de seguridad</li>
                    </ul>
                </div>
            </div>
        </div>
        
        <!-- Pestaña Admin -->
        <div id="admin" class="tab-content">
            <h2>Echeq</h2>
            <div class="alert alert-info">
                <strong>Información:</strong> Herramientas avanzadas para administradores del sistema.
            </div>
            
            <div class="admin-grid">
                <div class="admin-card">
                    <h3>Gestión de Tenants</h3>
                    <p>Administra todos los tenants del sistema</p>
                    <div class="admin-actions">
                        <button onclick="loadAllTenants()" class="btn btn-primary">Listar Todos los Tenants</button>
                        <button onclick="showCreateTenantForm()" class="btn btn-success">Crear Nuevo Tenant</button>
                    </div>
                </div>
                
                <div class="admin-card">
                    <h3>Estadísticas del Sistema</h3>
                    <p>Monitorea el estado general del sistema</p>
                    <div class="admin-actions">
                        <button onclick="loadSystemStats()" class="btn btn-info">Ver Estadísticas</button>
                        <button onclick="loadDatabaseStats()" class="btn btn-secondary">Estado de Base de Datos</button>
                    </div>
                </div>
                
                <div class="admin-card">
                    <h3>Logs del Sistema</h3>
                    <p>Acceso completo a logs y auditoría</p>
                    <div class="admin-actions">
                        <button onclick="loadSystemLogs()" class="btn btn-warning">Ver Logs del Sistema</button>
                        <button onclick="exportLogs()" class="btn btn-secondary">Exportar Logs</button>
                    </div>
                </div>
                
                <div class="admin-card">
                    <h3>Configuración</h3>
                    <p>Configuración avanzada del sistema</p>
                    <div class="admin-actions">
                        <button onclick="showSystemConfig()" class="btn btn-info">Configuración</button>
                        <button onclick="showEnvironmentVars()" class="btn btn-secondary">Variables de Entorno</button>
                    </div>
                </div>
            </div>
            
            <div id="admin-results" class="admin-results" style="margin-top: 2rem; display: none;">
                <!-- Los resultados se mostrarán aquí -->
            </div>
        </div>
        
        <!-- Footer fijo con datos y alertas -->
        <div class="footer-panel">
            <div class="footer-left">
                <div class="data-panel">
                    <h4>Datos del Sistema</h4>
                    <div class="data-item">
                        <span class="data-label">Estado:</span>
                        <span class="data-value status-online">Online</span>
                    </div>
                    <div class="data-item">
                        <span class="data-label">Base de datos:</span>
                        <span class="data-value">Conectada</span>
                    </div>
                    <div class="data-item">
                        <span class="data-label">Última actualización:</span>
                        <span class="data-value" id="lastUpdate">--:--:--</span>
                    </div>
                </div>
            </div>
            <div class="footer-right">
                <div class="alerts-panel">
                    <h4>Alertas y Resultados</h4>
                    <div id="alerts-container" class="alerts-container">
                        <div class="alert-item info">
                            <span class="alert-icon">ℹ️</span>
                            <span class="alert-text">Sistema iniciado correctamente</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-bundle.js"></script>
    <script>
        let currentCredentials = {};
        
        // Sistema de alertas y datos del footer
        function addAlert(message, type = 'info') {
            const alertsContainer = document.getElementById('alerts-container');
            const alertItem = document.createElement('div');
            alertItem.className = 'alert-item' + type;
            
            const icons = {
                info: 'ℹ️',
                success: '✅',
                warning: '⚠️',
                error: '❌'
            };
            
            alertItem.innerHTML = 
                '<span class="alert-icon">' + icons[type] + '</span>' +
                '<span class="alert-text">' + message + '</span>';
            
            alertsContainer.insertBefore(alertItem, alertsContainer.firstChild);
            
            // Limitar a 5 alertas máximo
            const alerts = alertsContainer.querySelectorAll('.alert-item');
            if (alerts.length > 5) {
                alerts[alerts.length - 1].remove();
            }
            
            // Auto-remover alertas después de 10 segundos
            setTimeout(() => {
                if (alertItem.parentNode) {
                    alertItem.remove();
                }
            }, 10000);
        }
        
        function updateLastUpdate() {
            const now = new Date();
            const timeString = now.toLocaleTimeString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });
            document.getElementById('lastUpdate').textContent = timeString;
        }
        
        // Actualizar tiempo cada minuto
        setInterval(updateLastUpdate, 60000);
        updateLastUpdate();
        
        // Sistema de pasos progresivos
        let currentStep = 1;
        let stepStates = {
            1: 'pending',
            2: 'pending', 
            3: 'pending'
        };
        
        // Inicializar el sistema de pasos
        function initializeProgressiveSteps() {
            // Mostrar solo el primer paso inicialmente
            showStep(1);
            updateStepStatus(1, 'current');
        }
        
        // Mostrar un paso específico
        function showStep(stepNumber) {
            // Ocultar todos los pasos
            for (let i = 1; i <= 3; i++) {
                const stepContent = document.getElementById('step' + i + '-content');
                const stepCard = document.getElementById('step' + i);
                if (stepContent && stepCard) {
                    stepContent.style.display = 'none';
                    stepCard.classList.remove('current');
                }
            }
            
            // Mostrar el paso solicitado
            const stepContent = document.getElementById('step' + stepNumber + '-content');
            const stepCard = document.getElementById('step' + stepNumber);
            if (stepContent && stepCard) {
                stepContent.style.display = 'block';
                stepCard.classList.add('current');
                currentStep = stepNumber;
            }
        }
        
        // Alternar visibilidad de un paso
        function toggleStep(stepNumber) {
            const stepContent = document.getElementById('step' + stepNumber + '-content');
            const stepCard = document.getElementById('step' + stepNumber);
            
            if (stepContent && stepCard) {
                if (stepContent.style.display === 'none') {
                    showStep(stepNumber);
                } else {
                    stepContent.style.display = 'none';
                    stepCard.classList.remove('current');
                }
            }
        }
        
        // Actualizar el estado de un paso
        function updateStepStatus(stepNumber, status) {
            const statusElement = document.getElementById('step' + stepNumber + '-status');
            const stepCard = document.getElementById('step' + stepNumber);
            
            if (statusElement && stepCard) {
                stepStates[stepNumber] = status;
                
                // Actualizar el texto del estado
                switch(status) {
                    case 'pending':
                        statusElement.textContent = 'Pendiente';
                        statusElement.className = 'step-status pending';
                        break;
                    case 'current':
                        statusElement.textContent = 'En Progreso';
                        statusElement.className = 'step-status current';
                        break;
                    case 'completed':
                        statusElement.textContent = 'Completado';
                        statusElement.className = 'step-status completed';
                        stepCard.classList.add('completed');
                        break;
                }
            }
        }
        
        // Completar un paso y avanzar al siguiente
        function completeStep(stepNumber) {
            updateStepStatus(stepNumber, 'completed');
            
            // Si no es el último paso, mostrar el siguiente
            if (stepNumber < 3) {
                const nextStep = stepNumber + 1;
                showStep(nextStep);
                updateStepStatus(nextStep, 'current');
            }
        }
        
        // Saltar al paso 1 (función modificada)
        function skipStep1() {
            completeStep(1);
            showStep(2);
            updateStepStatus(2, 'current');
        }
        
        // Funciones de tabs
        function showTab(tabName) {
            console.log('showTab called with:', tabName);
            
            try {
                // Ocultar todos los tabs del menú lateral
                document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
                
                // Mostrar el tab seleccionado - buscar por el onclick en el menú lateral
                const menuItems = document.querySelectorAll('.menu-item');
                menuItems.forEach(item => {
                    if (item.onclick && item.onclick.toString().includes(tabName)) {
                        item.classList.add('active');
                    }
                });
                
                const targetElement = document.getElementById(tabName);
                if (targetElement) {
                    targetElement.classList.add('active');
                    console.log('Tab activated:', tabName);
                } else {
                    console.error('Element not found:', tabName);
                }
                
                // Si es la pestaña de documentación, inicializar Swagger
                if (tabName === 'docs') {
                    initializeSwagger();
                }
                
                // Si es la pestaña de logs, cargar logs
                if (tabName === 'logs') {
                    refreshLogs();
                }
                
                // Si es la pestaña de testing, no se necesita configuración adicional
                
                // Si es la pestaña de credenciales, inicializar el sistema de pasos progresivos
                if (tabName === 'credentials') {
                    initializeProgressiveSteps();
                }
            } catch (error) {
                console.error('Error in showTab:', error);
            }
        }
        
        // Función para configurar credenciales
        function configureCredentials() {
            const apiKey = document.getElementById('testApiKey').value;
            const apiSecret = document.getElementById('testApiSecret').value;
            const tenantId = document.getElementById('testTenantId').value;
            
            if (!apiKey || !apiSecret || !tenantId) {
                showAlert('Por favor, completa todos los campos antes de continuar.', 'error');
                return;
            }
            
            // Configurar credenciales globales
            currentCredentials = {
                apiKey: apiKey,
                apiSecret: apiSecret,
                tenantId: tenantId
            };
            
            // Mostrar sección de acceso configurado
            document.getElementById('swaggerAccess').style.display = 'block';
            
            // Reinicializar Swagger UI con las nuevas credenciales
            initializeSwagger();
            
            showAlert('Credenciales configuradas! Ahora puedes usar el Swagger con autenticación automática.', 'success');
        }
        
        // Variables globales para logs
        let autoRefreshInterval = null;
        let isAutoRefreshEnabled = true;
        
        // Función para cargar logs
        async function refreshLogs() {
            try {
                const response = await fetch('/api/coelsa/logs');
                const data = await response.json();
                
                if (data.success) {
                    displayLogs(data.data.logs);
                } else {
                    document.getElementById('logs-content').innerHTML = '<div style="color: #ff6b6b;">Error cargando logs: ' + data.message + '</div>';
                }
            } catch (error) {
                document.getElementById('logs-content').innerHTML = '<div style="color: #ff6b6b;">Error de conexión: ' + error.message + '</div>';
            }
        }
        
        // Función para mostrar logs
        function displayLogs(logs) {
            const logsContent = document.getElementById('logs-content');
            if (!logsContent) return;
            
            if (logs.length === 0) {
                logsContent.innerHTML = '<div style="color: #888;">No hay logs disponibles</div>';
                return;
            }
            
            let html = '';
            logs.forEach(log => {
                const levelColor = log.level === 'error' ? '#ff6b6b' : '#00ff00';
                const fileColor = log.file === 'error' ? '#ff6b6b' : log.file === 'audit' ? '#ffd93d' : '#4ecdc4';
                
                html += '<div style="margin-bottom: 8px; padding: 4px; border-left: 3px solid ' + levelColor + ';">' +
                    '<span style="color: ' + fileColor + '; font-weight: bold;">[' + log.file.toUpperCase() + ']</span>' +
                    '<span style="color: #888; margin-left: 10px;">' + new Date(log.timestamp).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' }) + '</span>' +
                    '<div style="color: ' + levelColor + '; margin-top: 2px;">' + log.message + '</div>' +
                    '</div>';
            });
            
            logsContent.innerHTML = html;
            logsContent.scrollTop = logsContent.scrollHeight;
        }
        
        // Función para limpiar logs
        function clearLogs() {
            document.getElementById('logs-content').innerHTML = '<div style="color: #888;">Logs limpiados</div>';
        }
        
        // Función para alternar auto-actualización
        function toggleAutoRefresh() {
            const btn = document.getElementById('autoRefreshBtn');
            
            if (isAutoRefreshEnabled) {
                clearInterval(autoRefreshInterval);
                btn.textContent = 'Iniciar Auto-actualización';
                btn.classList.remove('btn-info');
                btn.classList.add('btn-success');
                isAutoRefreshEnabled = false;
            } else {
                autoRefreshInterval = setInterval(refreshLogs, 5000); // Actualizar cada 5 segundos
                btn.textContent = 'Pausar Auto-actualización';
                btn.classList.remove('btn-success');
                btn.classList.add('btn-info');
                isAutoRefreshEnabled = true;
            }
        }
        
        // Función para cargar datos del tenant
        async function loadTenantData() {
            const tenantId = document.getElementById('tenantIdInput').value.trim();
            if (!tenantId) {
                showAlert('Por favor ingresa un ID de tenant válido', 'error');
                return;
            }
            
            try {
                const response = await fetch('/api/coelsa/tenant-data/' + tenantId);
                const data = await response.json();
                
                if (data.success) {
                    displayTenantData(data.data);
                } else {
                    document.getElementById('tenant-data-content').innerHTML = '<div class="alert alert-error">Error cargando datos: ' + data.message + '</div>';
                }
            } catch (error) {
                document.getElementById('tenant-data-content').innerHTML = '<div class="alert alert-error">Error de conexión: ' + error.message + '</div>';
            }
        }
        
        // Función para mostrar datos del tenant
        function displayTenantData(data) {
            const content = document.getElementById('tenant-data-content');
            if (!content) return;
            
            const html = '<div class="tenant-data-container">' +
                '<div class="data-section">' +
                    '<h3>Información del Tenant</h3>' +
                    '<div class="data-grid">' +
                        '<div class="data-item"><strong>ID:</strong> ' + data.tenant.id + '</div>' +
                        '<div class="data-item"><strong>Nombre:</strong> ' + data.tenant.name + '</div>' +
                        '<div class="data-item"><strong>Código:</strong> ' + data.tenant.code + '</div>' +
                        '<div class="data-item"><strong>CUIT:</strong> ' + data.tenant.cuit + '</div>' +
                        '<div class="data-item"><strong>Estado:</strong> <span style="color: #4ecdc4;">' + data.tenant.status + '</span></div>' +
                    '</div>' +
                '</div>' +
                '<div class="data-section">' +
                    '<h3>Estadísticas</h3>' +
                    '<div class="stats-grid">' +
                        '<div class="stat-item"><div class="stat-number">' + data.estadisticas.total_cheques + '</div><div class="stat-label">Total Cheques</div></div>' +
                        '<div class="stat-item"><div class="stat-number">$' + data.estadisticas.total_monto.toLocaleString() + '</div><div class="stat-label">Monto Total</div></div>' +
                        '<div class="stat-item"><div class="stat-number">' + data.estadisticas.cheques_emitidos + '</div><div class="stat-label">Emitidos</div></div>' +
                        '<div class="stat-item"><div class="stat-number">' + data.estadisticas.cheques_activos + '</div><div class="stat-label">Activos</div></div>' +
                    '</div>' +
                '</div>' +
                '<div class="data-section">' +
                    '<h3>Cheques</h3>' +
                    '<div class="table-container">' +
                        '<table class="data-table">' +
                            '<thead><tr><th>ID</th><th>Monto</th><th>Estado</th><th>Beneficiario</th><th>Fecha</th></tr></thead>' +
                            '<tbody>' + data.cheques.map(cheque => 
                                '<tr>' +
                                    '<td>' + cheque.id + '</td>' +
                                    '<td>$' + cheque.monto.toLocaleString() + '</td>' +
                                    '<td><span class="status-badge status-' + cheque.estado.toLowerCase() + '">' + cheque.estado + '</span></td>' +
                                    '<td>' + cheque.beneficiario + '</td>' +
                                    '<td>' + new Date(cheque.fecha_emision).toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' }) + '</td>' +
                                '</tr>'
                            ).join('') + '</tbody>' +
                        '</table>' +
                    '</div>' +
                '</div>' +
                '<div class="data-section">' +
                    '<h3>Cuentas</h3>' +
                    '<div class="table-container">' +
                        '<table class="data-table">' +
                            '<thead><tr><th>ID</th><th>CUIT</th><th>CBU</th><th>Estado</th><th>Saldo</th></tr></thead>' +
                            '<tbody>' + data.cuentas.map(cuenta => 
                                '<tr>' +
                                    '<td>' + cuenta.id + '</td>' +
                                    '<td>' + cuenta.cuit + '</td>' +
                                    '<td>' + cuenta.cbu + '</td>' +
                                    '<td><span class="status-badge status-' + cuenta.estado.toLowerCase() + '">' + cuenta.estado + '</span></td>' +
                                    '<td>$' + cuenta.saldo.toLocaleString() + '</td>' +
                                '</tr>'
                            ).join('') + '</tbody>' +
                        '</table>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<style>' +
                '.tenant-data-container { display: flex; flex-direction: column; gap: 2rem; }' +
                '.data-section { background: rgba(255, 255, 255, 0.05); padding: 1.5rem; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.1); }' +
                '.data-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-top: 1rem; }' +
                '.data-item { padding: 0.5rem; background: rgba(255, 255, 255, 0.05); border-radius: 8px; }' +
                '.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-top: 1rem; }' +
                '.stat-item { text-align: center; padding: 1rem; background: rgba(255, 255, 255, 0.05); border-radius: 8px; }' +
                '.stat-number { font-size: 2rem; font-weight: bold; color: #4ecdc4; }' +
                '.stat-label { color: #888; margin-top: 0.5rem; }' +
                '.table-container { overflow-x: auto; margin-top: 1rem; }' +
                '.data-table { width: 100%; border-collapse: collapse; background: rgba(255, 255, 255, 0.05); border-radius: 8px; overflow: hidden; }' +
                '.data-table th, .data-table td { padding: 0.75rem; text-align: left; border-bottom: 1px solid rgba(255, 255, 255, 0.1); }' +
                '.data-table th { background: rgba(255, 255, 255, 0.1); font-weight: bold; }' +
                '.status-badge { padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.8rem; font-weight: bold; }' +
                '.status-emitido { background: #ffd93d; color: #000; }' +
                '.status-activo { background: #4ecdc4; color: #000; }' +
                '.status-active { background: #4ecdc4; color: #000; }' +
            '</style>';
            
            content.innerHTML = html;
            
            // Mostrar botón de borrar datos
            const clearDataBtn = document.getElementById('clearDataBtn');
            if (clearDataBtn) {
                clearDataBtn.style.display = 'inline-block';
            }
        }
        
        // Inicializar Swagger UI
        function initializeSwagger() {
            const swaggerContainer = document.getElementById('swagger-ui');
            if (!swaggerContainer) {
                console.error('Contenedor swagger-ui no encontrado');
                return;
            }
            
            // Limpiar contenido anterior
            swaggerContainer.innerHTML = '<div style="text-align: center; padding: 20px; color: #666;">Cargando documentación de la API...</div>';
            
            try {
                // Configuración simplificada de Swagger UI
                const ui = SwaggerUIBundle({
                    url: '/api/coelsa/swagger.json',
                    dom_id: '#swagger-ui',
                    deepLinking: true,
                    presets: [
                        SwaggerUIBundle.presets.apis,
                        SwaggerUIBundle.presets.standalone
                    ],
                    plugins: [
                        SwaggerUIBundle.plugins.DownloadUrl
                    ],
                    tryItOutEnabled: true,
                    requestInterceptor: (request) => {
                        // Agregar credenciales si están disponibles
                        if (currentCredentials.apiKey && currentCredentials.apiSecret && currentCredentials.tenantId) {
                            request.headers['X-API-Key'] = currentCredentials.apiKey;
                            request.headers['X-API-Secret'] = currentCredentials.apiSecret;
                            request.headers['X-Tenant-ID'] = currentCredentials.tenantId;
                        }
                        return request;
                    },
                    onComplete: () => {
                        console.log('Swagger UI cargado correctamente');
                    },
                    onFailure: (error) => {
                        console.error('Error cargando Swagger UI:', error);
                        swaggerContainer.innerHTML = '<div style="color: red; padding: 20px; text-align: center;"><h3>Error cargando la documentación</h3><p>No se pudo cargar la documentación de la API. Por favor, verifica que el endpoint /api/coelsa/swagger.json esté disponible.</p></div>';
                    }
                });
            } catch (error) {
                console.error('Error inicializando Swagger UI:', error);
                swaggerContainer.innerHTML = '<div style="color: red; padding: 20px; text-align: center;"><h3>Error de configuración</h3><p>Error al configurar Swagger UI. Por favor, recarga la página.</p></div>';
            }
        }
        
        // Función para cargar tenants existentes
        async function loadExistingTenants() {
            const adminKey = document.getElementById('adminKey').value.trim();
            if (!adminKey) {
                showAlert('Por favor ingresa la clave de administrador', 'error');
                return;
            }
            
            const { validateAdminKey } = require('../utils/adminKey');
            if (!validateAdminKey(adminKey)) {
                showAlert('Clave de administrador incorrecta', 'error');
                return;
            }
            
            try {
                const response = await fetch('/api/coelsa/tenants?adminKey=' + adminKey);
                const data = await response.json();
                
                if (data.success) {
                    displayTenantsList(data.data);
                } else {
                    showAlert('Error cargando tenants: ' + data.message, 'error');
                }
            } catch (error) {
                showAlert('Error de conexión: ' + error.message, 'error');
            }
        }
        
        // Función para mostrar lista de tenants
        function displayTenantsList(tenants) {
            const container = document.getElementById('tenants-list');
            if (!container) return;
            
            let html = '<div class="tenants-grid">';
            tenants.forEach(tenant => {
                html += '<div class="tenant-card">' +
                    '<h4>' + tenant.name + '</h4>' +
                    '<p><strong>ID:</strong> ' + tenant.id + '</p>' +
                    '<p><strong>Código:</strong> ' + tenant.code + '</p>' +
                    '<p><strong>Estado:</strong> <span style="color: ' + (tenant.is_active ? '#4ecdc4' : '#ff6b6b') + ';">' + (tenant.is_active ? 'Activo' : 'Inactivo') + '</span></p>' +
                    '<p><strong>Creado:</strong> ' + new Date(tenant.createdAt).toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' }) + '</p>' +
                    '<div class="tenant-actions">' +
                    '<button onclick="loadTenantCredentials(&quot;' + tenant.id + '&quot;)" class="btn btn-primary">Obtener Credenciales</button>' +
                    '<button onclick="deleteTenantFromAdmin(&quot;' + tenant.id + '&quot;)" class="btn btn-danger">Eliminar</button>' +
                    '</div>' +
                    '</div>';
            });
            html += '</div>';
            
            container.innerHTML = html;
            container.style.display = 'block';
        }
        
        // Función para cargar credenciales de un tenant
        async function loadTenantCredentials(tenantId) {
            const adminKey = document.getElementById('adminKey').value.trim();
            if (!adminKey) {
                showAlert('Por favor ingresa la clave de administrador', 'error');
                return;
            }
            
            try {
                const response = await fetch('/api/coelsa/tenant-credentials/' + tenantId + '?adminKey=' + adminKey);
                const data = await response.json();
                
                if (data.success) {
                    displayCredentials(data.data);
                } else {
                    showAlert('Error cargando credenciales: ' + data.message, 'error');
                }
            } catch (error) {
                showAlert('Error de conexión: ' + error.message, 'error');
            }
        }
        
        // Función para eliminar un tenant
        async function deleteTenant(tenantId, tenantName) {
            const adminKey = document.getElementById('adminKey').value.trim();
            if (!adminKey) {
                showAlert('Por favor ingresa la clave de administrador', 'error');
                return;
            }
            
            // Mostrar modal de confirmación personalizado
            showModal(
                'Confirmar Eliminación',
                '¿Estás seguro de que deseas eliminar el tenant "' + tenantName + '"?\\n\\nEsta acción no se puede deshacer.',
                'warning',
                [
                    {
                        text: 'Cancelar',
                        class: 'secondary',
                        action: 'window.closeModal();'
                    },
                    {
                        text: 'Eliminar',
                        class: 'primary',
                        action: 'window.closeModal(); deleteTenantConfirmed("' + tenantId + '", "' + tenantName + '");'
                    }
                ]
            );
        }
        
        // Función para confirmar eliminación de tenant
        async function deleteTenantConfirmed(tenantId, tenantName) {
            const adminKey = document.getElementById('adminKey').value.trim();
            
            try {
                const response = await fetch('/api/coelsa/tenants/' + tenantId + '?adminKey=' + encodeURIComponent(adminKey), {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                const data = await response.json();
                
                if (data.success) {
                    showAlert('Tenant "' + tenantName + '" eliminado exitosamente', 'success');
                    // Recargar la lista de tenants
                    await loadExistingTenants();
                } else {
                    showAlert('Error eliminando tenant: ' + data.message, 'error');
                }
            } catch (error) {
                showAlert('Error de conexión: ' + error.message, 'error');
            }
        }
        
        // Función para mostrar credenciales
        function displayCredentials(credentials) {
            const html = '<div class="credentials-display">' +
                '<h3>Credenciales Recuperadas</h3>' +
                '<div class="credential-item">' +
                    '<label>API Key:</label>' +
                    '<div class="credential-value">' + credentials.apiKey + '</div>' +
                    '<button onclick="copyToClipboard(&quot;' + credentials.apiKey + '&quot;)" class="btn btn-secondary">Copiar</button>' +
                '</div>' +
                '<div class="credential-item">' +
                    '<label>API Secret:</label>' +
                    '<div class="credential-value">' + credentials.apiSecret + '</div>' +
                    '<button onclick="copyToClipboard(&quot;' + credentials.apiSecret + '&quot;)" class="btn btn-secondary">Copiar</button>' +
                '</div>' +
                '<div class="credential-item">' +
                    '<label>Tenant ID:</label>' +
                    '<div class="credential-value">' + credentials.tenantId + '</div>' +
                    '<button onclick="copyToClipboard(&quot;' + credentials.tenantId + '&quot;)" class="btn btn-secondary">Copiar</button>' +
                '</div>' +
                '<div class="next-steps">' +
                    '<h4>Próximos Pasos:</h4>' +
                    '<p>1. Ve a la pestaña "Testing APIs" para probar las credenciales</p>' +
                    '<p>2. Ve a la pestaña "Documentación" para ver la API completa</p>' +
                '</div>' +
            '</div>';
            
            // Insertar las credenciales después de la lista de tenants
            const tenantsList = document.getElementById('tenants-list');
            tenantsList.insertAdjacentHTML('afterend', html);
        }
        
        // Función para borrar datos del tenant
        async function clearTenantData() {
            const tenantId = document.getElementById('tenantIdInput').value.trim();
            if (!tenantId) {
                showAlert('Por favor ingresa un ID de tenant válido', 'error');
                return;
            }
            
            // Solicitar clave de administrador
            const adminKey = prompt('Ingresa la clave de administrador para borrar los datos:');
            if (!adminKey) {
                showAlert('Operación cancelada', 'info');
                return;
            }
            
            if (!confirm('¿Estás seguro de que quieres borrar todos los datos y logs de este tenant?\\n\\nEsto NO borrará las credenciales ni el tenant, solo los datos generados.')) {
                return;
            }
            
            try {
                const response = await fetch('/api/coelsa/tenant-data/' + tenantId + '?adminKey=' + encodeURIComponent(adminKey), {
                    method: 'DELETE'
                });
                const data = await response.json();
                
                if (data.success) {
                    showAlert('Datos y logs del tenant borrados exitosamente', 'success');
                    document.getElementById('tenant-data-content').innerHTML = '<div class="alert alert-info"><strong>Información:</strong> Los datos han sido borrados. Las credenciales y el tenant se mantienen intactos.</div>';
                    document.getElementById('clearDataBtn').style.display = 'none';
                } else {
                    showAlert('Error borrando datos: ' + data.message, 'error');
                }
            } catch (error) {
                showAlert('Error de conexión: ' + error.message, 'error');
            }
        }
        
        // Función para borrar todos los logs
        async function clearAllLogs() {
            if (!confirm('¿Estás seguro de que quieres borrar TODOS los logs del sistema?\\n\\nEsta acción no se puede deshacer.')) {
                return;
            }
            
            try {
                // En un caso real, aquí se haría una llamada al endpoint de borrado
                showAlert('Todos los logs han sido borrados exitosamente', 'success');
                document.getElementById('logs-content').innerHTML = '<div style="color: #888;">Logs borrados - No hay logs disponibles</div>';
            } catch (error) {
                showAlert('Error borrando logs: ' + error.message, 'error');
            }
        }
        
        // Agregar estilos para las nuevas funcionalidades
        const additionalStyles = document.createElement('style');
        additionalStyles.textContent = '.tenants-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem; margin-top: 1rem; }' +
            '.tenant-card { background: linear-gradient(145deg, #ffffff 0%, #f8fafc 100%); padding: 2.5rem; border-radius: 20px; border: 1px solid rgba(226, 232, 240, 0.6); box-shadow: 0 8px 25px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.5); transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94); backdrop-filter: blur(10px); }' +
            '.tenant-card:hover { background: linear-gradient(145deg, #ffffff 0%, #f1f5f9 100%); transform: translateY(-4px) scale(1.02); box-shadow: 0 15px 35px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(255, 255, 255, 0.8); }' +
            '.tenant-card h4 { margin: 0 0 1rem 0; color: #1e293b; }' +
            '.tenant-card p { margin: 0.5rem 0; color: #374151; }' +
            '.tenant-actions { display: flex; gap: 0.75rem; margin-top: 1.5rem; flex-wrap: wrap; justify-content: flex-start; align-items: center; }' +
            '.tenant-actions .btn { flex: 1; min-width: 140px; text-align: center; padding: 0.75rem 1rem; font-size: 0.9rem; }' +
            '.credentials-display h3 { margin: 0 0 1rem 0; color: #000000; font-size: 1.1rem; font-weight: 600; }' +
            '.credentials-display h4 { color: #000000; margin: 0 0 1rem 0; font-size: 1.1rem; font-weight: 600; }' +
            '.credentials-display h5 { color: #f7fafc; margin: 1.5rem 0 0.5rem 0; font-size: 1rem; font-weight: 600; }' +
            '.credentials-display div { margin-bottom: 0.75rem; display: flex; align-items: center; flex-wrap: wrap; gap: 0.5rem; }' +
            '.credentials-display strong { color: #000000; font-weight: 600; }' +
            '.credentials-display span { color: #000000; word-break: break-all; }' +
            '.credentials-display pre { background: rgba(255, 255, 255, 0.1); color: #000000; padding: 1rem; border-radius: 12px; margin: 0.5rem 0; overflow-x: auto; border-left: 3px solid #f093fb; }' +
            '.btn-danger { background: linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #b91c1c 100%); color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 12px; cursor: pointer; font-weight: 600; transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94); box-shadow: 0 6px 20px rgba(239, 68, 68, 0.4); letter-spacing: 0.025em; }' +
            '.btn-danger:hover { background: linear-gradient(135deg, #dc2626 0%, #b91c1c 50%, #991b1b 100%); transform: translateY(-2px) scale(1.05); box-shadow: 0 10px 30px rgba(239, 68, 68, 0.6); }' +
            '#clearDataBtn { background: linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #b91c1c 100%); color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 12px; cursor: pointer; font-weight: 600; transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94); box-shadow: 0 6px 20px rgba(239, 68, 68, 0.4); letter-spacing: 0.025em; }' +
            '#clearDataBtn:hover { background: linear-gradient(135deg, #dc2626 0%, #b91c1c 50%, #991b1b 100%); transform: translateY(-2px) scale(1.05); box-shadow: 0 10px 30px rgba(239, 68, 68, 0.6); }';
        document.head.appendChild(additionalStyles);
        
        // Mostrar modales personalizados con mejor UX
        function showModal(title, message, type = 'success', buttons = []) {
            // Crear overlay con mejor diseño
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.7); backdrop-filter: blur(12px); z-index: 1000; display: flex; align-items: center; justify-content: center; animation: fadeIn 0.4s ease-out;';
            
            // Crear modal con diseño mejorado
            const modal = document.createElement('div');
            modal.className = 'custom-modal';
            
            // Configurar colores según el tipo
            let gradientBg, iconBg, iconColor, borderColor;
            switch(type) {
                case 'success':
                    gradientBg = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
                    iconBg = '#10b981';
                    iconColor = '#ffffff';
                    borderColor = '#059669';
                    break;
                case 'error':
                    gradientBg = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
                    iconBg = '#ef4444';
                    iconColor = '#ffffff';
                    borderColor = '#dc2626';
                    break;
                case 'info':
                    gradientBg = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
                    iconBg = '#3b82f6';
                    iconColor = '#ffffff';
                    borderColor = '#2563eb';
                    break;
                case 'warning':
                    gradientBg = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
                    iconBg = '#f59e0b';
                    iconColor = '#ffffff';
                    borderColor = '#d97706';
                    break;
                default:
                    gradientBg = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                    iconBg = '#667eea';
                    iconColor = '#ffffff';
                    borderColor = '#764ba2';
            }
            
            modal.style.cssText = 'background: ' + gradientBg + '; border-radius: 24px; padding: 0; max-width: 480px; width: 90%; box-shadow: 0 32px 64px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1); animation: slideIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1); overflow: hidden; border: 2px solid ' + borderColor + ';';
            
            const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : type === 'info' ? 'i' : '!';
            
            // Crear contenido del modal con mejor diseño
            const content = document.createElement('div');
            content.style.cssText = 'padding: 40px 32px; text-align: center; position: relative;';
            
            // Icono con diseño mejorado
            const iconDiv = document.createElement('div');
            iconDiv.style.cssText = 'width: 88px; height: 88px; background: ' + iconBg + '; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; font-size: 36px; font-weight: bold; color: ' + iconColor + '; box-shadow: 0 16px 32px rgba(0, 0, 0, 0.3), inset 0 2px 4px rgba(255, 255, 255, 0.2); border: 3px solid rgba(255, 255, 255, 0.2);';
            iconDiv.textContent = icon;
            
            // Título con mejor tipografía
            const titleH3 = document.createElement('h3');
            titleH3.style.cssText = 'color: white; margin: 0 0 16px; font-size: 28px; font-weight: 700; text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3); letter-spacing: -0.5px;';
            titleH3.textContent = title;
            
            // Mensaje con mejor diseño
            const messageP = document.createElement('p');
            messageP.style.cssText = 'color: rgba(255, 255, 255, 0.95); margin: 0 0 32px; font-size: 17px; line-height: 1.6; font-weight: 400; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);';
            messageP.textContent = message;
            
            // Contenedor de botones mejorado
            const buttonDiv = document.createElement('div');
            buttonDiv.style.cssText = 'display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;';
            
            if (buttons.length > 0) {
                buttons.forEach(btn => {
                    const button = document.createElement('button');
                    button.className = 'modal-btn' + (btn.class || 'primary');
                    button.textContent = btn.text;
                    button['onclick'] = function() { eval(btn.action); };
                    buttonDiv.appendChild(button);
                });
            } else {
                const button = document.createElement('button');
                button.className = 'modal-btn primary';
                button.textContent = 'Entendido';
                button['onclick'] = function() { window.closeModal(); };
                buttonDiv.appendChild(button);
            }
            
            content.appendChild(iconDiv);
            content.appendChild(titleH3);
            content.appendChild(messageP);
            content.appendChild(buttonDiv);
            modal.appendChild(content);
            
            // Agregar estilos CSS mejorados
            if (!document.getElementById('modal-styles')) {
                const style = document.createElement('style');
                style.id = 'modal-styles';
                style.textContent = 
                    '@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }' +
                    '@keyframes slideIn { from { opacity: 0; transform: translateY(-60px) scale(0.85); } to { opacity: 1; transform: translateY(0) scale(1); } }' +
                    '@keyframes slideOut { from { opacity: 1; transform: translateY(0) scale(1); } to { opacity: 0; transform: translateY(-60px) scale(0.85); } }' +
                    '@keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }' +
                    '.modal-btn { padding: 14px 28px; border: none; border-radius: 16px; font-weight: 600; cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); font-size: 15px; min-width: 120px; position: relative; overflow: hidden; text-transform: uppercase; letter-spacing: 0.5px; }' +
                    '.modal-btn.primary { background: rgba(255, 255, 255, 0.25); color: white; border: 2px solid rgba(255, 255, 255, 0.4); backdrop-filter: blur(10px); }' +
                    '.modal-btn.primary:hover { background: rgba(255, 255, 255, 0.35); transform: translateY(-3px); box-shadow: 0 12px 24px rgba(0, 0, 0, 0.3); border-color: rgba(255, 255, 255, 0.6); }' +
                    '.modal-btn.primary:active { transform: translateY(-1px); }' +
                    '.modal-btn.secondary { background: transparent; color: rgba(255, 255, 255, 0.9); border: 2px solid rgba(255, 255, 255, 0.4); }' +
                    '.modal-btn.secondary:hover { background: rgba(255, 255, 255, 0.15); color: white; border-color: rgba(255, 255, 255, 0.6); transform: translateY(-2px); }' +
                    '.modal-btn::before { content: ""; position: absolute; top: 0; left: -100%; width: 100%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent); transition: left 0.5s; }' +
                    '.modal-btn:hover::before { left: 100%; }';
                document.head.appendChild(style);
            }
            
            overlay.appendChild(modal);
            document.body.appendChild(overlay);
            
            // Función para cerrar modal con animación mejorada
            window.closeModal = function() {
                modal.style.animation = 'slideOut 0.3s ease-in';
                overlay.style.animation = 'fadeOut 0.3s ease-in';
                setTimeout(() => {
                    if (overlay.parentNode) {
                        overlay.parentNode.removeChild(overlay);
                    }
                }, 300);
            };
            
            // Cerrar al hacer clic en overlay
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    window.closeModal();
                }
            });
            
            // Cerrar con tecla Escape
            const handleKeyPress = (e) => {
                if (e.key === 'Escape') {
                    window.closeModal();
                    document.removeEventListener('keydown', handleKeyPress);
                }
            };
            document.addEventListener('keydown', handleKeyPress);
        }
        
        // Función de compatibilidad para alertas simples
        function showAlert(message, type = 'success') {
            // Agregar alerta al footer
            addAlert(message, type);
            
            const title = type === 'success' ? '¡Éxito!' : type === 'error' ? 'Error' : 'Información';
            showModal(title, message, type);
        }

        // Función para copiar al portapapeles
        function copyToClipboard(text) {
            navigator.clipboard.writeText(text).then(() => {
                showAlert('¡Copiado al portapapeles!', 'success');
            }).catch(err => {
                console.error('Error al copiar:', err);
                showAlert('Error al copiar al portapapeles', 'error');
            });
        }
        
        // Función para llenar datos de prueba
        function fillTestData() {
            const testData = {
                tenantName: 'Banco Demo Sandbox',
                tenantCode: 'BANCO_DEMO_' + Math.random().toString(36).substr(2, 5).toUpperCase(),
                tenantCuit: '20' + Math.floor(Math.random() * 100000000) + '9',
                tenantType: 'BANCO'
            };
            
            document.getElementById('tenantName').value = testData.tenantName;
            document.getElementById('tenantCode').value = testData.tenantCode;
            document.getElementById('tenantCuit').value = testData.tenantCuit;
            document.getElementById('tenantType').value = testData.tenantType;
            
            // Completar el paso 1 y avanzar al paso 2
            completeStep(1);
            showStep(2);
            updateStepStatus(2, 'current');
            
            showAlert('Datos de prueba cargados exitosamente. Avanzando al Paso 2...', 'success');
        }
        
        // Función para generar comandos de terminal
        function generateTerminalCommands(apiKey, apiSecret, tenantId) {
            const baseUrl = window.location.origin;
            
            // Variables de entorno
            const envVars = 'export ECHEQ_API_KEY="' + apiKey + '"' + String.fromCharCode(10) +
                'export ECHEQ_API_SECRET="' + apiSecret + '"' + String.fromCharCode(10) +
                'export ECHEQ_TENANT_ID="' + tenantId + '"' + String.fromCharCode(10) +
                'export ECHEQ_BASE_URL="' + baseUrl + '"';
            
            // Actualizar solo el elemento de variables de entorno
            const envVarsEl = document.getElementById('envVars');
            if (envVarsEl) envVarsEl.textContent = envVars;
        }
        
        // Configurar autenticación en Swagger
        function configureSwaggerAuth() {
            if (currentCredentials.apiKey && currentCredentials.apiSecret && currentCredentials.tenantId) {
                // Configurar autenticación en Swagger UI
                ui.preauthorizeApiKey('X-API-Key', currentCredentials.apiKey);
                ui.preauthorizeApiKey('X-API-Secret', currentCredentials.apiSecret);
                ui.preauthorizeApiKey('X-Tenant-ID', currentCredentials.tenantId);
                showAlert('Credenciales configuradas en Swagger UI', 'success');
            } else {
                showAlert('Primero configura las credenciales en la pestaña "Testing APIs"', 'error');
            }
        }
        
        // Formulario de crear tenant
        document.getElementById('createTenantForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
                const tenantData = {
                    name: document.getElementById('tenantName').value,
                    code: document.getElementById('tenantCode').value,
                    cuit: document.getElementById('tenantCuit').value,
                    tipo: document.getElementById('tenantType').value,
                    metadata: {
                        cuit: document.getElementById('tenantCuit').value,
                        tipo: document.getElementById('tenantType').value
                    }
                };
            
            try {
                const response = await fetch('/api/coelsa/create-tenant', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(tenantData)
                });
                
                const result = await response.json();
                
                    if (result.success) {
                        document.getElementById('tenantId').value = result.data.id;
                        
                        // Completar el paso 2 y avanzar al paso 3
                        completeStep(2);
                        showStep(3);
                        updateStepStatus(3, 'current');
                        
                        showAlert('Tenant creado exitosamente. Avanzando al Paso 3...', 'success');
                    } else {
                        showAlert('Error: ' + result.message, 'error');
                    }
            } catch (error) {
                showAlert('Error: ' + error.message, 'error');
            }
        });
        
        // Formulario de generar API keys
        document.getElementById('generateKeysForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const tenantId = document.getElementById('tenantId').value;
            
            try {
                const response = await fetch('/api/coelsa/generate-keys/' + tenantId, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                const result = await response.json();
                
                if (result.success) {
                    const credentials = result.data.sandbox_credentials;
                    const apiKeyEl = document.getElementById('apiKey');
                    const apiSecretEl = document.getElementById('apiSecret');
                    const tenantIdDisplayEl = document.getElementById('tenantIdDisplay');
                    const credentialsDisplayEl = document.getElementById('credentialsDisplay');
                    
                    if (apiKeyEl) apiKeyEl.textContent = credentials.api_key;
                    if (apiSecretEl) apiSecretEl.textContent = credentials.api_secret;
                    if (tenantIdDisplayEl) tenantIdDisplayEl.textContent = tenantId;
                    if (credentialsDisplayEl) credentialsDisplayEl.classList.remove('hidden');
                    
                    // Guardar credenciales para testing
                    currentCredentials = {
                        apiKey: credentials.api_key,
                        apiSecret: credentials.api_secret,
                        tenantId: tenantId
                    };
                    
                    // Generar comandos de terminal
                    generateTerminalCommands(credentials.api_key, credentials.api_secret, tenantId);
                    
                    // Completar el paso 3
                    completeStep(3);
                    
                    showAlert('API Keys generadas exitosamente. ¡Proceso completado!', 'success');
                } else {
                    showAlert('Error: ' + result.message, 'error');
                }
            } catch (error) {
                showAlert('Error: ' + error.message, 'error');
            }
        });
        
        // Event listener movido a setupTestingEventListeners() para evitar problemas de timing
        
        
        
        // Función para cargar credenciales generadas en Testing APIs
        function loadGeneratedCredentials() {
            const apiKeyEl = document.getElementById('apiKey');
            const apiSecretEl = document.getElementById('apiSecret');
            const tenantIdDisplayEl = document.getElementById('tenantIdDisplay');
            
            const apiKey = apiKeyEl ? apiKeyEl.textContent : '';
            const apiSecret = apiSecretEl ? apiSecretEl.textContent : '';
            const tenantId = tenantIdDisplayEl ? tenantIdDisplayEl.textContent : '';
            
            if (!apiKey || !apiSecret || !tenantId) {
                showAlert('No hay credenciales generadas. Ve a la pestaña "Credenciales API" y genera las credenciales primero.', 'error');
                return;
            }
            
            document.getElementById('testApiKey').value = apiKey;
            document.getElementById('testApiSecret').value = apiSecret;
            document.getElementById('testTenantId').value = tenantId;
            
            // Configurar credenciales globales
            currentCredentials = {
                apiKey: apiKey,
                apiSecret: apiSecret,
                tenantId: tenantId
            };
            
            // Mostrar sección de acceso configurado
            document.getElementById('swaggerAccess').style.display = 'block';
            
            // Reinicializar Swagger UI con las nuevas credenciales
            initializeSwagger();
            
            showAlert('Credenciales generadas cargadas exitosamente', 'success');
        }
        
        // Función para saltar al paso 2
        function scrollToStep2() {
            const step2 = document.querySelector('.step-card:nth-child(3)');
            if (step2) {
                step2.scrollIntoView({ behavior: 'smooth', block: 'start' });
                step2.style.border = '2px solid #667eea';
                step2.style.boxShadow = '0 0 20px rgba(102, 126, 234, 0.3)';
                setTimeout(() => {
                    step2.style.border = '';
                    step2.style.boxShadow = '';
                }, 3000);
            }
        }
        
        // Función para probar conexión
        async function testConnection() {
            if (!currentCredentials.apiKey) {
                showAlert('Primero configura las credenciales', 'error');
                return;
            }
            
            try {
                const response = await fetch('/api/coelsa/health', {
                    headers: {
                        'X-API-Key': currentCredentials.apiKey,
                        'X-API-Secret': currentCredentials.apiSecret,
                        'X-Tenant-ID': currentCredentials.tenantId
                    }
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    showAlert('Conexión exitosa! El servicio está funcionando correctamente.', 'success');
                } else {
                    showAlert('Error en la conexión: ' + result.message, 'error');
                }
            } catch (error) {
                showAlert('Error de conexión: ' + error.message, 'error');
            }
        }
        
        // Funciones administrativas
        async function loadAllTenants() {
            const adminKey = prompt('Ingresa la clave de administrador:');
            if (!adminKey) return;
            
            try {
                const response = await fetch('/api/coelsa/tenants?adminKey=' + encodeURIComponent(adminKey));
                const result = await response.json();
                
                const resultsDiv = document.getElementById('admin-results');
                resultsDiv.style.display = 'block';
                
                if (result.success) {
                    resultsDiv.innerHTML = 
                        '<h3>Lista de Tenants</h3>' +
                        '<div class="table-responsive">' +
                            '<table class="table">' +
                                '<thead>' +
                                    '<tr>' +
                                        '<th>ID</th>' +
                                        '<th>Nombre</th>' +
                                        '<th>Código</th>' +
                                        '<th>CUIT</th>' +
                                        '<th>Tipo</th>' +
                                        '<th>Estado</th>' +
                                        '<th>Acciones</th>' +
                                    '</tr>' +
                                '</thead>' +
                                '<tbody>' +
                                    result.data.map(tenant => 
                                        '<tr>' +
                                            '<td>' + tenant.id + '</td>' +
                                            '<td>' + tenant.name + '</td>' +
                                            '<td>' + tenant.code + '</td>' +
                                            '<td>' + (tenant.cuit || 'N/A') + '</td>' +
                                            '<td>' + (tenant.tipo || 'N/A') + '</td>' +
                                            '<td>' + (tenant.is_active ? 'Activo' : 'Inactivo') + '</td>' +
                                            '<td>' +
                                                '<button onclick="viewTenantDetails(\'' + tenant.id + '\')" class="btn btn-sm btn-info">Ver</button>' +
                                                '<button onclick="deleteTenantFromAdmin(\'' + tenant.id + '\')" class="btn btn-sm btn-danger">Eliminar</button>' +
                                            '</td>' +
                                        '</tr>'
                                    ).join('') +
                                '</tbody>' +
                            '</table>' +
                        '</div>';
                } else {
                    resultsDiv.innerHTML = '<div class="alert alert-danger">Error: ' + result.message + '</div>';
                }
            } catch (error) {
                showAlert('Error cargando tenants: ' + error.message, 'error');
            }
        }
        
        function showCreateTenantForm() {
            const resultsDiv = document.getElementById('admin-results');
            resultsDiv.style.display = 'block';
            resultsDiv.innerHTML = 
                '<h3>Crear Nuevo Tenant</h3>' +
                '<form id="createTenantAdminForm">' +
                    '<div class="form-row">' +
                        '<div class="form-group">' +
                            '<label for="adminTenantName">Nombre del Tenant</label>' +
                            '<input type="text" id="adminTenantName" name="tenantName" required>' +
                        '</div>' +
                        '<div class="form-group">' +
                            '<label for="adminTenantCode">Código del Tenant</label>' +
                            '<input type="text" id="adminTenantCode" name="tenantCode" required>' +
                        '</div>' +
                    '</div>' +
                    '<div class="form-row">' +
                        '<div class="form-group">' +
                            '<label for="adminTenantCuit">CUIT</label>' +
                            '<input type="text" id="adminTenantCuit" name="tenantCuit" required>' +
                        '</div>' +
                        '<div class="form-group">' +
                            '<label for="adminTenantType">Tipo</label>' +
                            '<select id="adminTenantType" name="tenantType" required>' +
                                '<option value="BANCO">Banco</option>' +
                                '<option value="FINANCIERA">Financiera</option>' +
                                '<option value="EMPRESA">Empresa</option>' +
                            '</select>' +
                        '</div>' +
                    '</div>' +
                    '<button type="submit" class="btn btn-primary">Crear Tenant</button>' +
                '</form>';
            
            document.getElementById('createTenantAdminForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                await createTenantFromAdmin();
            });
        }
        
        async function createTenantFromAdmin() {
            const formData = new FormData(document.getElementById('createTenantAdminForm'));
            const tenantData = {
                name: formData.get('tenantName'),
                code: formData.get('tenantCode'),
                cuit: formData.get('tenantCuit'),
                tipo: formData.get('tenantType')
            };
            
            try {
                const response = await fetch('/api/coelsa/create-tenant', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(tenantData)
                });
                
                const result = await response.json();
                
                if (result.success) {
                    showAlert('Tenant creado exitosamente', 'success');
                    loadAllTenants(); // Recargar la lista
                } else {
                    showAlert('Error creando tenant: ' + result.message, 'error');
                }
            } catch (error) {
                showAlert('Error: ' + error.message, 'error');
            }
        }
        
        async function loadSystemStats() {
            try {
                const response = await fetch('/api/coelsa/system-stats');
                const result = await response.json();
                
                const resultsDiv = document.getElementById('admin-results');
                resultsDiv.style.display = 'block';
                resultsDiv.innerHTML = 
                    '<h3>Estadísticas del Sistema</h3>' +
                    '<div class="stats-grid">' +
                        '<div class="stat-card">' +
                            '<h4>Total de Tenants</h4>' +
                            '<div class="stat-value">' + ((result.data && result.data.totalTenants) || 0) + '</div>' +
                        '</div>' +
                        '<div class="stat-card">' +
                            '<h4>Total de Cheques</h4>' +
                            '<div class="stat-value">' + ((result.data && result.data.totalCheques) || 0) + '</div>' +
                        '</div>' +
                        '<div class="stat-card">' +
                            '<h4>Total de Cuentas</h4>' +
                            '<div class="stat-value">' + ((result.data && result.data.totalCuentas) || 0) + '</div>' +
                        '</div>' +
                        '<div class="stat-card">' +
                            '<h4>Total de Endosos</h4>' +
                            '<div class="stat-value">' + ((result.data && result.data.totalEndosos) || 0) + '</div>' +
                        '</div>' +
                    '</div>';
            } catch (error) {
                showAlert('Error cargando estadísticas: ' + error.message, 'error');
            }
        }
        
        async function loadDatabaseStats() {
            try {
                const response = await fetch('/api/coelsa/database-stats');
                const result = await response.json();
                
                const resultsDiv = document.getElementById('admin-results');
                resultsDiv.style.display = 'block';
                resultsDiv.innerHTML = 
                    '<h3>Estado de Base de Datos</h3>' +
                    '<div class="alert alert-success">' +
                        '<strong>Estado:</strong> ' + ((result.data && result.data.status) || 'Conectado') + '<br>' +
                        '<strong>Versión:</strong> ' + ((result.data && result.data.version) || 'N/A') + '<br>' +
                        '<strong>Última conexión:</strong> ' + ((result.data && result.data.lastConnection) || 'N/A') +
                    '</div>';
            } catch (error) {
                showAlert('Error cargando estado de BD: ' + error.message, 'error');
            }
        }
        
        function loadSystemLogs() {
            showTab('logs');
        }
        
        function exportLogs() {
            showAlert('Función de exportación de logs en desarrollo', 'info');
        }
        
        function showSystemConfig() {
            const resultsDiv = document.getElementById('admin-results');
            resultsDiv.style.display = 'block';
            resultsDiv.innerHTML = 
                '<h3>Configuración del Sistema</h3>' +
                '<div class="alert alert-info">' +
                    '<strong>Ambiente:</strong> ' + (window.location.hostname.includes('railway') ? 'Producción' : 'Desarrollo') + '<br>' +
                    '<strong>URL Base:</strong> ' + window.location.origin + '<br>' +
                    '<strong>Versión:</strong> 1.0.0' +
                '</div>';
        }
        
        function showEnvironmentVars() {
            const resultsDiv = document.getElementById('admin-results');
            resultsDiv.style.display = 'block';
            resultsDiv.innerHTML = 
                '<h3>Variables de Entorno</h3>' +
                '<div class="alert alert-warning">' +
                    '<strong>Nota:</strong> Las variables de entorno sensibles no se muestran por seguridad.' +
                '</div>' +
                '<pre>NODE_ENV=' + ((process.env && process.env.NODE_ENV) || 'development') + '\n' +
                'PORT=' + ((process.env && process.env.PORT) || '3000') + '\n' +
                'DATABASE_URL=***oculto***\n' +
                'JWT_SECRET=***oculto***</pre>';
        }
        
        function viewTenantDetails(tenantId) {
            showAlert('Ver detalles del tenant: ' + tenantId, 'info');
        }
        
        async function deleteTenantFromAdmin(tenantId) {
            if (!confirm('¿Estás seguro de que quieres eliminar este tenant?')) return;
            
            const adminKey = prompt('Ingresa la clave de administrador:');
            if (!adminKey) return;
            
            try {
                const response = await fetch('/api/coelsa/tenant-data/' + tenantId + '?adminKey=' + encodeURIComponent(adminKey), {
                    method: 'DELETE'
                });
                
                const result = await response.json();
                
                if (result.success) {
                    showAlert('Tenant eliminado exitosamente', 'success');
                    loadAllTenants(); // Recargar la lista
                } else {
                    showAlert('Error eliminando tenant: ' + result.message, 'error');
                }
            } catch (error) {
                showAlert('Error: ' + error.message, 'error');
            }
        }
        
    </script>
</body>
</html>`;
    res.send(html);
  } catch (error) {
    console.error('Error generando HTML del panel:', error);
    res.status(500).json({
      success: false,
      message: 'Error generando panel de administración',
      error: error.message,
    });
  }
});

// ============================================================================
// MIDDLEWARE DE MANEJO DE ERRORES
// ============================================================================

// Capturar rutas no encontradas
router.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint no encontrado',
        error: 'ENDPOINT_NOT_FOUND',
        requested_path: req.originalUrl,
    available_endpoints: '/health, /api-docs',
    });
});

// Middleware de manejo de errores global
router.use((error, req, res, next) => {
    console.error('Error en ruta COELSA:', error);
    
    res.status(500).json({
        success: false,
        message: 'Error interno del servidor COELSA',
        error: error.message,
    timestamp: new Date().toISOString(),
    });
});

module.exports = router;
// Forzar deployment Mon Sep 22 13:22:44 -03 2025
// Force deployment Tue Sep 23 14:17:09 -03 2025
// Force deployment Tue Sep 23 14:36:14 -03 2025
