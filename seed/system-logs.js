/**
 * Seeder para Logs del Sistema
 */

const { models } = require('./config');

async function seedSystemLogs(seedResults) {
  console.log('📋 Insertando logs del sistema...');

  const systemLogsData = [
    {
      timestamp: new Date(),
      level: 'INFO',
      service: 'SANDBOX_SEED',
      message: 'Datos de prueba insertados exitosamente',
      action: 'SEED_DATA',
      details: {
        tenants_created: seedResults.tenants.length,
        clients_created: seedResults.clients.length,
        accounts_created: seedResults.accounts.length,
        echeqs_created: seedResults.echeqs.length,
        custodies_created: seedResults.custodies.length,
        discounts_created: seedResults.discounts.length,
        endorsements_created: seedResults.endorsements.length,
        certificates_created: seedResults.certificates.length,
        returns_created: seedResults.returns.length,
        assignments_created: seedResults.assignments.length,
        guarantees_created: seedResults.guarantees.length,
        mandates_created: seedResults.mandates.length,
        notifications_created: seedResults.notifications.length,
      },
      metadata: {
        seed_version: '3.0.0',
        environment: 'sandbox',
      },
    },
    {
      timestamp: new Date(),
      level: 'INFO',
      service: 'SANDBOX_SEED',
      message: 'API keys generadas automáticamente para todos los tenants',
      action: 'GENERATE_API_KEYS',
      details: {
        tenants_with_keys: seedResults.tenants.length,
        keys_generated: seedResults.tenants.length,
      },
      metadata: {
        seed_version: '3.0.0',
        environment: 'sandbox',
      },
    },
    {
      timestamp: new Date(),
      level: 'INFO',
      service: 'SANDBOX_SEED',
      message: 'Seeding COMPLETO de todos los modelos finalizado',
      action: 'SEED_COMPLETE',
      details: {
        total_models_seeded: 16,
        total_records: Object.values(seedResults).reduce(
          (total, arr) => total + arr.length,
          0
        ),
      },
      metadata: {
        seed_version: '3.0.0',
        environment: 'sandbox',
      },
    },
  ];

  const systemLogs = [];
  for (const logData of systemLogsData) {
    const log = await models.SystemLog.create(logData);
    systemLogs.push(log);
  }
  console.log('✅ Logs del sistema insertados');

  return systemLogs;
}

module.exports = { seedSystemLogs };
