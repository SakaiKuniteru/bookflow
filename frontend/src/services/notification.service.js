import { get, post } from './api-client.js';

const list = params => {
  const query = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, value);
  });
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return get(`/thong-bao${suffix}`);
};

const detail = id => get(`/thong-bao/${encodeURIComponent(id)}`);

const markRead = id => post(`/thong-bao/${encodeURIComponent(id)}/da-doc`);

const markAllRead = () => post('/thong-bao/doc-tat-ca');

const unreadCount = () => get('/thong-bao/chua-doc');

export default {
  list,
  detail,
  markRead,
  markAllRead,
  unreadCount
};