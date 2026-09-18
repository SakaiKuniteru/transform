'use strict';

require('dotenv').config();

const app = require('./app');

const PORT = Number(process.env.PORT);

if (!PORT) {
    throw new Error('Chưa cấu hình PORT trong file .env của Backend.');
}

const server = app.listen(PORT, () => {
    console.log(`Backend đang chạy tại http://localhost:${PORT}`);
});

server.on('error', (error) => {
    console.error('Không thể khởi động Backend:', error);
    process.exit(1);
});