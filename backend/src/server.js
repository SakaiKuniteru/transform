'use strict';

const env = require('./config/env');
const app = require('./app');

const server = app.listen(env.ungDung.port, env.ungDung.host, () => {
    const diaChi = env.ungDung.publicBaseUrl || `http://localhost:${env.ungDung.port}`;
    console.log(`Backend đang chạy tại ${diaChi}`);
    console.log(`Môi trường: ${env.moiTruong}`);
    console.log(`API: ${env.ungDung.apiPrefix}`);
});
server.requestTimeout = env.ungDung.requestTimeoutMs;
server.on('error', (error) => {
    console.error('Không thể khởi động Backend:', error);
    process.exit(1);
});
let dangDungServer = false;
function dungServer(tinHieu, exitCode = 0) {
    if (dangDungServer) { return; }
    dangDungServer = true;
    console.log(`Đang dừng Backend (${tinHieu})...`);
    server.close((error) => {
        if (error) {
            console.error('Không thể đóng Backend an toàn:', error);
            process.exit(1);
        }
        console.log('Backend đã dừng.');
        process.exit(exitCode);
    });
}
process.on('SIGTERM', () => { dungServer('SIGTERM'); });
process.on('SIGINT', () => { dungServer('SIGINT'); });
process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Promise Rejection:', reason);
    dungServer('unhandledRejection', 1);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    dungServer('uncaughtException', 1);
});