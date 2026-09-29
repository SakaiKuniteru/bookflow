import { get, post, put } from './api-client.js';

const list = params => {
  const query = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, value);
  });
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return get(`/sach${suffix}`);
};

const detail = id => get(`/sach/${encodeURIComponent(id)}`);

const search = params => {
  const query = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, value);
  });
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return get(`/sach/tim-kiem${suffix}`);
};

const create = payload => post('/sach', payload);

const update = (id, payload) => put(`/sach/${encodeURIComponent(id)}`, payload);

const availability = (id, params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, value);
  });
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return get(`/sach/${encodeURIComponent(id)}/kha-dung${suffix}`);
};

export default {
  list,
  detail,
  search,
  create,
  update,
  availability
};