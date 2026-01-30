const API_BASE =
  import.meta.env.VITE_API_BASE || '/api';

const request = async (path, options = {}) => {
  const url = `${API_BASE}${path}`;
  try {
    let bodyData = '';
    if (options.body) {
      try {
        bodyData = JSON.parse(options.body);
      } catch (e) {
        bodyData = options.body;
      }
    }
    console.log('[API REQUEST]', options.method || 'GET', url);
    console.log('[API REQUEST] Body:', bodyData);
    console.log('[API_BASE]', API_BASE);
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      ...options
    });

    console.log('[API RESPONSE]', response.status, response.statusText, response.url);

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      console.error('[API ERROR]', errorBody);
      throw new Error(errorBody.error || 'API request failed');
    }

    const data = await response.json();
    console.log('[API SUCCESS]', data);
    return data;
  } catch (error) {
    console.error('[API REQUEST FAILED]', error);
    throw error;
  }
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

export const previewOrder = (payload) =>
  request('/orders/preview', {
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
