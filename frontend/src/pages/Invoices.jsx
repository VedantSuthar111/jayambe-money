import { useMemo, useState } from 'react';

const createLineItem = () => ({ description: '', quantity: 1, rate: 0 });
const createTax = () => ({ label: 'GST', percent: 18 });

const formatCurrency = (value = 0) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(Number(value) || 0);

const InvoicesPage = ({ invoices, loading, error, onCreateInvoice }) => {
  const [form, setForm] = useState({
    type: 'final',
    customerName: '',
    dueDate: '',
    status: 'draft',
    notes: '',
    lineItems: [createLineItem()],
    taxes: [createTax()]
  });
  const [saving, setSaving] = useState(false);

  const totals = useMemo(() => {
    const subtotal = form.lineItems.reduce(
      (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.rate) || 0),
      0
    );
    const taxAmount = form.taxes.reduce(
      (sum, tax) => sum + subtotal * ((Number(tax.percent) || 0) / 100),
      0
    );
    return {
      subtotal,
      taxAmount,
      total: subtotal + taxAmount
    };
  }, [form.lineItems, form.taxes]);

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateLineItem = (index, field, value) => {
    setForm((prev) => {
      const lineItems = [...prev.lineItems];
      lineItems[index] = { ...lineItems[index], [field]: value };
      return { ...prev, lineItems };
    });
  };

  const updateTax = (index, field, value) => {
    setForm((prev) => {
      const taxes = [...prev.taxes];
      taxes[index] = { ...taxes[index], [field]: value };
      return { ...prev, taxes };
    });
  };

  const addLineItem = () => {
    setForm((prev) => ({
      ...prev,
      lineItems: [...prev.lineItems, createLineItem()]
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onCreateInvoice(form);
      setForm({
        ...form,
        customerName: '',
        dueDate: '',
        notes: '',
        lineItems: [createLineItem()],
        taxes: [createTax()]
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 text-white lg:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-3xl border border-white/10 bg-white p-8 text-slate-900 shadow-2xl shadow-slate-950/20">
        <header>
          <p className="text-xs uppercase tracking-[0.3em] text-brand">Invoices</p>
          <h1 className="mt-2 text-3xl font-semibold">Create a new invoice</h1>
          <p className="text-sm text-slate-500">
            Capture proforma or final invoices with multi-line items & taxes.
          </p>
        </header>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              Invoice Type
              <select
                value={form.type}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                onChange={(event) => setField('type', event.target.value)}
              >
                <option value="proforma">Proforma</option>
                <option value="final">Final</option>
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">
              Status
              <select
                value={form.status}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                onChange={(event) => setField('status', event.target.value)}
              >
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
              </select>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              Customer Name
              <input
                type="text"
                value={form.customerName}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                onChange={(event) => setField('customerName', event.target.value)}
                placeholder="Customer"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Due Date
              <input
                type="date"
                value={form.dueDate}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                onChange={(event) => setField('dueDate', event.target.value)}
              />
            </label>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-800">Line Items</p>
            <div className="mt-3 space-y-3">
              {form.lineItems.map((item, index) => (
                <div
                  key={`line-${index}`}
                  className="grid gap-3 rounded-xl border border-slate-200 p-3 sm:grid-cols-12"
                >
                  <input
                    type="text"
                    className="sm:col-span-6 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Description"
                    value={item.description}
                    onChange={(event) =>
                      updateLineItem(index, 'description', event.target.value)
                    }
                  />
                  <input
                    type="number"
                    min="1"
                    className="sm:col-span-3 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(event) =>
                      updateLineItem(index, 'quantity', event.target.value)
                    }
                  />
                  <input
                    type="number"
                    min="0"
                    className="sm:col-span-3 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Rate"
                    value={item.rate}
                    onChange={(event) => updateLineItem(index, 'rate', event.target.value)}
                  />
                </div>
              ))}
              <button type="button" className="btn-outline text-xs" onClick={addLineItem}>
                + Add line item
              </button>
            </div>
          </div>

  {form.taxes.map((tax, index) => (
            <div key={`tax-${index}`} className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">
                Tax Label
                <input
                  type="text"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={tax.label}
                  onChange={(event) => updateTax(index, 'label', event.target.value)}
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Tax %
                <input
                  type="number"
                  min="0"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={tax.percent}
                  onChange={(event) => updateTax(index, 'percent', event.target.value)}
                />
              </label>
            </div>
          ))}

          <label className="text-sm font-medium text-slate-700">
            Notes
            <textarea
              rows={2}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={form.notes}
              onChange={(event) => setField('notes', event.target.value)}
            />
          </label>

          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm text-slate-500">
              Subtotal: <strong>{formatCurrency(totals.subtotal)}</strong>
            </p>
            <p className="text-sm text-slate-500">
              Taxes: <strong>{formatCurrency(totals.taxAmount)}</strong>
            </p>
            <p className="text-xl font-semibold text-slate-900">
              Total: {formatCurrency(totals.total)}
            </p>
          </div>

          <button type="submit" className="btn-primary w-full" disabled={saving}>
            {saving ? 'Saving…' : 'Save Invoice'}
          </button>
        </form>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-slate-950/30 backdrop-blur">
        <header className="mb-6">
          <p className="text-xs uppercase tracking-[0.3em] text-white/70">
            Recent Invoices
          </p>
          <h2 className="mt-2 text-2xl font-semibold">Live list</h2>
        </header>
        {loading ? (
          <p className="text-sm text-white/70">Loading invoices…</p>
        ) : invoices.length === 0 ? (
          <p className="text-sm text-white/70">No invoices yet.</p>
        ) : (
          <div className="space-y-3">
            {invoices.slice(0, 10).map((invoice) => (
              <article
                key={invoice.id}
                className="rounded-2xl border border-white/10 bg-slate-900/40 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold">{invoice.number}</p>
                    <p className="text-xs text-white/60">
                      {invoice.customerName} · {invoice.type.toUpperCase()} ·{' '}
                      {invoice.status}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold">
                      {formatCurrency(invoice.total)}
                    </p>
                    <p className="text-xs text-white/60">
                      Balance {formatCurrency(invoice.balanceDue)}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default InvoicesPage;

