/**
 * Seeder para Devoluciones
 */

const { models } = require('./config');

async function seedReturns(tenants, echeqs) {
  console.log('↩️ Insertando devoluciones...');

  const returnsData = [
    {
      tenant_id: tenants.find(t => t.code === 'BANCO_DEMO').id,
      echeq_id: echeqs.find(e => e.number === 'SANDBOX-003').id,
      reason: 'insufficient_funds',
      request_date: '2024-01-25',
      status: 'APROBADA',
      resolution_date: '2024-01-25',
      requester_info: {
        name: 'Banco Demo S.A.',
        cuit: '30-12345678-9',
        contact: 'admin@bancodemo.com',
      },
      approver_info: {
        name: 'COELSA',
        cuit: '30-00000000-0',
        contact: 'admin@coelsa.com',
      },
    },
    {
      tenant_id: tenants.find(t => t.code === 'EMPRESA_TEST').id,
      echeq_id: echeqs.find(e => e.number === 'SANDBOX-001').id,
      reason: 'cancelled_by_issuer',
      request_date: '2024-01-18',
      status: 'PENDIENTE',
      requester_info: {
        name: 'Empresa Test S.A.',
        cuit: '30-11223344-5',
        contact: 'admin@empresatest.com',
      },
    },
  ];

  const returns = [];
  for (const returnData of returnsData) {
    const [returnRecord, created] = await models.Return.findOrCreate({
      where: {
        tenant_id: returnData.tenant_id,
        echeq_id: returnData.echeq_id,
        reason: returnData.reason,
      },
      defaults: returnData,
    });
    returns.push(returnRecord);
    console.log(
      `  ${created ? '✅ Creada' : '🔄 Actualizada'} devolución para eCheq ${returnData.echeq_id}`
    );
  }

  return returns;
}

module.exports = { seedReturns };
