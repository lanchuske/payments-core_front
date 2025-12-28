/**
 * Seeder para Cuentas
 */

const { models } = require('./config');

async function seedAccounts(tenants, clients) {
  console.log('🏦 Insertando cuentas...');

  const accountsData = [
    {
      tenant_id: tenants.find(t => t.code === 'BANCO_DEMO').id,
      client_id: clients.find(c => c.tax_id === '30-12345678-9').id,
      cbu: '1234567890123456789012',
      account_number: '1234567890',
      account_type: 'CORRIENTE',
      currency: 'ARS',
      bank: 'Banco Demo',
      branch: 'Centro',
      issuance_config: {
        permite_emision: true,
        limite_emision_diaria: 1000000,
        limite_emision_individual: 100000,
        requiere_aprobacion: false,
        clausulas_permitidas: ['A_LA_ORDEN', 'NO_A_LA_ORDEN'],
      },
      status: 'ACTIVE',
      current_balance: 500000.0,
      available_balance: 500000.0,
    },
    {
      tenant_id: tenants.find(t => t.code === 'EMPRESA_TEST').id,
      client_id: clients.find(c => c.tax_id === '30-11223344-5').id,
      cbu: '1111222233334444555566',
      account_number: '1111222233',
      account_type: 'CORRIENTE',
      currency: 'ARS',
      bank: 'Banco Demo',
      branch: 'Centro',
      issuance_config: {
        permite_emision: true,
        limite_emision_diaria: 500000,
        limite_emision_individual: 50000,
        requiere_aprobacion: false,
        clausulas_permitidas: ['A_LA_ORDEN'],
      },
      status: 'ACTIVE',
      current_balance: 250000.0,
      available_balance: 250000.0,
    },
    {
      tenant_id: tenants.find(t => t.code === 'COMERCIAL_SANDBOX').id,
      client_id: clients.find(c => c.tax_id === '30-55667788-9').id,
      cbu: '5555666677778888999900',
      account_number: '5555666677',
      account_type: 'CORRIENTE',
      currency: 'ARS',
      bank: 'Banco Demo',
      branch: 'Centro',
      issuance_config: {
        permite_emision: true,
        limite_emision_diaria: 250000,
        limite_emision_individual: 25000,
        requiere_aprobacion: true,
        monto_minimo_aprobacion: 10000,
        clausulas_permitidas: ['A_LA_ORDEN'],
      },
      status: 'ACTIVE',
      current_balance: 100000.0,
      available_balance: 100000.0,
    },
  ];

  const accounts = [];
  for (const accountData of accountsData) {
    const [account, created] = await models.Account.findOrCreate({
      where: { cbu: accountData.cbu },
      defaults: accountData,
    });
    accounts.push(account);
    console.log(
      `  ${created ? '✅ Creada' : '🔄 Actualizada'} cuenta: ${account.cbu}`
    );
  }

  return accounts;
}

module.exports = { seedAccounts };
