/**
 * Seeder para Notificaciones
 */

const { models } = require('./config');

async function seedNotifications(tenants) {
  console.log('📢 Insertando notificaciones...');

  const notificationsData = [
    {
      tenant_id: tenants.find(t => t.code === 'BANCO_DEMO').id,
      entity_info: {
        name: 'Banco Demo S.A.',
        cuit: '30-12345678-9',
        contact: 'admin@bancodemo.com',
      },
      type: 'SUCCESS',
      title: 'eCheq Validado Exitosamente',
      message:
        'El eCheq SANDBOX-001 ha sido validado y está disponible para procesamiento.',
      created_date: '2024-01-15',
      status: 'LEIDA',
      priority: 'ALTA',
    },
    {
      tenant_id: tenants.find(t => t.code === 'EMPRESA_TEST').id,
      entity_info: {
        name: 'Empresa Test S.A.',
        cuit: '30-11223344-5',
        contact: 'admin@empresatest.com',
      },
      type: 'WARNING',
      title: 'Recordatorio de Pago',
      message:
        'El eCheq SANDBOX-004 vence en 30 días. Por favor, proceda con el pago.',
      created_date: '2024-08-16',
      status: 'PENDIENTE',
      priority: 'MEDIA',
    },
    {
      tenant_id: tenants.find(t => t.code === 'COMERCIAL_SANDBOX').id,
      entity_info: {
        name: 'Comercial Sandbox S.R.L.',
        cuit: '30-55667788-9',
        contact: 'admin@comercialsandbox.com',
      },
      type: 'ERROR',
      title: 'Error en Procesamiento',
      message:
        'Se ha detectado un error en el procesamiento del eCheq SANDBOX-002.',
      created_date: '2024-01-20',
      status: 'LEIDA',
      priority: 'ALTA',
    },
  ];

  const notifications = [];
  for (const notificationData of notificationsData) {
    const [notification, created] = await models.Notification.findOrCreate({
      where: {
        tenant_id: notificationData.tenant_id,
        type: notificationData.type,
        title: notificationData.title,
      },
      defaults: notificationData,
    });
    notifications.push(notification);
    console.log(
      `  ${created ? '✅ Creada' : '🔄 Actualizada'} notificación: ${notificationData.title}`
    );
  }

  return notifications;
}

module.exports = { seedNotifications };
