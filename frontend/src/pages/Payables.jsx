import { useState } from 'react';

const formatCurrency = (value = 0) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(Number(value) || 0);

const PayablesPage = ({ payables, loading, error, onCreatePayable }) => {
  const [form, setForm] = useState({
    supplierName: '',
    amount: '',
    dueDate: '',
    status: 'pending'
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
      await onCreatePayable({
        ...form,
        amount: Number(form.amount)
      });
      setForm({
        supplierName: '',
        amount: '',
        dueDate: '',
        status: 'pending'
      });
    } finally {
      setSaving(false);
    }
  };

  const totals = payables.reduce(
    (acc, bill) => {
      const bucket = bill.status;
      acc[bucket] = (acc[bucket] || 0) + (Number(bill.amount) || 0);
      return acc;
    },
    { pending: 0, scheduled: 0, paid: 0 }
  );

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 text-white lg:grid-cols-[0.8fr_1.2fr]">
      <section className="rounded-3xl border border-white/10 bg-white p-8 text-slate-900 shadow-2xl shadow-slate-950/20">
        <header>
          <p className="text-xs uppercase tracking-[0.3em] text-amber-600">Vendors</p>
          <h1 className="mt-2 text-3xl font-semibold">Add supplier payable</h1>
          <p className="text-sm text-slate-500">
            Keep a ledger of upcoming payouts with due dates & statuses.
          </p>
        </header>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="text-sm font-medium text-slate-700">
            Supplier Name
            <input
              type="text"
              name="supplierName"
              value={form.supplierName}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              onChange={handleChange}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              Amount
              <input
                type="number"
                min="0"
                name="amount"
                value={form.amount}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                onChange={handleChange}
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Due Date
              <input
                type="date"
                name="dueDate"
                value={form.dueDate}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                onChange={handleChange}
              />
            </label>
          </div>

          <label className="text-sm font-medium text-slate-700">
            Status
            <select
              name="status"
              value={form.status}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              onChange={handleChange}
            >
              <option value="pending">Pending</option>
              <option value="scheduled">Scheduled</option>
              <option value="paid">Paid</option>
            </select>
          </label>

          <button type="submit" className="btn-primary w-full" disabled={saving}>
            {saving ? 'Saving…' : 'Add Payable'}
          </button>
        </form>
      </section>

      <section className="space-y-6">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-slate-950/30 backdrop-blur">
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">
            Status Overview
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              { label: 'Pending', value: totals.pending },
              { label: 'Scheduled', value: totals.scheduled },
              { label: 'Paid', value: totals.paid }
            ].map((card) => (
              <div key={card.label} className="rounded-2xl border border-white/10 p-4">
                <p className="text-xs uppercase tracking-wide text-white/60">
                  {card.label}
                </p>
                <p className="mt-2 text-2xl font-semibold">
                  {formatCurrency(card.value)}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-slate-950/30 backdrop-blur">
          <header className="mb-6">
            <p className="text-xs uppercase tracking-[0.3em] text-white/70">
              Payables List
            </p>
            <h2 className="mt-2 text-2xl font-semibold">Recent bills</h2>
          </header>
          {error && (
            <p className="mb-4 rounded-2xl border border-red-400/40 bg-red-900/40 px-4 py-2 text-sm text-red-100">
              {error}
            </p>
          )}
          {loading ? (
            <p className="text-sm text-white/70">Loading payables…</p>
          ) : payables.length === 0 ? (
            <p className="text-sm text-white/70">No supplier bills yet.</p>
          ) : (
            <div className="space-y-3">
              {payables.slice(0, 12).map((bill) => (
                <article
                  key={bill.id}
                  className="rounded-2xl border border-white/10 bg-slate-900/40 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold">
                        {bill.billNumber || 'Bill'}
                      </p>
                      <p className="text-xs text-white/60">
                        {bill.supplierName} · {bill.status}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold">
                        {formatCurrency(bill.amount)}
                      </p>
                      {bill.dueDate && (
                        <p className="text-xs text-white/60">
                          Due {new Date(bill.dueDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default PayablesPage;

