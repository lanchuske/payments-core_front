/**
 * Seeder para Tenants
 */

const { models, TENANTS_DATA, createSandboxCredentials } = require('./config');

async function seedTenants() {
  console.log('🏢 Insertando tenants para sandbox...');

  const tenants = [];
  for (const tenantData of TENANTS_DATA) {
    const [tenant, created] = await models.TenantSimple.findOrCreate({
      where: { code: tenantData.code },
      defaults: tenantData,
    });

    // Generar API keys para el tenant
    const sandboxCredentials = createSandboxCredentials(
      tenant,
      tenantData.sandbox_credentials
    );
    await tenant.update({ sandbox_credentials: sandboxCredentials });

    tenants.push(tenant);
    console.log(
      `  ${created ? '✅ Creado' : '🔄 Actualizado'} tenant: ${tenant.code}`
    );
    console.log(`    API Key: ${sandboxCredentials.api_key}`);
    console.log(`    API Secret: ${sandboxCredentials.api_secret}`);
  }

  return tenants;
}

module.exports = { seedTenants };
