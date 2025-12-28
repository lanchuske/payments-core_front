/**
 * Controlador de Autenticación
 * Maneja login, registro y gestión de usuarios
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User } = require('../models');
const { ApiResponse } = require('../utils/apiResponse');

class AuthController {
  /**
   * Login de usuario
   * POST /api/auth/login
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json(
          new ApiResponse(false, 'Email y contraseña son requeridos', null, 'MISSING_CREDENTIALS')
        );
      }

      // Buscar usuario por email
      const user = await User.findOne({ where: { email } });
      
      if (!user) {
        return res.status(401).json(
          new ApiResponse(false, 'Credenciales inválidas', null, 'INVALID_CREDENTIALS')
        );
      }

      // Verificar contraseña
      const isValidPassword = await bcrypt.compare(password, user.password);
      
      if (!isValidPassword) {
        return res.status(401).json(
          new ApiResponse(false, 'Credenciales inválidas', null, 'INVALID_CREDENTIALS')
        );
      }

      // Verificar que el usuario esté activo
      if (user.status !== 'ACTIVE') {
        return res.status(401).json(
          new ApiResponse(false, 'Usuario inactivo', null, 'USER_INACTIVE')
        );
      }

      // Generar JWT token
      const jwtSecret = process.env.JWT_SECRET;
      
      if (!jwtSecret) {
        return res.status(500).json(
          new ApiResponse(false, 'JWT_SECRET environment variable is not configured', null, 'MISSING_JWT_SECRET')
        );
      }
      
      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email,
          role: user.role,
          tenantId: user.tenantId 
        },
        jwtSecret,
        { expiresIn: '24h' }
      );

      // Respuesta exitosa
      res.json(new ApiResponse(true, 'Login exitoso', {
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          tenantId: user.tenantId,
          companyName: user.company_name
        }
      }));

    } catch (error) {
      console.error('Error en login:', error);
      res.status(500).json(
        new ApiResponse(false, 'Error interno del servidor', null, 'INTERNAL_ERROR')
      );
    }
  }

  /**
   * Registro de usuario
   * POST /api/auth/register
   */
  async register(req, res) {
    try {
      const { email, password, companyName, role = 'USER' } = req.body;

      if (!email || !password || !companyName) {
        return res.status(400).json(
          new ApiResponse(false, 'Email, contraseña y nombre de empresa son requeridos', null, 'MISSING_FIELDS')
        );
      }

      // Verificar si el usuario ya existe
      const existingUser = await User.findOne({ where: { email } });
      
      if (existingUser) {
        return res.status(409).json(
          new ApiResponse(false, 'El usuario ya existe', null, 'USER_EXISTS')
        );
      }

      // Hash de la contraseña
      const hashedPassword = await bcrypt.hash(password, 10);

      // Crear usuario
      const user = await User.create({
        email,
        password: hashedPassword,
        company_name: companyName,
        role,
        status: 'ACTIVE'
      });

      // Generar JWT token
      const jwtSecret = process.env.JWT_SECRET;
      
      if (!jwtSecret) {
        return res.status(500).json(
          new ApiResponse(false, 'JWT_SECRET environment variable is not configured', null, 'MISSING_JWT_SECRET')
        );
      }
      
      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email,
          role: user.role,
          tenantId: user.tenantId 
        },
        jwtSecret,
        { expiresIn: '24h' }
      );

      // Respuesta exitosa
      res.status(201).json(new ApiResponse(true, 'Usuario registrado exitosamente', {
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          tenantId: user.tenantId,
          companyName: user.company_name
        }
      }));

    } catch (error) {
      console.error('Error en registro:', error);
      res.status(500).json(
        new ApiResponse(false, 'Error interno del servidor', null, 'INTERNAL_ERROR')
      );
    }
  }

  /**
   * Obtener perfil del usuario
   * GET /api/auth/profile
   */
  async getProfile(req, res) {
    try {
      const userId = req.user.userId;
      const user = await User.findByPk(userId, {
        attributes: { exclude: ['password'] }
      });

      if (!user) {
        return res.status(404).json(
          new ApiResponse(false, 'Usuario no encontrado', null, 'USER_NOT_FOUND')
        );
      }

      res.json(new ApiResponse(true, 'Perfil obtenido exitosamente', {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          tenantId: user.tenantId,
          companyName: user.company_name,
          status: user.status,
          createdAt: user.createdAt
        }
      }));

    } catch (error) {
      console.error('Error obteniendo perfil:', error);
      res.status(500).json(
        new ApiResponse(false, 'Error interno del servidor', null, 'INTERNAL_ERROR')
      );
    }
  }

  /**
   * Actualizar perfil del usuario
   * PUT /api/auth/profile
   */
  async updateProfile(req, res) {
    try {
      const userId = req.user.userId;
      const { companyName } = req.body;

      const user = await User.findByPk(userId);
      
      if (!user) {
        return res.status(404).json(
          new ApiResponse(false, 'Usuario no encontrado', null, 'USER_NOT_FOUND')
        );
      }

      // Actualizar campos permitidos
      if (companyName) {
        user.company_name = companyName;
      }

      await user.save();

      res.json(new ApiResponse(true, 'Perfil actualizado exitosamente', {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          tenantId: user.tenantId,
          companyName: user.company_name,
          status: user.status
        }
      }));

    } catch (error) {
      console.error('Error actualizando perfil:', error);
      res.status(500).json(
        new ApiResponse(false, 'Error interno del servidor', null, 'INTERNAL_ERROR')
      );
    }
  }

  /**
   * Cambiar contraseña
   * PUT /api/auth/change-password
   */
  async changePassword(req, res) {
    try {
      const userId = req.user.userId;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json(
          new ApiResponse(false, 'Contraseña actual y nueva contraseña son requeridas', null, 'MISSING_PASSWORDS')
        );
      }

      const user = await User.findByPk(userId);
      
      if (!user) {
        return res.status(404).json(
          new ApiResponse(false, 'Usuario no encontrado', null, 'USER_NOT_FOUND')
        );
      }

      // Verificar contraseña actual
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      
      if (!isValidPassword) {
        return res.status(401).json(
          new ApiResponse(false, 'Contraseña actual incorrecta', null, 'INVALID_CURRENT_PASSWORD')
        );
      }

      // Hash de la nueva contraseña
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      user.password = hashedNewPassword;
      await user.save();

      res.json(new ApiResponse(true, 'Contraseña cambiada exitosamente'));

    } catch (error) {
      console.error('Error cambiando contraseña:', error);
      res.status(500).json(
        new ApiResponse(false, 'Error interno del servidor', null, 'INTERNAL_ERROR')
      );
    }
  }

  /**
   * Logout de usuario
   * POST /api/auth/logout
   */
  async logout(req, res) {
    try {
      // En un sistema más complejo, aquí se invalidaría el token
      // Por ahora, solo confirmamos el logout
      res.json(new ApiResponse(true, 'Logout exitoso'));

    } catch (error) {
      console.error('Error en logout:', error);
      res.status(500).json(
        new ApiResponse(false, 'Error interno del servidor', null, 'INTERNAL_ERROR')
      );
    }
  }
}

module.exports = new AuthController();

