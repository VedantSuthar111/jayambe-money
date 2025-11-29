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

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime()
  });
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
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
