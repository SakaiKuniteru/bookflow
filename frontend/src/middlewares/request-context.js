import crypto from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';
const requestStorage = new AsyncLocalStorage();
const requestContext = (req, res, next) => requestStorage.run(req, () => {
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();
  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);
  next();
});
const getCurrentRequest = () => requestStorage.getStore() || null;
export { getCurrentRequest };
export default requestContext;