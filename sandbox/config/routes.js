/**
 * Configuración de Rutas Dinámicas - ECHEQ Sandbox
 * Permite configurar rutas mediante variables de entorno
 */

const routes = {
  // Rutas base
  api: process.env.API_BASE_PATH || '/api',

  // Rutas de autenticación
  auth: process.env.AUTH_BASE_PATH || '/api/auth',

  // Rutas de usuarios
  users: process.env.USERS_BASE_PATH || '/api/users',

  // Rutas de tenants
  tenants: process.env.TENANTS_BASE_PATH || '/api/tenants',

  // Rutas de echeqs
  echeqs: process.env.ECHEQS_BASE_PATH || '/api/echeqs',

  // Rutas de descuentos
  discounts: process.env.DISCOUNTS_BASE_PATH || '/api/discounts',

  // Rutas de reportes
  reports: process.env.REPORTS_BASE_PATH || '/api/reports',

  // Rutas de configuración
  settings: process.env.SETTINGS_BASE_PATH || '/api/settings',

  // Rutas de administración
  admin: process.env.ADMIN_BASE_PATH || '/api/admin',

  // Health checks
  health: process.env.HEALTH_CHECK_PATH || '/health',
  healthQuick: process.env.HEALTH_CHECK_QUICK_PATH || '/health/quick',

  // Rutas de frontend
  login: process.env.LOGIN_PATH || '/login',
  adminPanel: process.env.ADMIN_PANEL_PATH || '/admin',
};

// Función para obtener todas las rutas
function getAllRoutes() {
  return {
    ...routes,
    // Rutas específicas de autenticación
    authLogin: `${routes.auth}/login`,
    authRegister: `${routes.auth}/register`,
    authProfile: `${routes.auth}/profile`,
    authLogout: `${routes.auth}/logout`,

    // Rutas específicas de usuarios
    usersList: `${routes.users}`,
    usersCreate: `${routes.users}`,
    usersUpdate: `${routes.users}/:id`,
    usersDelete: `${routes.users}/:id`,

    // Rutas específicas de tenants
    tenantsList: `${routes.tenants}`,
    tenantsCreate: `${routes.tenants}`,
    tenantsUpdate: `${routes.tenants}/:id`,
    tenantsDelete: `${routes.tenants}/:id`,

    // Rutas específicas de echeqs
    echeqsList: `${routes.echeqs}`,
    echeqsCreate: `${routes.echeqs}`,
    echeqsUpdate: `${routes.echeqs}/:id`,
    echeqsDelete: `${routes.echeqs}/:id`,

    // Rutas específicas de descuentos
    discountsList: `${routes.discounts}`,
    discountsCreate: `${routes.discounts}`,
    discountsUpdate: `${routes.discounts}/:id`,
    discountsDelete: `${routes.discounts}/:id`,

    // Rutas específicas de reportes
    reportsList: `${routes.reports}`,
    reportsGenerate: `${routes.reports}/generate`,

    // Rutas específicas de configuración
    settingsGet: `${routes.settings}`,
    settingsUpdate: `${routes.settings}`,

    // Rutas específicas de administración
    adminDashboard: `${routes.admin}/dashboard`,
    adminUsers: `${routes.admin}/users`,
    adminTenants: `${routes.admin}/tenants`,
    adminLogs: `${routes.admin}/logs`,
  };
}

// Función para validar configuración de rutas
function validateRoutes() {
  const errors = [];

  // Verificar que las rutas base no estén vacías
  Object.entries(routes).forEach(([key, value]) => {
    if (!value || value.trim() === '') {
      errors.push(`Ruta ${key} está vacía`);
    }
  });

  // Verificar que las rutas de API tengan el prefijo correcto
  if (!routes.api.startsWith('/')) {
    errors.push('API_BASE_PATH debe comenzar con /');
  }

  if (!routes.auth.startsWith('/')) {
    errors.push('AUTH_BASE_PATH debe comenzar con /');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Función para obtener información de rutas
function getRoutesInfo() {
  return {
    base: routes.api,
    endpoints: {
      auth: routes.auth,
      users: routes.users,
      tenants: routes.tenants,
      echeqs: routes.echeqs,
      discounts: routes.discounts,
      reports: routes.reports,
      settings: routes.settings,
      admin: routes.admin,
    },
    health: {
      basic: routes.health,
      quick: routes.healthQuick,
    },
    frontend: {
      login: routes.login,
      adminPanel: routes.adminPanel,
    },
    validation: validateRoutes(),
  };
}

module.exports = {
  routes,
  getAllRoutes,
  validateRoutes,
  getRoutesInfo,
};
