/**
 * Seeder para Avales
 */

const { models } = require('./config');

async function seedGuarantees(tenants, echeqs) {
  console.log('🛡️ Insertando avales...');

  const guaranteesData = [
    {
      tenant_id: tenants.find(t => t.code === 'BANCO_DEMO').id,
      echeq_id: echeqs.find(e => e.number === 'SANDBOX-001').id,
      guarantee_type: 'TOTAL',
      guarantor_info: {
        name: 'Banco Demo S.A.',
        cuit: '30-12345678-9',
        contact: 'admin@bancodemo.com',
      },
      guarantee_amount: 100000.0,
      request_date: '2024-01-16',
      status: 'APROBADO',
      resolution_date: '2024-01-16',
    },
    {
      tenant_id: tenants.find(t => t.code === 'EMPRESA_TEST').id,
      echeq_id: echeqs.find(e => e.number === 'SANDBOX-004').id,
      guarantee_type: 'PARCIAL',
      guarantor_info: {
        name: 'Empresa Test S.A.',
        cuit: '30-11223344-5',
        contact: 'admin@empresatest.com',
      },
      guarantee_amount: 75000.0,
      request_date: '2024-02-02',
      status: 'PENDIENTE',
    },
  ];

  const guarantees = [];
  for (const guaranteeData of guaranteesData) {
    const [guarantee, created] = await models.Guarantee.findOrCreate({
      where: {
        tenant_id: guaranteeData.tenant_id,
        echeq_id: guaranteeData.echeq_id,
        guarantee_type: guaranteeData.guarantee_type,
      },
      defaults: guaranteeData,
    });
    guarantees.push(guarantee);
    console.log(
      `  ${created ? '✅ Creado' : '🔄 Actualizado'} aval para eCheq ${guaranteeData.echeq_id}`
    );
  }

  return guarantees;
}

module.exports = { seedGuarantees };
