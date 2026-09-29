import path from 'node:path';
import { fileURLToPath } from 'node:url';
import env from './env.js';

const currentFile = fileURLToPath(import.meta.url);
const srcDir = path.dirname(path.dirname(currentFile));

const viewConfig = {
  viewsDir: path.join(srcDir, 'views'),
  layoutsDir: path.join(srcDir, 'views', 'layouts'),
  partialsDir: path.join(srcDir, 'views', 'partials'),
  publicDir: path.join(srcDir, 'public'),
  assetsDir: path.join(srcDir, 'assets'),
  cache: env.viewCache
};

export default viewConfig;