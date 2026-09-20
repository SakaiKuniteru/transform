'use strict';

const env = require('./config/env');
const app = require('./app');
const {
    kiemTraKetNoi,
    dongPool
} = require('./infrastructure/database/pool');
const {
    ketNoiRedis,
    dongRedis
} = require('./config/redis');
const storageService = require('./infrastructure/storage/storage.service');
const { taoTempCleaner } = require('./infrastructure/storage/temp-cleaner');

const tempCleaner = taoTempCleaner();
let server = null;
let dangDungServer = false;

async function khoiDongInfrastructure() {
    await kiemTraKetNoi();
    await ketNoiRedis();
    await storageService.damBaoSanSang();
    const ketQuaDon = await tempCleaner.chay();
    if (ketQuaDon?.daXoa || ketQuaDon?.loi) { console.log('[TempCleaner] Kết quả khởi động:', ketQuaDon); }
    tempCleaner.bat();
}

async function moHttpServer() {
    return new Promise((resolve, reject) => {
        const httpServer = app.listen(env.ungDung.port, env.ungDung.host, () => resolve(httpServer));
        httpServer.once('error', reject);
    });
}

async function khoiDong() {
    await khoiDongInfrastructure();
    server = await moHttpServer();
    server.requestTimeout = env.ungDung.requestTimeoutMs;
    const diaChi = env.ungDung.publicBaseUrl || `http://localhost:${env.ungDung.port}`;
    console.log(`Backend đang chạy tại ${diaChi}`);
    console.log(`Môi trường: ${env.moiTruong}`);
    console.log(`API: ${env.ungDung.apiPrefix}`);
}

async function dongHttpServer() {
    if (!server) { return; }
    const httpServer = server;
    server = null;
    await new Promise((resolve, reject) => {
        httpServer.close((error) => {
            if (error) { reject(error); } else { resolve(); }
        });
        httpServer.closeIdleConnections?.();
    });
}

async function dongInfrastructure() {
    tempCleaner.dung();
    await Promise.allSettled([
        dongRedis(),
        dongPool()
    ]);
}

async function dungServer(tinHieu, exitCode = 0) {
    if (dangDungServer) { return; }
    dangDungServer = true;
    console.log(`Đang dừng Backend (${tinHieu})...`);
    let maThoat = exitCode;
    try {
        await dongHttpServer();
    } catch (error) {
        maThoat = 1;
        console.error('Không thể đóng HTTP Server an toàn:', error);
    }
    try {
        await dongInfrastructure();
    } catch (error) {
        maThoat = 1;
        console.error('Không thể đóng infrastructure an toàn:', error);
    }
    console.log('Backend đã dừng.');
    process.exit(maThoat);
}

process.on('SIGTERM', () => { void dungServer('SIGTERM'); });
process.on('SIGINT', () => { void dungServer('SIGINT'); });

process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Promise Rejection:', reason);
    void dungServer('unhandledRejection', 1);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    void dungServer('uncaughtException', 1);
});

void khoiDong().catch(async (error) => {
    console.error('Không thể khởi động Backend:', error);
    await dongInfrastructure();
    process.exit(1);
});