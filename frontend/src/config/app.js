import env from './env.js';

const appConfig = {
  name: env.appName,
  host: env.host,
  port: env.port,
  url: env.appUrl,
  nodeEnv: env.nodeEnv,
  isProduction: env.nodeEnv === 'production',
  isDevelopment: env.nodeEnv === 'development',
  isTest: env.nodeEnv === 'test'
};

export default appConfig;