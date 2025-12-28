/**
 * Seeder para Cesiones
 */

const { models } = require('./config');

async function seedAssignments(tenants, echeqs) {
  console.log('📋 Insertando cesiones...');

  const assignmentsData = [
    {
      tenant_id: tenants.find(t => t.code === 'COMERCIAL_SANDBOX').id,
      echeq_id: echeqs.find(e => e.number === 'SANDBOX-002').id,
      assignment_type: 'TOTAL',
      assignor_info: {
        name: 'Comercial Sandbox S.R.L.',
        cuit: '30-55667788-9',
        contact: 'admin@comercialsandbox.com',
      },
      assignee_info: {
        name: 'Empresa Test S.A.',
        cuit: '30-11223344-5',
        contact: 'admin@empresatest.com',
      },
      assignment_date: '2024-01-22',
      assignment_amount: 50000.0,
      status: 'APROBADA',
    },
    {
      tenant_id: tenants.find(t => t.code === 'EMPRESA_TEST').id,
      echeq_id: echeqs.find(e => e.number === 'SANDBOX-004').id,
      assignment_type: 'PARCIAL',
      assignor_info: {
        name: 'Empresa Test S.A.',
        cuit: '30-11223344-5',
        contact: 'admin@empresatest.com',
      },
      assignee_info: {
        name: 'Banco Demo S.A.',
        cuit: '30-12345678-9',
        contact: 'admin@bancodemo.com',
      },
      assignment_date: '2024-02-05',
      assignment_amount: 50000.0,
      status: 'PENDIENTE',
    },
  ];

  const assignments = [];
  for (const assignmentData of assignmentsData) {
    const [assignment, created] = await models.Assignment.findOrCreate({
      where: {
        tenant_id: assignmentData.tenant_id,
        echeq_id: assignmentData.echeq_id,
        assignment_type: assignmentData.assignment_type,
      },
      defaults: assignmentData,
    });
    assignments.push(assignment);
    console.log(
      `  ${created ? '✅ Creada' : '🔄 Actualizada'} cesión para eCheq ${assignmentData.echeq_id}`
    );
  }

  return assignments;
}

module.exports = { seedAssignments };
