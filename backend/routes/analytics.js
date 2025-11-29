const express = require('express');
const store = require('../lib/store');

const router = express.Router();

// GET /api/analytics/customers.csv
router.get('/customers.csv', async (_req, res) => {
  try {
    const invoices = await store.listInvoices();
    const payments = await store.listPayments();

    // Map by customer name (fall back to Unknown)
    const map = {};

    invoices.forEach((inv) => {
      const name = inv.customerName || inv.customer || inv.customer_email || 'Unknown';
      const email = inv.customerEmail || inv.customer_email || '';
      const phone = inv.customerPhone || inv.customer_phone || '';
      const total = Number(inv.total || 0) || 0;
      const created = inv.createdAt || inv.created_at || null;

      if (!map[name]) map[name] = { customer: name, email: email, phone: phone || '', totalInvoiced: 0, invoiceCount: 0, lastInvoice: null, totalPaid: 0, lastPayment: null };
      map[name].totalInvoiced += total;
      map[name].invoiceCount += 1;
      if (created) {
        const d = new Date(created);
        if (!map[name].lastInvoice || d > new Date(map[name].lastInvoice)) map[name].lastInvoice = d.toISOString();
      }
    });

    payments.forEach((p) => {
      const name = p.customerName || p.customer || p.customer_email || 'Unknown';
      const phone = p.customerPhone || p.customer_phone || '';
      const amt = Number(p.amount || 0) || 0;
      const created = p.createdAt || p.created_at || null;
      if (!map[name]) map[name] = { customer: name, email: '', phone: phone || '', totalInvoiced: 0, invoiceCount: 0, lastInvoice: null, totalPaid: 0, lastPayment: null };
      // prefer existing phone, otherwise set from payment
      if ((!map[name].phone || map[name].phone === '') && phone) map[name].phone = phone;
      map[name].totalPaid += amt;
      if (created) {
        const d = new Date(created);
        if (!map[name].lastPayment || d > new Date(map[name].lastPayment)) map[name].lastPayment = d.toISOString();
      }
    });

    // Helper to split phone into country code and local 10-digit number and produce Excel-safe value
    const splitPhone = (raw) => {
      const out = { full: '', excelSafe: '', country: '', local: '' };
      if (!raw) return out;
      // keep + if present, and digits
      let normalized = String(raw || '').trim();
      // remove common separators
      normalized = normalized.replace(/[^+0-9]/g, '');
      // move + to front if present elsewhere
      if (normalized.includes('+')) {
        normalized = '+' + normalized.replace(/\+/g, '');
      }
      // digits only (no +)
      const digitsOnly = normalized.replace(/^\+/, '');

      if (digitsOnly.length > 10) {
        const cc = digitsOnly.slice(0, digitsOnly.length - 10);
        const local = digitsOnly.slice(-10);
        out.country = cc ? `+${cc}` : '';
        out.local = local;
      } else {
        out.country = '';
        out.local = digitsOnly;
      }

      out.full = (out.country ? out.country : '') + out.local;
      // Excel tends to convert long numbers to scientific notation. Use ="..." trick so Excel treats it as text
      out.excelSafe = out.full ? `="${out.full}"` : '';

      return out;
    };

    const rows = Object.values(map).map((r) => {
      const phoneRaw = r.phone || '';
      const p = splitPhone(phoneRaw);
      return {
        customer: r.customer,
        email: r.email || '',
        phoneRaw: phoneRaw,
        phoneExcel: p.excelSafe,
        phoneCountry: p.country,
        phoneLocal: p.local,
        totalInvoiced: Number(r.totalInvoiced || 0).toFixed(2),
        totalPaid: Number(r.totalPaid || 0).toFixed(2),
        outstanding: (Number(r.totalInvoiced || 0) - Number(r.totalPaid || 0)).toFixed(2),
        invoiceCount: r.invoiceCount || 0,
        lastInvoiceDate: r.lastInvoice || '',
        lastPaymentDate: r.lastPayment || ''
      };
    });

    // CSV header
    const header = [
      'Customer',
      'Email',
      'Phone',
      'Total Invoiced',
      'Total Paid',
      'Outstanding',
      'Invoice Count',
      'Last Invoice Date',
      'Last Payment Date'
    ];

    // Allow clients to request a different delimiter for locales where Excel expects semicolons
    const sep = String((_req.query && _req.query.sep) || 'comma').toLowerCase();
    const delim = sep === 'semicolon' ? ';' : sep === 'tab' ? '\t' : sep === 'pipe' ? '|' : ',';

    const escapeCsv = (v) => {
      if (v === null || v === undefined) return '';
      const s = String(v);
      // If the value contains delimiter, quote, or newline, wrap in quotes and escape internal quotes
      if (s.includes(delim) || s.includes('"') || s.includes('\n')) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    };

    let csv = header.join(delim) + '\n';
    rows.forEach((r) => {
      csv += [
        r.customer,
        r.email,
        r.phoneExcel,
        r.totalInvoiced,
        r.totalPaid,
        r.outstanding,
        r.invoiceCount,
        r.lastInvoiceDate,
        r.lastPaymentDate
      ]
        .map(escapeCsv)
        .join(delim) + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="receivables-by-customer.csv"');
    res.send(csv);
  } catch (err) {
    console.error('Failed to generate analytics CSV:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
