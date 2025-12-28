/**
 * Controlador de Gestión de Emails
 * Maneja las operaciones HTTP relacionadas con el sistema de emails
 */

const emailService = require('../services/emailService');
const { ApiResponse } = require('../utils/apiResponse');

class EmailController {
  /**
   * Verificar conexión de email
   * GET /api/email/verify
   */
  async verifyConnection(req, res) {
    try {
      const result = await emailService.verifyConnection();
      res.status(200).json(result);
    } catch (error) {
      console.error('Error en verifyConnection controller:', error);
      res
        .status(500)
        .json(
          new ApiResponse(
            false,
            'Error verificando conexión de email',
            null,
            'EMAIL_CONNECTION_ERROR'
          )
        );
    }
  }

  /**
   * Obtener estadísticas de email
   * GET /api/email/stats
   */
  async getEmailStats(req, res) {
    try {
      const result = await emailService.getEmailStats();
      res.status(200).json(result);
    } catch (error) {
      console.error('Error en getEmailStats controller:', error);
      res
        .status(500)
        .json(
          new ApiResponse(
            false,
            'Error obteniendo estadísticas de email',
            null,
            'EMAIL_STATS_ERROR'
          )
        );
    }
  }

  /**
   * Enviar email de prueba
   * POST /api/email/test
   */
  async sendTestEmail(req, res) {
    try {
      const { to, template, data } = req.body;

      if (!to || !template) {
        return res
          .status(400)
          .json(
            new ApiResponse(
              false,
              'Email y template son requeridos',
              null,
              'MISSING_REQUIRED_FIELDS'
            )
          );
      }

      const emailData = {
        to: to,
        subject: 'Email de Prueba - ECHEQ Platform',
        template: template,
        data: data || {},
      };

      const result = await emailService.sendEmail(emailData);
      res.status(200).json(result);
    } catch (error) {
      console.error('Error en sendTestEmail controller:', error);
      res
        .status(500)
        .json(
          new ApiResponse(
            false,
            'Error enviando email de prueba',
            null,
            'TEST_EMAIL_ERROR'
          )
        );
    }
  }

  /**
   * Enviar email de bienvenida
   * POST /api/email/welcome
   */
  async sendWelcomeEmail(req, res) {
    try {
      const { userId, tenantId } = req.body;

      if (!userId) {
        return res
          .status(400)
          .json(
            new ApiResponse(
              false,
              'ID de usuario es requerido',
              null,
              'MISSING_USER_ID'
            )
          );
      }

      // En un entorno real, aquí se obtendrían los datos del usuario y tenant
      // Por ahora, usamos datos mock
      const user = {
        email: 'test@example.com',
        companyName: 'Empresa Test',
        role: 'COMPANY_USER',
      };

      const tenant = {
        name: 'Banco Test',
        branding: {
          primaryColor: '#1976d2',
          secondaryColor: '#f5f5f5',
        },
      };

      const result = await emailService.sendWelcomeEmail(user, tenant);
      res.status(200).json(result);
    } catch (error) {
      console.error('Error en sendWelcomeEmail controller:', error);
      res
        .status(500)
        .json(
          new ApiResponse(
            false,
            'Error enviando email de bienvenida',
            null,
            'WELCOME_EMAIL_ERROR'
          )
        );
    }
  }

  /**
   * Enviar email de reset de contraseña
   * POST /api/email/password-reset
   */
  async sendPasswordResetEmail(req, res) {
    try {
      const { email, resetToken, tenantId } = req.body;

      if (!email || !resetToken) {
        return res
          .status(400)
          .json(
            new ApiResponse(
              false,
              'Email y token de reset son requeridos',
              null,
              'MISSING_REQUIRED_FIELDS'
            )
          );
      }

      // En un entorno real, aquí se obtendrían los datos del usuario y tenant
      const user = {
        email: email,
        companyName: 'Usuario Test',
      };

      const tenant = tenantId
        ? {
            name: 'Banco Test',
            branding: {
              primaryColor: '#1976d2',
              secondaryColor: '#f5f5f5',
            },
          }
        : null;

      const result = await emailService.sendPasswordResetEmail(
        user,
        resetToken,
        tenant
      );
      res.status(200).json(result);
    } catch (error) {
      console.error('Error en sendPasswordResetEmail controller:', error);
      res
        .status(500)
        .json(
          new ApiResponse(
            false,
            'Error enviando email de reset de contraseña',
            null,
            'PASSWORD_RESET_EMAIL_ERROR'
          )
        );
    }
  }

  /**
   * Enviar email de ECHEQ emitido
   * POST /api/email/echeq-emission
   */
  async sendEcheqEmissionEmail(req, res) {
    try {
      const { echeqId, userId, tenantId } = req.body;

      if (!echeqId || !userId) {
        return res
          .status(400)
          .json(
            new ApiResponse(
              false,
              'ID de ECHEQ y usuario son requeridos',
              null,
              'MISSING_REQUIRED_FIELDS'
            )
          );
      }

      // En un entorno real, aquí se obtendrían los datos del ECHEQ, usuario y tenant
      const echeq = {
        number: 'ECHEQ-001',
        amount: 100000,
        currency: 'ARS',
        issueDate: '2024-01-15',
        dueDate: '2024-02-15',
        issuer: 'Empresa Test S.A.',
        beneficiary: 'Proveedor Test S.A.',
        status: 'ACTIVE',
      };

      const user = {
        email: 'test@example.com',
        companyName: 'Empresa Test',
      };

      const tenant = tenantId
        ? {
            name: 'Banco Test',
            branding: {
              primaryColor: '#1976d2',
              secondaryColor: '#f5f5f5',
            },
          }
        : null;

      const result = await emailService.sendEcheqEmissionEmail(
        echeq,
        user,
        tenant
      );
      res.status(200).json(result);
    } catch (error) {
      console.error('Error en sendEcheqEmissionEmail controller:', error);
      res
        .status(500)
        .json(
          new ApiResponse(
            false,
            'Error enviando email de ECHEQ emitido',
            null,
            'ECHEQ_EMISSION_EMAIL_ERROR'
          )
        );
    }
  }

  /**
   * Enviar email de alerta de expiración
   * POST /api/email/expiration-warning
   */
  async sendExpirationWarningEmail(req, res) {
    try {
      const { echeqId, userId, daysUntilExpiry, tenantId } = req.body;

      if (!echeqId || !userId || !daysUntilExpiry) {
        return res
          .status(400)
          .json(
            new ApiResponse(
              false,
              'ID de ECHEQ, usuario y días hasta expiración son requeridos',
              null,
              'MISSING_REQUIRED_FIELDS'
            )
          );
      }

      // En un entorno real, aquí se obtendrían los datos del ECHEQ, usuario y tenant
      const echeq = {
        number: 'ECHEQ-001',
        amount: 100000,
        currency: 'ARS',
        dueDate: '2024-02-15',
        issuer: 'Empresa Test S.A.',
        beneficiary: 'Proveedor Test S.A.',
      };

      const user = {
        email: 'test@example.com',
        companyName: 'Empresa Test',
      };

      const tenant = tenantId
        ? {
            name: 'Banco Test',
            branding: {
              primaryColor: '#1976d2',
              secondaryColor: '#f5f5f5',
            },
          }
        : null;

      const result = await emailService.sendExpirationWarningEmail(
        echeq,
        user,
        daysUntilExpiry,
        tenant
      );
      res.status(200).json(result);
    } catch (error) {
      console.error('Error en sendExpirationWarningEmail controller:', error);
      res
        .status(500)
        .json(
          new ApiResponse(
            false,
            'Error enviando email de alerta de expiración',
            null,
            'EXPIRATION_WARNING_EMAIL_ERROR'
          )
        );
    }
  }

  /**
   * Enviar email de tenant activado
   * POST /api/email/tenant-activated
   */
  async sendTenantActivatedEmail(req, res) {
    try {
      const { tenantId, adminUserId } = req.body;

      if (!tenantId || !adminUserId) {
        return res
          .status(400)
          .json(
            new ApiResponse(
              false,
              'ID de tenant y admin son requeridos',
              null,
              'MISSING_REQUIRED_FIELDS'
            )
          );
      }

      // En un entorno real, aquí se obtendrían los datos del tenant y admin
      const tenant = {
        name: 'Banco Test',
        code: 'BANCO_TEST',
        activationDate: new Date(),
      };

      const adminUser = {
        email: 'admin@banco-test.com',
        companyName: 'Banco Test',
      };

      const result = await emailService.sendTenantActivatedEmail(
        tenant,
        adminUser
      );
      res.status(200).json(result);
    } catch (error) {
      console.error('Error en sendTenantActivatedEmail controller:', error);
      res
        .status(500)
        .json(
          new ApiResponse(
            false,
            'Error enviando email de tenant activado',
            null,
            'TENANT_ACTIVATED_EMAIL_ERROR'
          )
        );
    }
  }
}

module.exports = new EmailController();
