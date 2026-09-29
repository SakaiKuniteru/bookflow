import 'dotenv/config';

const getString = (name, fallback = '') => {
  const value = process.env[name];
  return value === undefined || value === '' ? fallback : value;
};

const getNumber = (name, fallback) => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? value : fallback;
};

const getBoolean = (name, fallback = false) => {
  const value = process.env[name];
  if (value === undefined) return fallback;
  return ['true', '1', 'yes', 'on'].includes(String(value).toLowerCase());
};

const env = {
  nodeEnv: getString('NODE_ENV', 'development'),
  host: getString('HOST', '0.0.0.0'),
  port: getNumber('PORT', 3000),
  appName: getString('APP_NAME', 'BookFlow'),
  appUrl: getString('APP_URL', 'http://localhost:3000'),
  backendApiUrl: getString('BACKEND_API_URL', 'http://localhost:4000/api'),
  backendApiTimeout: getNumber('BACKEND_API_TIMEOUT', 15000),
  authCookieName: getString('AUTH_COOKIE_NAME', 'bookflow_access_token'),
  authCookieSecure: getBoolean('AUTH_COOKIE_SECURE', false),
  authCookieSameSite: getString('AUTH_COOKIE_SAME_SITE', 'lax'),
  authCookieMaxAge: getNumber('AUTH_COOKIE_MAX_AGE', 86400000),
  sessionCookieHttpOnly: getBoolean('SESSION_COOKIE_HTTP_ONLY', true),
  viewCache: getBoolean('VIEW_CACHE', false)
};

export default env;