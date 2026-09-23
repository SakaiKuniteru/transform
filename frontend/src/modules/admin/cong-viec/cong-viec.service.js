'use strict';

const KHA_NANG_QUAN_TRI_CONG_VIEC = Object.freeze({
    hoTro: false,
    ma: 'ADMIN_CONG_VIEC_CHUA_HO_TRO',
    tieuDe: 'Quản lý công việc toàn hệ thống chưa khả dụng',
    thongBao: 'Backend hiện chỉ hỗ trợ xem và hủy công việc thuộc chính người dùng hoặc phiên khách hiện tại.',
    endpointHienTai: Object.freeze([
        'GET /cong-viec/cua-toi',
        'GET /cong-viec/:id',
        'PATCH /cong-viec/:id/huy'
    ])
});

function layTrang() {
    return {
        khaNang: KHA_NANG_QUAN_TRI_CONG_VIEC
    };
}

module.exports = {
    KHA_NANG_QUAN_TRI_CONG_VIEC,
    layTrang
};