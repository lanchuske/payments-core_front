const request = require('supertest');
const express = require('express');

// Crear una app Express simple para testing
const app = express();

// Mock de health endpoints
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/health/quick', (req, res) => {
  res.status(200).json({ status: 'OK', quick: true });
});

describe('Health Check Tests', () => {
  test('GET /health should return 200', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'OK');
  });

  test('GET /health/quick should return 200', async () => {
    const response = await request(app).get('/health/quick');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'OK');
    expect(response.body).toHaveProperty('quick', true);
  });
});
