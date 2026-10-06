import { get } from './api-client.js';
const list = () => get('/chi-nhanh');
export default { list };