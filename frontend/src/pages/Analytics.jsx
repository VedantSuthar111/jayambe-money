import { useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Title, Tooltip, Legend);

const formatCurrency = (value = 0) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(Number(value) || 0);

const AnalyticsPage = ({ metrics, invoices, payments, payables, loading, error }) => {
  const [downloading, setDownloading] = useState(false);
  const topInvoices = useMemo(
    () => invoices.slice().sort((a, b) => b.total - a.total).slice(0, 5),
    [invoices]
  );

  const upcomingPayables = useMemo(
    () =>
      payables
        .slice()
        .sort(
          (a, b) =>
            new Date(a.dueDate || Number.MAX_SAFE_INTEGER) -
            new Date(b.dueDate || Number.MAX_SAFE_INTEGER)
        )
        .slice(0, 5),
    [payables]
  );

  const recentCollections = payments.slice(0, 5);

  const receivablesByCustomer = useMemo(() => {
    const map = {};
    (invoices || []).forEach((inv) => {
      const bal = Number(inv.balanceDue ?? inv.balance ?? inv.total ?? 0) || 0;
      if (bal > 0) {
        const name = inv.customerName || inv.customer || inv.customer_id || 'Unknown';
        map[name] = (map[name] || 0) + bal;
      }
    });
    return Object.entries(map)
      .map(([customer, amount]) => ({ customer, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [invoices]);

  // Time series for invoices (last 30 days)
  const invoicesSeries = useMemo(() => {
    const days = 30;
    const today = new Date();
    const labels = [];
    const map = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      labels.push(key);
      map[key] = 0;
    }
    (invoices || []).forEach((inv) => {
      const k = new Date(inv.createdAt || inv.created_at || Date.now()).toISOString().slice(0, 10);
      if (map[k] !== undefined) map[k] += Number(inv.total || inv.amount || 0);
    });
    return { labels, data: labels.map((l) => Math.round(map[l] || 0)) };
  }, [invoices]);

  // Receivables share for doughnut
  const receivablesShare = useMemo(() => {
    const top = receivablesByCustomer.slice(0, 6);
    const others = receivablesByCustomer.slice(6).reduce((s, r) => s + r.amount, 0);
    const labels = top.map((t) => t.customer).concat(others > 0 ? ['Other'] : []);
    const data = top.map((t) => Math.round(t.amount)).concat(others > 0 ? [Math.round(others)] : []);
    return { labels, data };
  }, [receivablesByCustomer]);

  // Collections series for 30 days
  const collectionsSeries = useMemo(() => {
    const days = 30;
    const today = new Date();
    const labels = [];
    const map = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      labels.push(key);
      map[key] = 0;
    }
    (payments || []).forEach((p) => {
      const k = new Date(p.createdAt || p.created_at || p.date || Date.now()).toISOString().slice(0, 10);
      if (map[k] !== undefined) map[k] += Number(p.amount || 0);
    });
    return { labels, data: labels.map((l) => Math.round(map[l] || 0)) };
  }, [payments]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 text-white">
      <header className="mb-10 rounded-[32px] border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent p-10 shadow-2xl shadow-emerald-950/20 backdrop-blur">
        <p className="text-xs uppercase tracking-[0.4em] text-emerald-200">
          Intelligence
        </p>
        <h1 className="mt-4 text-4xl font-semibold">
          Analytics cockpit for cashflow, receivables & supplier health.
        </h1>
        <p className="mt-3 text-white/70">
          Real-time summaries refresh automatically as you create invoices,
          record payments or add payables.
        </p>
      </header>

      <div className="flex justify-end mb-6">
        <button
          onClick={async () => {
            try {
              setDownloading(true);
              const resp = await fetch('/api/analytics/customers.csv');
              if (!resp.ok) throw new Error('Failed to download');
              const blob = await resp.blob();
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'receivables-by-customer.csv';
              document.body.appendChild(a);
              a.click();
              a.remove();
              window.URL.revokeObjectURL(url);
            } catch (err) {
              console.error('Download failed', err);
              alert('Failed to download analytics sheet');
            } finally {
              setDownloading(false);
            }
          }}
          className="rounded bg-emerald-600 px-4 py-2 text-white shadow"
        >
          {downloading ? 'Downloading…' : 'Download analytics sheet'}
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-red-400/40 bg-red-900/30 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Today Collected', value: metrics.todayCollected },
          { label: 'MTD Collected', value: metrics.mtdCollected },
          { label: 'MTD Invoiced', value: metrics.mtdInvoiced },
          { label: 'Total Receivables', value: metrics.totalReceivables }
        ].map((card) => (
          <article
            key={card.label}
            className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-slate-950/40"
          >
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">
              {card.label}
            </p>
            <p className="mt-3 text-3xl font-semibold">
              {loading ? '…' : formatCurrency(card.value)}
            </p>
          </article>
        ))}
      </section>

      {/* Invoices over time chart */}
      <section className="mt-8">
        <article className="rounded-3xl border border-white/5 bg-white/90 p-6 text-slate-900 shadow-xl shadow-slate-950/30">
          <header className="mb-4">
            <p className="text-xs uppercase tracking-[0.3em] text-gray-600">Trends</p>
            <h2 className="text-2xl font-semibold">Invoices over time (30 days)</h2>
          </header>
          {loading ? (
            <p className="text-sm text-slate-500">Loading chart…</p>
          ) : (
            <div className="h-60">
              <Line
                data={{
                  labels: invoicesSeries.labels,
                  datasets: [
                    {
                      label: 'Invoiced (INR)',
                      data: invoicesSeries.data,
                      borderColor: 'rgba(16,185,129,0.9)',
                      backgroundColor: 'rgba(16,185,129,0.12)',
                      fill: true,
                      tension: 0.4
                    }
                  ]
                }}
                options={{ maintainAspectRatio: false, plugins: { legend: { display: true } }, scales: { y: { beginAtZero: true } } }}
              />
            </div>
          )}
        </article>
      </section>

      {/* Receivables by customer doughnut */}
      <section className="mt-8">
        <article className="rounded-3xl border border-white/5 bg-white/90 p-6 text-slate-900 shadow-xl shadow-slate-950/30">
          <header className="mb-4">
            <p className="text-xs uppercase tracking-[0.3em] text-amber-600">Receivables</p>
            <h2 className="text-2xl font-semibold">Receivables share by customer</h2>
          </header>
          {loading ? (
            <p className="text-sm text-slate-500">Loading chart…</p>
          ) : receivablesShare.data.length === 0 ? (
            <p className="text-sm text-slate-500">No receivables data.</p>
          ) : (
            <div className="h-60">
              <Doughnut
                data={{
                  labels: receivablesShare.labels,
                  datasets: [
                    {
                      data: receivablesShare.data,
                      backgroundColor: ['#10B981', '#60A5FA', '#F59E0B', '#FB7185', '#A78BFA', '#34D399', '#CBD5E1']
                    }
                  ]
                }}
                options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }}
              />
            </div>
          )}
        </article>
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <article className="rounded-3xl border border-white/5 bg-white/90 p-6 text-slate-900 shadow-xl shadow-slate-950/30">
          <header className="mb-4">
            <p className="text-xs uppercase tracking-[0.3em] text-emerald-600">
              Invoices
            </p>
            <h2 className="text-2xl font-semibold">Top 5 by value</h2>
          </header>
          {loading ? (
            <p className="text-sm text-slate-500">Loading invoices…</p>
          ) : topInvoices.length === 0 ? (
            <p className="text-sm text-slate-500">No invoices yet.</p>
          ) : (
            <ul className="divide-y divide-slate-200">
              {topInvoices.map((invoice) => (
                <li key={invoice.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-semibold">{invoice.number}</p>
                    <p className="text-xs text-slate-500">
                      {invoice.customerName} · {invoice.status}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(invoice.total)}</p>
                    <p className="text-xs text-slate-500">
                      Balance {formatCurrency(invoice.balanceDue)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="rounded-3xl border border-white/5 bg-white/90 p-6 text-slate-900 shadow-xl shadow-slate-950/30">
          <header className="mb-4">
            <p className="text-xs uppercase tracking-[0.3em] text-sky-600">
              Collections
            </p>
            <h2 className="text-2xl font-semibold">Recent payments</h2>
          </header>
          {loading ? (
            <p className="text-sm text-slate-500">Loading payments…</p>
          ) : recentCollections.length === 0 ? (
            <p className="text-sm text-slate-500">No payments yet.</p>
          ) : (
            <ul className="divide-y divide-slate-200">
              {recentCollections.map((payment) => (
                <li key={payment.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-semibold">{payment.receiptNumber}</p>
                    <p className="text-xs text-slate-500">
                      {payment.customerName} · {payment.mode} · {payment.tag}
                    </p>
                  </div>
                  <p className="font-semibold">{formatCurrency(payment.amount)}</p>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>
      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <article className="rounded-3xl border border-white/5 bg-white/90 p-6 text-slate-900 shadow-xl shadow-slate-950/30">
          <header className="mb-4">
            <p className="text-xs uppercase tracking-[0.3em] text-amber-600">Receivables</p>
            <h2 className="text-2xl font-semibold">Receivables by customer</h2>
          </header>
          {loading ? (
            <p className="text-sm text-slate-500">Loading receivables…</p>
          ) : receivablesByCustomer.length === 0 ? (
            <p className="text-sm text-slate-500">No outstanding receivables.</p>
          ) : (
            <div>
              <div className="mb-4 h-56">
                <Bar
                  data={{
                    labels: receivablesByCustomer.slice(0, 8).map((r) => r.customer),
                    datasets: [
                      {
                        label: 'Outstanding (INR)',
                        data: receivablesByCustomer.slice(0, 8).map((r) => Math.round(r.amount)),
                        backgroundColor: 'rgba(16, 185, 129, 0.8)'
                      }
                    ]
                  }}
                  options={{
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { y: { ticks: { callback: (v) => v } } }
                  }}
                />
              </div>

              <ul className="divide-y divide-slate-200">
                {receivablesByCustomer.slice(0, 8).map((r) => (
                  <li key={r.customer} className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-semibold">{r.customer}</p>
                      <p className="text-xs text-slate-500">{/* invoice count could go here */}</p>
                    </div>
                    <p className="font-semibold">{formatCurrency(r.amount)}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </article>

        <article className="rounded-3xl border border-white/5 bg-white/90 p-6 text-slate-900 shadow-xl shadow-slate-950/30">
          <header className="mb-4">
            <p className="text-xs uppercase tracking-[0.3em] text-sky-600">Collections</p>
            <h2 className="text-2xl font-semibold">Collections over time</h2>
          </header>
          {loading ? (
            <p className="text-sm text-slate-500">Loading collections…</p>
          ) : (
            <div className="h-56">
              <Line
                data={{
                  labels: collectionsSeries.labels,
                  datasets: [
                    {
                      label: 'Collected (INR)',
                      data: collectionsSeries.data,
                      borderColor: 'rgba(59, 130, 246, 0.9)',
                      backgroundColor: 'rgba(59, 130, 246, 0.2)',
                      fill: true,
                      tension: 0.4
                    }
                  ]
                }}
                options={{ maintainAspectRatio: false, plugins: { legend: { display: true } }, scales: { y: { beginAtZero: true } } }}
              />
            </div>
          )}
        </article>
      </section>
    </div>
  );
};

export default AnalyticsPage;

