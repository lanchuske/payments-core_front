/**
 * Controlador de Cuentas COELSA - VERSIÓN CORREGIDA
 * Implementa los endpoints según especificación OpenAPI:
 * - POST /Cuentas/Cuenta - Alta o actualización de cuenta emisora
 * - DELETE /Cuentas/Cuenta/{cbu}/{cuit} - Eliminar cuenta emisora
 */

const { TenantSimple, Account, Client, sequelize } = require('../models');
const { Op } = require('sequelize');

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
          const tenantCode = `TEN-${emisor_cuit}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${Math.random().toString(36).substr(2, 5)}-${Math.random().toString(36).substr(2, 3)}`;
          console.log('🔍 Debug - About to create tenant with code:', tenantCode);
          
          tenant = await TenantSimple.create({
            name: `Emisor ${emisor_cuit}`,
            code: tenantCode,
            cuit: emisor_cuit,
            sandbox_credentials: {
              api_key: `key_${emisor_cuit}`,
              api_secret: `secret_${emisor_cuit}`,
              type: 'EMPRESA',
            },
          });
          console.log('🔍 Debug - Tenant created successfully:', tenant);
          console.log('🔍 Debug - Tenant ID after creation:', tenant.id);
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

      // Crear un cliente básico para este tenant
      console.log('🔍 Debug - Creating client with tenant_id:', tenant.id);
      const client = await Client.create({
        tenant_id: tenant.id,
        type: 'EMPRESA',
        tax_id: `${emisor_cuit.slice(0, 2)}-${emisor_cuit.slice(2, 10)}-${emisor_cuit.slice(10)}`,
        business_name: `Emisor ${emisor_cuit}`,
        risk_classification: 'BAJO',
        status: 'ACTIVE',
        registration_date: new Date(),
      });
      console.log('🔍 Debug - Client created successfully:', client.id);

      // Crear o actualizar cuenta
      let account = await Account.findOne({
        where: { cbu: emisor_cbu },
      });

      if (account) {
        // Actualizar cuenta existente
        await account.update({
          client_id: client.id,
          account_number: emisor_cbu.slice(-8),
          account_type: 'CORRIENTE',
          currency: 'ARS',
          bank: 'BANCO_SANDBOX',
          branch: '001',
          registration_date: new Date(),
        });
        console.log('🔍 Debug - Account updated successfully');
      } else {
        // Crear nueva cuenta
        account = await Account.create({
          client_id: client.id,
          cbu: emisor_cbu,
          account_number: emisor_cbu.slice(-8),
          account_type: 'CORRIENTE',
          currency: 'ARS',
          bank: 'BANCO_SANDBOX',
          branch: '001',
          registration_date: new Date(),
        });
        console.log('🔍 Debug - Account created successfully');
      }

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
            include: [
              {
                model: TenantSimple,
                as: 'tenant',
              },
            ],
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
