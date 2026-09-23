'use strict';

const service = require('./nhat-ky.service');

const { taoViewContext } = require('../../../core/views/view-context');

function index(req, res, next) {
    try {
        const ketQua = service.layTrang();
        const data = taoViewContext(req, res, {
            layout: 'admin',
            page: {
                title: 'Nhật ký hệ thống | Transform Admin',
                noIndex: true
            },
            breadcrumb: [
                {
                    label: 'Quản trị',
                    url: '/admin'
                },
                {
                    label: 'Nhật ký hệ thống',
                    current: true
                }
            ],
            khaNang: ketQua.khaNang
        });
        return res.render('pages/admin/nhat-ky/index', data);
    } catch (error) { return next(error); }
}

module.exports = {
    index
};