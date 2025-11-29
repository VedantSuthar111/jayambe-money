const express = require('express');
const PDFDocument = require('pdfkit');
const store = require('../lib/store');

const router = express.Router();

// Helper to generate a nicely formatted bill PDF for an order. Returns a Buffer.
// Layout goals: billing details on the left (non-overlapping), date at top-right,
// and a centered, prominent "Thank you for your business." message at the end.
async function generateBillPdf(order, invoice) {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });

  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const leftX = doc.page.margins.left;
  const rightX = leftX + pageWidth;

  const companyName = 'Jay ambe wood and metal Works';

  // Header
  const headerY = 40;
  doc.fillColor('#333').fontSize(18).font('Helvetica-Bold').text(companyName, leftX, headerY);
  doc.fontSize(10).font('Helvetica').fillColor('gray').text('Billing Invoice', leftX, headerY + 26);

  // Date / meta at the top-right corner
  const dateStr = order.createdAt ? new Date(order.createdAt).toLocaleDateString() : new Date().toLocaleDateString();
  const metaLines = [];
  if (invoice && invoice.number) metaLines.push(`Invoice: ${invoice.number}`);
  metaLines.push(`Order ID: ${order.id || ''}`);
  metaLines.push(`Date: ${dateStr}`);
  if (invoice && invoice.dueDate) metaLines.push(`Due: ${new Date(invoice.dueDate).toLocaleDateString()}`);
  // print meta lines aligned to the right edge
  const metaWidth = pageWidth * 0.35;
  metaLines.forEach((ln, i) => {
    doc.fontSize(10).fillColor('black').font('Helvetica').text(ln, leftX, headerY + (i * 14), { width: pageWidth, align: 'right' });
  });

  // Customer / billing block on the left with fixed positions to avoid overlap
  const custTop = headerY + 70;
  const custX = leftX;
  const custWidth = pageWidth * 0.55;
  const lineHeight = 14;
  let y = custTop;

  doc.fontSize(11).font('Helvetica-Bold').fillColor('#111').text(order.customerName || 'Customer', custX, y, { width: custWidth });
  y += lineHeight;
  doc.fontSize(10).font('Helvetica').fillColor('black');
  if (order.customerEmail) {
    doc.text(`Email: ${order.customerEmail}`, custX, y, { width: custWidth });
    y += lineHeight;
  }
  if (order.customerPhone) {
    doc.text(`Phone: ${order.customerPhone}`, custX, y, { width: custWidth });
    y += lineHeight;
  }
  // Add some spacing before items
  y += 8;

  // Items table header and columns (fixed left-based coordinates)
  const tableTop = y;
  const col = {
    desc: pageWidth * 0.55,
    qty: pageWidth * 0.10,
    rate: pageWidth * 0.15,
    amount: pageWidth * 0.20
  };

  // Header background
  doc.save();
  doc.rect(leftX - 2, tableTop - 6, pageWidth + 4, 20).fill('#f3f4f6');
  doc.restore();

  doc.fillColor('black').font('Helvetica-Bold').fontSize(10);
  doc.text('Description', leftX, tableTop, { width: col.desc });
  doc.text('Qty', leftX + col.desc, tableTop, { width: col.qty, align: 'right' });
  doc.text('Rate', leftX + col.desc + col.qty, tableTop, { width: col.rate, align: 'right' });
  doc.text('Amount', leftX + col.desc + col.qty + col.rate, tableTop, { width: col.amount, align: 'right' });

  // Items
  let currentY = tableTop + 22;
  doc.font('Helvetica').fontSize(10);
  let subtotal = 0;
  const items = order.items || [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const qty = Number(it.quantity || 0);
    const rate = Number(it.rate || 0);
    const lineTotal = qty * rate;
    subtotal += lineTotal;

    doc.text(it.description || `Item ${i + 1}`, leftX, currentY, { width: col.desc });
    doc.text(String(qty), leftX + col.desc, currentY, { width: col.qty, align: 'right' });
    doc.text(rate.toFixed(2), leftX + col.desc + col.qty, currentY, { width: col.rate, align: 'right' });
    doc.text(lineTotal.toFixed(2), leftX + col.desc + col.qty + col.rate, currentY, { width: col.amount, align: 'right' });
    currentY += 18;
    // Add a page if we are near the bottom
    if (currentY > doc.page.height - doc.page.margins.bottom - 120) {
      doc.addPage();
      currentY = doc.page.margins.top;
    }
  }

  // Totals block aligned to the right side of the table
  const totalsX = leftX + col.desc + col.qty;
  currentY += 8;
  doc.font('Helvetica').fontSize(10);
  doc.text('Subtotal', totalsX, currentY, { width: col.rate, align: 'right' });
  doc.text(subtotal.toFixed(2), totalsX + col.rate, currentY, { width: col.amount, align: 'right' });
  currentY += 16;

  // Taxes
  const taxes = (invoice && (invoice.taxes || invoice.taxes)) || [];
  let taxTotal = 0;
  if (Array.isArray(taxes) && taxes.length > 0) {
    for (const tax of taxes) {
      const pct = Number(tax.percent || 0);
      const amt = subtotal * (pct / 100);
      taxTotal += amt;
      doc.text(`${tax.label || 'Tax'} (${pct}%)`, totalsX, currentY, { width: col.rate, align: 'right' });
      doc.text(amt.toFixed(2), totalsX + col.rate, currentY, { width: col.amount, align: 'right' });
      currentY += 14;
    }
  }

  // Grand total
  const grandTotal = subtotal + taxTotal;
  currentY += 6;
  doc.font('Helvetica-Bold').fontSize(11);
  doc.text('Total', totalsX, currentY, { width: col.rate, align: 'right' });
  doc.text(grandTotal.toFixed(2), totalsX + col.rate, currentY, { width: col.amount, align: 'right' });

  // Notes
  currentY += 22;
  if (order.note) {
    doc.font('Helvetica').fontSize(9).fillColor('black').text('Notes:', leftX, currentY, { underline: true });
    currentY += 14;
    doc.fontSize(9).text(order.note, leftX, currentY, { width: pageWidth });
    currentY += 18;
  }

  // Centered, prominent thank-you near the bottom
  const bottomY = doc.page.height - doc.page.margins.bottom - 80;
  const thankYouY = Math.max(currentY + 30, bottomY);
  doc.font('Helvetica-Bold').fontSize(14).fillColor('#444').text('Thank you for your business.', leftX, thankYouY, { width: pageWidth, align: 'center' });

  doc.end();

  // Convert stream to buffer (collect chunks)
  const streamToBuffer = (stream) =>
    new Promise((resolve, reject) => {
      const chunks = [];
      stream.on('data', (c) => chunks.push(c));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', (err) => reject(err));
    });

  const buffer = await streamToBuffer(doc);
  return buffer;
}

// POST /api/orders
// Body: { items: [{description, quantity, rate}], customerName, customerEmail, note }
router.post('/', async (req, res) => {
  try {
    const payload = req.body || {};

    // Basic server-side validation
    if (!payload.customerName || String(payload.customerName).trim() === '') {
      return res.status(400).json({ error: 'Customer name is required' });
    }
    // email required + simple format
    const email = String(payload.customerEmail || '').trim();
    const emailRe = /^\S+@\S+\.\S+$/;
    if (!email || !emailRe.test(email)) {
      return res.status(400).json({ error: 'A valid customer email is required' });
    }
    // phone required + simple check
    const phone = String(payload.customerPhone || '').trim();
    const phoneRe = /^\+?[0-9]{7,15}$/;
    if (!phone || !phoneRe.test(phone)) {
      return res.status(400).json({ error: 'A valid customer phone number is required (digits, optional +, 7-15 digits)' });
    }
    if (!Array.isArray(payload.items) || payload.items.length === 0) {
      return res.status(400).json({ error: 'At least one item is required' });
    }
    for (const it of payload.items) {
      if (!it || Number(it.quantity || 0) <= 0 || Number(it.rate || 0) < 0) {
        return res.status(400).json({ error: 'Each item must have quantity > 0 and rate >= 0' });
      }
    }

    // Persist invoice (treat order as an invoice row in the invoices table)
    const invoice = await store.createOrder(payload);

    // Build an order-like view from the invoice row for PDF generation
    const order = {
      id: invoice.id,
      items: invoice.lineItems || invoice.line_items || [],
      customerName: invoice.customerName || invoice.customer_name,
      customerEmail: invoice.customerEmail || invoice.customer_email,
      customerPhone: invoice.customerPhone || invoice.customer_phone || '',
      createdAt: invoice.createdAt || invoice.created_at,
      note: invoice.notes || invoice.note || ''
    };

    const pdfBuffer = await generateBillPdf(order, invoice);

    // Return invoice and PDF (base64) in response
    res.json({ invoice, billPdfBase64: pdfBuffer.toString('base64') });
  } catch (err) {
    console.error('Failed to create order/invoice:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/orders
router.get('/', async (req, res) => {
  try {
    const rows = await store.listOrders();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/orders/:id
router.get('/:id', async (req, res) => {
  try {
    const row = await store.getOrder(req.params.id);
    res.json(row);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

module.exports = router;
