'use strict';

const { taoForm } = require('../../../../core/forms/form-builder');
const service = require('../chinh-sach-han-muc.service');

function kiemTraChinhSach(values) {
    if ([ 'KHACH', 'NGUOI_DUNG' ].includes(values.doiTuong) && (values.loaiTaiKhoan || values.goiDichVuId)) { return { doiTuong: 'Đối tượng khách hoặc người dùng không được khai báo loại tài khoản hoặc gói dịch vụ.' }; }
    if (values.doiTuong === 'LOAI_TAI_KHOAN' && !values.loaiTaiKhoan) { return { loaiTaiKhoan: 'Phải chọn loại tài khoản.' }; }
    if (values.doiTuong === 'GOI_DICH_VU' && !values.goiDichVuId) { return { goiDichVuId: 'Phải chọn gói dịch vụ.' }; }
    if (values.khongGioiHan !== true && (values.gioiHan === '' || values.gioiHan === null || values.gioiHan === undefined)) { return { gioiHan: 'Phải nhập giới hạn hoặc chọn không giới hạn.' }; }
    if (values.maHanhDong === 'UPLOAD_TONG_SO_LAN' && (values.donVi !== 'LAN' || values.chuKy !== 'NGAY')) { return { maHanhDong: 'UPLOAD_TONG_SO_LAN phải dùng đơn vị Lần và chu kỳ Ngày.' }; }
    if (values.maHanhDong === 'UPLOAD_TONG_SO_TEP' && (values.donVi !== 'TEP' || values.chuKy !== 'THEO_GOI')) { return { maHanhDong: 'UPLOAD_TONG_SO_TEP phải dùng đơn vị Tệp và chu kỳ Theo gói.' }; }
    if (values.maHanhDong === 'UPLOAD_TONG_SO_TEP' && values.khongGioiHan !== true && values.doiTuong !== 'GOI_DICH_VU') { return { doiTuong: 'UPLOAD_TONG_SO_TEP hữu hạn chỉ áp dụng cho đối tượng Gói dịch vụ.' }; }
    if (values.maHanhDong === 'UPLOAD_SO_TEP_MOI_LAN' && (values.donVi !== 'TEP' || values.chuKy !== 'MOI_REQUEST' || values.khongGioiHan === true)) { return { maHanhDong: 'UPLOAD_SO_TEP_MOI_LAN phải dùng Tệp/Mỗi request và phải có giới hạn hữu hạn.' }; }
    if (values.maHanhDong === 'UPLOAD_KICH_THUOC_MOI_TEP' && (values.donVi !== 'BYTE' || values.chuKy !== 'MOI_TEP' || values.khongGioiHan === true)) { return { maHanhDong: 'UPLOAD_KICH_THUOC_MOI_TEP phải dùng Byte/Mỗi tệp và phải có giới hạn hữu hạn.' }; }
    if (values.hieuLucTu && values.hieuLucDen && new Date(values.hieuLucTu).getTime() >= new Date(values.hieuLucDen).getTime()) { return { hieuLucDen: 'Thời gian kết thúc phải lớn hơn thời gian bắt đầu.' }; }
    return null;
}

function taoChinhSachForm(context = {}) {
    const mode = context.mode === 'update' ? 'update' : 'create';
    const action = mode === 'update' ? `/admin/chinh-sach-han-muc/${context.id}/cap-nhat` : '/admin/chinh-sach-han-muc/tao';
    return taoForm(`admin-${mode === 'update' ? 'cap-nhat' : 'tao'}-chinh-sach-han-muc`, {
        method: 'POST',
        action
    })
        .field('ma', 'text', {
            label: 'Mã chính sách',
            required: true,
            maxLength: 100,
            pattern: '^[A-Za-z0-9_-]+$',
            placeholder: 'VD: USER_UPLOAD_DAILY'
        })
        .field('ten', 'text', {
            label: 'Tên chính sách',
            required: true,
            maxLength: 255,
            placeholder: 'Nhập tên chính sách'
        })
        .field('doiTuong', 'select', {
            label: 'Đối tượng áp dụng',
            required: true,
            defaultValue: 'NGUOI_DUNG',
            options: service.DOI_TUONG_OPTIONS,
            attributes: {
                'data-limit-target': 'true'
            }
        })
        .field('loaiTaiKhoan', 'select', {
            label: 'Loại tài khoản',
            placeholder: 'Chọn loại tài khoản',
            options: service.LOAI_TAI_KHOAN_OPTIONS,
            attributes: {
                'data-limit-account-type': 'true'
            }
        })
        .field('goiDichVuId', 'select', {
            label: 'Gói dịch vụ',
            placeholder: 'Chọn gói dịch vụ',
            options: context.goiOptions || [],
            attributes: {
                'data-limit-plan': 'true'
            }
        })
        .field('maHanhDong', 'select', {
            label: 'Mã hành động',
            required: true,
            options: service.MA_HAN_MUC_OPTIONS,
            attributes: {
                'data-limit-action': 'true'
            }
        })
        .field('donVi', 'select', {
            label: 'Đơn vị',
            required: true,
            options: service.DON_VI_OPTIONS,
            attributes: {
                'data-limit-unit': 'true'
            }
        })
        .field('chuKy', 'select', {
            label: 'Chu kỳ',
            required: true,
            options: service.CHU_KY_OPTIONS,
            attributes: {
                'data-limit-cycle': 'true'
            }
        })
        .field('muiGio', 'text', {
            label: 'Múi giờ',
            required: true,
            maxLength: 64,
            defaultValue: 'UTC',
            placeholder: 'UTC'
        })
        .field('gioiHan', 'number', {
            label: 'Giới hạn',
            min: 0,
            step: 1,
            attributes: {
                'data-limit-value': 'true'
            }
        })
        .field('khongGioiHan', 'toggle', {
            text: 'Không giới hạn',
            defaultValue: false,
            attributes: {
                'data-limit-unlimited': 'true'
            }
        })
        .field('hanhDongKhiVuot', 'select', {
            label: 'Khi vượt hạn mức',
            required: true,
            defaultValue: 'TU_CHOI',
            options: service.HANH_DONG_OPTIONS
        })
        .field('mucDoUuTien', 'number', {
            label: 'Mức độ ưu tiên',
            required: true,
            min: 1,
            step: 1,
            defaultValue: 100
        })
        .field('hieuLucTu', 'datetime-local', {
            label: 'Hiệu lực từ'
        })
        .field('hieuLucDen', 'datetime-local', {
            label: 'Hiệu lực đến'
        })
        .field('active', 'toggle', {
            text: 'Áp dụng chính sách',
            defaultValue: true
        })
        .validate(kiemTraChinhSach)
        .submit(mode === 'update' ? 'Lưu thay đổi' : 'Tạo chính sách', {
            className: 'btn btn-primary'
        })
        .build();
}

module.exports = {
    kiemTraChinhSach,
    taoChinhSachForm
};