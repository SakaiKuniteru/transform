'use strict';

const service = require('./cong-viec.service');
const { taoViewContext } = require('../../../core/views/view-context');

function index(req, res, next) {
    try {
        const ketQua = service.layTrang();
        const data = taoViewContext(req, res, {
            layout: 'admin',
            page: {
                title: 'Quản lý công việc | Transform Admin',
                noIndex: true
            },
            breadcrumb: [
                {
                    label: 'Quản trị',
                    url: '/admin'
                },
                {
                    label: 'Công việc',
                    current: true
                }
            ],
            khaNang: ketQua.khaNang
        });
        return res.render('pages/admin/cong-viec/index', data);
    } catch (error) { return next(error); }
}

module.exports = {
    index
};