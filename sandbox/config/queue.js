/**
 * Configuración del Sistema de Colas
 * Configuración para RabbitMQ y procesamiento asíncrono
 */

const Bull = require('bull');

// Configuración de RabbitMQ
const rabbitMQConfig = {
  url: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
  options: {
    heartbeat: 60,
    connection_timeout: 30000,
    channel_max: 0,
    frame_max: 0,
  },
  queues: {
    // Colas para notificaciones COELSA
    coelsaNotifications: 'coelsa.notifications',
    coelsaQueries: 'coelsa.queries',
    coelsaReconciliation: 'coelsa.reconciliation',

    // Colas para operaciones internas
    emailNotifications: 'email.notifications',
    smsNotifications: 'sms.notifications',
    auditEvents: 'audit.events',

    // Colas para procesamiento masivo
    bulkOperations: 'bulk.operations',
    reportGeneration: 'report.generation',

    // Colas para workers específicos
    echeqProcessing: 'echeq.processing',
    discountProcessing: 'discount.processing',
    custodyProcessing: 'custody.processing',
  },
  exchanges: {
    coelsaEvents: 'coelsa.events',
    systemEvents: 'system.events',
    tenantEvents: 'tenant.events',
  },
};

// Configuración de Redis para Bull
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  db: process.env.REDIS_DB || 0,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
};

// Configuración de Bull Queues
const bullQueues = {
  // Colas de procesamiento
  emailQueue: new Bull('email-processing', { redis: redisConfig }),
  smsQueue: new Bull('sms-processing', { redis: redisConfig }),
  auditQueue: new Bull('audit-processing', { redis: redisConfig }),

  // Colas de operaciones COELSA
  coelsaQueue: new Bull('coelsa-operations', { redis: redisConfig }),
  reconciliationQueue: new Bull('reconciliation', { redis: redisConfig }),

  // Colas de reportes
  reportQueue: new Bull('report-generation', { redis: redisConfig }),

  // Colas de mantenimiento
  maintenanceQueue: new Bull('maintenance', { redis: redisConfig }),
};

// Configuración de workers
const workerConfig = {
  // Configuración de reintentos
  retryAttempts: 3,
  retryDelay: 5000,
  backoffMultiplier: 2,

  // Configuración de concurrencia
  concurrency: {
    email: 5,
    sms: 3,
    coelsa: 2,
    reconciliation: 1,
    report: 2,
  },

  // Configuración de timeouts
  timeouts: {
    email: 30000,
    sms: 15000,
    coelsa: 60000,
    reconciliation: 300000,
    report: 120000,
  },
};

// Tipos de mensajes para RabbitMQ
const messageTypes = {
  // Mensajes de COELSA
  COELSA: {
    ECHEQ_EMITTED: 'echeq.emitted',
    ECHEQ_ACCEPTED: 'echeq.accepted',
    ECHEQ_REJECTED: 'echeq.rejected',
    ECHEQ_ENDORSED: 'echeq.endorsed',
    ECHEQ_DEPOSITED: 'echeq.deposited',
    ECHEQ_PAID: 'echeq.paid',
    ECHEQ_REJECTED_PAYMENT: 'echeq.rejected_payment',
    ECHEQ_RETURNED: 'echeq.returned',
    ECHEQ_EXPIRED: 'echeq.expired',
    MANDATE_CREATED: 'mandate.created',
    MANDATE_ACCEPTED: 'mandate.accepted',
    MANDATE_REJECTED: 'mandate.rejected',
    GUARANTEE_REQUESTED: 'guarantee.requested',
    GUARANTEE_ACCEPTED: 'guarantee.accepted',
    GUARANTEE_REJECTED: 'guarantee.rejected',
    CED_CREATED: 'ced.created',
    CED_ACCEPTED: 'ced.accepted',
    CED_REJECTED: 'ced.rejected',
  },

  // Mensajes del sistema
  SYSTEM: {
    USER_CREATED: 'user.created',
    USER_UPDATED: 'user.updated',
    USER_DELETED: 'user.deleted',
    TENANT_CREATED: 'tenant.created',
    TENANT_UPDATED: 'tenant.updated',
    TENANT_SUSPENDED: 'tenant.suspended',
    AUDIT_EVENT: 'audit.event',
    SECURITY_ALERT: 'security.alert',
    MAINTENANCE_NOTICE: 'maintenance.notice',
  },

  // Mensajes de notificaciones
  NOTIFICATION: {
    EMAIL_SENT: 'email.sent',
    EMAIL_FAILED: 'email.failed',
    SMS_SENT: 'sms.sent',
    SMS_FAILED: 'sms.failed',
    PUSH_SENT: 'push.sent',
    PUSH_FAILED: 'push.failed',
  },

  // Mensajes de operaciones
  OPERATION: {
    ECHEQ_CREATED: 'operation.echeq.created',
    ECHEQ_UPDATED: 'operation.echeq.updated',
    DISCOUNT_REQUESTED: 'operation.discount.requested',
    DISCOUNT_APPROVED: 'operation.discount.approved',
    DISCOUNT_REJECTED: 'operation.discount.rejected',
    CUSTODY_CREATED: 'operation.custody.created',
    CUSTODY_RELEASED: 'operation.custody.released',
  },
};

// Configuración de routing keys
const routingKeys = {
  // COELSA routing keys
  coelsa: {
    notifications: 'coelsa.notifications.*',
    queries: 'coelsa.queries.*',
    reconciliation: 'coelsa.reconciliation.*',
  },

  // Sistema routing keys
  system: {
    events: 'system.events.*',
    audit: 'system.audit.*',
    security: 'system.security.*',
  },

  // Tenant routing keys
  tenant: {
    events: 'tenant.{tenant_id}.events.*',
    operations: 'tenant.{tenant_id}.operations.*',
  },
};

module.exports = {
  rabbitMQConfig,
  redisConfig,
  bullQueues,
  workerConfig,
  messageTypes,
  routingKeys,
};
