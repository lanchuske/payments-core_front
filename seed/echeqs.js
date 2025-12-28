/**
 * Seeder para eCheqs
 */

const { models } = require('./config');

async function seedEcheqs(tenants, clients) {
  console.log('📄 Insertando eCheqs de prueba...');

  const echeqsData = [
    {
      tenant_id: tenants.find(t => t.code === 'EMPRESA_TEST').id,
      number: 'SANDBOX-001',
      amount: 100000.0,
      currency: 'ARS',
      issue_date: '2024-01-15',
      due_date: '2024-12-31',
      issuer: 'Empresa Test S.A.',
      beneficiary: 'Banco Demo S.A.',
      issuer_cuit: '30-11223344-5',
      beneficiary_cuit: '30-12345678-9',
      status: 'ACTIVE',
      customer_id: clients.find(c => c.tax_id === '30-11223344-5').id,
      validation_status: 'VALIDATED',
      validation_details: {
        validated_by: 'COELSA_SIMULATOR',
        validation_date: '2024-01-15T10:00:00Z',
        checks_passed: ['cuit_valid', 'amount_valid', 'date_valid'],
      },
      validated_at: '2024-01-15T10:00:00Z',
    },
    {
      tenant_id: tenants.find(t => t.code === 'COMERCIAL_SANDBOX').id,
      number: 'SANDBOX-002',
      amount: 50000.0,
      currency: 'ARS',
      issue_date: '2024-01-20',
      due_date: '2024-11-30',
      issuer: 'Comercial Sandbox S.R.L.',
      beneficiary: 'Empresa Test S.A.',
      issuer_cuit: '30-55667788-9',
      beneficiary_cuit: '30-11223344-5',
      status: 'PENDING_ACCEPTANCE',
      customer_id: clients.find(c => c.tax_id === '30-55667788-9').id,
      validation_status: 'PENDING',
      validation_details: {
        pending_checks: ['beneficiary_validation', 'amount_verification'],
      },
    },
    {
      tenant_id: tenants.find(t => t.code === 'BANCO_DEMO').id,
      number: 'SANDBOX-003',
      amount: 25000.0,
      currency: 'ARS',
      issue_date: '2024-01-25',
      due_date: '2024-10-31',
      issuer: 'Banco Demo S.A.',
      beneficiary: 'Comercial Sandbox S.R.L.',
      issuer_cuit: '30-12345678-9',
      beneficiary_cuit: '30-55667788-9',
      status: 'REJECTED',
      customer_id: clients.find(c => c.tax_id === '30-12345678-9').id,
      validation_status: 'INVALID',
      validation_details: {
        rejection_reason: 'insufficient_funds',
        rejected_by: 'COELSA_SIMULATOR',
        rejection_date: '2024-01-25T14:30:00Z',
      },
      validated_at: '2024-01-25T14:30:00Z',
    },
    {
      tenant_id: tenants.find(t => t.code === 'EMPRESA_TEST').id,
      number: 'SANDBOX-004',
      amount: 75000.0,
      currency: 'ARS',
      issue_date: '2024-02-01',
      due_date: '2024-09-15',
      issuer: 'Empresa Test S.A.',
      beneficiary: 'Banco Demo S.A.',
      issuer_cuit: '30-11223344-5',
      beneficiary_cuit: '30-12345678-9',
      status: 'ACCEPTED',
      customer_id: clients.find(c => c.tax_id === '30-11223344-5').id,
      validation_status: 'VALIDATED',
      validation_details: {
        validated_by: 'COELSA_SIMULATOR',
        validation_date: '2024-02-01T09:15:00Z',
        checks_passed: [
          'cuit_valid',
          'amount_valid',
          'date_valid',
          'beneficiary_valid',
        ],
      },
      validated_at: '2024-02-01T09:15:00Z',
    },
    {
      tenant_id: tenants.find(t => t.code === 'COMERCIAL_SANDBOX').id,
      number: 'SANDBOX-005',
      amount: 30000.0,
      currency: 'ARS',
      issue_date: '2024-02-05',
      due_date: '2024-09-30',
      issuer: 'Comercial Sandbox S.R.L.',
      beneficiary: 'Banco Demo S.A.',
      issuer_cuit: '30-55667788-9',
      beneficiary_cuit: '30-12345678-9',
      status: 'PAID',
      customer_id: clients.find(c => c.tax_id === '30-55667788-9').id,
      validation_status: 'VALIDATED',
      validation_details: {
        validated_by: 'COELSA_SIMULATOR',
        validation_date: '2024-02-05T11:45:00Z',
        checks_passed: [
          'cuit_valid',
          'amount_valid',
          'date_valid',
          'payment_processed',
        ],
      },
      validated_at: '2024-02-05T11:45:00Z',
    },
  ];

  const echeqs = [];
  for (const echeqData of echeqsData) {
    const [echeq, created] = await models.Echeq.findOrCreate({
      where: {
        tenant_id: echeqData.tenant_id,
        number: echeqData.number,
      },
      defaults: echeqData,
    });
    echeqs.push(echeq);
    console.log(
      `  ${created ? '✅ Creado' : '🔄 Actualizado'} eCheq: ${echeq.number}`
    );
  }

  return echeqs;
}

module.exports = { seedEcheqs };
