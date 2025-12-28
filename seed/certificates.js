/**
 * Seeder para Certificados
 */

const { models } = require('./config');

async function seedCertificates(tenants, echeqs) {
  console.log('📜 Insertando certificados...');

  const certificatesData = [
    {
      tenant_id: tenants.find(t => t.code === 'BANCO_DEMO').id,
      echeq_id: echeqs.find(e => e.number === 'SANDBOX-001').id,
      certificate_type: 'CAC',
      certificate_number: 'CERT-001-2024',
      issue_date: '2024-01-15',
      expiry_date: '2024-12-31',
      validity_days: 30,
      status: 'ACTIVO',
    },
    {
      tenant_id: tenants.find(t => t.code === 'EMPRESA_TEST').id,
      echeq_id: echeqs.find(e => e.number === 'SANDBOX-004').id,
      certificate_type: 'CAC_FINAL',
      certificate_number: 'CERT-002-2024',
      issue_date: '2024-02-01',
      expiry_date: '2024-12-31',
      validity_days: 30,
      status: 'ACTIVO',
    },
  ];

  const certificates = [];
  for (const certificateData of certificatesData) {
    const [certificate, created] = await models.Certificate.findOrCreate({
      where: {
        tenant_id: certificateData.tenant_id,
        echeq_id: certificateData.echeq_id,
        certificate_number: certificateData.certificate_number,
      },
      defaults: certificateData,
    });
    certificates.push(certificate);
    console.log(
      `  ${created ? '✅ Creado' : '🔄 Actualizado'} certificado ${certificateData.certificate_number} para eCheq ${certificateData.echeq_id}`
    );
  }

  return certificates;
}

module.exports = { seedCertificates };
