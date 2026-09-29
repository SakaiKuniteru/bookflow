import { get, post } from './api-client.js';

const methods = () => get('/thanh-toan/phuong-thuc');

const create = payload => post('/thanh-toan', payload);

const detail = id => get(`/thanh-toan/${encodeURIComponent(id)}`);

const retry = id => post(`/thanh-toan/${encodeURIComponent(id)}/thu-lai`);

export default {
  methods,
  create,
  detail,
  retry
};