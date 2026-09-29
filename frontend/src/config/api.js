import env from './env.js';

const apiConfig = {
  baseUrl: env.backendApiUrl.replace(/\/+$/, ''),
  timeout: env.backendApiTimeout
};

export default apiConfig;