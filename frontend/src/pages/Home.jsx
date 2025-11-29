import { Link } from 'react-router-dom';

const quickActions = [
  {
    title: 'Create Order',
    description: 'Quick create orders — generates invoice and bill PDF automatically.',
    badge: 'Sales',
    gradient: 'from-emerald-400 to-teal-500',
    href: '/orders'
  },
  {
    title: 'Record Payment',
    description: 'Log cash, UPI, bank transfer or card payments instantly.',
    badge: 'Collections',
    gradient: 'from-sky-400 to-blue-500',
    href: '/payments'
  },
  {
    title: 'Track Payables',
    description: 'Supplier bills, due dates and status in one lane.',
    badge: 'Vendors',
    gradient: 'from-amber-400 to-orange-500',
    href: '/payables'
  }
];

const insights = [
  'Live MTD collections vs invoiced heatmap',
  'Auto-generated receivables snapshot',
  'Supplier liability radar for next 14 days'
];

const Home = ({ metrics, loading }) => {
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-12 text-white lg:grid-cols-[1.1fr_0.9fr]">
      <section className="space-y-8 rounded-[32px] border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-white/0 p-10 shadow-2xl shadow-emerald-950/20 backdrop-blur">
        <p className="text-xs uppercase tracking-[0.5em] text-emerald-200">
          Finance Console
        </p>
        <div className="space-y-4">
          <h2 className="text-4xl font-semibold leading-tight">
            Run invoicing, collections & supplier ops from one cockpit.
          </h2>
          <p className="text-lg text-white/80">
            Pick a lane below to jump straight into execution. Every workflow
            routes you into the live dashboard with contextual focus.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { label: 'Today Collected', value: metrics.todayCollected },
            { label: 'MTD Invoiced', value: metrics.mtdInvoiced },
            { label: 'Total Receivables', value: metrics.totalReceivables }
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-white/10 bg-white/5 p-4"
            >
              <p className="text-xs uppercase tracking-wide text-white/60">
                {item.label}
              </p>
              <p className="mt-2 text-2xl font-semibold">
                {loading
                  ? '…'
                  : new Intl.NumberFormat('en-IN', {
                      style: 'currency',
                      currency: 'INR',
                      maximumFractionDigits: 0
                    }).format(item.value || 0)}
              </p>
            </div>
          ))}
        </div>
        <div className="grid gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.title}
              to={action.href}
              className="group relative overflow-hidden rounded-3xl border border-white/10 p-6 transition-transform hover:-translate-y-1"
            >
              <div
                className={`absolute inset-0 opacity-80 blur-3xl transition group-hover:opacity-100 bg-gradient-to-r ${action.gradient}`}
              />
              <div className="relative z-10">
                <span className="text-xs uppercase tracking-[0.3em] text-white/70">
                  {action.badge}
                </span>
                <div className="mt-2 flex items-center justify-between">
                  <h3 className="text-2xl font-semibold">{action.title}</h3>
                  <span className="rounded-full border border-white/30 px-3 py-1 text-xs">
                    Jump in →
                  </span>
                </div>
                <p className="mt-2 text-sm text-white/80">{action.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <aside className="space-y-6 rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-2xl shadow-slate-950/40 backdrop-blur">
        <p className="text-xs uppercase tracking-[0.4em] text-emerald-200">
          Live Insights
        </p>
        <div className="space-y-4 text-sm text-white/80">
          {insights.map((insight) => (
            <div
              key={insight}
              className="rounded-2xl border border-white/10 bg-slate-900/40 p-4"
            >
              {insight}
            </div>
          ))}
        </div>
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-400/30 via-emerald-500/20 to-transparent p-6 text-white">
          <h4 className="text-lg font-semibold">Need instant actions?</h4>
          <p className="mt-2 text-sm text-white/80">
            Use the dashboard quick keys to drop into order creation, record a
            payment or schedule supplier payouts without leaving context.
          </p>
          <Link
            to="/analytics"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-slate-900"
          >
            Enter Dashboard
            <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </aside>
    </div>
  );
};

export default Home;

