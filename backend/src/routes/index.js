'use strict';

const express = require('express');
const { apiResponse } = require('@transform/shared');
const env = require('../config/env');
const MA_LOI = require('../constants/ma-loi');
const { kiemTraKetNoi } = require('../infrastructure/database/pool');
const { kiemTraRedis } = require('../config/redis');
const storageService = require('../infrastructure/storage/storage.service');
const { loiDichVuKhongKhaDung } = require('../utils/loi');
const router = express.Router();

const ROUTE_MODULES = Object.freeze([
    {
        path: '/xac-thuc',
        modulePath: '../modules/xac-thuc/xac-thuc.route'
    },
    {
        path: '/nguoi-dung',
        modulePath: '../modules/nguoi-dung/nguoi-dung.route'
    },
    {
        path: '/tep',
        modulePath: '../modules/tep/tep.route'
    },
    {
        path: '/cong-viec',
        modulePath: '../modules/cong-viec/cong-viec.route'
    },
    {
        path: '/lich-su',
        modulePath: '../modules/lich-su/lich-su.route'
    },
    {
        path: '/chuyen-doi',
        modulePath: '../modules/chuyen-doi/chuyen-doi.route'
    },
    {
        path: '/goi-dich-vu',
        modulePath: '../modules/goi-dich-vu/goi-dich-vu.route'
    },
    {
        path: '/dang-ky-goi',
        modulePath: '../modules/dang-ky-goi/dang-ky-goi.route'
    },
    {
        path: '/chinh-sach-han-muc',
        modulePath: '../modules/chinh-sach-han-muc/chinh-sach-han-muc.route'
    },
    {
        path: '/han-muc',
        modulePath: '../modules/han-muc/han-muc.route'
    },
    {
        path: '/nhat-ky',
        modulePath: '../modules/nhat-ky/nhat-ky.route'
    }
]);

router.get('/', (req, res) => {
    return res.json(
        apiResponse.taoThanhCong(
            {
                service: env.ungDung.ten,
                version: env.ungDung.phienBan,
                environment: env.moiTruong,
                apiPrefix: env.ungDung.apiPrefix
            },
            {
                message: 'Transform Backend API đang hoạt động.'
            }
        )
    );
});

router.get('/health', (req, res) => {
    return res.json(
        apiResponse.taoThanhCong(
            {
                service: env.ungDung.ten,
                version: env.ungDung.phienBan,
                status: 'OK',
                uptimeSeconds: Math.floor(process.uptime()),
                timestamp: new Date().toISOString()
            },
            {
                message: 'Backend đang hoạt động.'
            }
        )
    );
});

async function kiemTraDatabaseReady() {
    try {
        return await kiemTraKetNoi();
    } catch (error) {
        throw loiDichVuKhongKhaDung('Database hiện không khả dụng.', MA_LOI.DATABASE_KHONG_KHA_DUNG, error);
    }
}

async function kiemTraRedisReady() {
    try {
        return await kiemTraRedis();
    } catch (error) {
        throw loiDichVuKhongKhaDung('Redis hiện không khả dụng.', MA_LOI.REDIS_KHONG_KHA_DUNG, error);
    }
}

async function kiemTraStorageReady() {
    try {
        return await storageService.kiemTraKetNoi();
    } catch (error) {
        if (error?.statusCode) { throw error; }
        throw loiDichVuKhongKhaDung('Storage hiện không khả dụng.', MA_LOI.STORAGE_KHONG_KHA_DUNG, error);
    }
}

router.get('/health/ready', async (req, res, next) => {
    try {
        const [database, redis, storage] = await Promise.all([
            kiemTraDatabaseReady(),
            kiemTraRedisReady(),
            kiemTraStorageReady()
        ]);
        return res.json(apiResponse.taoThanhCong(
            { service: env.ungDung.ten, version: env.ungDung.phienBan, status: 'READY', database, redis, storage },
            { message: 'Backend đã sẵn sàng.' }
        ));
    } catch (error) {
        return next(error);
    }
});

function napRouteModule(modulePath) {
    let resolvedPath;
    try {
        resolvedPath = require.resolve(modulePath);
    } catch (error) {
        if (error?.code === 'MODULE_NOT_FOUND') { return null; }
        throw error;
    }
    const moduleRouter = require(resolvedPath);
    if (typeof moduleRouter !== 'function') { return null; }
    return moduleRouter;
}

function dangKyRouteModules() {
    for (const routeConfig of ROUTE_MODULES) {
        const moduleRouter = napRouteModule(routeConfig.modulePath);
        if (!moduleRouter) { continue; }
        router.use(routeConfig.path, moduleRouter);
    }
}

dangKyRouteModules();

module.exports = router;