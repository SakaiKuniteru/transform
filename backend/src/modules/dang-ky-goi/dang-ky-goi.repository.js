'use strict';

const { layClient } = require('../../infrastructure/database/pool');

async function thucThi(sql, values = [], db = null) {
    if (db && typeof db.query === 'function') { return db.query(sql, values); }
    const client = await layClient();
    try {
        return await client.query(sql, values);
    } finally {
        client.release();
    }
}

function mapDangKy(row) {
    if (!row) { return null; }
    return {
        id: row.id,
        nguoiDungId: row.nguoi_dung_id,
        goiDichVuId: row.goi_dich_vu_id,
        trangThai: row.trang_thai,
        nguonKichHoat: row.nguon_kich_hoat,
        giaThanhToan: Number(row.gia_thanh_toan),
        tienTe: row.tien_te,
        maGiaoDich: row.ma_giao_dich,
        batDauLuc: row.bat_dau_luc,
        hetHanLuc: row.het_han_luc,
        huyLuc: row.huy_luc,
        tuDongGiaHan: row.tu_dong_gia_han,
        metadata: row.metadata || {},
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        nguoiDung: row.email === undefined ? undefined : {
            id: row.nguoi_dung_id,
            email: row.email,
            tenDangNhap: row.ten_dang_nhap,
            hoTen: row.ho_ten
        },
        goiDichVu: row.ma_goi === undefined ? undefined : {
            id: row.goi_dich_vu_id,
            ma: row.ma_goi,
            ten: row.ten_goi,
            gia: Number(row.gia_goi),
            tienTe: row.tien_te_goi,
            yeuCauThanhToan: row.yeu_cau_thanh_toan,
            chuKy: row.chu_ky,
            soChuKy: row.so_chu_ky
        }
    };
}

function getBaseSelect() {
    return `
        SELECT
            dkg.id,
            dkg.nguoi_dung_id,
            dkg.goi_dich_vu_id,
            dkg.trang_thai,
            dkg.nguon_kich_hoat,
            dkg.gia_thanh_toan,
            dkg.tien_te,
            dkg.ma_giao_dich,
            dkg.bat_dau_luc,
            dkg.het_han_luc,
            dkg.huy_luc,
            dkg.tu_dong_gia_han,
            dkg.metadata,
            dkg.created_at,
            dkg.updated_at,
            nd.email,
            nd.ten_dang_nhap,
            nd.ho_ten,
            gdv.ma AS ma_goi,
            gdv.ten AS ten_goi,
            gdv.gia AS gia_goi,
            gdv.tien_te AS tien_te_goi,
            gdv.yeu_cau_thanh_toan,
            gdv.chu_ky,
            gdv.so_chu_ky
        FROM dang_ky_goi dkg
        INNER JOIN nguoi_dung nd ON nd.id = dkg.nguoi_dung_id
        INNER JOIN goi_dich_vu gdv ON gdv.id = dkg.goi_dich_vu_id
    `;
}

async function getDanhSach(filters = {}, db = null) {
    const conditions = [];
    const values = [];
    if (filters.nguoiDungId) {
        values.push(filters.nguoiDungId);
        conditions.push(`dkg.nguoi_dung_id = $${values.length}`);
    }
    if (filters.goiDichVuId) {
        values.push(filters.goiDichVuId);
        conditions.push(`dkg.goi_dich_vu_id = $${values.length}`);
    }
    if (filters.trangThai) {
        values.push(filters.trangThai);
        conditions.push(`dkg.trang_thai = $${values.length}`);
    }
    if (filters.nguonKichHoat) {
        values.push(filters.nguonKichHoat);
        conditions.push(`dkg.nguon_kich_hoat = $${values.length}`);
    }
    if (filters.tuKhoa) {
        values.push(`%${filters.tuKhoa}%`);
        conditions.push(`(nd.email ILIKE $${values.length} OR nd.ten_dang_nhap ILIKE $${values.length} OR nd.ho_ten ILIKE $${values.length} OR gdv.ma ILIKE $${values.length} OR gdv.ten ILIKE $${values.length})`);
    }
    if (filters.tuNgay) {
        values.push(filters.tuNgay);
        conditions.push(`dkg.created_at >= $${values.length}`);
    }
    if (filters.denNgay) {
        values.push(filters.denNgay);
        conditions.push(`dkg.created_at <= $${values.length}`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const sortMap = {
        id: 'dkg.id',
        createdAt: 'dkg.created_at',
        batDauLuc: 'dkg.bat_dau_luc',
        hetHanLuc: 'dkg.het_han_luc',
        giaThanhToan: 'dkg.gia_thanh_toan'
    };
    const sortBy = sortMap[filters.sortBy] || 'dkg.created_at';
    const sortOrder = filters.sortOrder === 'asc' ? 'ASC' : 'DESC';
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;
    const countResult = await thucThi(`
        SELECT COUNT(*)::INTEGER AS total
        FROM dang_ky_goi dkg
        INNER JOIN nguoi_dung nd ON nd.id = dkg.nguoi_dung_id
        INNER JOIN goi_dich_vu gdv ON gdv.id = dkg.goi_dich_vu_id
        ${where}
    `, values, db);
    const queryValues = [...values, limit, offset];
    const result = await thucThi(`
        ${getBaseSelect()}
        ${where}
        ORDER BY ${sortBy} ${sortOrder}, dkg.id DESC
        LIMIT $${queryValues.length - 1}
        OFFSET $${queryValues.length}
    `, queryValues, db);
    return {
        items: result.rows.map(mapDangKy),
        total: Number(countResult.rows[0]?.total || 0),
        page,
        limit
    };
}

async function getById(id, db = null) {
    const result = await thucThi(`
        ${getBaseSelect()}
        WHERE dkg.id = $1
        LIMIT 1
    `, [id], db);
    return mapDangKy(result.rows[0]);
}

async function getByIdForUpdate(id, db) {
    const result = await thucThi(`
        ${getBaseSelect()}
        WHERE dkg.id = $1
        FOR UPDATE OF dkg
    `, [id], db);
    return mapDangKy(result.rows[0]);
}

async function getCuaNguoiDung(nguoiDungId, filters = {}, db = null) {
    return getDanhSach({
        ...filters,
        nguoiDungId
    }, db);
}

async function getHienTaiCuaNguoiDung(nguoiDungId, db = null) {
    const result = await thucThi(`
        ${getBaseSelect()}
        WHERE dkg.nguoi_dung_id = $1
        AND dkg.trang_thai = 'HOAT_DONG'
        AND (dkg.bat_dau_luc IS NULL OR dkg.bat_dau_luc <= NOW())
        AND (dkg.het_han_luc IS NULL OR dkg.het_han_luc > NOW())
        ORDER BY dkg.created_at DESC
        LIMIT 1
    `, [nguoiDungId], db);
    return mapDangKy(result.rows[0]);
}

async function getDangMoCuaNguoiDungVaGoi(nguoiDungId, goiDichVuId, db = null) {
    const result = await thucThi(`
        ${getBaseSelect()}
        WHERE dkg.nguoi_dung_id = $1
        AND dkg.goi_dich_vu_id = $2
        AND dkg.trang_thai IN ('CHO_THANH_TOAN', 'HOAT_DONG', 'TAM_DUNG')
        ORDER BY dkg.created_at DESC
        LIMIT 1
    `, [nguoiDungId, goiDichVuId], db);
    return mapDangKy(result.rows[0]);
}

async function getGoiDichVuById(id, db = null) {
    const result = await thucThi(`
        SELECT
            id,
            ma,
            ten,
            gia,
            tien_te,
            yeu_cau_thanh_toan,
            chu_ky,
            so_chu_ky,
            active,
            xoa_luc
        FROM goi_dich_vu
        WHERE id = $1
        AND xoa_luc IS NULL
        LIMIT 1
    `, [id], db);
    const row = result.rows[0];
    if (!row) { return null; }
    return {
        id: row.id,
        ma: row.ma,
        ten: row.ten,
        gia: Number(row.gia),
        tienTe: row.tien_te,
        yeuCauThanhToan: row.yeu_cau_thanh_toan,
        chuKy: row.chu_ky,
        soChuKy: row.so_chu_ky,
        active: row.active
    };
}

async function khoaNguoiDung(id, db) {
    const result = await thucThi(`
        SELECT id
        FROM nguoi_dung
        WHERE id = $1
        AND xoa_luc IS NULL
        FOR UPDATE
    `, [id], db);
    return result.rows[0] || null;
}

async function create(data, db = null) {
    const result = await thucThi(`
        INSERT INTO dang_ky_goi (
            nguoi_dung_id,
            goi_dich_vu_id,
            trang_thai,
            nguon_kich_hoat,
            gia_thanh_toan,
            tien_te,
            ma_giao_dich,
            bat_dau_luc,
            het_han_luc,
            huy_luc,
            tu_dong_gia_han,
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
            NULL,
            $10,
            $11
        )
        RETURNING id
    `, [
        data.nguoiDungId,
        data.goiDichVuId,
        data.trangThai || 'CHO_THANH_TOAN',
        data.nguonKichHoat || 'THANH_TOAN',
        data.giaThanhToan ?? 0,
        data.tienTe || 'VND',
        data.maGiaoDich || null,
        data.batDauLuc || null,
        data.hetHanLuc || null,
        data.tuDongGiaHan === true,
        data.metadata || {}
    ], db);
    return getById(result.rows[0].id, db);
}

async function kichHoat(id, batDauLuc = null, maGiaoDich = null, db = null) {
    const result = await thucThi(`
        UPDATE dang_ky_goi dkg
        SET
            trang_thai = 'HOAT_DONG',
            bat_dau_luc = COALESCE($2::TIMESTAMPTZ, NOW()),
            het_han_luc = CASE
                WHEN gdv.chu_ky = 'THANG' THEN COALESCE($2::TIMESTAMPTZ, NOW()) + MAKE_INTERVAL(months => gdv.so_chu_ky)
                WHEN gdv.chu_ky = 'NAM' THEN COALESCE($2::TIMESTAMPTZ, NOW()) + MAKE_INTERVAL(years => gdv.so_chu_ky)
                WHEN gdv.chu_ky = 'MOT_LAN' THEN NULL
                ELSE NULL
            END,
            huy_luc = NULL,
            ma_giao_dich = COALESCE($3, dkg.ma_giao_dich)
        FROM goi_dich_vu gdv
        WHERE dkg.id = $1
        AND gdv.id = dkg.goi_dich_vu_id
        AND dkg.trang_thai = 'CHO_THANH_TOAN'
        RETURNING dkg.id
    `, [id, batDauLuc, maGiaoDich], db);
    if (!result.rows[0]) { return null; }
    return getById(result.rows[0].id, db);
}

async function huyCacGoiDangSuDungKhac(nguoiDungId, excludeId, lyDo = null, db = null) {
    await thucThi(`
        UPDATE dang_ky_goi
        SET
            trang_thai = 'DA_HUY',
            huy_luc = NOW(),
            tu_dong_gia_han = FALSE,
            metadata = metadata || jsonb_build_object(
                'lyDoHuy',
                COALESCE($3::TEXT, 'Thay thế bởi gói dịch vụ khác')
            )
        WHERE nguoi_dung_id = $1
        AND id <> $2
        AND trang_thai IN ('HOAT_DONG', 'TAM_DUNG')
    `, [nguoiDungId, excludeId, lyDo], db);
}

async function tamDung(id, db = null) {
    const result = await thucThi(`
        UPDATE dang_ky_goi
        SET trang_thai = 'TAM_DUNG'
        WHERE id = $1
        AND trang_thai = 'HOAT_DONG'
        RETURNING id
    `, [id], db);
    if (!result.rows[0]) { return null; }
    return getById(result.rows[0].id, db);
}

async function tiepTuc(id, db = null) {
    const result = await thucThi(`
        UPDATE dang_ky_goi
        SET trang_thai = 'HOAT_DONG'
        WHERE id = $1
        AND trang_thai = 'TAM_DUNG'
        AND (het_han_luc IS NULL OR het_han_luc > NOW())
        RETURNING id
    `, [id], db);
    if (!result.rows[0]) { return null; }
    return getById(result.rows[0].id, db);
}

async function huy(id, lyDo = null, nguoiThucHienId = null, db = null) {
    const result = await thucThi(`
        UPDATE dang_ky_goi
        SET
            trang_thai = 'DA_HUY',
            huy_luc = NOW(),
            tu_dong_gia_han = FALSE,
            metadata = metadata || jsonb_build_object(
                'lyDoHuy',
                $2::TEXT,
                'nguoiHuyId',
                $3::INTEGER,
                'huyLuc',
                NOW()
            )
        WHERE id = $1
        AND trang_thai IN ('CHO_THANH_TOAN', 'HOAT_DONG', 'TAM_DUNG')
        RETURNING id
    `, [id, lyDo, nguoiThucHienId], db);
    if (!result.rows[0]) { return null; }
    return getById(result.rows[0].id, db);
}

async function dongBoHetHan(nguoiDungId = null, db = null) {
    const values = [];
    let condition = '';
    if (nguoiDungId !== null) {
        values.push(nguoiDungId);
        condition = `AND nguoi_dung_id = $${values.length}`;
    }
    const result = await thucThi(`
        UPDATE dang_ky_goi
        SET
            trang_thai = 'HET_HAN',
            tu_dong_gia_han = FALSE
        WHERE trang_thai IN ('HOAT_DONG', 'TAM_DUNG')
        AND het_han_luc IS NOT NULL
        AND het_han_luc <= NOW()
        ${condition}
        RETURNING id
    `, values, db);
    return result.rowCount;
}

module.exports = {
    getDanhSach,
    getById,
    getByIdForUpdate,
    getCuaNguoiDung,
    getHienTaiCuaNguoiDung,
    getDangMoCuaNguoiDungVaGoi,
    getGoiDichVuById,
    khoaNguoiDung,
    create,
    kichHoat,
    huyCacGoiDangSuDungKhac,
    tamDung,
    tiepTuc,
    huy,
    dongBoHetHan
};