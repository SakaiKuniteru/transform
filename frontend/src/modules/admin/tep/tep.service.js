'use strict';

const KHA_NANG_QUAN_TRI_TEP = Object.freeze({
    hoTro: false,
    ma: 'ADMIN_TEP_CHUA_HO_TRO',
    tieuDe: 'Quản lý tệp toàn hệ thống chưa khả dụng',
    thongBao: 'Backend hiện chỉ hỗ trợ người dùng xem và quản lý tệp thuộc chính tài khoản của mình.',
    endpointHienTai: Object.freeze([
        'GET /tep/cua-toi',
        'GET /tep/:id',
        'GET /tep/:id/tai-xuong',
        'PATCH /tep/:id',
        'DELETE /tep/:id'
    ])
});

function layTrang() {
    return {
        khaNang: KHA_NANG_QUAN_TRI_TEP
    };
}

module.exports = {
    KHA_NANG_QUAN_TRI_TEP,
    layTrang
};