'use strict';

const { layClient } = require('../../infrastructure/database/pool');

async function thucThi(sql, values = [], db = null) {
    if (db && typeof db.query === 'function') { return db.query(sql, values); }
    const client = await layClient();
    try {
        return await client.query(sql, values);
    } finally { client.release(); }
}

function mapPhienBan(row, prefix = '') {
    const get = (ten) => row[`${prefix}${ten}`];
    if (!get('id')) { return null; }
    return {
        id: get('id'),
        tepId: get('tep_id'),
        phienBanChaId: get('phien_ban_cha_id'),
        congViecTaoId: get('cong_viec_tao_id'),
        soPhienBan: get('so_phien_ban'),
        loaiPhienBan: get('loai_phien_ban'),
        tenTep: get('ten_tep'),
        phanMoRong: get('phan_mo_rong'),
        dinhDang: get('dinh_dang'),
        mimeType: get('mime_type'),
        kichThuocBytes: Number(get('kich_thuoc_bytes') || 0),
        hashSha256: get('hash_sha256'),
        storageDriver: get('storage_driver'),
        storageBucket: get('storage_bucket'),
        storageKey: get('storage_key'),
        storageEtag: get('storage_etag'),
        metadata: get('metadata') || {},
        trangThai: get('trang_thai'),
        hetHanLuc: get('het_han_luc'),
        xoaLuc: get('xoa_luc'),
        createdAt: get('created_at'),
        updatedAt: get('updated_at')
    };
}

function mapTep(row) {
    if (!row) { return null; }
    return {
        id: row.id,
        nguoiDungId: row.nguoi_dung_id,
        phienKhachId: row.phien_khach_id,
        tenTep: row.ten_tep,
        moTa: row.mo_ta,
        nguonTao: row.nguon_tao,
        trangThai: row.trang_thai,
        thuocTinh: row.thuoc_tinh || {},
        hetHanLuc: row.het_han_luc,
        xoaLuc: row.xoa_luc,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        phienBanHienTai: mapPhienBan(row, 'pb_')
    };
}

function layChuSoHuu(chuThe, alias = 't') {
    if (chuThe?.nguoiDungId) {
        return {
            sql: `${alias}.nguoi_dung_id = $1 AND ${alias}.phien_khach_id IS NULL`,
            value: chuThe.nguoiDungId
        };
    }
    if (chuThe?.phienKhachId) {
        return {
            sql: `${alias}.phien_khach_id = $1 AND ${alias}.nguoi_dung_id IS NULL`,
            value: chuThe.phienKhachId
        };
    }
    throw new TypeError('Chủ sở hữu tệp không hợp lệ.');
}

function selectCoBan() {
    return `
        SELECT
            t.id,
            t.nguoi_dung_id,
            t.phien_khach_id,
            t.ten_tep,
            t.mo_ta,
            t.nguon_tao,
            t.trang_thai,
            t.thuoc_tinh,
            t.het_han_luc,
            t.xoa_luc,
            t.created_at,
            t.updated_at,
            pb.id AS pb_id,
            pb.tep_id AS pb_tep_id,
            pb.phien_ban_cha_id AS pb_phien_ban_cha_id,
            pb.cong_viec_tao_id AS pb_cong_viec_tao_id,
            pb.so_phien_ban AS pb_so_phien_ban,
            pb.loai_phien_ban AS pb_loai_phien_ban,
            pb.ten_tep AS pb_ten_tep,
            pb.phan_mo_rong AS pb_phan_mo_rong,
            pb.dinh_dang AS pb_dinh_dang,
            pb.mime_type AS pb_mime_type,
            pb.kich_thuoc_bytes AS pb_kich_thuoc_bytes,
            pb.hash_sha256 AS pb_hash_sha256,
            pb.storage_driver AS pb_storage_driver,
            pb.storage_bucket AS pb_storage_bucket,
            pb.storage_key AS pb_storage_key,
            pb.storage_etag AS pb_storage_etag,
            pb.metadata AS pb_metadata,
            pb.trang_thai AS pb_trang_thai,
            pb.het_han_luc AS pb_het_han_luc,
            pb.xoa_luc AS pb_xoa_luc,
            pb.created_at AS pb_created_at,
            pb.updated_at AS pb_updated_at
        FROM tep t
        LEFT JOIN LATERAL (
            SELECT *
            FROM phien_ban_tep x
            WHERE x.tep_id = t.id
            AND x.xoa_luc IS NULL
            AND x.trang_thai <> 'DA_XOA'
            ORDER BY x.so_phien_ban DESC
            LIMIT 1
        ) pb ON TRUE
    `;
}

async function taoTep(data, db) {
    const result = await thucThi(`
        INSERT INTO tep (
            nguoi_dung_id,
            phien_khach_id,
            ten_tep,
            mo_ta,
            nguon_tao,
            trang_thai,
            thuoc_tinh,
            het_han_luc
        )
        VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8
        )
        RETURNING *
    `, [
        data.nguoiDungId || null,
        data.phienKhachId || null,
        data.tenTep,
        data.moTa || null,
        data.nguonTao || 'UPLOAD',
        data.trangThai || 'HOAT_DONG',
        data.thuocTinh || {},
        data.hetHanLuc || null
    ], db);
    return mapTep(result.rows[0]);
}

async function taoPhienBan(data, db) {
    const result = await thucThi(`
        INSERT INTO phien_ban_tep (
            tep_id,
            phien_ban_cha_id,
            cong_viec_tao_id,
            so_phien_ban,
            loai_phien_ban,
            ten_tep,
            phan_mo_rong,
            dinh_dang,
            mime_type,
            kich_thuoc_bytes,
            hash_sha256,
            storage_driver,
            storage_bucket,
            storage_key,
            storage_etag,
            metadata,
            trang_thai,
            het_han_luc
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
            $17,
            $18
        )
        RETURNING *
    `, [
        data.tepId,
        data.phienBanChaId || null,
        data.congViecTaoId || null,
        data.soPhienBan,
        data.loaiPhienBan || 'GOC',
        data.tenTep,
        data.phanMoRong || null,
        data.dinhDang || null,
        data.mimeType || null,
        data.kichThuocBytes || 0,
        data.hashSha256 || null,
        data.storageDriver,
        data.storageBucket || null,
        data.storageKey,
        data.storageEtag || null,
        data.metadata || {},
        data.trangThai || 'SAN_SANG',
        data.hetHanLuc || null
    ], db);
    return mapPhienBan(result.rows[0]);
}

async function getChiTiet(id, chuThe, db = null) {
    const chuSoHuu = layChuSoHuu(chuThe);
    const result = await thucThi(`
        ${selectCoBan()}
        WHERE t.id = $2
        AND ${chuSoHuu.sql}
        AND t.xoa_luc IS NULL
        AND t.trang_thai <> 'DA_XOA'
        LIMIT 1
    `, [
        chuSoHuu.value,
        id
    ], db);
    return mapTep(result.rows[0]);
}

async function getDanhSach(chuThe, filters = {}, db = null) {
    const chuSoHuu = layChuSoHuu(chuThe);
    const values = [chuSoHuu.value];
    const conditions = [
        chuSoHuu.sql,
        't.xoa_luc IS NULL',
        `t.trang_thai <> 'DA_XOA'`
    ];
    if (filters.trangThai) {
        values.push(filters.trangThai);
        conditions.push(`t.trang_thai = $${values.length}`);
    }
    if (filters.tuKhoa) {
        values.push(`%${filters.tuKhoa}%`);
        conditions.push(`t.ten_tep ILIKE $${values.length}`);
    }
    values.push(filters.gioiHan);
    const limitIndex = values.length;
    values.push(filters.offset);
    const offsetIndex = values.length;
    const result = await thucThi(`
        ${selectCoBan()}
        WHERE ${conditions.join('\n        AND ')}
        ORDER BY t.created_at DESC, t.id DESC
        LIMIT $${limitIndex}
        OFFSET $${offsetIndex}
    `, values, db);
    return result.rows.map(mapTep);
}

async function demDanhSach(chuThe, filters = {}, db = null) {
    const chuSoHuu = layChuSoHuu(chuThe);
    const values = [chuSoHuu.value];
    const conditions = [
        chuSoHuu.sql,
        't.xoa_luc IS NULL',
        `t.trang_thai <> 'DA_XOA'`
    ];
    if (filters.trangThai) {
        values.push(filters.trangThai);
        conditions.push(`t.trang_thai = $${values.length}`);
    }
    if (filters.tuKhoa) {
        values.push(`%${filters.tuKhoa}%`);
        conditions.push(`t.ten_tep ILIKE $${values.length}`);
    }
    const result = await thucThi(`
        SELECT COUNT(*)::INTEGER AS tong_so
        FROM tep t
        WHERE ${conditions.join('\n        AND ')}
    `, values, db);
    return Number(result.rows[0]?.tong_so || 0);
}

async function capNhat(id, chuThe, data, db = null) {
    const chuSoHuu = layChuSoHuu(chuThe);
    const result = await thucThi(`
        UPDATE tep
        SET
            ten_tep = COALESCE($3, ten_tep),
            mo_ta = CASE WHEN $4::BOOLEAN THEN $5 ELSE mo_ta END,
            thuoc_tinh = COALESCE($6::JSONB, thuoc_tinh)
        WHERE id = $2
        AND ${chuSoHuu.sql}
        AND xoa_luc IS NULL
        AND trang_thai <> 'DA_XOA'
        RETURNING *
    `, [
        chuSoHuu.value,
        id,
        data.tenTep ?? null,
        data.coMoTa === true,
        data.moTa ?? null,
        data.thuocTinh === undefined ? null : JSON.stringify(data.thuocTinh)
    ], db);
    return result.rows[0] || null;
}

async function getDanhSachStorageKey(id, chuThe, db = null) {
    const chuSoHuu = layChuSoHuu(chuThe);
    const result = await thucThi(`
        SELECT
            pb.id,
            pb.storage_driver,
            pb.storage_bucket,
            pb.storage_key
        FROM phien_ban_tep pb
        INNER JOIN tep t ON t.id = pb.tep_id
        WHERE t.id = $2
        AND ${chuSoHuu.sql}
        AND t.xoa_luc IS NULL
        AND pb.xoa_luc IS NULL
        ORDER BY pb.id
    `, [
        chuSoHuu.value,
        id
    ], db);
    return result.rows.map((row) => ({
        id: row.id,
        storageDriver: row.storage_driver,
        storageBucket: row.storage_bucket,
        storageKey: row.storage_key
    }));
}

async function xoaMem(id, chuThe, db) {
    const chuSoHuu = layChuSoHuu(chuThe);
    const tepResult = await thucThi(`
        UPDATE tep
        SET
            trang_thai = 'DA_XOA',
            xoa_luc = NOW()
        WHERE id = $2
        AND ${chuSoHuu.sql}
        AND xoa_luc IS NULL
        RETURNING id
    `, [
        chuSoHuu.value,
        id
    ], db);
    if (tepResult.rowCount === 0) { return false; }
    await thucThi(`
        UPDATE phien_ban_tep
        SET
            trang_thai = 'DA_XOA',
            xoa_luc = NOW()
        WHERE tep_id = $1
        AND xoa_luc IS NULL
    `, [id], db);
    return true;
}

async function getChiTietQuanTri(id, db = null) {
    const result = await thucThi(`
        ${selectCoBan()}
        WHERE t.id = $1
        LIMIT 1
    `, [id], db);
    return mapTep(result.rows[0]);
}

function taoDieuKienQuanTri(filters = {}) {
    const values = [];
    const conditions = [];
    if (filters.trangThai) {
        values.push(filters.trangThai);
        conditions.push(`t.trang_thai = $${values.length}`);
    } else {
        conditions.push(`t.trang_thai <> 'DA_XOA'`);
        conditions.push('t.xoa_luc IS NULL');
    }
    if (filters.nguoiDungId) {
        values.push(filters.nguoiDungId);
        conditions.push(`t.nguoi_dung_id = $${values.length}`);
    }
    if (filters.dinhDang) {
        values.push(filters.dinhDang);
        conditions.push(`LOWER(COALESCE(pb.dinh_dang, pb.phan_mo_rong, '')) = LOWER($${values.length})`);
    }
    if (filters.tuKhoa) {
        values.push(`%${filters.tuKhoa}%`);
        conditions.push(`(
            t.id::TEXT ILIKE $${values.length}
            OR t.ten_tep ILIKE $${values.length}
            OR COALESCE(pb.ten_tep, '') ILIKE $${values.length}
            OR COALESCE(pb.dinh_dang, '') ILIKE $${values.length}
        )`);
    }
    if (filters.tuNgay) {
        values.push(filters.tuNgay);
        conditions.push(`t.created_at >= $${values.length}`);
    }
    if (filters.denNgay) {
        values.push(filters.denNgay);
        conditions.push(`t.created_at <= $${values.length}`);
    }
    return { values, conditions };
}

async function getDanhSachQuanTri(filters = {}, db = null) {
    const { values, conditions } = taoDieuKienQuanTri(filters);
    values.push(filters.pageSize);
    const limitIndex = values.length;
    values.push(filters.offset);
    const offsetIndex = values.length;
    const result = await thucThi(`
        ${selectCoBan()}
        WHERE ${conditions.length ? conditions.join('\n        AND ') : 'TRUE'}
        ORDER BY t.created_at DESC, t.id DESC
        LIMIT $${limitIndex}
        OFFSET $${offsetIndex}
    `, values, db);
    return result.rows.map(mapTep);
}

async function demDanhSachQuanTri(filters = {}, db = null) {
    const { values, conditions } = taoDieuKienQuanTri(filters);
    const result = await thucThi(`
        SELECT COUNT(*)::INTEGER AS tong_so
        FROM tep t
        LEFT JOIN LATERAL (
            SELECT *
            FROM phien_ban_tep x
            WHERE x.tep_id = t.id
            AND x.xoa_luc IS NULL
            AND x.trang_thai <> 'DA_XOA'
            ORDER BY x.so_phien_ban DESC
            LIMIT 1
        ) pb ON TRUE
        WHERE ${conditions.length ? conditions.join('\n        AND ') : 'TRUE'}
    `, values, db);
    return Number(result.rows[0]?.tong_so || 0);
}

async function getDanhSachStorageKeyQuanTri(id, db = null) {
    const result = await thucThi(`
        SELECT
            pb.id,
            pb.storage_driver,
            pb.storage_bucket,
            pb.storage_key
        FROM phien_ban_tep pb
        INNER JOIN tep t ON t.id = pb.tep_id
        WHERE t.id = $1
        AND t.xoa_luc IS NULL
        AND pb.xoa_luc IS NULL
        ORDER BY pb.id
    `, [id], db);
    return result.rows.map((row) => ({
        id: row.id,
        storageDriver: row.storage_driver,
        storageBucket: row.storage_bucket,
        storageKey: row.storage_key
    }));
}

async function xoaMemQuanTri(id, db) {
    const tepResult = await thucThi(`
        UPDATE tep
        SET
            trang_thai = 'DA_XOA',
            xoa_luc = NOW()
        WHERE id = $1
        AND xoa_luc IS NULL
        RETURNING id
    `, [id], db);
    if (tepResult.rowCount === 0) { return false; }
    await thucThi(`
        UPDATE phien_ban_tep
        SET
            trang_thai = 'DA_XOA',
            xoa_luc = NOW()
        WHERE tep_id = $1
        AND xoa_luc IS NULL
    `, [id], db);
    return true;
}

module.exports = {
    taoTep,
    taoPhienBan,
    getChiTiet,
    getDanhSach,
    demDanhSach,
    capNhat,
    getDanhSachStorageKey,
    xoaMem,
    getChiTietQuanTri,
    getDanhSachQuanTri,
    demDanhSachQuanTri,
    getDanhSachStorageKeyQuanTri,
    xoaMemQuanTri
};