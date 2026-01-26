const express = require('express');
const PDFDocument = require('pdfkit');
const store = require('../lib/store');
const router = express.Router();
async function generateBillPdf(order, invoice) {
  const doc = new PDFDocument({ size: 'A4', margin: 20, bufferPages: true });

  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const leftX = doc.page.margins.left;

  // Company info
  const companyName = 'JAY AMBE METAL WORKS';
  const companyAddress = 'D-31, 2 Sardar Industrial Estate Area';
  const companyCity = 'Ajwa Road, Vadodara';
  const companyPhone = '+91 9925074921';
  const companyGSTIN = '24AWVPS9710Q1ZD';

  let y = doc.page.margins.top;

  // Helper function to convert number to words
  function numberToWords(num) {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

    function convert(n) {
      if (n === 0) return '';
      if (n < 10) return ones[n];
      if (n < 20) return teens[n - 10];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
      if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convert(n % 100) : '');
      if (n < 1000000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + convert(n % 1000) : '');
      return convert(Math.floor(n / 1000000)) + ' Million' + (n % 1000000 !== 0 ? ' ' + convert(n % 1000000) : '');
    }
    return convert(num) + ' Only';
  }

  // Title - Company Name
  doc.font('Helvetica-Bold').fontSize(18).fillColor('#000').text(companyName, leftX, y, { align: 'center', width: pageWidth });
  y += 20;

  // Company details - centered
  doc.font('Helvetica').fontSize(10).fillColor('#000').text(companyAddress, leftX, y, { align: 'center', width: pageWidth });
  y += 13;
  doc.text(companyCity, leftX, y, { align: 'center', width: pageWidth });
  y += 13;
  doc.text(`Tel: ${companyPhone}`, leftX, y, { align: 'center', width: pageWidth });
  y += 13;
  doc.font('Helvetica-Bold').fontSize(10).text(`GSTIN: ${companyGSTIN}`, leftX, y, { align: 'center', width: pageWidth });
  y += 16;

  // Tax Invoice title
  doc.font('Helvetica-Bold').fontSize(14).text('Tax Invoice', leftX, y, { align: 'center', width: pageWidth });
  y += 25;

  // Invoice details table - with borders
  const detailX = leftX;
  const detailColWidth = pageWidth / 2;
  
  // Draw borders for invoice details
  doc.rect(detailX, y, pageWidth, 60).stroke();
  doc.moveTo(detailX + detailColWidth, y).lineTo(detailX + detailColWidth, y + 60).stroke();
  
  // Horizontal dividers for 4 rows
  for (let i = 1; i < 4; i++) {
    doc.moveTo(detailX, y + (i * 15)).lineTo(detailX + pageWidth, y + (i * 15)).stroke();
  }

  doc.font('Helvetica').fontSize(9).fillColor('#000');
  let detailY = y + 3;
  
  doc.text(`Invoice No: ${invoice && invoice.number ? invoice.number : 'N/A'}`, detailX + 3, detailY, { width: detailColWidth - 6 });
  doc.text('Transport Mode: Self', detailX + detailColWidth + 3, detailY, { width: detailColWidth - 6 });
  detailY += 15;

  const invoiceDate = order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB');
  doc.text(`Invoice Date: ${invoiceDate}`, detailX + 3, detailY, { width: detailColWidth - 6 });
  doc.text('Vehicle No: Self', detailX + detailColWidth + 3, detailY, { width: detailColWidth - 6 });
  detailY += 15;

  doc.text('Reverse Charge (Y/N): No', detailX + 3, detailY, { width: detailColWidth - 6 });
  doc.text('Place of Supply: Vadodara', detailX + detailColWidth + 3, detailY, { width: detailColWidth - 6 });
  detailY += 15;

  doc.text('State: Gujarat (Code: 24)', detailX + 3, detailY, { width: detailColWidth - 6 });

  y += 75;

  // Bill To / Ship To table - with borders
  const billToColWidth = pageWidth / 2;
  
  // Header row
  doc.rect(detailX, y, pageWidth, 14).stroke();
  doc.moveTo(detailX + billToColWidth, y).lineTo(detailX + billToColWidth, y + 42).stroke();
  
  doc.font('Helvetica-Bold').fontSize(10);
  doc.text('Bill To Party', detailX + 3, y + 2, { width: billToColWidth - 6 });
  doc.text('Ship To Party', detailX + billToColWidth + 3, y + 2, { width: billToColWidth - 6 });
  
  // Details row
  doc.moveTo(detailX, y + 14).lineTo(detailX + pageWidth, y + 14).stroke();
  
  doc.font('Helvetica').fontSize(7);
  const billToDetails = `Name: ${order.customerName || 'N/A'}\nGSTIN: N/A\nState: Gujarat (24)`;
  const shipToDetails = `Name:\nVoucher Ref:\nState: Gujarat (24)`;
  
  doc.text(billToDetails, detailX + 3, y + 18, { width: billToColWidth - 6 });
  doc.text(shipToDetails, detailX + billToColWidth + 3, y + 18, { width: billToColWidth - 6 });
  
  // Bottom border
  doc.rect(detailX, y, pageWidth, 42).stroke();
  
  y += 55;

  // Items table
  const tableTop = y;
  const cols = {
    sr: pageWidth * 0.05,
    desc: pageWidth * 0.25,
    uom: pageWidth * 0.08,
    qty: pageWidth * 0.08,
    rate: pageWidth * 0.10,
    amount: pageWidth * 0.10,
    taxable: pageWidth * 0.10,
    cgst: pageWidth * 0.08,
    sgst: pageWidth * 0.08,
    total: pageWidth * 0.08
  };

  const headers = ['Sr', 'Product Description', 'UOM', 'Qty', 'Rate', 'Amount', 'Taxable Value', 'CGST 9%', 'SGST 9%', 'Total'];
  const headerWidths = [cols.sr, cols.desc, cols.uom, cols.qty, cols.rate, cols.amount, cols.taxable, cols.cgst, cols.sgst, cols.total];

  // Draw header row border and content
  doc.rect(leftX, tableTop, pageWidth, 14).stroke();
  let xPos = leftX;
  for (let i = 0; i < headers.length; i++) {
    doc.moveTo(xPos, tableTop).lineTo(xPos, tableTop + 14);
    xPos += headerWidths[i];
  }
  doc.moveTo(xPos, tableTop).lineTo(xPos, tableTop + 14).stroke();

  doc.font('Helvetica-Bold').fontSize(8).fillColor('#000');
  xPos = leftX;
  for (let i = 0; i < headers.length; i++) {
    doc.text(headers[i], xPos + 1, tableTop + 2, { width: headerWidths[i] - 2, align: 'center', height: 10 });
    xPos += headerWidths[i];
  }

  let rowY = tableTop + 14;
  let subtotal = 0;
  let cgstTotal = 0;
  let sgstTotal = 0;
  const items = order.items || [];
  const gstPercent = (invoice && invoice.taxes && invoice.taxes[0] && invoice.taxes[0].percent) ? invoice.taxes[0].percent / 2 : 9;

  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const qty = Number(it.quantity || 0);
    const rate = Number(it.rate || 0);
    const amount = qty * rate;
    const cgst = amount * (gstPercent / 100);
    const sgst = amount * (gstPercent / 100);
    const total = amount + cgst + sgst;

    subtotal += amount;
    cgstTotal += cgst;
    sgstTotal += sgst;

    // Draw row border
    doc.rect(leftX, rowY, pageWidth, 14).stroke();
    
    // Draw column separators
    xPos = leftX;
    for (let j = 0; j < headerWidths.length; j++) {
      doc.moveTo(xPos, rowY).lineTo(xPos, rowY + 14);
      xPos += headerWidths[j];
    }
    doc.moveTo(xPos, rowY).lineTo(xPos, rowY + 14).stroke();

    // Write data
    doc.font('Helvetica').fontSize(8).fillColor('#000');
    xPos = leftX + 1;

    doc.text(String(i + 1), xPos, rowY + 2, { width: cols.sr - 2, align: 'center' });
    xPos += cols.sr;

    doc.text(it.description || 'Item', xPos, rowY + 2, { width: cols.desc - 2 });
    xPos += cols.desc;

    doc.text('SQ.FT', xPos, rowY + 2, { width: cols.uom - 2, align: 'center' });
    xPos += cols.uom;

    doc.text(String(qty), xPos, rowY + 2, { width: cols.qty - 2, align: 'right' });
    xPos += cols.qty;

    doc.text( rate.toFixed(2), xPos + 1, rowY + 2, { width: cols.rate - 3, align: 'right' });
    xPos += cols.rate;

    doc.text(amount.toFixed(2), xPos, rowY + 2, { width: cols.amount - 2, align: 'right' });
    xPos += cols.amount;

    doc.text(amount.toFixed(2), xPos, rowY + 2, { width: cols.taxable - 2, align: 'right' });
    xPos += cols.taxable;

    doc.text(cgst.toFixed(2), xPos, rowY + 2, { width: cols.cgst - 2, align: 'right' });
    xPos += cols.cgst;

    doc.text(sgst.toFixed(2), xPos, rowY + 2, { width: cols.sgst - 2, align: 'right' });
    xPos += cols.sgst;

    doc.text(total.toFixed(2), xPos, rowY + 2, { width: cols.total - 2, align: 'right' });

    rowY += 14;
  }

  // Totals row
  const grandTotal = subtotal + cgstTotal + sgstTotal;
  doc.rect(leftX, rowY, pageWidth, 14).stroke();
  xPos = leftX;
  for (let j = 0; j < headerWidths.length; j++) {
    doc.moveTo(xPos, rowY).lineTo(xPos, rowY + 14);
    xPos += headerWidths[j];
  }
  doc.moveTo(xPos, rowY).lineTo(xPos, rowY + 14).stroke();

  doc.font('Helvetica-Bold').fontSize(8);
  xPos = leftX + cols.sr + cols.desc + cols.uom + cols.qty + cols.rate;
  doc.text('Total', xPos + 1, rowY + 2, { width: cols.amount - 2, align: 'right' });

  xPos = leftX + cols.sr + cols.desc + cols.uom + cols.qty + cols.rate + cols.amount;
  doc.text(subtotal.toFixed(2), xPos + 1, rowY + 2, { width: cols.taxable - 2, align: 'right' });

  xPos += cols.taxable;
  doc.text(cgstTotal.toFixed(2), xPos + 1, rowY + 2, { width: cols.cgst - 2, align: 'right' });

  xPos += cols.cgst;
  doc.text(sgstTotal.toFixed(2), xPos + 1, rowY + 2, { width: cols.sgst - 2, align: 'right' });

  xPos += cols.sgst;
  doc.text(grandTotal.toFixed(2), xPos + 1, rowY + 2, { width: cols.total - 2, align: 'right' });

  y = rowY + 28;

  // Summary section
  const summaryBoxWidth = 180;
  const summaryX = leftX + pageWidth - summaryBoxWidth;
  
  // Draw summary box with borders
  doc.rect(summaryX, y, summaryBoxWidth, 58).stroke();
  
  // Dividers
  doc.moveTo(summaryX, y + 14.5).lineTo(summaryX + summaryBoxWidth, y + 14.5).stroke();
  doc.moveTo(summaryX, y + 29).lineTo(summaryX + summaryBoxWidth, y + 29).stroke();
  doc.moveTo(summaryX, y + 43.5).lineTo(summaryX + summaryBoxWidth, y + 43.5).stroke();

  doc.font('Helvetica').fontSize(8).fillColor('#000');
  let summaryY = y + 2;
  
  doc.text('Total Amount Before Tax', summaryX + 3, summaryY, { width: 110 });
  doc.text(subtotal.toFixed(2), summaryX + 115, summaryY, { width: 60, align: 'right' });
  summaryY += 14.5;

  doc.text('Add CGST', summaryX + 3, summaryY, { width: 110 });
  doc.text(cgstTotal.toFixed(2), summaryX + 115, summaryY, { width: 60, align: 'right' });
  summaryY += 14.5;

  doc.text('Add SGST', summaryX + 3, summaryY, { width: 110 });
  doc.text(sgstTotal.toFixed(2), summaryX + 115, summaryY, { width: 60, align: 'right' });
  summaryY += 14.5;

  doc.font('Helvetica-Bold').fontSize(9);
  doc.text('Total Amount After Tax', summaryX + 3, summaryY, { width: 110 });
  doc.text(grandTotal.toFixed(2), summaryX + 115, summaryY, { width: 60, align: 'right' });

  y += 75;

  // Amount in words
  doc.font('Helvetica').fontSize(9).fillColor('#000');
  const amountWords = numberToWords(Math.round(grandTotal));
  doc.text(`Amount in Words: Rs. ${amountWords}`, leftX, y);
  y += 30;

  // Bank details and signature
  const bankX = leftX;
  const sigX = leftX + pageWidth * 0.55;

  doc.font('Helvetica-Bold').fontSize(9);
  doc.text('Bank Details', bankX, y);
  
  doc.font('Helvetica').fontSize(8);
  doc.text('A/C No: 41448201726', bankX, y + 11);
  doc.text('Branch: Darbar Chokdi', bankX, y + 22);
  doc.text('IFSC: SBIN0013006', bankX, y + 33);

  // Signature section
  doc.font('Helvetica').fontSize(8).fillColor('#000');
  doc.text('For JAY AMBE METAL WORKS', sigX, y, { align: 'center', width: 120 });
  doc.moveTo(sigX + 12, y + 36).lineTo(sigX + 88, y + 36).stroke();
  doc.text('Authorised Signatory', sigX, y + 38, { align: 'center', width: 120, fontSize: 7 });

  // Convert stream to buffer
  const streamToBuffer = (stream) =>
    new Promise((resolve, reject) => {
      const chunks = [];
      stream.on('data', (c) => chunks.push(c));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', (err) => reject(err));
    });

  const done = streamToBuffer(doc);
  doc.end();
  const buffer = await done;
  return buffer;
}

router.post('/', async (req, res) => {
  try {
    const payload = req.body || {};
    if (!payload.customerName || String(payload.customerName).trim() === '') {
      return res.status(400).json({ error: 'Customer name is required' });
    }
    const email = String(payload.customerEmail || '').trim();
    const emailRe = /^\S+@\S+\.\S+$/;
    if (!email || !emailRe.test(email)) {
      return res.status(400).json({ error: 'A valid customer email is required' });
    }
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

    const invoice = await store.createOrder(payload);
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
    res.json({ invoice, billPdfBase64: pdfBuffer.toString('base64') });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/preview', async (req, res) => {
  try {
    const payload = req.body || {};
    const defaults = {
      customerName: 'Preview Customer',
      customerEmail: 'preview@example.com',
      customerPhone: '+911234567890',
      items: [{ description: 'Preview item', quantity: 1, rate: 1000 }],
      note: 'Preview only',
      createdAt: new Date().toISOString(),
      dueDate: null,
      taxes: []
    };
    const merged = {
      customerName: payload.customerName || defaults.customerName,
      customerEmail: payload.customerEmail || defaults.customerEmail,
      customerPhone: payload.customerPhone || defaults.customerPhone,
      items: Array.isArray(payload.items) && payload.items.length > 0 ? payload.items : defaults.items,
      note: payload.note || defaults.note,
      createdAt: payload.createdAt || defaults.createdAt,
      dueDate: payload.dueDate || defaults.dueDate,
      taxes: Array.isArray(payload.taxes) ? payload.taxes : defaults.taxes
    };

    const invoice = {
      id: 'preview',
      number: payload.number || 'PREVIEW',
      taxes: merged.taxes,
      dueDate: merged.dueDate,
      terms: 'Due on receipt',
      createdAt: merged.createdAt
    };

    const order = {
      id: 'preview',
      items: merged.items,
      customerName: merged.customerName,
      customerEmail: merged.customerEmail,
      customerPhone: merged.customerPhone,
      createdAt: merged.createdAt,
      note: merged.note
    };

    const pdfBuffer = await generateBillPdf(order, invoice);
    res.json({ invoice, billPdfBase64: pdfBuffer.toString('base64') });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (_req, res) => {
  try {
    const rows = await store.listOrders();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const row = await store.getOrder(req.params.id);
    res.json(row);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

module.exports = router;
