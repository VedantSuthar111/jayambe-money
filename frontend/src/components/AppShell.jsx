import { Fragment } from 'react';
import { Link, NavLink } from 'react-router-dom';

const navItems = [
  { path: '/', label: 'Home' },
  { path: '/orders', label: 'Orders' },
  { path: '/analytics', label: 'Analytics' },
  { path: '/payments', label: 'Payments' },
  { path: '/payables', label: 'Payables' }
];

const AppShell = ({ children, toast, onDismissToast }) => {
  return (
    <Fragment>
      <div className="relative min-h-screen bg-slate-950">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-10 top-0 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="absolute bottom-10 right-0 h-80 w-80 rounded-full bg-teal-500/10 blur-[120px]" />
        </div>

        {toast && (
          <div className="pointer-events-auto fixed inset-x-0 top-5 flex justify-center px-4">
            <div className="flex items-center gap-3 rounded-full border border-emerald-300/50 bg-emerald-500/80 px-4 py-2 text-sm text-white shadow-lg shadow-emerald-900/20">
              <span>{toast}</span>
              <button
                type="button"
                onClick={onDismissToast}
                className="rounded-full bg-white/20 px-2 py-0.5 text-xs uppercase tracking-wide"
              >
                dismiss
              </button>
            </div>
          </div>
        )}

        <div className="relative z-10 flex min-h-screen flex-col">
          <header className="border-b border-white/10 bg-slate-950/60 backdrop-blur">
            <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5">
              <Link to="/" className="flex items-center gap-3 text-white">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 font-semibold">
                  JA
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-emerald-200">
                    Jay Ambe
                  </p>
                  <h1 className="text-lg font-semibold text-white">
                    Money Intelligence Hub
                  </h1>
                </div>
              </Link>
              <nav className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-sm font-medium text-white">
                {navItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      [
                        'rounded-full px-4 py-1 transition-colors',
                        isActive
                          ? 'bg-white/90 text-slate-900'
                          : 'text-white/80 hover:bg-white/10'
                      ].join(' ')
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </nav>
            </div>
          </header>

          <main className="flex-1">{children}</main>

          <footer className="border-t border-white/5 bg-slate-950/80 py-6 text-center text-sm text-white/60">
            Built with Tailwind CSS · Real-time finance cockpit for Jay Ambe
          </footer>
        </div>
      </div>
    </Fragment>
  );
};

export default AppShell;

