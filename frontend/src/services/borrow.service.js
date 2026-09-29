import { get, post } from './api-client.js';

const list = params => {
  const query = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, value);
  });
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return get(`/muon-tra${suffix}`);
};

const detail = id => get(`/muon-tra/${encodeURIComponent(id)}`);

const create = payload => post('/muon-tra', payload);

const receiveReturn = (id, payload) => post(`/muon-tra/${encodeURIComponent(id)}/nhan-tra`, payload);

const reservations = params => {
  const query = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, value);
  });
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return get(`/dat-truoc${suffix}`);
};

const createReservation = payload => post('/dat-truoc', payload);

export default {
  list,
  detail,
  create,
  receiveReturn,
  reservations,
  createReservation
};