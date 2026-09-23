'use strict';

const service = require('./tep.service');
const { taoViewContext } = require('../../../core/views/view-context');

function index(req, res, next) {
    try {
        const ketQua = service.layTrang();
        const data = taoViewContext(req, res, {
            layout: 'admin',
            page: {
                title: 'Quản lý tệp | Transform Admin',
                noIndex: true
            },
            breadcrumb: [
                {
                    label: 'Quản trị',
                    url: '/admin'
                },
                {
                    label: 'Tệp',
                    current: true
                }
            ],
            khaNang: ketQua.khaNang
        });
        return res.render('pages/admin/tep/index', data);
    } catch (error) { return next(error); }
}

module.exports = {
    index
};