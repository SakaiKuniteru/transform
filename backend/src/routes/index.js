'use strict';

const express = require('express');
const { apiResponse } = require('@transform/shared');
const env = require('../config/env');
const MA_LOI = require('../constants/ma-loi');
const { taoLoi } = require('../utils/loi');
const { kiemTraKetNoi } = require('../infrastructure/database/pool');

const router = express.Router();


/*
 * ============================================================
 * DANH SÁCH ROUTE MODULE
 * ============================================================
 */

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
        path: '/tep',
        modulePath: '../modules/tep/tep.route'
    },
    {
        path: '/cong-viec',
        modulePath: '../modules/cong-viec/cong-viec.route'
    }
]);


/*
 * ============================================================
 * THÔNG TIN API
 * ============================================================
 */

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


/*
 * ============================================================
 * HEALTH CHECK
 * ============================================================
 */

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


/*
 * ============================================================
 * READINESS CHECK
 * ============================================================
 */

router.get('/health/ready', async (req, res, next) => {
    try {
        const database = await kiemTraKetNoi();
        return res.json(
            apiResponse.taoThanhCong(
                {
                    service: env.ungDung.ten,
                    version: env.ungDung.phienBan,
                    status: 'READY',
                    database
                },
                {
                    message: 'Backend đã sẵn sàng.'
                }
            )
        );
    } catch (error) {
        return next(
            taoLoi({
                maLoi: MA_LOI.DATABASE_KHONG_KHA_DUNG,
                thongBao: 'Backend chưa sẵn sàng vì không thể kết nối database.',
                statusCode: 503,
                expose: true,
                cause: error
            })
        );
    }
});


/*
 * ============================================================
 * NẠP ROUTE MODULE
 * ============================================================
 */

function napRouteModule(modulePath) {
    let resolvedPath;
    try {
        resolvedPath = require.resolve(modulePath);
    } catch (error) {
        if (error?.code === 'MODULE_NOT_FOUND') { return null; }
        throw error;
    }
    const moduleRouter = require(resolvedPath);
    if (typeof moduleRouter === 'function') { return moduleRouter; }
    if (moduleRouter && typeof moduleRouter === 'object' && Object.keys(moduleRouter).length === 0) { return null; }
    throw new TypeError(`Route module "${modulePath}" phải export Express Router.`);
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