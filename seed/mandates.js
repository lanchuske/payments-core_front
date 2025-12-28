/**
 * Seeder para Mandatos
 */

const { models } = require('./config');

async function seedMandates(tenants, echeqs) {
  console.log('📋 Insertando mandatos...');

  const mandatesData = [
    {
      tenant_id: tenants.find(t => t.code === 'COMERCIAL_SANDBOX').id,
      echeq_id: echeqs.find(e => e.number === 'SANDBOX-002').id,
      mandatary_info: {
        name: 'Banco Demo S.A.',
        cuit: '30-12345678-9',
        contact: 'admin@bancodemo.com',
      },
      mandate_type: 'PAYMENT_MANDATE',
      mandate_date: '2024-01-23',
      status: 'ACTIVE',
      observations: 'Mandato para procesamiento de pagos',
    },
    {
      tenant_id: tenants.find(t => t.code === 'EMPRESA_TEST').id,
      echeq_id: echeqs.find(e => e.number === 'SANDBOX-004').id,
      mandatary_info: {
        name: 'Banco Demo S.A.',
        cuit: '30-12345678-9',
        contact: 'admin@bancodemo.com',
      },
      mandate_type: 'COLLECTION_MANDATE',
      mandate_date: '2024-02-03',
      status: 'ACTIVE',
      observations: 'Mandato para procesamiento de cobranzas',
    },
  ];

  const mandates = [];
  for (const mandateData of mandatesData) {
    const [mandate, created] = await models.Mandate.findOrCreate({
      where: {
        tenant_id: mandateData.tenant_id,
        echeq_id: mandateData.echeq_id,
        mandate_type: mandateData.mandate_type,
      },
      defaults: mandateData,
    });
    mandates.push(mandate);
    console.log(
      `  ${created ? '✅ Creado' : '🔄 Actualizado'} mandato para eCheq ${mandateData.echeq_id}`
    );
  }

  return mandates;
}

module.exports = { seedMandates };
