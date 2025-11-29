const express = require('express');
const store = require('../lib/store');

const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    const data = await store.listInvoices();
    return res.json({ data });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const invoice = await store.createInvoice(req.body || {});
    return res.status(201).json(invoice);
  } catch (error) {
    return res.status(400).json({
      error: error.message
    });
  }
});

module.exports = router;
