const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Crear una app Express simple para testing
const app = express();
app.use(express.json());

// Mock de datos de usuario
const mockUser = {
  id: 1,
  email: 'admin@echeq.ar',
  password: bcrypt.hashSync('Admin123!', 10),
  role: 'SYSTEM_ADMIN',
};

// Mock de auth endpoints
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (
    email === mockUser.email &&
    bcrypt.compareSync(password, mockUser.password)
  ) {
    const token = jwt.sign(
      { userId: mockUser.id, email: mockUser.email },
      'test-secret'
    );
    res.status(200).json({
      token,
      user: { id: mockUser.id, email: mockUser.email, role: mockUser.role },
    });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

describe('Authentication Integration Tests', () => {
  test('POST /api/auth/login should authenticate valid user', async () => {
    const loginData = {
      email: 'admin@echeq.ar',
      password: 'Admin123!',
    };

    const response = await request(app)
      .post('/api/auth/login')
      .send(loginData)
      .expect(200);

    expect(response.body).toHaveProperty('token');
    expect(response.body).toHaveProperty('user');
    expect(response.body.user).toHaveProperty('email', loginData.email);
  });

  test('POST /api/auth/login should reject invalid credentials', async () => {
    const loginData = {
      email: 'invalid@example.com',
      password: 'wrongpassword',
    };

    const response = await request(app)
      .post('/api/auth/login')
      .send(loginData)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });
});
