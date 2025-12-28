/**
 * ⚠️ CÓDIGO LEGACY - NO EN USO ⚠️
 * 
 * Este código está DEPRECADO. La plataforma usa echeq-sandbox-nestjs.
 * Ver DEPRECATED.md y LEGACY_README.md en la raíz del repositorio.
 * 
 * ⚠️ NO MODIFICAR - Este código no se ejecuta en producción
 */

// Cargar variables de entorno PRIMERO
require('dotenv').config();

// Inicializar Azure Application Insights (debe ser lo primero después de dotenv)
let aiClient = null;
try {
  const appInsights = require('applicationinsights');
  const connectionString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
  
  if (connectionString) {
    appInsights.setup(connectionString)
      .setAutoDependencyCorrelation(true)
      .setAutoCollectRequests(true)
      .setAutoCollectPerformance(true, true)
      .setAutoCollectExceptions(true)
      .setAutoCollectDependencies(true)
      .setAutoCollectConsole(true, true)
      .setUseDiskRetryCaching(true)
      .setDistributedTracingMode(appInsights.DistributedTracingModes.AI_AND_W3C)
      .start();
    
    aiClient = appInsights.defaultClient;
    aiClient.context.tags[aiClient.context.keys.cloudRole] = 'echeq-sandbox';
    aiClient.context.tags[aiClient.context.keys.cloudRoleInstance] = 
      process.env.WEBSITE_INSTANCE_ID || process.env.HOSTNAME || 'local';
    
    console.log('✅ Azure Application Insights inicializado');
  } else {
    console.log('⚠️  APPLICATIONINSIGHTS_CONNECTION_STRING no configurada, Application Insights deshabilitado');
  }
} catch (error) {
  console.warn('⚠️  Error inicializando Azure Application Insights (continuando):', error.message);
  aiClient = null;
}

const express = require('express');
const cors = require('cors');
const path = require('path');
const logger = require('./services/logger');

// Importar configuración de base de datos (simplificada)
let sequelize = null;
try {
  const { sequelize: dbSequelize } = require('./config/database');
  sequelize = dbSequelize;
} catch (error) {
  console.log('⚠️ Base de datos no disponible:', error.message);
}

const app = express();
const PORT = process.env.PORT || 8080;

// Función para generar URL del servidor dinámicamente
function getServerUrl() {
  // Usar variables de entorno primero (Azure, Railway, etc.)
  if (process.env.SANDBOX_URL) {
    return process.env.SANDBOX_URL;
  }
  
  if (process.env.FRONTEND_URL) {
    return process.env.FRONTEND_URL;
  }
  
  // Si estamos en Railway (producción) - mantener compatibilidad temporal
  if (process.env.RAILWAY_ENVIRONMENT) {
    return `https://${process.env.RAILWAY_PUBLIC_DOMAIN || 'localhost:8080'}`;
  }
  
  // Si estamos en desarrollo local, usar localhost
  return `http://localhost:${PORT}`;
}

// Configurar EJS como motor de templates (DEPRECATED - usar Next.js frontend)
// app.set('view engine', 'ejs');
// app.set('views', path.join(__dirname, 'views'));

// Ruta raíz removida - se maneja más abajo con página HTML completa
// Forzar redeploy en Railway

// Middleware básico
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  })
);

// Middleware de logging para capturar todas las requests
app.use(logger.middleware);

// Servir archivos estáticos
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Endpoint dinámico para Swagger JSON
app.get('/api/coelsa/swagger.json', (req, res) => {
  try {
    const swaggerPath = path.join(__dirname, 'swagger.json');
    const swaggerContent = require(swaggerPath);
    
    // Actualizar la URL del servidor dinámicamente
    const serverUrl = getServerUrl();
    const swaggerUrl = `${serverUrl}/api/coelsa`;
    
    swaggerContent.servers = [
      {
        url: swaggerUrl,
        description: process.env.RAILWAY_ENVIRONMENT ? 'Servidor de producción (Railway)' : 'Servidor de desarrollo local'
      }
    ];
    
    res.json(swaggerContent);
  } catch (error) {
    console.error('Error cargando Swagger:', error);
    res.status(500).json({ error: 'Error cargando documentación Swagger' });
  }
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use((req, res, next) => {
  console.log(
    `[${new Date().toISOString()}] ${req.method} ${req.path} - ${req.ip}`
  );
  next();
});

// Health check ultra-rápido para Railway (sin logging)
app.get('/health/quick', (req, res) => {
  res.status(200).send('OK');
});

// Health check completo para Railway (con verificación de BD opcional)
app.get('/health', async (req, res) => {
  try {
    if (sequelize) {
      await sequelize.authenticate();
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'echeq-sandbox',
        database: 'connected',
        environment: process.env.NODE_ENV || 'sandbox',
      });
    } else {
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'echeq-sandbox',
        database: 'not_configured',
        environment: process.env.NODE_ENV || 'sandbox',
      });
    }
  } catch (error) {
    console.error('Health check failed:', error.message);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'echeq-sandbox',
      database: 'error',
      error: error.message,
    });
  }
});

// NOTA: Mover el frontend estático DESPUÉS de montar APIs para que /api/* no sea interceptado por Next

// ============================================================================
// ENDPOINT DE SIMULACIÓN DIRECTO (SIN AUTENTICACIÓN PARA TESTING)
// ============================================================================

// Endpoint de simulación directo para testing
app.post('/api/coelsa/simulate', async (req, res) => {
  try {
    const { operation, data } = req.body;


    if (operation === 'emision') {

      // VALIDACIÓN: Verificar que emisor y beneficiario no sean la misma empresa
      const issuerCuit = data.emisor_cuit || data.issuer_cuit;
      const beneficiaryCuit = data.beneficiario_cuit || data.beneficiary_cuit;

      if (issuerCuit && beneficiaryCuit && issuerCuit === beneficiaryCuit) {
        console.log(
          `❌ [SANDBOX] Error: No se puede emitir eCheq a la misma empresa`
        );
        return res.status(400).json({
          success: false,
          error: 'No se puede emitir un eCheq a la misma empresa',
          message:
            'El emisor y beneficiario no pueden ser la misma empresa (mismo CUIT)',
          details: {
            issuer_cuit: issuerCuit,
            beneficiary_cuit: beneficiaryCuit,
            validation_error: 'SAME_ISSUER_BENEFICIARY',
          },
        });
      }

      // Importar modelos
      const { Echeq } = require('./models');
      const EcheqEvent = require('./models/echeqEvent');

      if (Echeq) {
        console.log(
          `🔍 [DEBUG] Modelo Echeq disponible, procediendo a crear...`
        );

        const echeqNumber = `ECHEQ-${Date.now()}-${Math.random().toString(36).substring(2, 4).toUpperCase()}`;
        const echeqId = `ECHEQ-${Date.now()}`;

        const echeqData = {
          number: echeqNumber,
          amount: data.monto || data.amount || 0,
          currency: data.moneda || 'ARS',
          issue_date:
            data.fecha_emision || new Date().toISOString().split('T')[0],
          due_date:
            data.fecha_vencimiento ||
            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split('T')[0],
          issuer: data.emisor || 'Emisor Desconocido',
          beneficiary: data.beneficiario || 'Beneficiario Desconocido',
          issuerCuit: data.emisor_cuit
            ? data.emisor_cuit.replace(/-/g, '')
            : null,
          beneficiaryCuit: data.beneficiario_cuit
            ? data.beneficiario_cuit.replace(/-/g, '')
            : null,
          status: 'EMITTED',
          validationStatus: 'VALIDATED',
          validatedAt: new Date(), // Fecha real de validación
          tenantId: null, // Sin tenant por ahora
          coelsaReference: echeqId,
          validationDetails: {
            emision_timestamp: new Date().toISOString(),
            sandbox_operation: 'emision',
            validated: true,
            api_key: req.headers['x-api-key'] || 'unknown',
          },
        };


        const savedEcheq = await Echeq.create(echeqData);
        console.log(
          `✅ [SANDBOX] eCheq persistido en BD: ${savedEcheq.number}`
        );

        // Registrar evento de emisión (manejar error si la tabla no existe)
        try {
          await EcheqEvent.create({
            echeq_number: savedEcheq.number,
            event_type: 'EMISSION',
            event_status: 'SUCCESS',
            event_description: `eCheq emitido por ${savedEcheq.issuer} a favor de ${savedEcheq.beneficiary}`,
            event_data: {
              issuer_cuit: savedEcheq.issuerCuit,
              beneficiary_cuit: savedEcheq.beneficiaryCuit,
              amount: savedEcheq.amount,
              currency: savedEcheq.currency,
              due_date: savedEcheq.dueDate,
            },
            user_cuit: savedEcheq.issuerCuit,
            timestamp: new Date(),
          });
          console.log(
            `✅ [SANDBOX] Evento de emisión registrado para: ${savedEcheq.number}`
          );
        } catch (eventError) {
          console.warn(
            `⚠️ [SANDBOX] No se pudo registrar evento de emisión (tabla echeq_events no existe):`,
            eventError.message
          );
        }

        // Registrar evento de validación (manejar error si la tabla no existe)
        try {
          await EcheqEvent.create({
            echeq_number: savedEcheq.number,
            event_type: 'VALIDATION',
            event_status: 'SUCCESS',
            event_description: 'eCheq validado por el sistema COELSA',
            event_data: {
              validation_status: 'VALIDATED',
              validated_at: new Date().toISOString(),
            },
            user_cuit: savedEcheq.issuerCuit,
            timestamp: new Date(),
          });
          console.log(
            `✅ [SANDBOX] Evento de validación registrado para: ${savedEcheq.number}`
          );
        } catch (eventError) {
          console.warn(
            `⚠️ [SANDBOX] No se pudo registrar evento de validación (tabla echeq_events no existe):`,
            eventError.message
          );
        }

        console.log(
          `✅ [SANDBOX] eCheq procesado exitosamente: ${savedEcheq.number}`
        );

        res.json({
          success: true,
          echeq_number: echeqNumber,
          sandbox_reference: echeqId,
          status: 'EMITIDO',
          message: 'ECHEQ emitido exitosamente en sandbox',
          details: {
            emisor: data.emisor || 'Emisor Test',
            beneficiario: data.beneficiario || 'Beneficiario Test',
            monto: data.monto || 0,
            moneda: data.moneda || 'ARS',
          },
        });
      } else {
        // Fallback si no hay modelo disponible
        const echeqNumber = `ECHEQ-${Date.now()}-${Math.random().toString(36).substring(2, 4).toUpperCase()}`;

        res.json({
          success: true,
          echeq_number: echeqNumber,
          sandbox_reference: `ECHEQ-${Date.now()}`,
          status: 'EMITIDO',
          message: 'ECHEQ emitido exitosamente en sandbox (sin persistencia)',
          warning: 'Modelo Echeq no disponible',
          details: {
            emisor: data.emisor || 'Emisor Test',
            beneficiario: data.beneficiario || 'Beneficiario Test',
            monto: data.monto || 0,
            moneda: data.moneda || 'ARS',
            fecha_emision: data.fecha_emision,
            fecha_vencimiento: data.fecha_vencimiento,
            emisor_cuit: data.emisor_cuit,
            beneficiario_cuit: data.beneficiario_cuit,
          },
        });
      }
    } else if (operation === 'validacion_echeq') {

      // Importar modelo Echeq
      const { Echeq } = require('./models');

      if (Echeq) {

        const echeqNumber = data.number;

        const echeq = await Echeq.findOne({
          where: { number: echeqNumber },
        });

        if (echeq) {

          res.json({
            success: true,
            valid: true,
            message: 'ECHEQ validado exitosamente',
            details: {
              numero_echeq: echeq.number,
              estado: echeq.status,
              emisor: echeq.issuer,
              beneficiario: echeq.beneficiary,
              issuercuit: echeq.issuerCuit,
              beneficiarycuit: echeq.beneficiaryCuit,
              monto: echeq.amount,
              moneda: echeq.currency,
              fecha_emision: echeq.issue_date,
              fecha_vencimiento: echeq.due_date,
              validation_status: echeq.validationStatus,
              fecha_validacion: echeq.validatedAt
                ? echeq.validatedAt.toISOString()
                : new Date().toISOString(),
              sandbox_id: echeq.id,
              validaciones: {
                formato: true,
                emisor: true,
                beneficiario: true,
                monto: true,
                vencimiento: true,
                firmas: true,
                persistido_en_sandbox: true,
              },
            },
          });
        } else {

          res.json({
            success: false,
            valid: false,
            message: 'ECHEQ no encontrado en sandbox',
            details: {
              numero_echeq: echeqNumber,
              estado: 'NO_ENCONTRADO',
              validaciones: {
                formato: false,
                emisor: false,
                beneficiario: false,
                monto: false,
                vencimiento: false,
                firmas: false,
                persistido_en_sandbox: false,
              },
            },
          });
        }
      } else {
        res.json({
          success: false,
          valid: false,
          message: 'Modelo Echeq no disponible',
          error: 'MODEL_NOT_AVAILABLE',
        });
      }
    } else if (operation === 'listar_echeqs_por_emisor') {
      // Buscar eCheqs reales por emisor (CUIT) en la base de datos
      const emisorCuit = data.emisor_cuit;
      console.log(
        `🔍 [SANDBOX] Buscando eCheqs para emisor CUIT: ${emisorCuit}`
      );

      // Consultar eCheqs reales de la base de datos
      const { Echeq } = require('./models');
      if (Echeq) {
        try {
          // Normalizar el CUIT (remover guiones si los tiene)
          const cuitNormalizado = emisorCuit.replace(/-/g, '');
          console.log(
            `🔍 [SANDBOX] Consultando BD con CUIT normalizado: ${cuitNormalizado}`
          );

          // Buscar eCheqs donde el emisor sea el CUIT especificado
          const echeqsEncontrados = await Echeq.findAll({
            where: {
              issuercuit: cuitNormalizado,
            },
            order: [['created_at', 'DESC']],
          });

          console.log(
            `✅ [SANDBOX] Encontrados ${echeqsEncontrados.length} eCheqs para emisor: ${cuitNormalizado}`
          );

          // Mapear los eCheqs encontrados al formato esperado
          const echeqsReales = echeqsEncontrados.map(echeq => ({
            numero_echeq: echeq.number,
            monto: parseFloat(echeq.amount),
            moneda: echeq.currency,
            fecha_emision: echeq.issue_date,
            fecha_vencimiento: echeq.due_date,
            emisor: echeq.issuer,
            beneficiario: echeq.beneficiary,
            issuercuit: echeq.issuerCuit,
            beneficiarycuit: echeq.beneficiaryCuit,
            estado: echeq.status,
            validation_status: echeq.validationStatus,
            validated_at: echeq.validatedAt
              ? echeq.validatedAt.toISOString()
              : new Date().toISOString(),
            sandbox_id: echeq.id,
            custody_status: 'NO_CUSTODY',
            custody_bank: null,
          }));

          res.json({
            success: true,
            echeqs: echeqsReales,
            total: echeqsReales.length,
            emisor_cuit: emisorCuit,
          });
        } catch (error) {
          console.error('❌ [SANDBOX] Error consultando eCheqs:', error);
          res.json({
            success: false,
            message: 'Error consultando eCheqs',
            error: error.message,
          });
        }
      } else {
        res.json({
          success: false,
          message: 'Modelo Echeq no disponible',
          error: 'MODEL_NOT_AVAILABLE',
        });
      }
    } else if (operation === 'listar_echeqs_por_beneficiario') {
      // Buscar eCheqs reales por beneficiario (CUIT) en la base de datos
      const beneficiarioCuit = data.beneficiario_cuit;
      console.log(
        `🔍 [SANDBOX] Buscando eCheqs para beneficiario CUIT: ${beneficiarioCuit}`
      );

      const { Echeq } = require('./models');
      if (Echeq) {
        try {
          // Normalizar el CUIT (remover guiones si los tiene)
          const cuitNormalizado = beneficiarioCuit.replace(/-/g, '');
          console.log(
            `🔍 [SANDBOX] Consultando BD con CUIT normalizado: ${cuitNormalizado}`
          );

          // Buscar eCheqs donde el beneficiario sea el CUIT especificado
          const echeqsEncontrados = await Echeq.findAll({
            where: {
              beneficiarycuit: cuitNormalizado,
            },
            order: [['created_at', 'DESC']],
          });

          console.log(
            `✅ [SANDBOX] Encontrados ${echeqsEncontrados.length} eCheqs para beneficiario: ${cuitNormalizado}`
          );

          // Mapear los eCheqs encontrados al formato esperado
          const echeqsReales = echeqsEncontrados.map(echeq => ({
            numero_echeq: echeq.number,
            monto: parseFloat(echeq.amount),
            moneda: echeq.currency,
            fecha_emision: echeq.issue_date,
            fecha_vencimiento: echeq.due_date,
            emisor: echeq.issuer,
            beneficiario: echeq.beneficiary,
            issuercuit: echeq.issuerCuit,
            beneficiarycuit: echeq.beneficiaryCuit,
            estado: echeq.status,
            validation_status: echeq.validationStatus,
            validated_at: echeq.validatedAt
              ? echeq.validatedAt.toISOString()
              : new Date().toISOString(),
            sandbox_id: echeq.id,
            custody_status: 'NO_CUSTODY',
            custody_bank: null,
          }));

          res.json({
            success: true,
            echeqs: echeqsReales,
            total: echeqsReales.length,
            beneficiario_cuit: beneficiarioCuit,
          });
        } catch (error) {
          console.error('❌ [SANDBOX] Error consultando eCheqs:', error);
          res.json({
            success: false,
            message: 'Error consultando eCheqs',
            error: error.message,
          });
        }
      } else {
        res.json({
          success: false,
          message: 'Modelo Echeq no disponible',
          error: 'MODEL_NOT_AVAILABLE',
        });
      }
    } else if (operation === 'consultar_estado_echeq') {
      // Consultar estado de un eCheq específico
      const numeroEcheq = data.numero_echeq;

      const { Echeq } = require('./models');
      if (Echeq) {
        try {
          const echeq = await Echeq.findOne({
            where: { number: numeroEcheq },
          });

          if (echeq) {

            res.json({
              success: true,
              echeq: {
                numero_echeq: echeq.number,
                monto: parseFloat(echeq.amount),
                moneda: echeq.currency,
                fecha_emision: echeq.issue_date,
                fecha_vencimiento: echeq.due_date,
                emisor: echeq.issuer,
                beneficiario: echeq.beneficiary,
                issuercuit: echeq.issuerCuit,
                beneficiarycuit: echeq.beneficiaryCuit,
                estado: echeq.status,
                validation_status: echeq.validationStatus,
                validated_at: echeq.validatedAt
                  ? echeq.validatedAt.toISOString()
                  : new Date().toISOString(),
                sandbox_id: echeq.id,
                endosado: echeq.status === 'ENDORSED',
                fecha_endoso:
                  echeq.status === 'ENDORSED'
                    ? echeq.validatedAt?.toISOString()
                    : null,
              },
            });
          } else {
            res.json({
              success: false,
              message: 'eCheq no encontrado',
              numero_echeq: numeroEcheq,
            });
          }
        } catch (error) {
          console.error(
            '❌ [SANDBOX] Error consultando estado de eCheq:',
            error
          );
          res.json({
            success: false,
            message: 'Error consultando estado de eCheq',
            error: error.message,
          });
        }
      } else {
        res.json({
          success: false,
          message: 'Modelo Echeq no disponible',
          error: 'MODEL_NOT_AVAILABLE',
        });
      }
    } else if (operation === 'consulta_estado_echeq') {
      console.log(
        `🔍 [SANDBOX] Consultando estado de eCheq: ${data.numero_echeq || data.echeq_id}`
      );

      // Importar modelo Echeq
      const { Echeq } = require('./models');

      if (Echeq) {
        const echeqNumber = data.numero_echeq || data.echeq_id;

        const echeq = await Echeq.findOne({
          where: { number: echeqNumber },
        });

        if (echeq) {
          console.log(
            `✅ [SANDBOX] eCheq encontrado: ${echeq.number} - Estado: ${echeq.status}`
          );

          res.json({
            success: true,
            message: 'Estado de eCheq consultado exitosamente',
            data: {
              numero_echeq: echeq.number,
              estado: echeq.status,
              estado_detallado: echeq.status,
              fecha_emision: echeq.issue_date,
              fecha_vencimiento: echeq.due_date,
              emisor: echeq.issuer,
              beneficiario: echeq.beneficiary,
              monto: echeq.amount,
              moneda: echeq.currency,
              validation_status: echeq.validationStatus,
              fecha_validacion: echeq.validatedAt
                ? echeq.validatedAt.toISOString()
                : null,
              sandbox_id: echeq.id,
              endosado:
                echeq.status === 'ENDORSED' || echeq.status === 'ACTIVE',
              endosado_a:
                echeq.status === 'ENDORSED' ? echeq.beneficiary : null,
              custody_status: echeq.custodyStatus || 'NO_CUSTODY',
              custody_bank: echeq.custodyBank || null,
              detalles_adicionales: {
                puede_endosar: echeq.status === 'ACTIVE',
                puede_depositar: echeq.status === 'ACTIVE',
                puede_anular:
                  echeq.status === 'ACTIVE' || echeq.status === 'EMITTED',
                puede_poner_custodia: echeq.status === 'ACTIVE',
              },
            },
          });
        } else {

          res.json({
            success: false,
            message: 'eCheq no encontrado',
            data: {
              numero_echeq: echeqNumber,
              estado: 'NO_ENCONTRADO',
              estado_detallado: 'NO_ENCONTRADO',
              endosado: false,
              endosado_a: null,
            },
          });
        }
      } else {
        res.json({
          success: false,
          message: 'Modelo Echeq no disponible',
          error: 'MODEL_NOT_AVAILABLE',
        });
      }
    } else if (operation === 'consulta_echeq_por_id') {

      // Importar modelo Echeq
      const { Echeq } = require('./models');

      if (Echeq) {
        const echeqId = data.cheque_id;

        const echeq = await Echeq.findOne({
          where: { number: echeqId },
        });

        if (echeq) {

          res.json({
            success: true,
            message: 'eCheq consultado exitosamente por ID',
            data: {
              cheque: {
                cheque_id: echeq.number,
                estado: echeq.status,
                fecha_emision: echeq.issue_date,
                fecha_vencimiento: echeq.due_date,
                emisor: echeq.issuer,
                beneficiario: echeq.beneficiary,
                monto: echeq.amount,
                moneda: echeq.currency,
                validation_status: echeq.validationStatus,
                sandbox_id: echeq.id,
                endosado:
                  echeq.status === 'ENDORSED' || echeq.status === 'ACTIVE',
                endosado_a:
                  echeq.status === 'ENDORSED' ? echeq.beneficiary : null,
                custody_status: echeq.custodyStatus || 'NO_CUSTODY',
                custody_bank: echeq.custodyBank || null,
              },
            },
          });
        } else {

          res.json({
            success: false,
            message: 'eCheq no encontrado por ID',
            data: {
              cheque: {
                cheque_id: echeqId,
                estado: 'NO_ENCONTRADO',
                endosado: false,
                endosado_a: null,
              },
            },
          });
        }
      } else {
        res.json({
          success: false,
          message: 'Modelo Echeq no disponible',
          error: 'MODEL_NOT_AVAILABLE',
        });
      }
    } else if (operation === 'consulta_echeq_por_cmc7') {

      // Importar modelo Echeq
      const { Echeq } = require('./models');

      if (Echeq) {
        const cmc7 = data.cmc7;

        // En el sandbox, simulamos que el CMC7 es el mismo que el número de eCheq
        const echeq = await Echeq.findOne({
          where: { number: cmc7 },
        });

        if (echeq) {
          console.log(
            `✅ [SANDBOX] eCheq encontrado por CMC7: ${echeq.number}`
          );

          res.json({
            success: true,
            message: 'eCheq consultado exitosamente por CMC7',
            data: {
              cmc7: cmc7,
              numero_echeq: echeq.number,
              estado: echeq.status,
              fecha_emision: echeq.issue_date,
              fecha_vencimiento: echeq.due_date,
              emisor: echeq.issuer,
              beneficiario: echeq.beneficiary,
              monto: echeq.amount,
              moneda: echeq.currency,
              validation_status: echeq.validationStatus,
              sandbox_id: echeq.id,
              endosado:
                echeq.status === 'ENDORSED' || echeq.status === 'ACTIVE',
              endosado_a:
                echeq.status === 'ENDORSED' ? echeq.beneficiary : null,
              custody_status: echeq.custodyStatus || 'NO_CUSTODY',
              custody_bank: echeq.custodyBank || null,
            },
          });
        } else {

          res.json({
            success: false,
            message: 'eCheq no encontrado por CMC7',
            data: {
              cmc7: cmc7,
              numero_echeq: null,
              estado: 'NO_ENCONTRADO',
              endosado: false,
              endosado_a: null,
            },
          });
        }
      } else {
        res.json({
          success: false,
          message: 'Modelo Echeq no disponible',
          error: 'MODEL_NOT_AVAILABLE',
        });
      }
    } else if (operation === 'endoso') {
      console.log(
        `🔧 [SANDBOX] Data keys:`,
        data ? Object.keys(data) : 'data is null/undefined'
      );

      try {
        const echeqNumber = data?.numero_echeq;
        const nuevoBeneficiario = data?.nuevo_beneficiario;
        const beneficiarioActual = data?.beneficiario_actual;

        console.log(
          `🔧 [SANDBOX] Procesando endoso: ${echeqNumber} de ${beneficiarioActual} a ${nuevoBeneficiario}`
        );

        // Importar modelo Echeq
        const { Echeq } = require('./models');

        if (Echeq) {
          const echeq = await Echeq.findOne({
            where: { number: echeqNumber },
          });

          if (echeq) {
            console.log(
              `✅ [SANDBOX] eCheq encontrado para endoso: ${echeq.number}`
            );

            // Actualizar eCheq con nuevo beneficiario
            await echeq.update({
              beneficiary: nuevoBeneficiario,
              status: 'ENDORSED',
              updatedAt: new Date(),
            });

            console.log(
              `✅ [SANDBOX] eCheq endosado exitosamente: ${echeq.number} -> ${nuevoBeneficiario}`
            );

            res.json({
              success: true,
              status: 'ENDOSADO',
              message: 'ECHEQ endosado exitosamente',
              endoso_id: `ENDOSO-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
              fecha_endoso: new Date().toISOString(),
              echeq_number: echeqNumber,
              nuevo_beneficiario: nuevoBeneficiario,
            });
          } else {
            console.log(
              `❌ [SANDBOX] eCheq no encontrado para endoso: ${echeqNumber}`
            );
            res.json({
              success: false,
              message: 'ECHEQ no encontrado',
              error: 'ECHEQ_NOT_FOUND',
            });
          }
        } else {
          res.json({
            success: false,
            message: 'Modelo Echeq no disponible',
            error: 'MODEL_NOT_AVAILABLE',
          });
        }
      } catch (error) {
        console.error('❌ [SANDBOX] Error en endoso:', error);
        res.json({
          success: false,
          message: 'Error procesando endoso',
          error: error.message,
        });
      }
    } else {
      res.json({
        success: false,
        message: 'Operación no soportada',
        error: 'UNSUPPORTED_OPERATION',
      });
    }
  } catch (error) {
    console.error('❌ [SANDBOX] Error en simulación:', error);
    console.error('❌ [SANDBOX] Stack trace:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Error interno en simulación',
      error: error.message,
    });
  }
});

// ============================================================================
// CONFIGURACIÓN DE RUTAS COELSA
// ============================================================================

// Importar y montar rutas COELSA
const coelsaRoutes = require('./routes/coelsaRoutes');

// Importar y montar rutas de simulación COELSA (opcional - archivo puede no existir)
let simulateCoelsaRoutes = null;
try {
  simulateCoelsaRoutes = require('./scripts/simulate-coelsa');
} catch (error) {
  console.log('⚠️  Rutas de simulación COELSA no disponibles (archivo no encontrado)');
}

// Importar y montar rutas de tenants
const tenantRoutes = require('./routes/tenants');

// Importar y montar rutas de health
const healthRoutes = require('./routes/health');

// Importar y montar rutas de bank-portfolio
const bankPortfolioRoutes = require('./routes/bank-portfolio');

// Importar y montar rutas de eventos de eCheqs
const echeqEventsRoutes = require('./routes/echeqEvents');

// Importar rutas de eCheqs
const echeqRoutes = require('./routes/echeqs');

// Importar rutas de autenticación
const authRoutes = require('./routes/auth');

// Montar rutas COELSA en /api/coelsa
// Rutas COELSA oficiales (implementación completa)
app.use('/api/coelsa', coelsaRoutes);

// Rutas internas del sandbox (endpoints de administración)
const sandboxRoutes = require('./routes/sandboxRoutes');
app.use('/api/sandbox', sandboxRoutes);

// Rutas de gestión de credenciales
const credentialsRoutes = require('./routes/credentialsRoutes');
app.use('/api/credentials', credentialsRoutes);

// Rutas de sincronización
const syncRoutes = require('./routes/syncRoutes');
app.use('/api/sync', syncRoutes);

// Rutas REALES de tenants (con autenticación simple)
const realTenantsSimple = require('./routes/realTenantsSimple');
app.use('/api/real', realTenantsSimple);

// Nota: simulateCoelsaRoutes removido - no es parte de COELSA oficial

// Montar rutas de tenants en /api/tenants
app.use('/api/tenants', tenantRoutes);

// Montar rutas de health
app.use('/', healthRoutes);

// Montar rutas de eventos de eCheqs en /api/echeq-events
app.use('/api/echeq-events', echeqEventsRoutes);

// Montar rutas de bank-portfolio
app.use('/api/bank-portfolio', bankPortfolioRoutes);

// Montar rutas de eCheqs
app.use('/api/echeqs', echeqRoutes);

// Montar rutas de autenticación
app.use('/api/auth', authRoutes);

// Ruta de información de APIs disponibles
app.get('/api', (req, res) => {
  res.json({
    service: 'echeq-sandbox',
    status: 'running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'sandbox',
    available_apis: {
      coelsa: {
        base_url: '/api/coelsa',
        health: '/api/coelsa/health',
        documentation: '/api/coelsa/api-docs',
        endpoints: {
          cuentas: '/api/coelsa/Cuentas/*',
          cheques: '/api/coelsa/Cheques/*',
          endosos: '/api/coelsa/Endosos/*',
          custodia: '/api/coelsa/Custodia/*',
          devoluciones: '/api/coelsa/Devoluciones/*',
          certificados: '/api/coelsa/Certificados/*',
          cesion: '/api/coelsa/Cesion/*',
          avales: '/api/coelsa/Avales/*',
          mandatos: '/api/coelsa/Mandatos/*',
          notificaciones: '/api/coelsa/Notificaciones/*',
          seguridad: '/api/coelsa/Seguridad/*',
          reportes: '/api/coelsa/Reportes/*',
        },
      },
    },
  });
});

// ============================================================================
// FRONTEND NEXT.JS (DEBE IR AL FINAL PARA NO INTERCEPTAR /api/*)
// ============================================================================
const frontendPath = path.join(__dirname, '../frontend/.next/static');
const frontendOutPath = path.join(__dirname, '../frontend/out');

// Servir archivos estáticos de Next.js
app.use('/_next/static', express.static(path.join(frontendPath)));

// Servir archivos estáticos del build de Next.js
app.use(express.static(frontendOutPath));

// Ruta raíz - servir el frontend Next.js
app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, '../frontend/out/index.html');
  res.sendFile(indexPath);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    error:
      process.env.NODE_ENV === 'development' ? err.message : 'Error interno',
  });
});

// 404 handler
// Endpoint temporal para limpiar eCheqs (solo para desarrollo)
app.delete('/api/cleanup/echeqs', async (req, res) => {
  try {
    if (!sequelize) {
      return res.status(500).json({
        success: false,
        message: 'Base de datos no disponible',
      });
    }


    // Verificar eCheqs existentes
    const [echeqs] = await sequelize.query(
      'SELECT id, number, issuer, beneficiary, amount FROM echeq.echeqs ORDER BY created_at DESC'
    );

    if (echeqs.length > 0) {
      // Eliminar todos los eCheqs
      await sequelize.query('DELETE FROM echeq.echeqs');
    }

    res.json({
      success: true,
      message: 'Limpieza completada',
      deleted_count: echeqs.length,
    });
  } catch (error) {
    console.error('❌ [CLEANUP] Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error durante la limpieza',
      error: error.message,
    });
  }
});

app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada',
  });
});

// Inicializar servidor
async function startServer() {
  try {
    // Conectar a PostgreSQL si está disponible
    if (sequelize) {
      try {
        const { connectDatabase } = require('./config/database');
        await connectDatabase();
        console.log('✅ Base de datos PostgreSQL conectada correctamente');
      } catch (dbError) {
        console.log('⚠️ Base de datos no disponible:', dbError.message);
      }
    }

    // Iniciar servidor
    app.listen(PORT, () => {
      console.log(`🚀 Servidor ECHEQ Sandbox iniciado en puerto ${PORT}`);
      console.log(`📊 Health check: /health`);
      console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'sandbox'}`);
      console.log(`🌐 URL del servidor: ${getServerUrl()}`);
      console.log(`📚 Swagger UI: ${getServerUrl()}/api/sandbox/api-docs`);
    });
  } catch (error) {
    console.error('❌ Error iniciando servidor:', error);
    process.exit(1);
  }
}

// Manejar señales de terminación
process.on('SIGTERM', () => {
  console.log('🛑 Recibida señal SIGTERM, cerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Recibida señal SIGINT, cerrando servidor...');
  process.exit(0);
});

// Iniciar servidor
startServer();
