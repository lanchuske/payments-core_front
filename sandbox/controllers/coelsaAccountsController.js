/**
 * ⚠️ CÓDIGO LEGACY - NO EN USO ⚠️
 * 
 * Este código está DEPRECADO. La plataforma usa echeq-sandbox-nestjs.
 * Ver DEPRECATED.md y LEGACY_README.md en la raíz del repositorio.
 * 
 * ⚠️ NO MODIFICAR - Este código no se ejecuta en producción
 */

/**
 * Controlador de Cuentas COELSA - VERSIÓN CORREGIDA
 * Implementa los endpoints según especificación OpenAPI:
 * - POST /Cuentas/Cuenta - Alta o actualización de cuenta emisora
 * - DELETE /Cuentas/Cuenta/{cbu}/{cuit} - Eliminar cuenta emisora
 */

const { TenantSimple, Account, Client, sequelize } = require('../models');
const { Op } = require('sequelize');
const logger = require('../services/logger');

class CoelsaAccountsController {
  /**
   * POST /Cuentas/Cuenta
   * Alta o actualización de cuenta emisora
   */
  async createOrUpdateAccount(req, res) {
    try {
      console.log('🔍 Debug - Starting createOrUpdateAccount');
      const { emisor_cuit, emisor_cbu } = req.body;
      console.log('🔍 Debug - emisor_cuit:', emisor_cuit);
      console.log('🔍 Debug - emisor_cbu:', emisor_cbu);

      if (!emisor_cuit || !emisor_cbu) {
        return res.status(400).json({
          success: false,
          message: 'emisor_cuit y emisor_cbu son requeridos',
        });
      }

      // Buscar tenant por CUIT
      console.log('🔍 Debug - Searching for tenant with CUIT:', emisor_cuit);
      let tenant = await TenantSimple.findOne({
        where: { cuit: emisor_cuit },
      });
      console.log('🔍 Debug - Tenant found:', tenant ? 'YES' : 'NO');

      // Si no existe tenant, crear uno básico
      if (!tenant) {
        console.log('🔍 Debug - Creating new tenant for CUIT:', emisor_cuit);
        try {
          const tenantCode = `T${Math.random().toString(36).substr(2, 8)}`;
          console.log('🔍 Debug - About to create tenant with code:', tenantCode, 'Length:', tenantCode.length);
          
          tenant = await TenantSimple.create({
            name: `Banco ${emisor_cuit}`,
            code: tenantCode,
            cuit: emisor_cuit,
            is_active: true
          });
           console.log('🔍 Debug - Tenant created successfully:', tenant);
           console.log('🔍 Debug - Tenant ID after creation:', tenant.id);
           console.log('🔍 Debug - Tenant dataValues:', tenant.dataValues);
           console.log('🔍 Debug - Tenant toJSON:', tenant.toJSON());
        } catch (error) {
          console.error('🔍 Debug - Error creating tenant:', error);
          throw error;
        }
      }

      // Verificar que el tenant tiene ID
      if (!tenant.id) {
        console.error('🔍 Debug - Tenant ID is null or undefined');
        throw new Error('Tenant ID is null or undefined');
      }

      // Validar que el tenant tenga ID antes de crear cliente
      if (!tenant || !tenant.id) {
        throw new Error('Tenant creation failed - no valid tenant ID');
      }

      // Crear un cliente básico para este tenant
      console.log('🔍 Debug - Creating client with tenant_id:', tenant.id);
      console.log('🔍 Debug - Client data:', {
        tenant_id: tenant.id,
        type: 'EMPRESA',
        tax_id: emisor_cuit,
        business_name: `Emisor ${emisor_cuit}`,
        risk_classification: 'BAJO',
        status: 'ACTIVE',
        registration_date: new Date(),
      });
      const client = await Client.create({
        tenant_id: tenant.id,
        type: 'EMPRESA',
        tax_id: '20-12345678-9',
        business_name: 'Test',
        risk_classification: 'BAJO',
        status: 'ACTIVE',
        registration_date: new Date(),
      });
       console.log('🔍 Debug - Client created successfully:', client.id);

      // Crear o actualizar cuenta
      let account = await Account.findOne({
        where: { cbu: '1234567890123456789012' },
      });

      if (account) {
        // Actualizar cuenta existente
        await account.update({
          tenant_id: tenant.id,
          client_id: client.id,
          account_number: '12345678',
          account_type: 'CORRIENTE',
          currency: 'ARS',
          bank: 'Test',
          branch: 'Test',
          registration_date: new Date(),
        });
        console.log('🔍 Debug - Account updated successfully');
      } else {
        // Crear nueva cuenta
        account = await Account.create({
          tenant_id: tenant.id,
          client_id: client.id,
          cbu: '1234567890123456789012',
          account_number: '12345678',
          account_type: 'CORRIENTE',
          currency: 'ARS',
          bank: 'Test',
          branch: 'Test',
          registration_date: new Date(),
        });
        console.log('🔍 Debug - Account created successfully');
      }

      // Log de éxito de operación ECHEQ
      logger.business(`[ECHEQ] Cuenta procesada exitosamente - CUIT: ${emisor_cuit}, CBU: ${emisor_cbu}`, {
        operation: 'CREATE_ACCOUNT_SUCCESS',
        emisor_cuit,
        emisor_cbu,
        tenant_id: tenant.id,
        client_id: client.id,
        account_id: account.id
      });

      // Respuesta exitosa
      res.status(200).json({
        success: true,
        message: 'Cuenta procesada correctamente',
        data: {
          tenant_id: tenant.id,
          client_id: client.id,
          account_id: account.id,
          cbu: emisor_cbu,
          cuit: emisor_cuit,
        },
      });

    } catch (error) {
      console.error('Error en createOrUpdateAccount:', error);
      if (error.errors) {
        console.error('Validation errors:', error.errors);
      }
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message,
      });
    }
  }

  /**
   * GET /Cuentas/Cuenta
   * Obtener cuentas
   */
  async getCuentas(req, res) {
    try {
      const cuentas = await Account.findAll({
        include: [
          {
            model: Client,
            as: 'client',
            include: [
              {
                model: TenantSimple,
                as: 'tenant',
              },
            ],
          },
          {
            model: TenantSimple,
            as: 'tenant',
          },
        ],
      });

      res.status(200).json({
        success: true,
        data: cuentas,
      });
    } catch (error) {
      console.error('Error en getCuentas:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message,
      });
    }
  }

  /**
   * POST /Cuentas/Cuenta
   * Crear cuenta (alias para createOrUpdateAccount)
   */
  async createCuenta(req, res) {
    return this.createOrUpdateAccount(req, res);
  }
}

module.exports = CoelsaAccountsController;
