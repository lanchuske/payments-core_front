/**
 * Seeder para Descuentos
 */

const { models } = require('./config');

async function seedDiscounts(tenants, clients, echeqs) {
  console.log('💰 Insertando descuentos...');

  const discountsData = [
    {
      tenant_id: tenants.find(t => t.code === 'COMERCIAL_SANDBOX').id,
      echeq_id: echeqs.find(e => e.number === 'SANDBOX-002').id,
      customer_id: clients.find(c => c.tax_id === '30-55667788-9').id,
      requested_amount: 45000.0,
      approved_amount: 40000.0,
      rate: 0.1,
      status: 'PENDING',
    },
    {
      tenant_id: tenants.find(t => t.code === 'EMPRESA_TEST').id,
      echeq_id: echeqs.find(e => e.number === 'SANDBOX-004').id,
      customer_id: clients.find(c => c.tax_id === '30-11223344-5').id,
      requested_amount: 70000.0,
      approved_amount: 65000.0,
      rate: 0.067,
      status: 'APPROVED',
    },
  ];

  const discounts = [];
  for (const discountData of discountsData) {
    const [discount, created] = await models.Discount.findOrCreate({
      where: {
        tenant_id: discountData.tenant_id,
        echeq_id: discountData.echeq_id,
      },
      defaults: discountData,
    });
    discounts.push(discount);
    console.log(
      `  ${created ? '✅ Creado' : '🔄 Actualizado'} descuento para eCheq ${discountData.echeq_id}`
    );
  }

  return discounts;
}

module.exports = { seedDiscounts };
