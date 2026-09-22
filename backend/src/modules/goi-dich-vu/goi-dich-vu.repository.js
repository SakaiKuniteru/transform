'use strict';

const { layClient } = require('../../infrastructure/database/pool');

async function thucThi(sql, values = []) {
    const client = await layClient();
    try {
        return await client.query(sql, values);
    } finally {
        client.release();
    }
}

function mapGoiDichVu(row) {
    if (!row) { return null; }
    return {
        id: row.id,
        ma: row.ma,
        ten: row.ten,
        moTa: row.mo_ta,
        gia: Number(row.gia),
        tienTe: row.tien_te,
        yeuCauThanhToan: row.yeu_cau_thanh_toan,
        chuKy: row.chu_ky,
        soChuKy: row.so_chu_ky,
        thuTu: row.thu_tu,
        active: row.active,
        metadata: row.metadata || {},
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        xoaLuc: row.xoa_luc
    };
}

function getSelect() {
    return `
        SELECT
            id,
            ma,
            ten,
            mo_ta,
            gia,
            tien_te,
            yeu_cau_thanh_toan,
            chu_ky,
            so_chu_ky,
            thu_tu,
            active,
            metadata,
            created_at,
            updated_at,
            xoa_luc
        FROM goi_dich_vu
    `;
}

async function getDanhSach(filters = {}) {
    const conditions = ['xoa_luc IS NULL'];
    const values = [];
    if (filters.tuKhoa) {
        values.push(`%${filters.tuKhoa}%`);
        conditions.push(`(
            ma ILIKE $${values.length}
            OR ten ILIKE $${values.length}
        )`);
    }
    if (filters.active !== undefined) {
        values.push(filters.active);
        conditions.push(`active = $${values.length}`);
    }
    if (filters.chuKy) {
        values.push(filters.chuKy);
        conditions.push(`chu_ky = $${values.length}`);
    }
    if (filters.yeuCauThanhToan !== undefined) {
        values.push(filters.yeuCauThanhToan);
        conditions.push(`yeu_cau_thanh_toan = $${values.length}`);
    }
    const sortMap = {
        id: 'id',
        ma: 'ma',
        ten: 'ten',
        gia: 'gia',
        thuTu: 'thu_tu',
        createdAt: 'created_at'
    };
    const sortBy = sortMap[filters.sortBy] || 'thu_tu';
    const sortOrder = filters.sortOrder === 'desc' ? 'DESC' : 'ASC';
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;
    const countResult = await thucThi(`
        SELECT COUNT(*)::INTEGER AS total
        FROM goi_dich_vu
        WHERE ${conditions.join(' AND ')}
    `, values);
    const queryValues = [...values, limit, offset];
    const result = await thucThi(`
        ${getSelect()}
        WHERE ${conditions.join(' AND ')}
        ORDER BY
            ${sortBy} ${sortOrder},
            id ASC
        LIMIT $${queryValues.length - 1}
        OFFSET $${queryValues.length}
    `, queryValues);
    return {
        items: result.rows.map(mapGoiDichVu),
        total: Number(countResult.rows[0]?.total || 0),
        page,
        limit
    };
}

async function getById(id) {
    const result = await thucThi(`
        ${getSelect()}
        WHERE id = $1
        AND xoa_luc IS NULL
        LIMIT 1
    `, [id]);
    return mapGoiDichVu(result.rows[0]);
}

async function getByMa(ma, excludeId = null) {
    const values = [ma];
    let excludeCondition = '';
    if (excludeId !== null) {
        values.push(excludeId);
        excludeCondition = `AND id <> $${values.length}`;
    }
    const result = await thucThi(`
        ${getSelect()}

        WHERE LOWER(ma) = LOWER($1)
        AND xoa_luc IS NULL
        ${excludeCondition}
        LIMIT 1
    `, values);
    return mapGoiDichVu(result.rows[0]);
}

async function create(data) {
    const result = await thucThi(`
        INSERT INTO goi_dich_vu (
            ma,
            ten,
            mo_ta,
            gia,
            tien_te,
            yeu_cau_thanh_toan,
            chu_ky,
            so_chu_ky,
            thu_tu,
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
            $11
        )
        RETURNING *
    `, [
        data.ma,
        data.ten,
        data.moTa,
        data.gia,
        data.tienTe,
        data.yeuCauThanhToan,
        data.chuKy,
        data.soChuKy,
        data.thuTu,
        data.active,
        data.metadata
    ]);
    return mapGoiDichVu(result.rows[0]);
}

async function update(id, data) {
    const fields = [];
    const values = [];
    const them = (column, value) => {
        values.push(value);
        fields.push(`${column} = $${values.length}`);
    };
    if (data.ma !== undefined) { them('ma', data.ma); }
    if (data.ten !== undefined) { them('ten', data.ten); }
    if (data.moTa !== undefined) { them('mo_ta', data.moTa); }
    if (data.gia !== undefined) { them('gia', data.gia); }
    if (data.tienTe !== undefined) { them('tien_te', data.tienTe); }
    if (data.yeuCauThanhToan !== undefined) { them('yeu_cau_thanh_toan', data.yeuCauThanhToan); }
    if (data.chuKy !== undefined) { them('chu_ky', data.chuKy); }
    if (data.soChuKy !== undefined) { them('so_chu_ky', data.soChuKy); }
    if (data.thuTu !== undefined) { them('thu_tu', data.thuTu); }
    if (data.active !== undefined) { them('active', data.active); }
    if (data.metadata !== undefined) { them('metadata', data.metadata); }
    if (fields.length === 0) { return getById(id); }
    values.push(id);
    const result = await thucThi(`
        UPDATE goi_dich_vu
        SET
            ${fields.join(',\n            ')}
        WHERE id = $${values.length}
        AND xoa_luc IS NULL
        RETURNING *
    `, values);
    return mapGoiDichVu(result.rows[0]);
}

async function updateTrangThai(id, active) {
    const result = await thucThi(`
        UPDATE goi_dich_vu
        SET active = $1
        WHERE id = $2
        AND xoa_luc IS NULL
        RETURNING *
    `, [active, id]);
    return mapGoiDichVu(result.rows[0]);
}

async function softDelete(id) {
    const result = await thucThi(`
        UPDATE goi_dich_vu
        SET
            active = FALSE,
            xoa_luc = NOW()
        WHERE id = $1
        AND xoa_luc IS NULL
        RETURNING *
    `, [id]);
    return mapGoiDichVu(result.rows[0]);
}

async function demDangKyDangSuDung(id) {
    const result = await thucThi(`
        SELECT COUNT(*)::INTEGER AS total
        FROM dang_ky_goi
        WHERE goi_dich_vu_id = $1
        AND trang_thai IN (
            'CHO_THANH_TOAN',
            'HOAT_DONG',
            'TAM_DUNG'
        )
    `, [id]);
    return Number(result.rows[0]?.total || 0);
}

module.exports = {
    getDanhSach,
    getById,
    getByMa,
    create,
    update,
    updateTrangThai,
    softDelete,
    demDangKyDangSuDung
};