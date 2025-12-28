/**
 * Controlador de Operaciones Masivas COELSA
 * Implementa los endpoints para operaciones masivas según especificación COELSA:
 * - POST /masivo/cuentas/alta - Alta masiva de cuentas
 * - POST /masivo/cheques/crear - Creación masiva de cheques
 * - POST /masivo/cheques/admitir - Admisión masiva de cheques
 */

// Importar modelos solo cuando sea necesario
let Echeq, Account, Tenant, echeqEvent;

try {
  const models = require('../models');
  Echeq = models.Echeq;
  Account = models.Account;
  Tenant = models.TenantSimple;
  echeqEvent = models.echeqEvent;
} catch (error) {
  console.log('⚠️ Modelos no disponibles:', error.message);
  // Crear objetos mock para desarrollo
  Echeq = {
    bulkCreate: () => Promise.resolve([]),
    findAll: () => Promise.resolve([]),
  };
  Account = {
    bulkCreate: () => Promise.resolve([]),
    findAll: () => Promise.resolve([]),
  };
  Tenant = { findOne: () => Promise.resolve(null) };
  echeqEvent = { bulkCreate: () => Promise.resolve([]) };
}

class CoelsaMasivoController {
  /**
   * POST /masivo/cuentas/alta
   * Alta masiva de cuentas
   */
  async altaCuentas(req, res) {
    try {
      const cuentas = req.body;
      const tenantId = req.coelsaAuth?.tenantId;

      if (!Array.isArray(cuentas) || cuentas.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Lista de cuentas es requerida'
        });
      }

      // Validar estructura de cuentas
      const cuentasValidas = cuentas.map(cuenta => ({
        account_number: cuenta.cuenta || cuenta.account_number,
        cuit: cuenta.cuit,
        // client_id: '141d7a76-e2fc-43f3-8ac6-53a2677b132c', // Comentado temporalmente por restricción FK
        tenant_id: tenantId,
        cbu: `20${(cuenta.cuenta || cuenta.account_number).toString().slice(0, 8)}${Math.random().toString().slice(2, 6)}`, // Generar CBU simulado (máximo 22 caracteres)
        account_type: 'CORRIENTE',
        currency: 'ARS',
        bank: 'Banco Sandbox', // Banco simulado
        branch: '001', // Sucursal simulada
        status: 'ACTIVE',
        created_at: new Date()
      }));

      // Crear cuentas masivamente
      const cuentasCreadas = await Account.bulkCreate(cuentasValidas);

      res.json({
        success: true,
        data: {
          total: cuentasCreadas.length,
          cuentas: cuentasCreadas.map(c => ({
            id: c.id,
            account_number: c.account_number,
            cuit: c.cuit,
            status: c.status
          }))
        },
        message: `${cuentasCreadas.length} cuentas creadas exitosamente`
      });
    } catch (error) {
      console.error('Error en alta masiva de cuentas:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * POST /masivo/cheques/crear
   * Creación masiva de cheques
   */
  async crearCheques(req, res) {
    try {
      const cheques = req.body;
      const tenantId = req.coelsaAuth?.tenantId;

      if (!Array.isArray(cheques) || cheques.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Lista de cheques es requerida'
        });
      }

      // Validar estructura de cheques
      const chequesValidos = cheques.map(cheque => ({
        tenant_id: tenantId,
        amount: cheque.monto || cheque.amount,
        currency: 'ARS',
        issue_date: new Date().toISOString().split('T')[0],
        due_date: cheque.fecha_vencimiento || cheque.due_date,
        issuer: cheque.emisor_nombre || cheque.issuer,
        beneficiary: cheque.beneficiario_nombre || cheque.beneficiary,
        issuer_cuit: cheque.emisor_cuit || cheque.issuer_cuit,
        beneficiary_cuit: cheque.beneficiario_cuit || cheque.beneficiary_cuit,
        status: 'EMITTED',
        concept: cheque.concepto || cheque.concept,
        created_at: new Date()
      }));

      // Crear cheques masivamente
      const chequesCreados = await Echeq.bulkCreate(chequesValidos);

      res.json({
        success: true,
        data: {
          total: chequesCreados.length,
          cheques: chequesCreados.map(c => ({
            id: c.id,
            number: c.number,
            amount: c.amount,
            status: c.status,
            issuer_cuit: c.issuer_cuit,
            beneficiary_cuit: c.beneficiary_cuit
          }))
        },
        message: `${chequesCreados.length} cheques creados exitosamente`
      });
    } catch (error) {
      console.error('Error en creación masiva de cheques:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * POST /masivo/cheques/admitir
   * Admisión masiva de cheques
   */
  async admitirCheques(req, res) {
    try {
      const { cheque_ids, beneficiario_documento } = req.body;
      const tenantId = req.coelsaAuth?.tenantId;

      if (!Array.isArray(cheque_ids) || cheque_ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Lista de IDs de cheques es requerida'
        });
      }

      if (!beneficiario_documento) {
        return res.status(400).json({
          success: false,
          message: 'Documento del beneficiario es requerido'
        });
      }

      // Buscar cheques
      const cheques = await Echeq.findAll({
        where: {
          id: cheque_ids,
          tenant_id: tenantId,
          status: 'EMITTED'
        }
      });

      if (cheques.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No se encontraron cheques válidos para admitir'
        });
      }

      // Actualizar cheques masivamente
      await Echeq.update(
        { 
          status: 'ACTIVE',
          admission_date: new Date()
        },
        {
          where: {
            id: cheque_ids,
            tenant_id: tenantId
          }
        }
      );

      res.json({
        success: true,
        data: {
          total: cheques.length,
          beneficiario_documento: beneficiario_documento,
          status: 'ACTIVE'
        },
        message: `${cheques.length} cheques admitidos exitosamente`
      });
    } catch (error) {
      console.error('Error en admisión masiva de cheques:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
}

module.exports = CoelsaMasivoController;
