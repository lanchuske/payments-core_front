/**
 * Seeder para Custodias
 */

const { models } = require('./config');

async function seedCustodies(tenants, clients, echeqs) {
  console.log('🏦 Insertando custodias...');

  const custodiesData = [
    {
      tenant_id: tenants.find(t => t.code === 'BANCO_DEMO').id,
      echeq_id: echeqs.find(e => e.number === 'SANDBOX-001').id,
      customer_id: clients.find(c => c.tax_id === '30-12345678-9').id,
      custody_date: '2024-01-15',
      status: 'IN_CUSTODY',
    },
    {
      tenant_id: tenants.find(t => t.code === 'EMPRESA_TEST').id,
      echeq_id: echeqs.find(e => e.number === 'SANDBOX-004').id,
      customer_id: clients.find(c => c.tax_id === '30-11223344-5').id,
      custody_date: '2024-02-01',
      status: 'IN_CUSTODY',
    },
  ];

  const custodies = [];
  for (const custodyData of custodiesData) {
    const [custody, created] = await models.Custody.findOrCreate({
      where: {
        tenant_id: custodyData.tenant_id,
        echeq_id: custodyData.echeq_id,
      },
      defaults: custodyData,
    });
    custodies.push(custody);
    console.log(
      `  ${created ? '✅ Creada' : '🔄 Actualizada'} custodia para eCheq ${custodyData.echeq_id}`
    );
  }

  return custodies;
}

module.exports = { seedCustodies };
