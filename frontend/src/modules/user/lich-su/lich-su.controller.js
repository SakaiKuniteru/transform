'use strict';

const service = require('./lich-su.service');
const { taoViewContext, taoPagination } = require('../../../core/views/view-context');

function taoFilters(query = {}) {
    return {
        tuKhoa: String(query.tuKhoa || query.q || ''),
        loaiSuKien: String(query.loaiSuKien || ''),
        nguon: String(query.nguon || ''),
        congViecId: String(query.congViecId || ''),
        tepId: String(query.tepId || ''),
        tuNgay: String(query.tuNgay || ''),
        denNgay: String(query.denNgay || '')
    };
}

async function index(req, res, next) {
    try {
        const ketQua = await service.layDanhSach(req, req.query);
        const filters = taoFilters(req.query);
        const pagination = taoPagination({
            page: ketQua.phanTrang.trang,
            totalPages: ketQua.phanTrang.tongTrang,
            baseUrl: '/user/lich-su',
            query: filters
        });
        const data = taoViewContext(req, res, {
            layout: 'user',
            page: {
                title: 'Lịch sử | Transform'
            },
            breadcrumb: [
                {
                    label: 'Trang chủ',
                    url: '/'
                },
                {
                    label: 'Lịch sử',
                    current: true
                }
            ],
            danhSach: ketQua.danhSach,
            phanTrang: ketQua.phanTrang,
            pagination,
            filters,
            loaiSuKienOptions: service.LOAI_SU_KIEN_OPTIONS,
            nguonOptions: service.NGUON_OPTIONS
        });
        return res.render('pages/user/lich-su/index', data);
    } catch (error) { return next(error); }
}

module.exports = {
    index
};