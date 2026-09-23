'use strict';

const service = require('./dashboard.service');
const { taoViewContext } = require('../../../core/views/view-context');

async function index(req, res, next) {
    try {
        const dashboard = await service.layDashboard(req);
        const data = taoViewContext(req, res, {
            layout: 'admin',
            page: {
                title: 'Tổng quan quản trị | Transform'
            },
            breadcrumb: [
                {
                    label: 'Quản trị',
                    current: true
                }
            ],
            dashboard
        });
        return res.render('pages/admin/dashboard/index', data);
    } catch (error) { return next(error); }
}

module.exports = {
    index
};