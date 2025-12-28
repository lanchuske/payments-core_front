/**
 * Servicio de Envío de Emails (TypeScript)
 * Gestiona el envío de emails usando templates y configuración multi-tenant
 */

import * as nodemailer from 'nodemailer';
import * as handlebars from 'handlebars';
import { promises as fs } from 'fs';
import * as path from 'path';
import { createTransporter, templateConfig } from '../config/email';
import { ApiResponse } from '../utils/apiResponse';
import { getSandboxConfig } from '../config/urls';

// Interfaces para el servicio de email
export interface EmailUrls {
  frontend: string;
  login: string;
  dashboard: string;
  echeqs: string;
  discounts: string;
  resetPassword: string;
}

export interface EmailTemplate {
  name: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailData {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  attachments?: any[];
}

export interface TenantEmailData {
  tenant_name: string;
  tenant_code: string;
  tenant_cuit: string;
  api_key?: string;
  api_secret?: string;
  generated_at?: string;
}

export interface EcheqEmailData {
  echeq_id: string;
  monto: number;
  beneficiario: string;
  fecha_emision: string;
  fecha_vencimiento: string;
  estado: string;
}

export interface DiscountEmailData {
  discount_id: string;
  echeq_id: string;
  monto_descuento: number;
  fecha_descuento: string;
  status: string;
}

export interface NotificationEmailData {
  type: string;
  title: string;
  message: string;
  timestamp: string;
  priority: 'low' | 'medium' | 'high';
}

class EmailService {
  private transporter: nodemailer.Transporter;
  private templates: Map<string, handlebars.TemplateDelegate>;
  private templateCache: Map<string, string>;

  constructor() {
    this.transporter = createTransporter();
    this.templates = new Map();
    this.templateCache = new Map();
  }

  /**
   * Obtener URLs dinámicas para emails
   */
  getEmailUrls(): EmailUrls {
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
  async loadTemplate(templateName: string): Promise<string> {
    try {
      // Verificar si el template está en caché
      if (this.templateCache.has(templateName)) {
        return this.templateCache.get(templateName)!;
      }

      const templatePath = path.join(
        templateConfig.templatesDir,
        `${templateName}.hbs`
      );
      const templateContent = await fs.readFile(templatePath, 'utf8');
      
      // Guardar en caché
      this.templateCache.set(templateName, templateContent);
      return templateContent;
    } catch (error) {
      console.error(`Error cargando template ${templateName}:`, error);
      throw new Error(`Template ${templateName} no encontrado`);
    }
  }

  /**
   * Compilar template con Handlebars
   */
  async compileTemplate(templateName: string, data: any): Promise<string> {
    try {
      // Verificar si el template ya está compilado
      if (this.templates.has(templateName)) {
        const template = this.templates.get(templateName)!;
        return template(data);
      }

      // Cargar y compilar template
      const templateContent = await this.loadTemplate(templateName);
      const template = handlebars.compile(templateContent);
      
      // Guardar template compilado
      this.templates.set(templateName, template);
      return template(data);
    } catch (error) {
      console.error(`Error compilando template ${templateName}:`, error);
      throw new Error(`Error compilando template ${templateName}`);
    }
  }

  /**
   * Enviar email simple
   */
  async sendEmail(emailData: EmailData): Promise<ApiResponse> {
    try {
      const mailOptions: any = {
        from: emailData.from || templateConfig.from,
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text,
        attachments: emailData.attachments,
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      return new ApiResponse(
        true,
        'Email enviado exitosamente',
        {
          messageId: result.messageId,
          accepted: result.accepted,
          rejected: result.rejected,
        },
        null
      );
    } catch (error) {
      console.error('Error enviando email:', error);
      return new ApiResponse(
        false,
        error instanceof Error ? error.message : 'Error enviando email',
        null,
        'EMAIL_SEND_ERROR'
      );
    }
  }

  /**
   * Enviar email de bienvenida para tenant
   */
  async sendTenantWelcomeEmail(
    tenantData: TenantEmailData,
    email: string
  ): Promise<ApiResponse> {
    try {
      const urls = this.getEmailUrls();
      const templateData = {
        ...tenantData,
        ...urls,
        email,
        current_year: new Date().getFullYear(),
      };

      const html = await this.compileTemplate('tenant-welcome', templateData);
      const subject = `Bienvenido a ECHEQ Sandbox - ${tenantData.tenant_name}`;

      return await this.sendEmail({
        to: email,
        subject,
        html,
      });
    } catch (error) {
      console.error('Error enviando email de bienvenida:', error);
      return new ApiResponse(
        false,
        error instanceof Error ? error.message : 'Error enviando email de bienvenida',
        null,
        'TENANT_WELCOME_EMAIL_ERROR'
      );
    }
  }

  /**
   * Enviar email de credenciales generadas
   */
  async sendCredentialsEmail(
    tenantData: TenantEmailData,
    email: string
  ): Promise<ApiResponse> {
    try {
      const urls = this.getEmailUrls();
      const templateData = {
        ...tenantData,
        ...urls,
        email,
        current_year: new Date().getFullYear(),
      };

      const html = await this.compileTemplate('credentials-generated', templateData);
      const subject = `Credenciales API generadas - ${tenantData.tenant_name}`;

      return await this.sendEmail({
        to: email,
        subject,
        html,
      });
    } catch (error) {
      console.error('Error enviando email de credenciales:', error);
      return new ApiResponse(
        false,
        error instanceof Error ? error.message : 'Error enviando email de credenciales',
        null,
        'CREDENTIALS_EMAIL_ERROR'
      );
    }
  }

  /**
   * Enviar email de notificación de ECHEQ
   */
  async sendEcheqNotificationEmail(
    echeqData: EcheqEmailData,
    email: string,
    tenantName: string
  ): Promise<ApiResponse> {
    try {
      const urls = this.getEmailUrls();
      const templateData = {
        ...echeqData,
        ...urls,
        email,
        tenant_name: tenantName,
        current_year: new Date().getFullYear(),
      };

      const html = await this.compileTemplate('echeq-notification', templateData);
      const subject = `Notificación de ECHEQ - ${echeqData.echeq_id}`;

      return await this.sendEmail({
        to: email,
        subject,
        html,
      });
    } catch (error) {
      console.error('Error enviando email de notificación ECHEQ:', error);
      return new ApiResponse(
        false,
        error instanceof Error ? error.message : 'Error enviando email de notificación',
        null,
        'ECHEQ_NOTIFICATION_EMAIL_ERROR'
      );
    }
  }

  /**
   * Enviar email de notificación de descuento
   */
  async sendDiscountNotificationEmail(
    discountData: DiscountEmailData,
    email: string,
    tenantName: string
  ): Promise<ApiResponse> {
    try {
      const urls = this.getEmailUrls();
      const templateData = {
        ...discountData,
        ...urls,
        email,
        tenant_name: tenantName,
        current_year: new Date().getFullYear(),
      };

      const html = await this.compileTemplate('discount-notification', templateData);
      const subject = `Notificación de Descuento - ${discountData.discount_id}`;

      return await this.sendEmail({
        to: email,
        subject,
        html,
      });
    } catch (error) {
      console.error('Error enviando email de notificación de descuento:', error);
      return new ApiResponse(
        false,
        error instanceof Error ? error.message : 'Error enviando email de notificación de descuento',
        null,
        'DISCOUNT_NOTIFICATION_EMAIL_ERROR'
      );
    }
  }

  /**
   * Enviar email de notificación general
   */
  async sendNotificationEmail(
    notificationData: NotificationEmailData,
    email: string,
    tenantName: string
  ): Promise<ApiResponse> {
    try {
      const urls = this.getEmailUrls();
      const templateData = {
        ...notificationData,
        ...urls,
        email,
        tenant_name: tenantName,
        current_year: new Date().getFullYear(),
      };

      const html = await this.compileTemplate('general-notification', templateData);
      const subject = `${notificationData.title} - ${tenantName}`;

      return await this.sendEmail({
        to: email,
        subject,
        html,
      });
    } catch (error) {
      console.error('Error enviando email de notificación general:', error);
      return new ApiResponse(
        false,
        error instanceof Error ? error.message : 'Error enviando email de notificación general',
        null,
        'GENERAL_NOTIFICATION_EMAIL_ERROR'
      );
    }
  }

  /**
   * Verificar configuración del servicio
   */
  async verifyConfiguration(): Promise<ApiResponse> {
    try {
      await this.transporter.verify();
      return new ApiResponse(
        true,
        'Configuración de email verificada correctamente',
        null,
        null
      );
    } catch (error) {
      console.error('Error verificando configuración de email:', error);
      return new ApiResponse(
        false,
        error instanceof Error ? error.message : 'Error verificando configuración de email',
        null,
        'EMAIL_CONFIG_VERIFICATION_ERROR'
      );
    }
  }

  /**
   * Limpiar caché de templates
   */
  clearTemplateCache(): void {
    this.templates.clear();
    this.templateCache.clear();
  }

  /**
   * Obtener estadísticas del servicio
   */
  getServiceStats(): Record<string, any> {
    return {
      templatesLoaded: this.templates.size,
      templatesCached: this.templateCache.size,
      transporterConfigured: !!this.transporter,
    };
  }
}

export default new EmailService();
