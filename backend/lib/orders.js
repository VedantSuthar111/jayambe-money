const { nanoid } = require('nanoid');

// Simple in-memory orders store. Not persisted across restarts.
const orders = new Map();

const createOrder = (payload = {}) => {
  const id = nanoid();
  const order = {
    id,
    items: payload.items || [],
    customerName: payload.customerName || 'Walk-in Customer',
    customerEmail: payload.customerEmail || '',
    createdAt: new Date().toISOString(),
    note: payload.note || ''
  };
  orders.set(id, order);
  return order;
};

const listOrders = () => Array.from(orders.values()).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

const getOrder = (id) => orders.get(id) || null;

const deleteOrder = (id) => orders.delete(id);

module.exports = {
  createOrder,
  listOrders,
  getOrder,
  deleteOrder
};
