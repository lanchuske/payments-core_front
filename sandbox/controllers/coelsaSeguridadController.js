/**
 * Controlador COELSA - Seguridad
 * Implementa operaciones de seguridad y autenticación según especificación COELSA
 */

const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

// Simulación de base de datos para clientes y tokens
let clientes = [
  {
    clientId: 'entidad_demo',
    client_secret: '12345',
    name: 'Entidad Demo',
    status: 'ACTIVO',
    scopes: ['read', 'write'],
    tenantId: 'default-tenant',
  },
];

let tokens = [];

/**
 * Obtener token JWT
 * POST /Seguridad/Token
 */
const obtenerToken = async (req, res) => {
  try {
    const { client_id, client_secret } = req.body;

    // Validaciones
    if (!client_id || !client_secret) {
      return res.status(400).json({
        success: false,
        message: 'client_id y client_secret son requeridos',
        error: 'MISSING_REQUIRED_FIELDS',
        timestamp: new Date().toISOString(),
      });
    }

    // Verificar credenciales del cliente
    const cliente = clientes.find(
      c =>
        c.clientId === client_id &&
        c.client_secret === client_secret &&
        c.status === 'ACTIVO'
    );

    if (!cliente) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas',
        error: 'INVALID_CREDENTIALS',
        timestamp: new Date().toISOString(),
      });
    }

    // Generar token JWT
    const tokenPayload = {
      clientId: cliente.clientId,
      name: cliente.name,
      scopes: cliente.scopes,
      tenantId: cliente.tenantId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hora
    };

    const access_token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET || 'sandbox_jwt_secret_very_long_and_secure_123'
    );

    // Registrar token
    const tokenRecord = {
      id: uuidv4(),
      access_token: access_token.substring(0, 20) + '...', // Solo mostrar parte del token
      clientId: cliente.clientId,
      scopes: cliente.scopes,
      fecha_emision: new Date(),
      fecha_expiracion: new Date(Date.now() + 60 * 60 * 1000), // 1 hora
      status: 'ACTIVO',
    };

    tokens.push(tokenRecord);

    res.status(200).json({
      success: true,
      message: 'Token emitido exitosamente',
      data: {
        access_token,
        token_type: 'Bearer',
        expires_in: 3600,
        scopes: cliente.scopes,
        clientId: cliente.clientId,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error en obtenerToken:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Validar token JWT
 * POST /Seguridad/Validar
 */
const validarToken = async (req, res) => {
  try {
    const { access_token } = req.body;

    // Validaciones
    if (!access_token) {
      return res.status(400).json({
        success: false,
        message: 'access_token es requerido',
        error: 'MISSING_REQUIRED_FIELDS',
        timestamp: new Date().toISOString(),
      });
    }

    try {
      // Verificar y decodificar token
      const decoded = jwt.verify(
        access_token,
        process.env.JWT_SECRET || 'sandbox_jwt_secret_very_long_and_secure_123'
      );

      // Verificar si el token está registrado y activo
      const tokenRecord = tokens.find(
        t =>
          t.access_token.startsWith(access_token.substring(0, 20)) &&
          t.status === 'ACTIVO'
      );

      if (!tokenRecord) {
        return res.status(401).json({
          success: false,
          message: 'Token no válido o expirado',
          error: 'INVALID_TOKEN',
          timestamp: new Date().toISOString(),
        });
      }

      res.status(200).json({
        success: true,
        message: 'Token válido',
        data: {
          clientId: decoded.clientId,
          name: decoded.name,
          scopes: decoded.scopes,
          tenantId: decoded.tenantId,
          expiracion: new Date(decoded.exp * 1000),
          timestamp: new Date().toISOString(),
        },
      });
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        message: 'Token inválido o expirado',
        error: 'INVALID_TOKEN',
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('Error en validarToken:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Revocar token JWT
 * POST /Seguridad/Revocar
 */
const revocarToken = async (req, res) => {
  try {
    const { access_token } = req.body;

    // Validaciones
    if (!access_token) {
      return res.status(400).json({
        success: false,
        message: 'access_token es requerido',
        error: 'MISSING_REQUIRED_FIELDS',
        timestamp: new Date().toISOString(),
      });
    }

    // Buscar y revocar token
    const tokenIndex = tokens.findIndex(
      t =>
        t.access_token.startsWith(access_token.substring(0, 20)) &&
        t.status === 'ACTIVO'
    );

    if (tokenIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró token válido para revocar',
        error: 'TOKEN_NOT_FOUND',
        timestamp: new Date().toISOString(),
      });
    }

    // Revocar token
    tokens[tokenIndex].estado = 'REVOCADO';
    tokens[tokenIndex].fecha_revocacion = new Date();

    res.status(200).json({
      success: true,
      message: 'Token revocado exitosamente',
      data: {
        clientId: tokens[tokenIndex].client_id,
        fecha_revocacion: tokens[tokenIndex].fecha_revocacion,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error en revocarToken:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Crear cliente (función administrativa)
 * POST /Seguridad/Cliente
 */
const crearCliente = async (req, res) => {
  try {
    const { client_id, client_secret, nombre, scopes = ['read'] } = req.body;

    // Validaciones
    if (!client_id || !client_secret || !nombre) {
      return res.status(400).json({
        success: false,
        message: 'client_id, client_secret y nombre son requeridos',
        error: 'MISSING_REQUIRED_FIELDS',
        timestamp: new Date().toISOString(),
      });
    }

    // Verificar si el cliente ya existe
    const clienteExistente = clientes.find(c => c.clientId === client_id);
    if (clienteExistente) {
      return res.status(409).json({
        success: false,
        message: 'El client_id ya existe',
        error: 'CLIENT_ALREADY_EXISTS',
        timestamp: new Date().toISOString(),
      });
    }

    // Crear nuevo cliente
    const nuevoCliente = {
      client_id,
      client_secret,
      nombre,
      status: 'ACTIVO',
      scopes: Array.isArray(scopes) ? scopes : [scopes],
      tenantId: req.tenantId || 'default-tenant',
      fecha_creacion: new Date(),
    };

    clientes.push(nuevoCliente);

    res.status(200).json({
      success: true,
      message: 'Cliente creado exitosamente',
      data: {
        clientId: nuevoCliente.clientId,
        name: nuevoCliente.name,
        scopes: nuevoCliente.scopes,
        status: nuevoCliente.status,
        fecha_creacion: nuevoCliente.fecha_creacion,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error en crearCliente:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Listar clientes (función administrativa)
 * GET /Seguridad/Clientes
 */
const listarClientes = async (req, res) => {
  try {
    const clientesLista = clientes.map(c => ({
      clientId: c.clientId,
      name: c.name,
      status: c.status,
      scopes: c.scopes,
      fecha_creacion: c.fecha_creacion,
    }));

    res.status(200).json({
      success: true,
      data: {
        total_clientes: clientesLista.length,
        clientes: clientesLista,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error en listarClientes:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * POST /Seguridad/Token
 * Generar token (alias para método existente)
 */
const generateToken = async (req, res) => {
  // Redirigir al método existente
  return this.generateToken(req, res);
};
module.exports = {
  generateToken,
};
