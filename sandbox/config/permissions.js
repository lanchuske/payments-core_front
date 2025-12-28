/**
 * Configuración de Permisos por Flujo ECHEQ
 * Basado en el Mapa Integral de Flujos ECHEQ
 */

const flowPermissions = {
  // A. FLUJO DE EMISIÓN
  EMISSION: {
    SYSTEM_ADMIN: ['configure', 'manage_banks', 'global_settings'],
    BANK_ADMIN: ['approve', 'configure_limits', 'manage_users'],
    BANK_OPERATOR: ['execute', 'validate', 'register'],
    COMPANY_USER: ['request', 'create_own', 'view_own'],
    BANK_ANALYST: ['analyze', 'report', 'statistics'],
    BANK_AUDITOR: ['audit', 'compliance', 'review'],
  },

  // B. FLUJO DE RECEPCIÓN Y ACEPTACIÓN
  RECEPTION: {
    SYSTEM_ADMIN: ['configure_policies'],
    BANK_ADMIN: ['configure_policies', 'manage_reception'],
    BANK_OPERATOR: ['execute_reception', 'execute_repudiation'],
    COMPANY_USER: ['accept_own', 'repudiate_own'],
    BANK_ANALYST: ['analyze_reception', 'report_reception'],
    BANK_AUDITOR: ['audit_reception', 'compliance_reception'],
  },

  // C. FLUJO DE ENDOSO Y TRANSMISIÓN
  ENDORSEMENT: {
    SYSTEM_ADMIN: ['configure_endorsement'],
    BANK_ADMIN: ['approve_special', 'configure_policies'],
    BANK_OPERATOR: ['execute_endorsement', 'execute_cancellation'],
    COMPANY_USER: ['endorse_own', 'cancel_own'],
    BANK_ANALYST: ['analyze_endorsement', 'opportunities'],
    BANK_AUDITOR: ['audit_endorsement', 'compliance_endorsement'],
  },

  // D. FLUJO DE CUSTODIA
  CUSTODY: {
    SYSTEM_ADMIN: ['configure_custody'],
    BANK_ADMIN: ['configure_policies', 'approve_special'],
    BANK_OPERATOR: ['execute_custody', 'execute_withdrawal'],
    COMPANY_USER: ['custody_own', 'withdraw_own'],
    BANK_ANALYST: ['analyze_custody', 'report_custody'],
    BANK_AUDITOR: ['audit_custody', 'compliance_custody'],
  },

  // E. FLUJO DE COBRO Y LIQUIDACIÓN
  PAYMENT: {
    SYSTEM_ADMIN: ['configure_payment'],
    BANK_ADMIN: ['configure_policies', 'manage_payment'],
    BANK_OPERATOR: ['execute_deposit', 'execute_payment', 'execute_rejection'],
    COMPANY_USER: ['deposit_own', 'payment_own', 'view_rejections'],
    BANK_ANALYST: ['analyze_payment', 'report_payment'],
    BANK_AUDITOR: ['audit_payment', 'compliance_payment'],
  },

  // F. FLUJO DE DEVOLUCIONES
  RETURN: {
    SYSTEM_ADMIN: ['configure_return'],
    BANK_ADMIN: ['approve_special', 'configure_policies'],
    BANK_OPERATOR: [
      'execute_request',
      'execute_acceptance',
      'execute_cancellation',
    ],
    COMPANY_USER: ['request_own', 'accept_own', 'cancel_own'],
    BANK_ANALYST: ['analyze_return', 'report_return'],
    BANK_AUDITOR: ['audit_return', 'compliance_return'],
  },

  // G. FLUJO DE MANDATOS
  MANDATE: {
    SYSTEM_ADMIN: ['configure_mandate'],
    BANK_ADMIN: ['approve_special', 'configure_policies'],
    BANK_OPERATOR: ['execute_mandate', 'execute_actions'],
    COMPANY_USER: ['create_own', 'actions_own'],
    BANK_ANALYST: ['analyze_mandate', 'opportunities'],
    BANK_AUDITOR: ['audit_mandate', 'compliance_mandate'],
  },

  // H. FLUJO DE CESIÓN DE DERECHOS (CED)
  CED: {
    SYSTEM_ADMIN: ['configure_ced'],
    BANK_ADMIN: ['approve_special', 'configure_policies'],
    BANK_OPERATOR: ['execute_ced', 'execute_actions'],
    COMPANY_USER: ['create_own', 'actions_own'],
    BANK_ANALYST: ['analyze_ced', 'report_ced'],
    BANK_AUDITOR: ['audit_ced', 'compliance_ced'],
  },

  // I. FLUJO DE AVALES
  GUARANTEE: {
    SYSTEM_ADMIN: ['configure_guarantee'],
    BANK_ADMIN: ['approve_special', 'configure_policies'],
    BANK_OPERATOR: ['execute_request', 'execute_actions'],
    COMPANY_USER: ['request_own', 'actions_own'],
    BANK_ANALYST: ['analyze_guarantee', 'report_guarantee'],
    BANK_AUDITOR: ['audit_guarantee', 'compliance_guarantee'],
  },

  // J. FLUJO DE ESTADOS ESPECIALES
  SPECIAL_STATUS: {
    SYSTEM_ADMIN: ['configure_policies', 'manage_system'],
    BANK_ADMIN: ['manage_special', 'configure_policies'],
  },

  // K. FLUJO DE GESTIÓN DE TENANTS
  TENANT: {
    SYSTEM_ADMIN: [
      'create',
      'list',
      'view',
      'update',
      'activate',
      'suspend',
      'delete',
      'stats',
      'config',
      'coelsa_credentials',
      'check_permission',
    ],
    BANK_ADMIN: ['view_own', 'update_own', 'stats_own', 'config_own'],
    BANK_OPERATOR: ['view_own'],
    COMPANY_USER: ['view_own'],
    BANK_ANALYST: ['view_own', 'stats_own'],
    BANK_AUDITOR: ['view_own', 'stats_own'],
  },
};

/**
 * Permisos específicos por acción
 */
const actionPermissions = {
  // Permisos de tenant
  'tenant.create': ['SYSTEM_ADMIN'],
  'tenant.list': ['SYSTEM_ADMIN'],
  'tenant.view': [
    'SYSTEM_ADMIN',
    'BANK_ADMIN',
    'BANK_OPERATOR',
    'COMPANY_USER',
    'BANK_ANALYST',
    'BANK_AUDITOR',
  ],
  'tenant.view_own': [
    'SYSTEM_ADMIN',
    'BANK_ADMIN',
    'BANK_OPERATOR',
    'COMPANY_USER',
    'BANK_ANALYST',
    'BANK_AUDITOR',
  ],
  'tenant.update': ['SYSTEM_ADMIN', 'BANK_ADMIN'],
  'tenant.update_own': ['BANK_ADMIN'],
  'tenant.activate': ['SYSTEM_ADMIN'],
  'tenant.suspend': ['SYSTEM_ADMIN'],
  'tenant.delete': ['SYSTEM_ADMIN'],
  'tenant.stats': [
    'SYSTEM_ADMIN',
    'BANK_ADMIN',
    'BANK_ANALYST',
    'BANK_AUDITOR',
  ],
  'tenant.stats_own': ['BANK_ADMIN', 'BANK_ANALYST', 'BANK_AUDITOR'],
  'tenant.config': ['SYSTEM_ADMIN', 'BANK_ADMIN'],
  'tenant.config_own': ['BANK_ADMIN'],
  'tenant.coelsa_credentials': ['SYSTEM_ADMIN', 'BANK_ADMIN'],
  'tenant.check_permission': ['SYSTEM_ADMIN', 'BANK_ADMIN'],

  // Acciones de Emisión
  'emission.create_account': ['SYSTEM_ADMIN', 'BANK_ADMIN', 'BANK_OPERATOR'],
  'emission.create_echeq': ['BANK_ADMIN', 'BANK_OPERATOR', 'COMPANY_USER'],
  'emission.create_bulk': ['BANK_ADMIN', 'BANK_OPERATOR'],
  'emission.approve': ['BANK_ADMIN', 'BANK_OPERATOR'],
  'emission.reject': ['BANK_ADMIN', 'BANK_OPERATOR'],
  'emission.configure_clause': ['BANK_ADMIN', 'BANK_OPERATOR'],

  // Acciones de Recepción
  'reception.accept': ['BANK_OPERATOR', 'COMPANY_USER'],
  'reception.repudiate': ['BANK_OPERATOR', 'COMPANY_USER'],

  // Acciones de Endoso
  'endorsement.nominal': ['BANK_OPERATOR', 'COMPANY_USER'],
  'endorsement.negotiation': ['BANK_OPERATOR', 'COMPANY_USER'],
  'endorsement.procurement': ['BANK_OPERATOR', 'COMPANY_USER'],
  'endorsement.cancel': ['BANK_OPERATOR', 'COMPANY_USER'],

  // Acciones de Custodia
  'custody.put': ['BANK_OPERATOR', 'COMPANY_USER'],
  'custody.withdraw': ['BANK_OPERATOR', 'COMPANY_USER'],

  // Acciones de Pago
  'payment.deposit': ['BANK_OPERATOR', 'COMPANY_USER'],
  'payment.cash': ['BANK_OPERATOR', 'COMPANY_USER'],
  'payment.reject': ['BANK_OPERATOR'],

  // Acciones de Devolución
  'return.request': ['BANK_OPERATOR', 'COMPANY_USER'],
  'return.accept': ['BANK_OPERATOR', 'COMPANY_USER'],
  'return.cancel': ['BANK_OPERATOR', 'COMPANY_USER'],

  // Acciones de Mandatos
  'mandate.create': ['BANK_OPERATOR', 'COMPANY_USER'],
  'mandate.accept': ['BANK_OPERATOR', 'COMPANY_USER'],
  'mandate.revoke': ['BANK_OPERATOR', 'COMPANY_USER'],

  // Acciones de CED
  'ced.create': ['BANK_OPERATOR', 'COMPANY_USER'],
  'ced.accept': ['BANK_OPERATOR', 'COMPANY_USER'],
  'ced.cancel': ['BANK_OPERATOR', 'COMPANY_USER'],

  // Acciones de Avales
  'guarantee.request': ['BANK_OPERATOR', 'COMPANY_USER'],
  'guarantee.accept': ['BANK_OPERATOR', 'COMPANY_USER'],
  'guarantee.reject': ['BANK_OPERATOR', 'COMPANY_USER'],

  // Acciones de Estados Especiales
  'special.expire': ['SYSTEM_ADMIN', 'BANK_ADMIN'],
  'special.no_pay': ['BANK_OPERATOR', 'COMPANY_USER'],

  // Acciones de Email
  'email.verify': ['SYSTEM_ADMIN', 'BANK_ADMIN'],
  'email.stats': ['SYSTEM_ADMIN', 'BANK_ADMIN'],
  'email.send_test': ['SYSTEM_ADMIN', 'BANK_ADMIN'],
  'email.send_welcome': ['SYSTEM_ADMIN', 'BANK_ADMIN'],
  'email.send_password_reset': ['SYSTEM_ADMIN', 'BANK_ADMIN'],
  'email.send_echeq_emission': ['SYSTEM_ADMIN', 'BANK_ADMIN', 'BANK_OPERATOR'],
  'email.send_expiration_warning': [
    'SYSTEM_ADMIN',
    'BANK_ADMIN',
    'BANK_OPERATOR',
  ],
  'email.send_tenant_activated': ['SYSTEM_ADMIN'],
  'email.send_discount_approved': [
    'SYSTEM_ADMIN',
    'BANK_ADMIN',
    'BANK_OPERATOR',
  ],
  'email.send_discount_rejected': [
    'SYSTEM_ADMIN',
    'BANK_ADMIN',
    'BANK_OPERATOR',
  ],
};

/**
 * Verificar si un usuario tiene permiso para una acción específica
 */
function hasPermission(userRole, action) {
  const allowedRoles = actionPermissions[action];
  return allowedRoles && allowedRoles.includes(userRole);
}

/**
 * Verificar si un usuario tiene permiso para un flujo específico
 */
function hasFlowPermission(userRole, flow, permission) {
  const flowPerms = flowPermissions[flow];
  if (!flowPerms || !flowPerms[userRole]) {
    return false;
  }
  return flowPerms[userRole].includes(permission);
}

/**
 * Obtener todos los permisos de un usuario para un flujo
 */
function getUserFlowPermissions(userRole, flow) {
  const flowPerms = flowPermissions[flow];
  return flowPerms && flowPerms[userRole] ? flowPerms[userRole] : [];
}

/**
 * Obtener todos los flujos disponibles para un usuario
 */
function getUserAvailableFlows(userRole) {
  const availableFlows = {};

  Object.keys(flowPermissions).forEach(flow => {
    const permissions = getUserFlowPermissions(userRole, flow);
    if (permissions.length > 0) {
      availableFlows[flow] = permissions;
    }
  });

  return availableFlows;
}

module.exports = {
  flowPermissions,
  actionPermissions,
  hasPermission,
  hasFlowPermission,
  getUserFlowPermissions,
  getUserAvailableFlows,
};
