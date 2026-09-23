'use strict';
const service = require('./dashboard.service');
const { taoViewContext } = require('../../../core/views/view-context');

async function index(req, res, next) {
    try {
        const dashboard = await service.layDashboard(req);
        const data = taoViewContext(req, res, {
            layout: 'user',
            page: {
                title: 'Tổng quan | Transform',
                description: 'Tổng quan tài khoản Transform.'
            },
            breadcrumb: [
                {
                    label: 'Trang chủ',
                    url: '/'
                },
                {
                    label: 'Tổng quan',
                    current: true
                }
            ],
            dashboard
        });
        return res.render('pages/user/dashboard/index', data);
    } catch (error) { return next(error); }
}

module.exports = {
    index
};