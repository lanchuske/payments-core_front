/**
 * Seeder para Endosos
 */

const { models } = require('./config');

async function seedEndorsements(tenants, echeqs) {
  console.log('📝 Insertando endosos...');

  const endorsementsData = [
    {
      tenant_id: tenants.find(t => t.code === 'EMPRESA_TEST').id,
      echeq_id: echeqs.find(e => e.number === 'SANDBOX-001').id,
      type: 'NOMINAL',
      endorser: '30-11223344-5',
      endorsee: '30-55667788-9',
      endorsement_date: '2024-01-20',
      procurement_reason: 'payment_to_supplier',
      negotiation_bank: 'Banco Demo',
      status: 'ACTIVO',
    },
    {
      tenant_id: tenants.find(t => t.code === 'COMERCIAL_SANDBOX').id,
      echeq_id: echeqs.find(e => e.number === 'SANDBOX-002').id,
      type: 'NEGOCIACION',
      endorser: '30-55667788-9',
      endorsee: '30-12345678-9',
      endorsement_date: '2024-01-22',
      procurement_reason: 'partial_payment',
      negotiation_bank: 'Banco Demo',
      status: 'ACTIVO',
    },
  ];

  const endorsements = [];
  for (const endorsementData of endorsementsData) {
    const [endorsement, created] = await models.Endorsement.findOrCreate({
      where: {
        tenant_id: endorsementData.tenant_id,
        echeq_id: endorsementData.echeq_id,
        type: endorsementData.type,
      },
      defaults: endorsementData,
    });
    endorsements.push(endorsement);
    console.log(
      `  ${created ? '✅ Creado' : '🔄 Actualizado'} endoso para eCheq ${endorsementData.echeq_id}`
    );
  }

  return endorsements;
}

module.exports = { seedEndorsements };
