import express from 'express';
import path from 'node:path';
import cookieParser from 'cookie-parser';
import { engine } from 'express-handlebars';
import config from './config/index.js';
import routes from './routes/index.js';
import requestContext from './middlewares/request-context.js';
import userMiddleware from './middlewares/user.js';
import localsMiddleware from './middlewares/locals.js';
import notFoundMiddleware from './middlewares/not-found.js';
import errorHandler from './middlewares/error-handler.js';
import session from 'express-session';
import { createClient } from 'redis';
import { RedisStore } from 'connect-redis';

const app = express();
const sessionRedis = createClient({ url: config.env.redisUrl });
sessionRedis.on('error', error => console.error('Redis session lỗi:', error.message));
await sessionRedis.connect();
const sessionStore = new RedisStore({ client: sessionRedis, prefix: 'bookflow:session:', ttl: 900 });

app.disable('x-powered-by');

app.engine('hbs', engine({
  extname: '.hbs',
  defaultLayout: 'main',
  layoutsDir: config.view.layoutsDir,
  partialsDir: config.view.partialsDir,
  helpers: {
    json: value => JSON.stringify(value),
    eq: (left, right) => left === right,
    ne: (left, right) => left !== right,
    and: (left, right) => Boolean(left && right),
    or: (left, right) => Boolean(left || right),
    not: value => !value,
    includes: (value, item) => Array.isArray(value) && value.includes(item),
    formatNumber: value => {
      const number = Number(value);
      if (!Number.isFinite(number)) return '';
      return new Intl.NumberFormat('vi-VN').format(number);
    },
    formatDate: value => {
      if (!value) return '';
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return '';
      return new Intl.DateTimeFormat('vi-VN').format(date);
    },
    formatDateTime: value => {
      if (!value) return '';
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return '';
      return new Intl.DateTimeFormat('vi-VN', {
        dateStyle: 'short',
        timeStyle: 'short'
      }).format(date);
    }
  }
}));

app.set('view engine', 'hbs');
app.set('views', config.view.viewsDir);
app.set('view cache', config.view.cache);

app.use(requestContext);
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());
app.use(session({
  name: 'bookflow.sid',
  store: sessionStore,
  secret: config.env.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', secure: config.app.isProduction, maxAge: 15 * 60 * 1000 }
}));
app.use('/brand', express.static(path.join(config.view.assetsDir, 'brand', 'logo'), {
  maxAge: config.app.isProduction ? '1d' : 0,
  index: false
}));
app.use(express.static(config.view.publicDir, {
  maxAge: config.app.isProduction ? '1d' : 0,
  index: false
}));
app.use(userMiddleware);
app.use(localsMiddleware);
app.use(routes);
app.use(notFoundMiddleware);
app.use(errorHandler);

export default app;
