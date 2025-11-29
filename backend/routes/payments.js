const express = require('express');
const store = require('../lib/store');

const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    const data = await store.listPayments();
    return res.json({ data });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const payment = await store.recordPayment(req.body || {});
    return res.status(201).json(payment);
  } catch (error) {
    return res.status(400).json({
      error: error.message
    });
  }
});

module.exports = router;
