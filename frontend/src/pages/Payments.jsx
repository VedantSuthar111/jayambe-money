import { useState } from 'react';

const PaymentSelect = ({ label, name, value, options, onChange }) => (
  <label className="text-sm font-medium text-slate-700">
    {label}
    <select
      name={name}
      value={value}
      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      onChange={onChange}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </label>
);

const PAYMENT_MODE_LABELS = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'card', label: 'Card' }
];

const PAYMENT_TAG_LABELS = [
  { value: 'advance', label: 'Advance' },
  { value: 'final', label: 'Final' },
  { value: 'adjustment', label: 'Adjustment' }
];

const formatCurrency = (value = 0) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(Number(value) || 0);

const PaymentsPage = ({ invoices, payments, loading, error, onRecordPayment }) => {
  const [form, setForm] = useState({
    invoiceId: '',
    amount: '',
    mode: 'cash',
    tag: 'final',
    note: ''
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onRecordPayment({
        ...form,
        amount: Number(form.amount)
      });
      setForm((prev) => ({
        ...prev,
        amount: '',
        note: ''
      }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 text-white lg:grid-cols-[0.7fr_1.3fr]">
      <section className="rounded-3xl border border-white/10 bg-white p-8 text-slate-900 shadow-2xl shadow-slate-950/20">
        <header>
          <p className="text-xs uppercase tracking-[0.3em] text-sky-600">Payments</p>
          <h1 className="mt-2 text-3xl font-semibold">Record a receipt</h1>
          <p className="text-sm text-slate-500">
            Allocate payments against invoices with amount, mode and tags.
          </p>
        </header>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="text-sm font-medium text-slate-700">
            Invoice
            <select
              name="invoiceId"
              value={form.invoiceId}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              onChange={handleChange}
            >
              <option value="">Select invoice</option>
              {invoices.map((invoice) => (
                <option key={invoice.id} value={invoice.id}>
                  {invoice.number} · {invoice.customerName}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-medium text-slate-700">
            Amount
            <input
              type="number"
              min="0"
              step="0.01"
              name="amount"
              value={form.amount}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              onChange={handleChange}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <PaymentSelect
              label="Mode"
              name="mode"
              value={form.mode}
              options={PAYMENT_MODE_LABELS}
              onChange={handleChange}
            />
            <PaymentSelect
              label="Tag"
              name="tag"
              value={form.tag}
              options={PAYMENT_TAG_LABELS}
              onChange={handleChange}
            />
          </div>

          <label className="text-sm font-medium text-slate-700">
            Note
            <textarea
              name="note"
              rows={2}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={form.note}
              onChange={handleChange}
            />
          </label>

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={saving || invoices.length === 0}
          >
            {saving ? 'Saving…' : 'Record Payment'}
          </button>
          {invoices.length === 0 && (
            <p className="text-xs text-slate-500">
              Add an invoice first before recording payments.
            </p>
          )}
        </form>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-slate-950/30 backdrop-blur">
        <header className="mb-6">
          <p className="text-xs uppercase tracking-[0.3em] text-white/70">
            Collections
          </p>
          <h2 className="mt-2 text-2xl font-semibold">Recent receipts</h2>
        </header>
        {error && (
          <p className="mb-4 rounded-2xl border border-red-400/40 bg-red-900/40 px-4 py-2 text-sm text-red-100">
            {error}
          </p>
        )}
        {loading ? (
          <p className="text-sm text-white/70">Loading payments…</p>
        ) : payments.length === 0 ? (
          <p className="text-sm text-white/70">No payments yet.</p>
        ) : (
          <div className="space-y-3">
            {payments.slice(0, 12).map((payment) => (
              <article
                key={payment.id}
                className="rounded-2xl border border-white/10 bg-slate-900/40 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold">{payment.receiptNumber}</p>
                    <p className="text-xs text-white/60">
                      {payment.invoiceNumber} · {payment.mode} · {payment.tag}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold">
                      {formatCurrency(payment.amount)}
                    </p>
                    <p className="text-xs text-white/60">
                      {new Date(payment.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {payment.note && (
                  <p className="mt-2 text-xs text-white/70">“{payment.note}”</p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default PaymentsPage;

