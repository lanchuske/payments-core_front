/**
 * Servicio de Logging
 * Sistema de logs estructurado con Winston
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs'); // Added for file transport

// Configuración de niveles de log
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Colores para consola
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(logColors);

// Formato personalizado para logs
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;

    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }

    return log;
  })
);

// Formato para consola
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;

    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }

    return log;
  })
);

// Transport en memoria personalizado para logs en tiempo real
class MemoryTransport extends winston.Transport {
  constructor(options = {}) {
    super(options);
    this.logs = [];
    this.maxSize = options.maxSize || 1000;
  }

  log(info, callback) {
    setImmediate(() => {
      this.emit('logged', info);
    });

    // Agregar log a la memoria
    this.logs.push({
      timestamp: info.timestamp || new Date().toISOString(),
      message: info.message,
      level: info.level,
      file: 'combined'
    });

    // Mantener solo los últimos logs
    if (this.logs.length > this.maxSize) {
      this.logs = this.logs.slice(-this.maxSize);
    }

    callback();
  }

  read() {
    return this.logs;
  }
}

const memoryTransport = new MemoryTransport({
  level: 'debug',
  maxSize: 1000 // Mantener solo los últimos 1000 logs
});

// Transport para base de datos
class DatabaseTransport extends winston.Transport {
  constructor(options = {}) {
    super(options);
    this.level = options.level || 'info';
  }

  async log(info, callback) {
    setImmediate(() => {
      this.emit('logged', info);
    });

    try {
      // Solo guardar logs importantes en la base de datos
      if (info.level === 'error' || info.level === 'warn' || 
          (info.level === 'info' && info.message && info.message.includes('[ECHEQ]'))) {
        
        const { SystemLog } = require('../models');
        
        await SystemLog.create({
          timestamp: new Date(info.timestamp || Date.now()),
          level: info.level.toUpperCase(),
          service: 'echeq-sandbox',
          message: info.message,
          action: info.action || null,
          userInfo: info.userInfo || null,
          tenantId: info.tenantId || null,
          resourceType: info.resourceType || null,
          resourceId: info.resourceId || null,
          ipAddress: info.ipAddress || null,
          userAgent: info.userAgent || null,
          method: info.method || null,
          url: info.url || null,
          statusCode: info.statusCode || null,
          details: info.details || null,
          metadata: info.metadata || {}
        });
      }
    } catch (error) {
      console.error('Error guardando log en base de datos:', error);
    }

    callback();
  }
}

const databaseTransport = new DatabaseTransport({
  level: 'info'
});

// Configuración de transportes
const transports = [
  // Consola (siempre disponible)
  new winston.transports.Console({
    format: consoleFormat,
    level: 'debug',
  }),
  // Transport en memoria (siempre disponible)
  memoryTransport,
  // Transport para base de datos (siempre disponible)
  databaseTransport,
];

// Agregar logs de archivo siempre (para sandbox)
if (!process.env.RAILWAY_ENVIRONMENT) {
  // Crear directorio de logs local si no existe
  const logsDir = path.join(__dirname, '../../logs');
  if (!fs.existsSync(logsDir)) {
    try {
      fs.mkdirSync(logsDir, { recursive: true });
    } catch (error) {
      console.warn('No se pudo crear directorio de logs:', error.message);
    }
  }

  // Archivo de errores
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: logFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );

  // Archivo de logs generales
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      format: logFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );

  // Archivo de logs de auditoría
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'audit.log'),
      level: 'info',
      format: logFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 10,
    })
  );
}

// Crear logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels: logLevels,
  format: logFormat,
  transports,
  exitOnError: false,
});

// Métodos de conveniencia
logger.audit = (message, meta = {}) => {
  logger.info(message, { ...meta, type: 'audit' });
};

logger.security = (message, meta = {}) => {
  logger.warn(message, { ...meta, type: 'security' });
};

logger.performance = (message, meta = {}) => {
  logger.info(message, { ...meta, type: 'performance' });
};

logger.business = (message, meta = {}) => {
  logger.info(message, { ...meta, type: 'business' });
};

logger.api = (message, meta = {}) => {
  logger.http(message, { ...meta, type: 'api' });
};

logger.database = (message, meta = {}) => {
  logger.debug(message, { ...meta, type: 'database' });
};

logger.queue = (message, meta = {}) => {
  logger.info(message, { ...meta, type: 'queue' });
};

logger.coelsa = (message, meta = {}) => {
  logger.info(message, { ...meta, type: 'coelsa' });
};

// Middleware para Express
logger.middleware = (req, res, next) => {
  const start = Date.now();

  // Filtrar llamadas internas que no son parte del sandbox ECHEQ
  const internalPaths = ['/api/coelsa/logs', '/health', '/api/sandbox/api-docs'];
  const isInternalCall = internalPaths.some(path => req.url.startsWith(path));
  
  if (isInternalCall) {
    next();
    return;
  }

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      userId: req.user?.id,
      tenantId: req.user?.tenant_id,
    };

    if (res.statusCode >= 400) {
      logger.warn('API Request', logData);
    } else {
      logger.api('API Request', logData);
    }
  });

  next();
};

// Función para log de errores con contexto
logger.errorWithContext = (error, context = {}) => {
  const errorData = {
    message: error.message,
    stack: error.stack,
    name: error.name,
    code: error.code,
    ...context,
  };

  logger.error('Error with context', errorData);
};

// Función para log de transacciones
logger.transaction = (type, data, meta = {}) => {
  logger.business(`Transaction: ${type}`, {
    transactionType: type,
    transactionData: data,
    ...meta,
  });
};

// Función para log de eventos de negocio
logger.businessEvent = (event, data, meta = {}) => {
  logger.business(`Business Event: ${event}`, {
    eventType: event,
    eventData: data,
    ...meta,
  });
};

// Función para log de métricas
logger.metric = (name, value, tags = {}) => {
  logger.performance(`Metric: ${name}`, {
    metricName: name,
    metricValue: value,
    tags,
  });
};

// Función para obtener logs de memoria
logger.getRecentLogs = () => {
  try {
    const memoryLogs = memoryTransport.read();
    return memoryLogs.map(log => ({
      file: 'combined',
      timestamp: log.timestamp,
      message: log.message,
      level: log.level,
    }));
  } catch (error) {
    console.error('Error getting memory logs:', error);
    return [];
  }
};

module.exports = logger;
