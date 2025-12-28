/**
 * Seeder para Configuraciones COELSA
 */

const { models } = require('./config');

async function seedCoelsaConfigs(tenants) {
  console.log('⚙️ Insertando configuraciones COELSA...');

  const coelsaConfigsData = [
    {
      tenant_id: tenants.find(t => t.code === 'BANCO_DEMO').id,
      environment: 'sandbox',
      base_url: 'https://api-sandbox.coelsa.com.ar',
      api_key: 'sandbox_demo_key_123',
      api_secret: 'sandbox_demo_secret_123',
      timeout: 30000,
      max_retries: 3,
      retry_delay: 1000,
      endpoints: {
        validate: '/validate',
        custody: '/custody',
        payment: '/payment',
        return: '/return',
        mandate: '/mandate',
        guarantee: '/guarantee',
        ced: '/ced',
      },
      features: {
        digital_signature: false,
        hmac_auth: true,
        certificate_auth: false,
        idempotency: true,
        webhooks: false,
      },
      is_active: true,
      test_status: 'success',
      test_message: 'Conexión exitosa con simulador',
      created_by_info: {
        user: 'system',
        timestamp: new Date().toISOString(),
      },
    },
    {
      tenant_id: tenants.find(t => t.code === 'EMPRESA_TEST').id,
      environment: 'sandbox',
      base_url: 'https://api-sandbox.coelsa.com.ar',
      api_key: 'sandbox_test_key_456',
      api_secret: 'sandbox_test_secret_456',
      timeout: 30000,
      max_retries: 3,
      retry_delay: 1000,
      endpoints: {
        validate: '/validate',
        custody: '/custody',
        payment: '/payment',
        return: '/return',
        mandate: '/mandate',
        guarantee: '/guarantee',
        ced: '/ced',
      },
      features: {
        digital_signature: false,
        hmac_auth: true,
        certificate_auth: false,
        idempotency: true,
        webhooks: false,
      },
      is_active: true,
      test_status: 'success',
      test_message: 'Conexión exitosa con simulador',
      created_by_info: {
        user: 'system',
        timestamp: new Date().toISOString(),
      },
    },
  ];

  const coelsaConfigs = [];
  for (const configData of coelsaConfigsData) {
    const [config, created] = await models.CoelsaConfig.findOrCreate({
      where: { tenant_id: configData.tenant_id },
      defaults: configData,
    });
    coelsaConfigs.push(config);
    console.log(
      `  ${created ? '✅ Creada' : '🔄 Actualizada'} configuración COELSA para tenant`
    );
  }

  return coelsaConfigs;
}

module.exports = { seedCoelsaConfigs };
