import { get, post } from './api-client.js';

const cart = () => get('/gio-hang');

const updateCart = payload => post('/gio-hang/cap-nhat', payload);

const checkout = payload => post('/don-hang', payload);

const list = params => {
  const query = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, value);
  });
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return get(`/don-hang/cua-toi${suffix}`);
};
const detail = id => get(`/don-hang/cua-toi/${encodeURIComponent(id)}`);
const cancel = id => post(`/don-hang/${encodeURIComponent(id)}/huy`);

export default {
  cart,
  updateCart,
  checkout,
  list,
  detail,
  cancel
};