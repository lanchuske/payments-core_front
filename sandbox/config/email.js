/**
 * Configuración del Sistema de Emails
 * Configuración para envío de emails usando Nodemailer
 */

const nodemailer = require('nodemailer');

// Configuración por defecto (desarrollo)
const defaultConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: process.env.SMTP_SECURE === 'true' || false,
  auth: {
    user: process.env.SMTP_USER || 'test@example.com',
    pass: process.env.SMTP_PASS || 'test-password',
  },
};

// Configuración para diferentes entornos
const emailConfigs = {
  development: {
    ...defaultConfig,
    // Para desarrollo, usar Mailtrap o similar
    host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
    port: process.env.SMTP_PORT || 2525,
    auth: {
      user: process.env.SMTP_USER || 'test@mailtrap.io',
      pass: process.env.SMTP_PASS || 'test-password',
    },
  },
  test: {
    ...defaultConfig,
    // Para testing, usar ethereal email
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
      user: 'test@ethereal.email',
      pass: 'test-password',
    },
  },
  production: {
    ...defaultConfig,
    // Para producción, usar configuración real
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  },
};

// Obtener configuración según el entorno
const getEmailConfig = () => {
  const env = process.env.NODE_ENV || 'development';
  return emailConfigs[env] || emailConfigs.development;
};

// Crear transporter
const createTransporter = () => {
  const config = getEmailConfig();

  return nodemailer.createTransport({
    ...config,
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    rateLimit: 14, // 14 emails por segundo
    logger: process.env.NODE_ENV === 'development',
    debug: process.env.NODE_ENV === 'development',
  });
};

// Configuración de templates
const templateConfig = {
  // Directorio de templates
  templatesDir: './src/templates/emails',

  // Configuración de Handlebars
  handlebarsConfig: {
    defaultLayout: 'main',
    layoutsDir: './src/templates/emails/layouts',
    partialsDir: './src/templates/emails/partials',
    extname: '.hbs',
  },

  // Configuración de emails por defecto
  defaultFrom: process.env.EMAIL_FROM || 'admin@echeq.ar',
  defaultReplyTo: process.env.EMAIL_REPLY_TO || 'support@echeq.com',

  // Configuración de branding por tenant
  tenantBranding: {
    logo: null,
    primaryColor: '#1976d2',
    secondaryColor: '#f5f5f5',
    companyName: 'ECHEQ Platform',
  },
};

// Tipos de email disponibles
const emailTypes = {
  // Emails de autenticación
  AUTH: {
    WELCOME: 'auth.welcome',
    PASSWORD_RESET: 'auth.password_reset',
    EMAIL_VERIFICATION: 'auth.email_verification',
    LOGIN_ALERT: 'auth.login_alert',
  },

  // Emails de ECHEQs
  ECHEQ: {
    EMISSION_CREATED: 'echeq.emission_created',
    EMISSION_APPROVED: 'echeq.emission_approved',
    EMISSION_REJECTED: 'echeq.emission_rejected',
    ENDORSEMENT_CREATED: 'echeq.endorsement_created',
    ENDORSEMENT_ACCEPTED: 'echeq.endorsement_accepted',
    ENDORSEMENT_REJECTED: 'echeq.endorsement_rejected',
    CUSTODY_CREATED: 'echeq.custody_created',
    CUSTODY_RELEASED: 'echeq.custody_released',
    PAYMENT_RECEIVED: 'echeq.payment_received',
    EXPIRATION_WARNING: 'echeq.expiration_warning',
    EXPIRED: 'echeq.expired',
  },

  // Emails de descuentos
  DISCOUNT: {
    REQUEST_CREATED: 'discount.request_created',
    REQUEST_APPROVED: 'discount.request_approved',
    REQUEST_REJECTED: 'discount.request_rejected',
    REQUEST_CANCELLED: 'discount.request_cancelled',
  },

  // Emails de mandatos
  MANDATE: {
    CREATED: 'mandate.created',
    ACCEPTED: 'mandate.accepted',
    REJECTED: 'mandate.rejected',
    REVOKED: 'mandate.revoked',
  },

  // Emails de CED
  CED: {
    CREATED: 'ced.created',
    ADMITTED: 'ced.admitted',
    REPUDIATED: 'ced.repudiated',
    CANCELLED: 'ced.cancelled',
  },

  // Emails de avales
  GUARANTEE: {
    REQUESTED: 'guarantee.requested',
    ADMITTED: 'guarantee.admitted',
    REJECTED: 'guarantee.rejected',
    CANCELLED: 'guarantee.cancelled',
  },

  // Emails de sistema
  SYSTEM: {
    TENANT_ACTIVATED: 'system.tenant_activated',
    TENANT_SUSPENDED: 'system.tenant_suspended',
    USER_CREATED: 'system.user_created',
    USER_ACTIVATED: 'system.user_activated',
    USER_SUSPENDED: 'system.user_suspended',
    MAINTENANCE_NOTICE: 'system.maintenance_notice',
    SECURITY_ALERT: 'system.security_alert',
  },

  // Emails de reportes
  REPORT: {
    DAILY_SUMMARY: 'report.daily_summary',
    WEEKLY_SUMMARY: 'report.weekly_summary',
    MONTHLY_SUMMARY: 'report.monthly_summary',
    CUSTOM_REPORT: 'report.custom_report',
  },
};

module.exports = {
  createTransporter,
  getEmailConfig,
  templateConfig,
  emailTypes,
};
