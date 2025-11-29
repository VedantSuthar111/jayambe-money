const { nanoid } = require('nanoid');
const { randomUUID } = require('crypto');
const { startOfDay, startOfMonth } = require('date-fns');
const supabase = require('./supabase');

const PAYMENT_MODES = ['cash', 'upi', 'bank_transfer', 'card'];
const PAYMENT_TAGS = ['advance', 'final', 'adjustment'];

const padNumber = (num) => num.toString().padStart(4, '0');

const countForTable = async (table, filters = []) => {
  let query = supabase.from(table).select('id', { count: 'exact', head: true });
  filters.forEach(([column, value]) => {
    query = query.eq(column, value);
  });
  const { count, error } = await query;
  if (error) {
    throw new Error(error.message);
  }
  return count || 0;
};

const nextInvoiceNumber = async (type) => {
  const prefix = type === 'proforma' ? 'JA-PRO-' : 'JA-INV-';
  const count = await countForTable('invoices', [['type', type]]);
  return `${prefix}${padNumber(count + 1)}`;
};

const nextReceiptNumber = async () => {
  const count = await countForTable('payments');
  return `JA-RCPT-${padNumber(count + 1)}`;
};

const nextPayableNumber = async () => {
  const count = await countForTable('payables');
  return `JA-PAY-${padNumber(count + 1)}`;
};

const normalizeLineItems = (lineItems = []) =>
  lineItems.map((item) => ({
    id: nanoid(6),
    description: item.description || 'Line Item',
    quantity: Number(item.quantity) || 1,
    rate: Number(item.rate) || 0
  }));

const normalizeTaxes = (taxes = []) =>
  taxes.map((tax) => ({
    id: nanoid(6),
    label: tax.label || 'Tax',
    percent: Number(tax.percent) || 0
  }));

const calculateTotals = (lineItems = [], taxes = []) => {
  const subtotal = lineItems.reduce(
    (sum, item) => sum + item.quantity * item.rate,
    0
  );
  const taxAmount = taxes.reduce(
    (sum, tax) => sum + subtotal * (tax.percent / 100),
    0
  );

  return {
    subtotal,
    taxAmount,
    total: subtotal + taxAmount
  };
};

const mapInvoice = (row = {}) => ({
  id: row.id,
  number: row.number,
  type: row.type,
  customerName: row.customer_name,
  customerEmail: row.customer_email,
  customerPhone: row.customer_phone,
  dueDate: row.due_date,
  status: row.status,
  lineItems: row.line_items,
  taxes: row.taxes,
  subtotal: row.subtotal,
  taxAmount: row.tax_amount,
  total: row.total,
  paidToDate: row.paid_to_date,
  balanceDue: row.balance_due,
  notes: row.notes,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const mapPayment = (row = {}) => ({
  id: row.id,
  invoiceId: row.invoice_id,
  invoiceNumber: row.invoice_number,
  customerName: row.customer_name,
  receiptNumber: row.receipt_number,
  amount: row.amount,
  mode: row.mode,
  tag: row.tag,
  note: row.note,
  createdAt: row.created_at
});

const mapPayable = (row = {}) => ({
  id: row.id,
  billNumber: row.bill_number,
  supplierName: row.supplier_name,
  amount: row.amount,
  dueDate: row.due_date,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const createInvoice = async (payload = {}) => {
  const type = payload.type === 'proforma' ? 'proforma' : 'final';
  const lineItems = normalizeLineItems(payload.lineItems);
  const taxes = normalizeTaxes(payload.taxes);
  const totals = calculateTotals(lineItems, taxes);
  const number = await nextInvoiceNumber(type);

  const invoiceRow = {
    // Let the database generate the UUID for `id` (DEFAULT gen_random_uuid())
    number,
    type,
    customer_name: payload.customerName || 'Walk-in Customer',
    customer_email: payload.customerEmail || '',
    customer_phone: payload.customerPhone || '',
    due_date: payload.dueDate || null,
    status: payload.status || 'draft',
    line_items: lineItems,
    taxes,
    subtotal: totals.subtotal,
    tax_amount: totals.taxAmount,
    total: totals.total,
    paid_to_date: 0,
    balance_due: totals.total,
    notes: payload.notes || ''
  };

  // If a createdAt is provided by the client, set it (will override DB default)
  if (payload.createdAt) {
    invoiceRow.created_at = payload.createdAt;
  }

  const { data, error } = await supabase
    .from('invoices')
    .insert(invoiceRow)
    .select()
    .single();

  if (error) {
    const msg = String(error.message || '').toLowerCase();
    // If the error indicates the column doesn't exist (schema mismatch), retry without customer_phone
    if (msg.includes('customer_phone') || msg.includes('does not exist') || msg.includes('column') && msg.includes('does not exist')) {
      // remove the phone field and retry insert so older DB schemas don't break
      delete invoiceRow.customer_phone;
      const { data: retryData, error: retryError } = await supabase
        .from('invoices')
        .insert(invoiceRow)
        .select()
        .single();
      if (retryError) {
        throw new Error(retryError.message);
      }
      return mapInvoice(retryData);
    }

    throw new Error(error.message);
  }

  return mapInvoice(data);
};

// createOrder: Persist an order as an invoice row in the `invoices` table
// This keeps orders and invoices in the same table and avoids needing a separate `orders` table.
const createOrder = async (payload = {}) => {
  // Reuse createInvoice logic: treat the order as an invoice of type 'final'
  const invoice = await createInvoice({
    type: payload.type || 'final',
    customerName: payload.customerName,
    customerEmail: payload.customerEmail,
    customerPhone: payload.customerPhone,
    dueDate: payload.dueDate || null,
    status: payload.status || 'draft',
    lineItems: payload.items || [],
    taxes: payload.taxes || [],
    notes: payload.note || ''
  });

  return invoice;
};

// listOrders/getOrder: reuse invoices list/get so orders and invoices come from same table
const listOrders = async () => {
  return await listInvoices();
};

const getOrder = async (id) => {
  return await getInvoiceById(id);
};

const listInvoices = async () => {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    throw new Error(error.message);
  }
  return data.map(mapInvoice);
};

const getInvoiceById = async (id) => {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', id)
    .single();
  if (error) {
    throw new Error('Invoice not found');
  }
  return mapInvoice(data);
};

const recordPayment = async (payload = {}) => {
  const invoice = await getInvoiceById(payload.invoiceId);

  const mode = PAYMENT_MODES.includes(payload.mode) ? payload.mode : 'cash';
  const tag = PAYMENT_TAGS.includes(payload.tag) ? payload.tag : 'final';
  const amount = Number(payload.amount);

  if (!amount || amount <= 0) {
    throw new Error('Amount must be greater than zero');
  }

  const receiptNumber = await nextReceiptNumber();

  const paymentRow = {
    id: randomUUID(),
    invoice_id: invoice.id,
    invoice_number: invoice.number,
    customer_name: invoice.customerName,
    receipt_number: receiptNumber,
    amount,
    mode,
    tag,
    note: payload.note || ''
  };

  const { data: paymentData, error: paymentError } = await supabase
    .from('payments')
    .insert(paymentRow)
    .select()
    .single();

  if (paymentError) {
    throw new Error(paymentError.message);
  }

  const updatedPaid = Number((invoice.paidToDate + amount).toFixed(2));
  const updatedBalance = Number(
    Math.max(invoice.total - updatedPaid, 0).toFixed(2)
  );

  const { error: updateError } = await supabase
    .from('invoices')
    .update({
      paid_to_date: updatedPaid,
      balance_due: updatedBalance,
      status: updatedBalance <= 0 ? 'paid' : invoice.status
    })
    .eq('id', invoice.id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  return mapPayment(paymentData);
};

const listPayments = async () => {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    throw new Error(error.message);
  }
  return data.map(mapPayment);
};

const createPayable = async (payload = {}) => {
  const billNumber = payload.billNumber || (await nextPayableNumber());

  const payableRow = {
    id: randomUUID(),
    bill_number: billNumber,
    supplier_name: payload.supplierName || 'Supplier',
    amount: Number(payload.amount) || 0,
    due_date: payload.dueDate || null,
    status: payload.status || 'pending'
  };

  const { data, error } = await supabase
    .from('payables')
    .insert(payableRow)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapPayable(data);
};

const listPayables = async () => {
  const { data, error } = await supabase
    .from('payables')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    throw new Error(error.message);
  }
  return data.map(mapPayable);
};

const getDashboardMetrics = async () => {
  const todayStart = startOfDay(new Date());
  const monthStart = startOfMonth(new Date());

  const [{ data: todayPayments }, { data: monthPayments }, { data: monthInvoices }, { data: invoiceBalances }] =
    await Promise.all([
      supabase
        .from('payments')
        .select('amount, created_at')
        .gte('created_at', todayStart.toISOString()),
      supabase
        .from('payments')
        .select('amount, created_at')
        .gte('created_at', monthStart.toISOString()),
      supabase
        .from('invoices')
        .select('total, created_at')
        .gte('created_at', monthStart.toISOString()),
      supabase.from('invoices').select('balance_due')
    ]);

  const sumValues = (rows = [], field) =>
    rows.reduce((sum, row) => sum + Number(row[field] || 0), 0);

  return {
    todayCollected: sumValues(todayPayments, 'amount'),
    mtdCollected: sumValues(monthPayments, 'amount'),
    mtdInvoiced: sumValues(monthInvoices, 'total'),
    totalReceivables: sumValues(invoiceBalances, 'balance_due')
  };
};

module.exports = {
  createInvoice,
  listInvoices,
  getInvoiceById,
  recordPayment,
  listPayments,
  createPayable,
  listPayables,
  getDashboardMetrics,
  createOrder,
  listOrders,
  getOrder
};
