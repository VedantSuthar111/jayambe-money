const express = require('express');
const cors = require('cors');
const net = require('net');
require('dotenv').config();

const invoicesRouter = require('./routes/invoices');
const paymentsRouter = require('./routes/payments');
const payablesRouter = require('./routes/payables');
const ordersRouter = require('./routes/orders');
const analyticsRouter = require('./routes/analytics');
const store = require('./lib/store');

const PREFERRED_PORT = Number(process.env.PORT) || 4000;

const app = express();

// Log all incoming requests
app.use((req, res, next) => {
  console.log(`[SERVER] ${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Log after body parsing
app.use((req, res, next) => {
  if (req.method === 'POST' || req.method === 'PUT') {
    console.log(`[SERVER] Request body parsed:`, JSON.stringify(req.body, null, 2));
  }
  next();
});

app.get('/health', (_req, res) => {
  console.log('[HEALTH CHECK] Request received');
  res.json({
    status: 'ok',
    uptime: process.uptime()
  });
});

app.get('/api/test', (_req, res) => {
  console.log('[TEST ENDPOINT] Request received');
  res.json({ message: 'Test endpoint working', timestamp: new Date().toISOString() });
});

app.get('/api/dashboard/metrics', async (_req, res) => {
  try {
    const metrics = await store.getDashboardMetrics();
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.use('/api/invoices', invoicesRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/payables', payablesRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/analytics', analyticsRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Unexpected server error' });
});

function findAvailablePort(port) {
  return new Promise((resolve, reject) => {
    const tester = net.createServer().unref();

    tester.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(findAvailablePort(port + 1));
      } else {
        reject(err);
      }
    });

    tester.listen(port, () => {
      tester.close(() => resolve(port));
    });
  });
}

async function start() {
  try {
    const port = await findAvailablePort(PREFERRED_PORT);

    if (port !== PREFERRED_PORT) {
      console.warn(
        `Port ${PREFERRED_PORT} is busy, using available port ${port} instead.`
      );
    }

    app.listen(port, () => {
      console.log(`Jay Ambe API listening on http://localhost:${port}`);
      console.log(`Orders endpoint: http://localhost:${port}/api/orders`);
      console.log('Server is ready to receive requests...');
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
