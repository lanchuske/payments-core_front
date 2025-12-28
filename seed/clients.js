/**
 * Seeder para Clientes
 */

const { models } = require('./config');

async function seedClients(tenants) {
  console.log('👥 Insertando clientes...');

  const clientsData = [
    // Cliente para Banco Demo
    {
      tenant_id: tenants.find(t => t.code === 'BANCO_DEMO').id,
      type: 'EMPRESA',
      tax_id: '30-12345678-9',
      business_name: 'Banco Demo S.A.',
      trade_name: 'Banco Demo',
      fiscal_address: {
        calle: 'Av. Demo 1234',
        ciudad: 'Buenos Aires',
        provincia: 'CABA',
        codigo_postal: '1000',
      },
      contacts: {
        email_principal: 'admin@bancodemo.com.ar',
        telefono_principal: '+5491145678901',
      },
      banking_data: {
        cbu_principal: '1234567890123456789012',
        banco_principal: 'Banco Demo',
      },
      operational_config: {
        permite_emision: true,
        permite_endoso: true,
        permite_custodia: true,
        permite_negociacion: false,
        limite_emision_diaria: 1000000,
        limite_emision_individual: 100000,
      },
      risk_classification: 'BAJO',
      status: 'ACTIVE',
    },
    // Cliente para Empresa Test
    {
      tenant_id: tenants.find(t => t.code === 'EMPRESA_TEST').id,
      type: 'EMPRESA',
      tax_id: '30-11223344-5',
      business_name: 'Empresa Test S.A.',
      trade_name: 'Empresa Test',
      fiscal_address: {
        calle: 'Av. Test 5678',
        ciudad: 'Buenos Aires',
        provincia: 'CABA',
        codigo_postal: '1000',
      },
      contacts: {
        email_principal: 'admin@empresatest.com.ar',
        telefono_principal: '+5491198765432',
      },
      banking_data: {
        cbu_principal: '1111222233334444555566',
        banco_principal: 'Banco Demo',
      },
      operational_config: {
        permite_emision: true,
        permite_endoso: true,
        permite_custodia: false,
        permite_negociacion: false,
        limite_emision_diaria: 500000,
        limite_emision_individual: 50000,
      },
      risk_classification: 'MEDIO',
      status: 'ACTIVE',
    },
    // Cliente para Comercial Sandbox
    {
      tenant_id: tenants.find(t => t.code === 'COMERCIAL_SANDBOX').id,
      type: 'EMPRESA',
      tax_id: '30-55667788-9',
      business_name: 'Comercial Sandbox S.R.L.',
      trade_name: 'Comercial Sandbox',
      fiscal_address: {
        calle: 'Av. Sandbox 9012',
        ciudad: 'Buenos Aires',
        provincia: 'CABA',
        codigo_postal: '1000',
      },
      contacts: {
        email_principal: 'admin@comercialsandbox.com.ar',
        telefono_principal: '+5491155566677',
      },
      banking_data: {
        cbu_principal: '5555666677778888999900',
        banco_principal: 'Banco Demo',
      },
      operational_config: {
        permite_emision: true,
        permite_endoso: false,
        permite_custodia: false,
        permite_negociacion: true,
        limite_emision_diaria: 250000,
        limite_emision_individual: 25000,
      },
      risk_classification: 'ALTO',
      status: 'ACTIVE',
    },
  ];

  const clients = [];
  for (const clientData of clientsData) {
    const [client, created] = await models.Client.findOrCreate({
      where: {
        tenant_id: clientData.tenant_id,
        tax_id: clientData.tax_id,
      },
      defaults: clientData,
    });
    clients.push(client);
    console.log(
      `  ${created ? '✅ Creado' : '🔄 Actualizado'} cliente: ${client.business_name}`
    );
  }

  return clients;
}

module.exports = { seedClients };
