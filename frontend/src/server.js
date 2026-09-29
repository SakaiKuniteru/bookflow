import http from 'node:http';
import app from './app.js';
import config from './config/index.js';

const server = http.createServer(app);

const shutdown = signal => {
  console.log(`[FRONTEND] Nhận tín hiệu ${signal}, đang đóng server...`);
  server.close(error => {
    if (error) {
      console.error('[FRONTEND] Đóng server thất bại:', error);
      process.exit(1);
    }
    console.log('[FRONTEND] Server đã đóng.');
    process.exit(0);
  });
};

server.on('error', error => {
  console.error('[FRONTEND] HTTP server error:', error);
  process.exit(1);
});

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

server.listen(config.app.port, config.app.host, () => {
  console.log(`[FRONTEND] ${config.app.name} đang chạy tại http://${config.app.host}:${config.app.port}`);
  console.log(`[FRONTEND] Backend API: ${config.api.baseUrl}`);
});