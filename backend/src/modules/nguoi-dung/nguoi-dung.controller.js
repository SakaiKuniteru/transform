'use strict';

const { apiResponse } = require('@transform/shared');
const service = require('./nguoi-dung.service');

function layValidated(req, viTri) {
    return req.validated?.[viTri] ?? req[viTri] ?? {};
}

async function layDanhSach(req, res) {
    const query = layValidated(req, 'query');
    const ketQua = await service.layDanhSach(query);
    const meta = apiResponse.taoPhanTrang({
        page: ketQua.page,
        pageSize: ketQua.pageSize,
        total: ketQua.tong
    });
    return res.json(
        apiResponse.taoThanhCong(
            ketQua.danhSach,
            {
                message: 'Lấy danh sách người dùng thành công.',
                meta
            }
        )
    );
}

async function layHienTai(req, res) {
    const nguoiDung = await service.layHienTai(req.user.id);
    return res.json(
        apiResponse.taoThanhCong(
            nguoiDung,
            {
                message: 'Lấy thông tin người dùng hiện tại thành công.'
            }
        )
    );
}

async function layChiTiet(req, res) {
    const params = layValidated(req, 'params');
    const nguoiDung = await service.layChiTiet(params.id);
    return res.json(
        apiResponse.taoThanhCong(
            nguoiDung,
            {
                message: 'Lấy thông tin người dùng thành công.'
            }
        )
    );
}

async function taoMoi(req, res) {
    const body = layValidated(req, 'body');
    const nguoiDung = await service.taoMoi(body);
    return res.status(201).json(
        apiResponse.taoThanhCong(
            nguoiDung,
            {
                message: 'Tạo người dùng thành công.'
            }
        )
    );
}

async function capNhat(req, res) {
    const params = layValidated(req, 'params');
    const body = layValidated(req, 'body');
    const nguoiDung = await service.capNhat(
        params.id,
        body,
        req.user.id
    );
    return res.json(
        apiResponse.taoThanhCong(
            nguoiDung,
            {
                message: 'Cập nhật người dùng thành công.'
            }
        )
    );
}

async function capNhatHienTai(req, res) {
    const body = layValidated(req, 'body');

    const nguoiDung = await service.capNhatHienTai(
        req.user.id,
        body
    );
    return res.json(
        apiResponse.taoThanhCong(
            nguoiDung,
            {
                message: 'Cập nhật thông tin cá nhân thành công.'
            }
        )
    );
}

async function capNhatTrangThai(req, res) {
    const params = layValidated(req, 'params');
    const body = layValidated(req, 'body');

    const nguoiDung = await service.capNhatTrangThai(
        params.id,
        body.trangThai,
        req.user.id
    );
    return res.json(
        apiResponse.taoThanhCong(
            nguoiDung,
            {
                message: 'Cập nhật trạng thái người dùng thành công.'
            }
        )
    );
}

async function xoa(req, res) {
    const params = layValidated(req, 'params');

    const nguoiDung = await service.xoa(
        params.id,
        req.user.id
    );
    return res.json(
        apiResponse.taoThanhCong(
            nguoiDung,
            {
                message: 'Xóa người dùng thành công.'
            }
        )
    );
}

module.exports = {
    layDanhSach,
    layHienTai,
    layChiTiet,
    taoMoi,
    capNhat,
    capNhatHienTai,
    capNhatTrangThai,
    xoa
};