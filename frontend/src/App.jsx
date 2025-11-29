import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import AppShell from './components/AppShell';
// Invoices page removed — Orders now creates invoices automatically
import PaymentsPage from './pages/Payments';
import PayablesPage from './pages/Payables';
import AnalyticsPage from './pages/Analytics';
import OrdersPage from './pages/Orders';
import {
  fetchInvoices,
  fetchPayments,
  fetchPayables,
  fetchMetrics,
  recordPayment,
  createPayable
} from './utils/api';

const initialMetrics = {
  todayCollected: 0,
  mtdCollected: 0,
  mtdInvoiced: 0,
  totalReceivables: 0
};

function App() {
  const [metrics, setMetrics] = useState(initialMetrics);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [payables, setPayables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(''), 3000);
  };

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [
        invoiceResponse,
        paymentResponse,
        payableResponse,
        metricResponse
      ] = await Promise.all([
        fetchInvoices(),
        fetchPayments(),
        fetchPayables(),
        fetchMetrics()
      ]);
      setInvoices(invoiceResponse.data || []);
      setPayments(paymentResponse.data || []);
      setPayables(payableResponse.data || []);
      setMetrics(metricResponse || initialMetrics);
    } catch (err) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Invoice creation is handled automatically when creating orders via Orders page.

  const handlePaymentSubmit = async (paymentValues) => {
    try {
      await recordPayment(paymentValues);
      await loadData();
      showToast('Payment recorded');
    } catch (err) {
      setError(err.message || 'Unable to record payment');
    }
  };

  const handlePayableCreate = async (payableValues) => {
    try {
      await createPayable(payableValues);
      await loadData();
      showToast('Supplier bill saved');
    } catch (err) {
      setError(err.message || 'Unable to save supplier bill');
    }
  };

  return (
    <AppShell toast={toast} onDismissToast={() => setToast('')}>
      <Routes>
        <Route
          path="/"
          element={<Home metrics={metrics} loading={loading} />}
        />
        <Route
          path="/analytics"
          element={
            <AnalyticsPage
              metrics={metrics}
              invoices={invoices}
              payments={payments}
              payables={payables}
              loading={loading}
              error={error}
            />
          }
        />
        <Route
          path="/orders"
          element={<OrdersPage />}
        />
        <Route
          path="/payments"
          element={
            <PaymentsPage
              loading={loading}
              error={error}
              invoices={invoices}
              payments={payments}
              onRecordPayment={handlePaymentSubmit}
            />
          }
        />
        <Route
          path="/payables"
          element={
            <PayablesPage
              loading={loading}
              error={error}
              payables={payables}
              onCreatePayable={handlePayableCreate}
            />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}

export default App;
