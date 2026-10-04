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
  authRefreshCookieName: getString('AUTH_REFRESH_COOKIE_NAME', 'bookflow_refresh_token'),
  authRefreshCookieMaxAge: getNumber('AUTH_REFRESH_COOKIE_MAX_AGE', 120 * 60 * 1000),
  authCookieMaxAge: getNumber('AUTH_COOKIE_MAX_AGE', 60 * 60 * 1000),
  authCookieSameSite: getString('AUTH_COOKIE_SAME_SITE', 'lax'),
  sessionCookieHttpOnly: getBoolean('SESSION_COOKIE_HTTP_ONLY', true),
  sessionSecret: getString('SESSION_SECRET'),
  redisUrl: getString('REDIS_URL'),
  registrationDraftKey: getString('REGISTRATION_DRAFT_KEY'),
  viewCache: getBoolean('VIEW_CACHE', false)
};

export default env;