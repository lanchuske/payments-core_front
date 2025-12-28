/**
 * Seeder para Eventos de eCheqs
 */

const { models } = require('./config');

async function seedEcheqEvents(echeqs) {
  console.log('📝 Insertando eventos de eCheqs...');

  const echeqEventsData = [
    {
      echeq_id: echeqs.find(e => e.number === 'SANDBOX-001').id,
      event_type: 'EMISSION',
      event_status: 'SUCCESS',
      event_description: 'eCheq emitido exitosamente',
      event_data: {
        issuer: 'Empresa Test S.A.',
        beneficiary: 'Banco Demo S.A.',
        amount: 100000,
        currency: 'ARS',
      },
      user_cuit: '30-11223344-5',
      timestamp: new Date(),
    },
    {
      echeq_id: echeqs.find(e => e.number === 'SANDBOX-002').id,
      event_type: 'VALIDATION',
      event_status: 'PENDING',
      event_description: 'eCheq en proceso de validación',
      event_data: {
        validation_steps: ['cuit_check', 'amount_check', 'date_check'],
        current_step: 'amount_check',
      },
      user_cuit: '30-55667788-9',
      timestamp: new Date(),
    },
    {
      echeq_id: echeqs.find(e => e.number === 'SANDBOX-003').id,
      event_type: 'REJECTION',
      event_status: 'FAILED',
      event_description: 'eCheq rechazado por falta de fondos',
      event_data: {
        rejection_reason: 'insufficient_funds',
        rejected_by: 'COELSA_SIMULATOR',
        rejection_code: 'FUNDS_001',
      },
      user_cuit: '30-12345678-9',
      timestamp: new Date(),
    },
    {
      echeq_id: echeqs.find(e => e.number === 'SANDBOX-004').id,
      event_type: 'ACCEPTANCE',
      event_status: 'SUCCESS',
      event_description: 'eCheq aceptado por beneficiario',
      event_data: {
        accepted_by: 'Comercial Sandbox S.R.L.',
        acceptance_date: '2024-02-01T10:30:00Z',
      },
      user_cuit: '30-55667788-9',
      timestamp: new Date(),
    },
    {
      echeq_id: echeqs.find(e => e.number === 'SANDBOX-005').id,
      event_type: 'PAYMENT',
      event_status: 'SUCCESS',
      event_description: 'eCheq pagado exitosamente',
      event_data: {
        payment_date: '2024-02-10T16:20:00Z',
        payment_method: 'bank_transfer',
        payment_reference: 'PAY-2024-001',
      },
      user_cuit: '30-55667788-9',
      timestamp: new Date(),
    },
  ];

  const echeqEvents = [];
  for (const eventData of echeqEventsData) {
    const [event, created] = await models.echeqEvent.findOrCreate({
      where: {
        echeq_id: eventData.echeq_id,
        event_type: eventData.event_type,
        timestamp: eventData.timestamp,
      },
      defaults: eventData,
    });
    echeqEvents.push(event);
    console.log(
      `  ${created ? '✅ Creado' : '🔄 Actualizado'} evento: ${eventData.event_type} para echeq_id: ${eventData.echeq_id}`
    );
  }

  return echeqEvents;
}

module.exports = { seedEcheqEvents };
