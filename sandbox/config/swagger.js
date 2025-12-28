/**
 * Configuración Swagger para ECHEQ Sandbox
 * Documenta todos los endpoints disponibles del sandbox
 */

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'ECHEQ Sandbox API - Simulador COELSA',
      description:
        'API del sandbox ECHEQ que simula el sistema COELSA para testing y desarrollo. Incluye endpoints para cuentas, cheques, endosos y simulador COELSA.',
      version: '2.0.0',
      contact: {
        name: 'ECHEQ Sandbox Support',
        email: 'sandbox@echeq.ar',
      },
      license: {
        name: 'Proprietary',
        url: 'https://echeq.ar/license',
      },
    },
    servers: [
      {
        url:
          process.env.SANDBOX_URL ||
          process.env.FRONTEND_URL ||
          'http://localhost:3000',
        description: 'ECHEQ Sandbox',
      },
      {
        url:
          process.env.SANDBOX_API_URL ||
          process.env.NEXT_PUBLIC_API_URL ||
          'http://localhost:3001/api/coelsa',
        description: 'API COELSA',
      },
      {
        url: 'http://localhost:8080',
        description: 'Desarrollo Local (Fallback)',
      },
    ],
    tags: [
      {
        name: 'Health',
        description: 'Endpoints de verificación de salud del sistema',
      },
      {
        name: 'Simulador COELSA',
        description: 'Endpoints del simulador COELSA para testing',
      },
      {
        name: 'Cuentas COELSA',
        description: 'Gestión de cuentas emisoras según especificación COELSA',
      },
      {
        name: 'Cheques COELSA',
        description:
          'Gestión de cheques electrónicos según especificación COELSA',
      },
      {
        name: 'Endosos COELSA',
        description: 'Gestión de endosos según especificación COELSA',
      },
      {
        name: 'Autenticación',
        description: 'Endpoints de autenticación y gestión de usuarios',
      },
      {
        name: 'Usuarios',
        description: 'Gestión de usuarios del sistema',
      },
      {
        name: 'Tenants',
        description: 'Gestión de tenants y configuración multi-tenant',
      },
      {
        name: 'ECHEQs',
        description: 'Operaciones principales con ECHEQs',
      },
      {
        name: 'Reportes',
        description: 'Generación de reportes y estadísticas',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        // Esquemas para cuentas COELSA
        CuentaCOELSA: {
          type: 'object',
          required: ['emisor_cuit', 'emisor_cbu'],
          properties: {
            emisor_cuit: {
              type: 'string',
              description: 'CUIT del emisor',
              example: '20123456789',
            },
            emisor_cbu: {
              type: 'string',
              description: 'CBU del emisor',
              example: '1234567890123456789012',
            },
            emisor_nombre: {
              type: 'string',
              description: 'Nombre del emisor',
              example: 'Empresa Test S.A.',
            },
            emisor_tipo: {
              type: 'string',
              description: 'Tipo de emisor',
              example: 'emisor',
              enum: ['emisor', 'banco', 'financiera'],
            },
          },
        },
        // Esquemas para cheques COELSA
        ChequeCOELSA: {
          type: 'object',
          required: ['emisor_cuit', 'monto', 'beneficiario_documento'],
          properties: {
            emisor_cuit: {
              type: 'string',
              description: 'CUIT del emisor',
              example: '20123456789',
            },
            emisor_cbu: {
              type: 'string',
              description: 'CBU del emisor',
              example: '1234567890123456789012',
            },
            beneficiario_documento: {
              type: 'string',
              description: 'Documento del beneficiario',
              example: '30123456789',
            },
            beneficiario_cbu: {
              type: 'string',
              description: 'CBU del beneficiario',
              example: '9876543210987654321098',
            },
            monto: {
              type: 'number',
              description: 'Monto del cheque',
              example: 100000,
            },
            fecha_vencimiento: {
              type: 'string',
              format: 'date',
              description: 'Fecha de vencimiento',
              example: '2025-12-31',
            },
            concepto: {
              type: 'string',
              description: 'Concepto del cheque',
              example: 'Pago por servicios',
            },
          },
        },
        // Esquemas para endosos COELSA
        EndosoCOELSA: {
          type: 'object',
          required: [
            'cheque_id',
            'endosante_documento',
            'endosatario_documento',
          ],
          properties: {
            cheque_id: {
              type: 'string',
              description: 'ID del cheque a endosar',
              example: 'ECHEQ-1234567890-ABCDEF',
            },
            endosante_documento: {
              type: 'string',
              description: 'Documento del endosante',
              example: '30123456789',
            },
            endosatario_documento: {
              type: 'string',
              description: 'Documento del endosatario',
              example: '40123456789',
            },
            endosatario_cbu: {
              type: 'string',
              description: 'CBU del endosatario',
              example: '1111111111111111111111',
            },
          },
        },
        // Esquemas para respuestas
        ApiResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Indica si la operación fue exitosa',
            },
            message: {
              type: 'string',
              description: 'Mensaje descriptivo de la operación',
            },
            data: {
              type: 'object',
              description: 'Datos de la respuesta',
            },
            error: {
              type: 'string',
              description: 'Código de error si la operación falló',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp de la respuesta',
            },
          },
        },
      },
    },
  },
  apis: ['./routes/*.js', './controllers/*.js', './index.js'],
};

const specs = swaggerJsdoc(options);

module.exports = specs;
