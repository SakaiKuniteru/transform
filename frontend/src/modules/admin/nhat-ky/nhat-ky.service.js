'use strict';

const KHA_NANG_NHAT_KY = Object.freeze({
    hoTro: false,
    ma: 'ADMIN_NHAT_KY_CHUA_CO_API',
    tieuDe: 'Nhật ký hệ thống chưa có API quản trị',
    thongBao: 'Backend đã ghi nhật ký vào cơ sở dữ liệu nhưng chưa expose HTTP API để Frontend quản trị truy vấn.',
    khaNangBackend: Object.freeze([
        'Tra cứu theo Request ID',
        'Tra cứu theo Trace ID',
        'Tra cứu theo công việc',
        'Dọn nhật ký hết hạn'
    ]),
    serviceNoiBo: Object.freeze([
        'getTheoRequestId',
        'getTheoTraceId',
        'getTheoCongViec',
        'xoaHetHan'
    ])
});

function layTrang() {
    return {
        khaNang: KHA_NANG_NHAT_KY
    };
}

module.exports = {
    KHA_NANG_NHAT_KY,
    layTrang
};