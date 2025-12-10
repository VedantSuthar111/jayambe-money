const API_BASE =
  import.meta.env.VITE_API_BASE;

const request = async (path, options = {}) => {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || 'API request failed');
  }

  return response.json();
};

export const fetchInvoices = () => request('/invoices');
export const fetchPayments = () => request('/payments');
export const fetchPayables = () => request('/payables');
export const fetchMetrics = () => request('/dashboard/metrics');

export const createInvoice = (payload) =>
  request('/invoices', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

export const createOrder = (payload) =>
  request('/orders', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

export const recordPayment = (payload) =>
  request('/payments', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

export const createPayable = (payload) =>
  request('/payables', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
