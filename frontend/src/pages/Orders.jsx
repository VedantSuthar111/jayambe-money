import { useEffect, useState } from 'react';
import { createOrder, fetchInvoices } from '../utils/api';

const EmptyItem = () => ({ description: '', quantity: 1, rate: 0 });

const OrdersPage = () => {
  const [items, setItems] = useState([EmptyItem()]);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [createdAt, setCreatedAt] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [gstRegistered, setGstRegistered] = useState(true);
  const [gstPercent, setGstPercent] = useState(18);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const updateItem = (index, key, value) => {
    const next = items.slice();
    next[index] = { ...next[index], [key]: value };
    setItems(next);
  };

  const addItem = () => setItems([...items, EmptyItem()]);
  const removeItem = (i) => setItems(items.filter((_, idx) => idx !== i));

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // Client-side validation
      if (!customerName || String(customerName).trim() === '') {
        setError('Customer name is required');
        setLoading(false);
        return;
      }
      // validate email
      const emailVal = String(customerEmail || '').trim();
      const emailRe = /^\S+@\S+\.\S+$/;
      if (!emailVal || !emailRe.test(emailVal)) {
        setError('A valid customer email is required');
        setLoading(false);
        return;
      }
      // validate phone
      const phoneVal = String(customerPhone || '').trim();
      const phoneRe = /^\+?[0-9]{7,15}$/;
      if (!phoneVal || !phoneRe.test(phoneVal)) {
        setError('A valid customer phone number is required (digits, optional +, 7-15 digits)');
        setLoading(false);
        return;
      }
      if (!Array.isArray(items) || items.length === 0) {
        setError('Add at least one item');
        setLoading(false);
        return;
      }
      for (const it of items) {
        if (!it || Number(it.quantity || 0) <= 0 || Number(it.rate || 0) < 0) {
          setError('Each item must have quantity > 0 and rate >= 0');
          setLoading(false);
          return;
        }
      }

      const payload = {
        items,
        customerName,
        customerEmail,
        customerPhone,
        note,
        createdAt: createdAt ? new Date(createdAt).toISOString() : undefined,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        taxes: gstRegistered && Number(gstPercent) > 0 ? [{ label: 'GST', percent: Number(gstPercent) }] : []
      };

      const resp = await createOrder(payload);

      // resp.billPdfBase64 contains base64 PDF; trigger download
      if (resp && resp.billPdfBase64) {
        const href = 'data:application/pdf;base64,' + resp.billPdfBase64;
        const link = document.createElement('a');
        link.href = href;
        const filename = `bill-${resp.invoice.id}.pdf`;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
      }

      // refresh recent invoices list
      await loadRecent();

      // reset form
      setItems([EmptyItem()]);
      setCustomerName('');
      setCustomerEmail('');
      setCustomerPhone('');
      setNote('');
    } catch (err) {
      setError(err.message || 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  const subtotal = items.reduce((sum, it) => sum + (Number(it.quantity || 0) * Number(it.rate || 0)), 0);
  const taxAmount = gstRegistered ? subtotal * (Number(gstPercent || 0) / 100) : 0;
  const total = subtotal + taxAmount;

  const [recent, setRecent] = useState([]);

  const loadRecent = async () => {
    try {
      const resp = await fetchInvoices();
      // resp should be array or { data: [] }
      const rows = resp.data || resp || [];
      setRecent(rows.slice(0, 10));
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    loadRecent();
  }, []);

  // default createdAt to now (datetime-local expects 'YYYY-MM-DDTHH:MM')
  useEffect(() => {
    if (!createdAt) {
      const now = new Date();
      const iso = now.toISOString();
      // take YYYY-MM-DDTHH:MM
      setCreatedAt(iso.slice(0, 16));
    }
  }, []);

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-8 px-6 py-12 text-white lg:grid-cols-[1.2fr_0.8fr]">
      <section className="rounded-3xl border border-white/10 bg-white p-8 text-slate-900 shadow-2xl shadow-slate-950/20">
        <header>
          <p className="text-xs uppercase tracking-[0.3em] text-sky-600">Orders</p>
          <h1 className="mt-2 text-3xl font-semibold">Create order & print bill</h1>
          <p className="text-sm text-slate-500">Create an order — an invoice record and bill PDF will be generated automatically.</p>
        </header>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="text-sm font-medium text-slate-700">
            Customer name
            <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </label>

          <label className="text-sm font-medium text-slate-700">
            Customer email
            <input value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </label>

          <label className="text-sm font-medium text-slate-700">
            Customer phone
            <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="e.g. +919876543210" />
          </label>

          <div>
            <label className="text-sm font-medium text-slate-700">Items</label>
            <div className="mt-2 space-y-2">
              <div className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-6">
                  <label className="block text-xs text-slate-500">Created date</label>
                  <input type="datetime-local" value={createdAt} onChange={(e) => setCreatedAt(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1 text-sm" />
                </div>
                <div className="col-span-3">
                  <label className="block text-xs text-slate-500">Due date</label>
                  <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1 text-sm" />
                </div>
                <div className="col-span-3">
                  <label className="block text-xs text-slate-500">GST</label>
                  <div className="mt-1 flex items-center gap-2">
                    <input type="checkbox" checked={gstRegistered} onChange={(e) => setGstRegistered(e.target.checked)} className="h-4 w-4" />
                    <input type="number" min="0" value={gstPercent} onChange={(e) => setGstPercent(Number(e.target.value))} className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-sm" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-12 gap-2 text-xs text-slate-500 font-medium px-2">
                <div className="col-span-7">Description</div>
                <div className="col-span-1 text-right">Qty</div>
                <div className="col-span-2 text-right">Rate</div>
                <div className="col-span-1 text-right">Amount</div>
                <div className="col-span-1"></div>
              </div>
              {items.map((it, i) => (
                <div key={i} className="flex gap-3 items-center bg-slate-50 p-3 rounded">
                  <input
                    placeholder="Description"
                    value={it.description}
                    onChange={(e) => updateItem(i, 'description', e.target.value)}
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white text-slate-900 w-full"
                  />
                  <input
                    type="number"
                    min="1"
                    value={it.quantity}
                    onChange={(e) => updateItem(i, 'quantity', Number(e.target.value))}
                    className="w-20 rounded-lg border border-slate-300 px-3 py-2 text-sm text-right"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={it.rate}
                    onChange={(e) => updateItem(i, 'rate', Number(e.target.value))}
                    className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm text-right"
                  />
                  <div className="w-24 text-right text-sm text-slate-700">{(Number(it.quantity || 0) * Number(it.rate || 0)).toFixed(2)}</div>
                  <div className="w-20 flex justify-end">
                    <button type="button" onClick={() => removeItem(i)} className="rounded bg-red-600 px-4 py-2 text-white whitespace-nowrap">Del</button>
                  </div>
                </div>
              ))}

              <div>
                <button type="button" onClick={addItem} className="rounded bg-emerald-500 px-3 py-1 text-white">Add item</button>
              </div>
            </div>
          </div>

        <div className="rounded border bg-slate-50 p-4 mt-4">
          <div className="flex justify-between text-sm text-slate-700">
            <div>Subtotal</div>
            <div>₹ {subtotal.toFixed(2)}</div>
          </div>
          <div className="flex justify-between text-sm text-slate-700">
            <div>GST {gstRegistered ? `(${gstPercent}%)` : ''}</div>
            <div>₹ {taxAmount.toFixed(2)}</div>
          </div>
          <div className="flex justify-between text-lg font-semibold mt-2 text-slate-900">
            <div>Total</div>
            <div>₹ {total.toFixed(2)}</div>
          </div>
        </div>

          <label className="text-sm font-medium text-slate-700">
            Note
            <textarea value={note} onChange={(e) => setNote(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </label>

          {error && <div className="text-sm text-red-400">{error}</div>}

          <div>
            <button disabled={loading} type="submit" className="btn-primary w-full">
              {loading ? 'Creating...' : 'Add Order & Download Bill'}
            </button>
          </div>
        </form>

      </section>

      <aside className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-slate-950/30 backdrop-blur">
        <header className="mb-6">
          <p className="text-xs uppercase tracking-[0.3em] text-white/70">Recent</p>
          <h2 className="mt-2 text-2xl font-semibold">Recent Orders / Invoices</h2>
        </header>
        <div className="space-y-3">
          {recent.length === 0 ? (
            <p className="text-sm text-white/70">No recent orders</p>
          ) : (
            recent.map((inv) => (
              <article key={inv.id} className="rounded-2xl border border-white/10 bg-slate-900/40 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-semibold text-white">{inv.number}</p>
                    <p className="text-xs text-white/60">{inv.customer_name || inv.customerName}</p>
                  </div>
                  <div className="text-right text-white">
                    <p className="text-lg font-semibold">₹ {Number(inv.total || inv.totalAmount || 0).toFixed(2)}</p>
                    <p className="text-xs text-white/60">{new Date(inv.created_at || inv.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </aside>
    </div>
  );
};

export default OrdersPage;
