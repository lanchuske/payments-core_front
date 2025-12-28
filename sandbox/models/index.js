const { sequelize } = require('../config/database');

// Importar modelos
const User = require('./User')(sequelize);
const Echeq = require('./Echeq')(sequelize);
const Custody = require('./Custody')(sequelize);
const Discount = require('./Discount')(sequelize);
const TenantSimple = require('./TenantSimple')(sequelize);
const Client = require('./Client')(sequelize);
const Account = require('./Account')(sequelize);
const CoelsaConfig = require('./CoelsaConfig')(sequelize);
const SystemLog = require('./SystemLog')(sequelize);
const Endorsement = require('./Endorsement')(sequelize);
const echeqEvent = require('./echeqEvent');

// Nuevos modelos COELSA
const Certificate = require('./Certificate')(sequelize);
const Return = require('./Return')(sequelize);
const Assignment = require('./Assignment')(sequelize);
const Guarantee = require('./Guarantee')(sequelize);
const Mandate = require('./Mandate')(sequelize);
const Notification = require('./Notification')(sequelize);

// Definir relaciones multi-tenant simplificadas

// Relaciones TenantSimple
TenantSimple.hasMany(Client, { foreignKey: 'tenant_id', as: 'clients' });
Client.belongsTo(TenantSimple, { foreignKey: 'tenant_id', as: 'tenant' });

TenantSimple.hasMany(Account, { foreignKey: 'tenant_id', as: 'accounts' });
Account.belongsTo(TenantSimple, { foreignKey: 'tenant_id', as: 'tenant' });

TenantSimple.hasMany(Echeq, { foreignKey: 'tenant_id', as: 'echeqs' });
Echeq.belongsTo(TenantSimple, { foreignKey: 'tenant_id', as: 'tenant' });

// Relaciones CoelsaConfig
TenantSimple.hasOne(CoelsaConfig, {
  foreignKey: 'tenant_id',
  as: 'coelsaConfig',
});
CoelsaConfig.belongsTo(TenantSimple, { foreignKey: 'tenant_id', as: 'tenant' });

// Relaciones Client
Client.hasMany(Account, { foreignKey: 'client_id', as: 'accounts' });
Account.belongsTo(Client, { foreignKey: 'client_id', as: 'client' });

Client.hasMany(Echeq, { foreignKey: 'customer_id', as: 'echeqs' });
Echeq.belongsTo(Client, { foreignKey: 'customer_id', as: 'customer' });

// Relaciones simplificadas (sin usuarios)

// Relaciones Echeq
Echeq.hasOne(Custody, { foreignKey: 'echeq_id', as: 'custody' });
Custody.belongsTo(Echeq, { foreignKey: 'echeq_id', as: 'echeq' });

Echeq.hasMany(Discount, { foreignKey: 'echeq_id', as: 'discounts' });
Discount.belongsTo(Echeq, { foreignKey: 'echeq_id', as: 'echeq' });

// Relaciones Endorsement
Echeq.hasMany(Endorsement, { foreignKey: 'echeq_id', as: 'endorsements' });
Endorsement.belongsTo(Echeq, { foreignKey: 'echeq_id', as: 'echeq' });

// Nuevas relaciones COELSA
Echeq.hasMany(Certificate, { foreignKey: 'echeq_id', as: 'certificates' });
Certificate.belongsTo(Echeq, { foreignKey: 'echeq_id', as: 'echeq' });

Echeq.hasMany(Return, { foreignKey: 'echeq_id', as: 'returns' });
Return.belongsTo(Echeq, { foreignKey: 'echeq_id', as: 'echeq' });

Echeq.hasMany(Assignment, { foreignKey: 'echeq_id', as: 'assignments' });
Assignment.belongsTo(Echeq, { foreignKey: 'echeq_id', as: 'echeq' });

Echeq.hasMany(Guarantee, { foreignKey: 'echeq_id', as: 'guarantees' });
Guarantee.belongsTo(Echeq, { foreignKey: 'echeq_id', as: 'echeq' });

Echeq.hasMany(Mandate, { foreignKey: 'echeq_id', as: 'mandates' });
Mandate.belongsTo(Echeq, { foreignKey: 'echeq_id', as: 'echeq' });

// Relaciones simplificadas para nuevos modelos (sin usuarios)

// Relaciones de tenant para nuevos modelos
TenantSimple.hasMany(Certificate, {
  foreignKey: 'tenant_id',
  as: 'certificates',
});
TenantSimple.hasMany(Return, { foreignKey: 'tenant_id', as: 'returns' });
TenantSimple.hasMany(Assignment, {
  foreignKey: 'tenant_id',
  as: 'assignments',
});
TenantSimple.hasMany(Guarantee, { foreignKey: 'tenant_id', as: 'guarantees' });
TenantSimple.hasMany(Mandate, { foreignKey: 'tenant_id', as: 'mandates' });
TenantSimple.hasMany(Notification, {
  foreignKey: 'tenant_id',
  as: 'notifications',
});

module.exports = {
  User,
  Echeq,
  Custody,
  Discount,
  TenantSimple,
  Client,
  Account,
  CoelsaConfig,
  SystemLog,
  Endorsement,
  echeqEvent,
  // Nuevos modelos COELSA
  Certificate,
  Return,
  Assignment,
  Guarantee,
  Mandate,
  Notification,
};
