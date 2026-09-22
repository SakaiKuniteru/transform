'use strict';

const { layClient } = require('../../infrastructure/database/pool');
const { bigIntRaJson } = require('../han-muc/han-muc.util');

async function thucThi(sql, values = [], db = null) {
    if (db && typeof db.query === 'function') { return db.query(sql, values); }
    const client = await layClient();
    try {
        return await client.query(sql, values);
    } finally {
        client.release();
    }
}

function mapChinhSach(row) {
    if (!row) { return null; }
    return {
        id: row.id,
        ma: row.ma,
        ten: row.ten,
        doiTuong: row.doi_tuong,
        loaiTaiKhoan: row.loai_tai_khoan,
        goiDichVuId: row.goi_dich_vu_id,
        tenGoiDichVu: row.ten_goi_dich_vu,
        maGoiDichVu: row.ma_goi_dich_vu,
        maHanhDong: row.ma_hanh_dong,
        donVi: row.don_vi,
        chuKy: row.chu_ky,
        muiGio: row.mui_gio,
        gioiHan: row.gioi_han === null ? null : bigIntRaJson(row.gioi_han),
        khongGioiHan: row.khong_gioi_han,
        hanhDongKhiVuot: row.hanh_dong_khi_vuot,
        mucDoUuTien: row.muc_do_uu_tien,
        hieuLucTu: row.hieu_luc_tu,
        hieuLucDen: row.hieu_luc_den,
        active: row.active,
        metadata: row.metadata || {},
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

function getBaseSelect() {
    return `
        SELECT
            cshm.id,
            cshm.ma,
            cshm.ten,
            cshm.doi_tuong,
            cshm.loai_tai_khoan,
            cshm.goi_dich_vu_id,
            gdv.ma AS ma_goi_dich_vu,
            gdv.ten AS ten_goi_dich_vu,
            cshm.ma_hanh_dong,
            cshm.don_vi,
            cshm.chu_ky,
            cshm.mui_gio,
            cshm.gioi_han,
            cshm.khong_gioi_han,
            cshm.hanh_dong_khi_vuot,
            cshm.muc_do_uu_tien,
            cshm.hieu_luc_tu,
            cshm.hieu_luc_den,
            cshm.active,
            cshm.metadata,
            cshm.created_at,
            cshm.updated_at
        FROM chinh_sach_han_muc cshm
        LEFT JOIN goi_dich_vu gdv ON gdv.id = cshm.goi_dich_vu_id
    `;
}

async function getDanhSach(filters = {}, db = null) {
    const conditions = [];
    const values = [];
    if (filters.tuKhoa) {
        values.push(`%${filters.tuKhoa}%`);
        conditions.push(`(cshm.ma ILIKE $${values.length} OR cshm.ten ILIKE $${values.length} OR cshm.ma_hanh_dong ILIKE $${values.length})`);
    }
    if (filters.doiTuong) {
        values.push(filters.doiTuong);
        conditions.push(`cshm.doi_tuong = $${values.length}`);
    }
    if (filters.loaiTaiKhoan) {
        values.push(filters.loaiTaiKhoan);
        conditions.push(`cshm.loai_tai_khoan = $${values.length}`);
    }
    if (filters.goiDichVuId) {
        values.push(filters.goiDichVuId);
        conditions.push(`cshm.goi_dich_vu_id = $${values.length}`);
    }
    if (filters.maHanhDong) {
        values.push(filters.maHanhDong);
        conditions.push(`cshm.ma_hanh_dong = $${values.length}`);
    }
    if (filters.donVi) {
        values.push(filters.donVi);
        conditions.push(`cshm.don_vi = $${values.length}`);
    }
    if (filters.chuKy) {
        values.push(filters.chuKy);
        conditions.push(`cshm.chu_ky = $${values.length}`);
    }
    if (filters.active !== undefined) {
        values.push(filters.active);
        conditions.push(`cshm.active = $${values.length}`);
    }
    if (filters.dangHieuLuc === true) { conditions.push(`cshm.hieu_luc_tu <= NOW() AND (cshm.hieu_luc_den IS NULL OR cshm.hieu_luc_den > NOW())`); }
    if (filters.dangHieuLuc === false) { conditions.push(`(cshm.hieu_luc_tu > NOW() OR (cshm.hieu_luc_den IS NOT NULL AND cshm.hieu_luc_den <= NOW()))`); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const sortMap = {
        id: 'cshm.id',
        ma: 'cshm.ma',
        ten: 'cshm.ten',
        mucDoUuTien: 'cshm.muc_do_uu_tien',
        hieuLucTu: 'cshm.hieu_luc_tu',
        createdAt: 'cshm.created_at'
    };
    const sortBy = sortMap[filters.sortBy] || 'cshm.muc_do_uu_tien';
    const sortOrder = filters.sortOrder === 'desc' ? 'DESC' : 'ASC';
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;
    const countResult = await thucThi(`
        SELECT COUNT(*)::INTEGER AS total
        FROM chinh_sach_han_muc cshm
        ${where}
    `, values, db);
    const queryValues = [...values, limit, offset];
    const result = await thucThi(`
        ${getBaseSelect()}
        ${where}
        ORDER BY ${sortBy} ${sortOrder}, cshm.id DESC
        LIMIT $${queryValues.length - 1}
        OFFSET $${queryValues.length}
    `, queryValues, db);
    return {
        items: result.rows.map(mapChinhSach),
        total: Number(countResult.rows[0]?.total || 0),
        page,
        limit
    };
}

async function getById(id, db = null) {
    const result = await thucThi(`
        ${getBaseSelect()}
        WHERE cshm.id = $1
        LIMIT 1
    `, [id], db);
    return mapChinhSach(result.rows[0]);
}

async function getByMa(ma, excludeId = null, db = null) {
    const values = [ma];
    let exclude = '';
    if (excludeId !== null) {
        values.push(excludeId);
        exclude = `AND cshm.id <> $${values.length}`;
    }
    const result = await thucThi(`
        ${getBaseSelect()}
        WHERE LOWER(cshm.ma) = LOWER($1)
        ${exclude}
        LIMIT 1
    `, values, db);
    return mapChinhSach(result.rows[0]);
}

async function getGoiDichVuById(id, db = null) {
    const result = await thucThi(`
        SELECT
            id,
            ma,
            ten,
            active,
            xoa_luc
        FROM goi_dich_vu
        WHERE id = $1
        AND xoa_luc IS NULL
        LIMIT 1
    `, [id], db);
    return result.rows[0] || null;
}

async function create(data, db = null) {
    const result = await thucThi(`
        INSERT INTO chinh_sach_han_muc (
            ma,
            ten,
            doi_tuong,
            loai_tai_khoan,
            goi_dich_vu_id,
            ma_hanh_dong,
            don_vi,
            chu_ky,
            mui_gio,
            gioi_han,
            khong_gioi_han,
            hanh_dong_khi_vuot,
            muc_do_uu_tien,
            hieu_luc_tu,
            hieu_luc_den,
            active,
            metadata
        )
        VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            $9,
            $10,
            $11,
            $12,
            $13,
            $14,
            $15,
            $16,
            $17
        )
        RETURNING id
    `, [
        data.ma,
        data.ten,
        data.doiTuong,
        data.loaiTaiKhoan,
        data.goiDichVuId,
        data.maHanhDong,
        data.donVi,
        data.chuKy,
        data.muiGio,
        data.gioiHan,
        data.khongGioiHan,
        data.hanhDongKhiVuot,
        data.mucDoUuTien,
        data.hieuLucTu,
        data.hieuLucDen,
        data.active,
        data.metadata
    ], db);
    return getById(result.rows[0].id, db);
}

async function update(id, data, db = null) {
    const fields = [];
    const values = [];
    const them = (column, value) => {
        values.push(value);
        fields.push(`${column} = $${values.length}`);
    };
    if (data.ma !== undefined) { them('ma', data.ma); }
    if (data.ten !== undefined) { them('ten', data.ten); }
    if (data.doiTuong !== undefined) { them('doi_tuong', data.doiTuong); }
    if (data.loaiTaiKhoan !== undefined) { them('loai_tai_khoan', data.loaiTaiKhoan); }
    if (data.goiDichVuId !== undefined) { them('goi_dich_vu_id', data.goiDichVuId); }
    if (data.maHanhDong !== undefined) { them('ma_hanh_dong', data.maHanhDong); }
    if (data.donVi !== undefined) { them('don_vi', data.donVi); }
    if (data.chuKy !== undefined) { them('chu_ky', data.chuKy); }
    if (data.muiGio !== undefined) { them('mui_gio', data.muiGio); }
    if (data.gioiHan !== undefined) { them('gioi_han', data.gioiHan); }
    if (data.khongGioiHan !== undefined) { them('khong_gioi_han', data.khongGioiHan); }
    if (data.hanhDongKhiVuot !== undefined) { them('hanh_dong_khi_vuot', data.hanhDongKhiVuot); }
    if (data.mucDoUuTien !== undefined) { them('muc_do_uu_tien', data.mucDoUuTien); }
    if (data.hieuLucTu !== undefined) { them('hieu_luc_tu', data.hieuLucTu); }
    if (data.hieuLucDen !== undefined) { them('hieu_luc_den', data.hieuLucDen); }
    if (data.active !== undefined) { them('active', data.active); }
    if (data.metadata !== undefined) { them('metadata', data.metadata); }
    if (fields.length === 0) { return getById(id, db); }
    values.push(id);
    const result = await thucThi(`
        UPDATE chinh_sach_han_muc
        SET ${fields.join(',\n            ')}
        WHERE id = $${values.length}
        RETURNING id
    `, values, db);
    if (!result.rows[0]) { return null; }
    return getById(result.rows[0].id, db);
}

async function updateTrangThai(id, active, db = null) {
    const result = await thucThi(`
        UPDATE chinh_sach_han_muc
        SET active = $1
        WHERE id = $2
        RETURNING id
    `, [active, id], db);
    if (!result.rows[0]) { return null; }
    return getById(result.rows[0].id, db);
}

async function xoa(id, db = null) {
    const result = await thucThi(`
        DELETE FROM chinh_sach_han_muc
        WHERE id = $1
        RETURNING id
    `, [id], db);
    return result.rows[0] || null;
}

module.exports = {
    getDanhSach,
    getById,
    getByMa,
    getGoiDichVuById,
    create,
    update,
    updateTrangThai,
    xoa
};