'use strict';
const app = require('./app');
const appConfig = require('./config/app.config');
const { dongRedisSessionStore } = require('./core/session/redis-session.store');
let dangDung = false;
const server = app.listen(appConfig.port, appConfig.host, () => { console.log(`Frontend đang chạy tại http://localhost:${appConfig.port}`); console.log(`Môi trường: ${appConfig.environment}`); });
server.requestTimeout = appConfig.requestTimeoutMs;

function dungServer(signal) {
    if (dangDung) { return; }
    dangDung = true;
    console.log(`Đang dừng Frontend (${signal})...`);
    const timeout = setTimeout(() => { console.error('Frontend graceful shutdown quá thời gian cho phép.'); process.exit(1); }, appConfig.shutdownTimeoutMs);
    timeout.unref();
    server.close(async (error) => { clearTimeout(timeout); if (error) { console.error('Không thể đóng Frontend:', error); process.exit(1); } try { await dongRedisSessionStore(); } catch (redisError) { console.error('Không thể đóng Redis session store:', redisError); process.exit(1); } console.log('Frontend đã dừng an toàn.'); process.exit(0); });
}

server.on('error', (error) => { console.error('Không thể khởi động Frontend:', error); process.exit(1); });
process.on('SIGTERM', () => dungServer('SIGTERM'));
process.on('SIGINT', () => dungServer('SIGINT'));