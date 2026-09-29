import { get, post, put } from './api-client.js';

const profile = () => get('/khach-hang/toi');

const updateProfile = payload => put('/khach-hang/toi', payload);

const dashboard = () => get('/khach-hang/toi/tong-quan');

const membership = () => get('/hoi-vien/toi');

const list = params => {
  const query = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, value);
  });
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return get(`/khach-hang${suffix}`);
};

const detail = id => get(`/khach-hang/${encodeURIComponent(id)}`);

const notifications = params => {
  const query = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, value);
  });
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return get(`/thong-bao${suffix}`);
};

const markNotificationRead = id => post(`/thong-bao/${encodeURIComponent(id)}/da-doc`);

export default {
  profile,
  updateProfile,
  dashboard,
  membership,
  list,
  detail,
  notifications,
  markNotificationRead
};