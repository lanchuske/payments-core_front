/**
 * Servicio de Envío de Emails
 * Gestiona el envío de emails usando templates y configuración multi-tenant
 */

// const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const fs = require('fs').promises;
const path = require('path');
const { createTransporter, templateConfig } = require('../config/email');
const { ApiResponse } = require('../utils/apiResponse');
const { getSandboxConfig } = require('../config/urls');

class EmailService {
  constructor() {
    this.transporter = createTransporter();
    this.templates = new Map();
    this.templateCache = new Map();
  }

  /**
   * Obtener URLs dinámicas para emails
   */
  getEmailUrls() {
    const config = getSandboxConfig();
    return {
      frontend: config.urls.frontend,
      login: config.urls.login,
      dashboard: config.urls.dashboard,
      echeqs: `${config.urls.frontend}/echeqs`,
      discounts: `${config.urls.frontend}/discounts`,
      resetPassword: `${config.urls.frontend}/reset-password`,
    };
  }

  /**
   * Cargar template desde archivo
   */
  async loadTemplate(templateName) {
    try {
      // Verificar si el template está en caché
      if (this.templateCache.has(templateName)) {
        return this.templateCache.get(templateName);
      }

      const templatePath = path.join(
        templateConfig.templatesDir,
        `${templateName}.hbs`
      );
      const templateContent = await fs.readFile(templatePath, 'utf8');
      const template = handlebars.compile(templateContent);

      // Guardar en caché
      this.templateCache.set(templateName, template);

      return template;
    } catch (error) {
      console.error(`Error cargando template ${templateName}:`, error);
      throw new Error(`Template ${templateName} no encontrado`);
    }
  }

  /**
   * Cargar layout
   */
  async loadLayout(layoutName = 'main') {
    try {
      const layoutPath = path.join(
        templateConfig.handlebarsConfig.layoutsDir,
        `${layoutName}.hbs`
      );
      const layoutContent = await fs.readFile(layoutPath, 'utf8');
      return handlebars.compile(layoutContent);
    } catch (error) {
      console.error(`Error cargando layout ${layoutName}:`, error);
      // Retornar template simple si no hay layout
      return handlebars.compile('{{{body}}}');
    }
  }

  /**
   * Renderizar email con template y datos
   */
  async renderEmail(templateName, data, layoutName = 'main') {
    try {
      const template = await this.loadTemplate(templateName);
      const layout = await this.loadLayout(layoutName);

      // Renderizar contenido del template
      const body = template(data);

      // Renderizar con layout
      const html = layout({
        ...data,
        body,
        layout: layoutName,
      });

      return html;
    } catch (error) {
      console.error(`Error renderizando email ${templateName}:`, error);
      throw error;
    }
  }

  /**
   * Enviar email
   */
  async sendEmail(emailData) {
    try {
      const {
        to,
        subject,
        template,
        data = {},
        from = templateConfig.defaultFrom,
        replyTo = templateConfig.defaultReplyTo,
        attachments = [],
        tenant = null,
      } = emailData;

      // Validar datos requeridos
      if (!to || !subject || !template) {
        throw new Error('to, subject y template son requeridos');
      }

      // Aplicar branding del tenant si está disponible
      let emailDataWithBranding = { ...data };
      if (tenant && tenant.branding) {
        emailDataWithBranding = {
          ...emailDataWithBranding,
          tenant: {
            name: tenant.name,
            branding: tenant.branding,
          },
        };
      }

      // Renderizar email
      const html = await this.renderEmail(template, emailDataWithBranding);

      // Configurar opciones del email
      const mailOptions = {
        from: from,
        to: to,
        subject: subject,
        html: html,
        replyTo: replyTo,
      };

      // Agregar attachments si existen
      if (attachments && attachments.length > 0) {
        mailOptions.attachments = attachments;
      }

      // Enviar email
      const result = await this.transporter.sendMail(mailOptions);

      console.log(`Email enviado exitosamente a ${to}:`, result.messageId);

      return new ApiResponse(true, 'Email enviado exitosamente', {
        messageId: result.messageId,
        to: to,
        subject: subject,
      });
    } catch (error) {
      console.error('Error enviando email:', error);
      throw error;
    }
  }

  /**
   * Enviar email de bienvenida
   */
  async sendWelcomeEmail(user, tenant = null) {
    const emailData = {
      to: user.email,
      subject: 'Bienvenido a ECHEQ Platform',
      template: 'auth.welcome',
      data: {
        user: {
          name: user.companyName || user.email,
          email: user.email,
          role: user.role,
        },
        tenant: tenant
          ? {
              name: tenant.name,
              branding: tenant.branding,
            }
          : null,
        loginUrl: this.getEmailUrls().login,
      },
    };

    return await this.sendEmail(emailData);
  }

  /**
   * Enviar email de reset de contraseña
   */
  async sendPasswordResetEmail(user, resetToken, tenant = null) {
    const resetUrl = `${this.getEmailUrls().resetPassword}?token=${resetToken}`;

    const emailData = {
      to: user.email,
      subject: 'Restablecer Contraseña - ECHEQ Platform',
      template: 'auth.password_reset',
      data: {
        user: {
          name: user.companyName || user.email,
          email: user.email,
        },
        resetUrl: resetUrl,
        token: resetToken,
        expiresIn: '24 horas',
        tenant: tenant
          ? {
              name: tenant.name,
              branding: tenant.branding,
            }
          : null,
      },
    };

    return await this.sendEmail(emailData);
  }

  /**
   * Enviar email de ECHEQ emitido
   */
  async sendEcheqEmissionEmail(echeq, user, tenant = null) {
    const emailData = {
      to: user.email,
      subject: `ECHEQ Emitido - ${echeq.number}`,
      template: 'echeq.emission_created',
      data: {
        echeq: {
          number: echeq.number,
          amount: echeq.amount,
          currency: echeq.currency,
          issueDate: echeq.issueDate,
          dueDate: echeq.dueDate,
          issuer: echeq.issuer,
          beneficiary: echeq.beneficiary,
          status: echeq.status,
        },
        user: {
          name: user.companyName || user.email,
          email: user.email,
        },
        tenant: tenant
          ? {
              name: tenant.name,
              branding: tenant.branding,
            }
          : null,
        dashboardUrl: this.getEmailUrls().echeqs,
      },
    };

    return await this.sendEmail(emailData);
  }

  /**
   * Enviar email de ECHEQ aprobado
   */
  async sendEcheqApprovedEmail(echeq, user, approvedBy, tenant = null) {
    const emailData = {
      to: user.email,
      subject: `ECHEQ Aprobado - ${echeq.number}`,
      template: 'echeq.emission_approved',
      data: {
        echeq: {
          number: echeq.number,
          amount: echeq.amount,
          currency: echeq.currency,
          issueDate: echeq.issueDate,
          dueDate: echeq.dueDate,
          issuer: echeq.issuer,
          beneficiary: echeq.beneficiary,
        },
        user: {
          name: user.companyName || user.email,
          email: user.email,
        },
        approvedBy: {
          name: approvedBy.companyName || approvedBy.email,
          email: approvedBy.email,
        },
        tenant: tenant
          ? {
              name: tenant.name,
              branding: tenant.branding,
            }
          : null,
        dashboardUrl: this.getEmailUrls().echeqs,
      },
    };

    return await this.sendEmail(emailData);
  }

  /**
   * Enviar email de ECHEQ rechazado
   */
  async sendEcheqRejectedEmail(echeq, user, rejectedBy, reason, tenant = null) {
    const emailData = {
      to: user.email,
      subject: `ECHEQ Rechazado - ${echeq.number}`,
      template: 'echeq.emission_rejected',
      data: {
        echeq: {
          number: echeq.number,
          amount: echeq.amount,
          currency: echeq.currency,
          issueDate: echeq.issueDate,
          dueDate: echeq.dueDate,
          issuer: echeq.issuer,
          beneficiary: echeq.beneficiary,
        },
        user: {
          name: user.companyName || user.email,
          email: user.email,
        },
        rejectedBy: {
          name: rejectedBy.companyName || rejectedBy.email,
          email: rejectedBy.email,
        },
        reason: reason,
        tenant: tenant
          ? {
              name: tenant.name,
              branding: tenant.branding,
            }
          : null,
        dashboardUrl: this.getEmailUrls().echeqs,
      },
    };

    return await this.sendEmail(emailData);
  }

  /**
   * Enviar email de descuento aprobado
   */
  async sendDiscountApprovedEmail(discount, user, approvedBy, tenant = null) {
    const emailData = {
      to: user.email,
      subject: `Descuento Aprobado - ${discount.id}`,
      template: 'discount.request_approved',
      data: {
        discount: {
          id: discount.id,
          requestedAmount: discount.requested_amount,
          approvedAmount: discount.approved_amount,
          rate: discount.rate,
          requestedAt: discount.requested_at,
          approvedAt: discount.approved_at,
        },
        user: {
          name: user.companyName || user.email,
          email: user.email,
        },
        approvedBy: {
          name: approvedBy.companyName || approvedBy.email,
          email: approvedBy.email,
        },
        tenant: tenant
          ? {
              name: tenant.name,
              branding: tenant.branding,
            }
          : null,
        dashboardUrl: this.getEmailUrls().discounts,
      },
    };

    return await this.sendEmail(emailData);
  }

  /**
   * Enviar email de alerta de expiración
   */
  async sendExpirationWarningEmail(
    echeq,
    user,
    daysUntilExpiry,
    tenant = null
  ) {
    const emailData = {
      to: user.email,
      subject: `Alerta de Expiración - ECHEQ ${echeq.number}`,
      template: 'echeq.expiration_warning',
      data: {
        echeq: {
          number: echeq.number,
          amount: echeq.amount,
          currency: echeq.currency,
          dueDate: echeq.dueDate,
          issuer: echeq.issuer,
          beneficiary: echeq.beneficiary,
        },
        user: {
          name: user.companyName || user.email,
          email: user.email,
        },
        daysUntilExpiry: daysUntilExpiry,
        tenant: tenant
          ? {
              name: tenant.name,
              branding: tenant.branding,
            }
          : null,
        dashboardUrl: this.getEmailUrls().echeqs,
      },
    };

    return await this.sendEmail(emailData);
  }

  /**
   * Enviar email de tenant activado
   */
  async sendTenantActivatedEmail(tenant, adminUser) {
    const emailData = {
      to: adminUser.email,
      subject: `Tenant Activado - ${tenant.name}`,
      template: 'system.tenant_activated',
      data: {
        tenant: {
          name: tenant.name,
          code: tenant.code,
          activationDate: tenant.activationDate,
        },
        admin: {
          name: adminUser.companyName || adminUser.email,
          email: adminUser.email,
        },
        dashboardUrl: this.getEmailUrls().dashboard,
      },
    };

    return await this.sendEmail(emailData);
  }

  /**
   * Verificar conexión del transporter
   */
  async verifyConnection() {
    try {
      await this.transporter.verify();
      return new ApiResponse(
        true,
        'Conexión de email verificada correctamente'
      );
    } catch (error) {
      console.error('Error verificando conexión de email:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas de envío
   */
  async getEmailStats() {
    try {
      // En un entorno real, esto consultaría una base de datos
      // Por ahora, retornamos datos mock
      return new ApiResponse(true, 'Estadísticas de email obtenidas', {
        totalSent: 0,
        totalFailed: 0,
        successRate: 100,
        lastSent: null,
      });
    } catch (error) {
      console.error('Error obteniendo estadísticas de email:', error);
      throw error;
    }
  }
}

module.exports = new EmailService();
