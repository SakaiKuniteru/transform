'use strict';

const { layClient } = require('../../infrastructure/database/pool');

async function thucThi(sql, values = [], db = null) {
    if (db && typeof db.query === 'function') { return db.query(sql, values); }
    const client = await layClient();
    try { return await client.query(sql, values); } finally { client.release(); }
}

function mapChuyenDoi(row) {
    if (!row) { return null; }
    return {
        id: row.id,
        congViecId: row.cong_viec_id,
        buocCongViecId: row.buoc_cong_viec_id,
        thuTu: row.thu_tu,
        lanThu: row.lan_thu,
        phienBanNguonId: row.phien_ban_nguon_id,
        phienBanKetQuaId: row.phien_ban_ket_qua_id,
        dinhDangNguon: row.dinh_dang_nguon,
        dinhDangDich: row.dinh_dang_dich,
        converterKey: row.converter_key,
        engine: row.engine,
        phienBanEngine: row.phien_ban_engine,
        trangThai: row.trang_thai,
        tuyChon: row.tuy_chon || {},
        metadata: row.metadata || {},
        thongKe: row.thong_ke || {},
        maLoi: row.ma_loi,
        thongBaoLoi: row.thong_bao_loi,
        chiTietLoi: row.chi_tiet_loi,
        batDauLuc: row.bat_dau_luc,
        hoanThanhLuc: row.hoan_thanh_luc,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

async function tao(data, db = null) {
    const result = await thucThi(`
        INSERT INTO chuyen_doi (
            cong_viec_id,
            buoc_cong_viec_id,
            thu_tu,
            lan_thu,
            phien_ban_nguon_id,
            phien_ban_ket_qua_id,
            dinh_dang_nguon,
            dinh_dang_dich,
            converter_key,
            engine,
            phien_ban_engine,
            trang_thai,
            tuy_chon,
            metadata,
            thong_ke
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
        ON CONFLICT (cong_viec_id, thu_tu, lan_thu) DO NOTHING
        RETURNING *
    `, [
        data.congViecId,
        data.buocCongViecId || null,
        data.thuTu,
        data.lanThu,
        data.phienBanNguonId || null,
        data.phienBanKetQuaId || null,
        data.dinhDangNguon,
        data.dinhDangDich,
        data.converterKey,
        data.engine || null,
        data.phienBanEngine || null,
        data.trangThai || 'CHO_XU_LY',
        data.tuyChon || {},
        data.metadata || {},
        data.thongKe || {}
    ], db);
    return mapChuyenDoi(result.rows[0]);
}

async function getTheoId(id, db = null) {
    const result = await thucThi(`SELECT * FROM chuyen_doi WHERE id = $1 LIMIT 1`, [id], db);
    return mapChuyenDoi(result.rows[0]);
}

async function getTheoLan(congViecId, thuTu, lanThu, db = null) {
    const result = await thucThi(`SELECT * FROM chuyen_doi WHERE cong_viec_id = $1 AND thu_tu = $2 AND lan_thu = $3 LIMIT 1`, [congViecId, thuTu, lanThu], db);
    return mapChuyenDoi(result.rows[0]);
}

async function getTheoLanXuLy(congViecId, lanThu, db = null) {
    const result = await thucThi(`SELECT * FROM chuyen_doi WHERE cong_viec_id = $1 AND lan_thu = $2 ORDER BY thu_tu ASC, id ASC`, [congViecId, lanThu], db);
    return result.rows.map(mapChuyenDoi);
}

async function getTheoCongViec(congViecId, db = null) {
    const result = await thucThi(`SELECT * FROM chuyen_doi WHERE cong_viec_id = $1 ORDER BY lan_thu ASC, thu_tu ASC, id ASC`, [congViecId], db);
    return result.rows.map(mapChuyenDoi);
}

async function batDau(id, data = {}, db = null) {
    const result = await thucThi(`
        UPDATE chuyen_doi
        SET
            trang_thai = 'DANG_XU_LY',
            engine = COALESCE($2, engine),
            phien_ban_engine = COALESCE($3, phien_ban_engine),
            metadata = COALESCE($4::JSONB, metadata),
            ma_loi = NULL,
            thong_bao_loi = NULL,
            chi_tiet_loi = NULL,
            bat_dau_luc = COALESCE(bat_dau_luc, NOW()),
            hoan_thanh_luc = NULL
        WHERE id = $1
        AND trang_thai IN ('CHO_XU_LY','DANG_XU_LY')
        RETURNING *
    `, [id, data.engine || null, data.phienBanEngine || null, data.metadata === undefined ? null : JSON.stringify(data.metadata)], db);
    return mapChuyenDoi(result.rows[0]);
}

async function hoanThanh(id, data = {}, db = null) {
    const result = await thucThi(`
        UPDATE chuyen_doi
        SET
            trang_thai = 'HOAN_THANH',
            phien_ban_ket_qua_id = COALESCE($2, phien_ban_ket_qua_id),
            engine = COALESCE($3, engine),
            phien_ban_engine = COALESCE($4, phien_ban_engine),
            metadata = COALESCE($5::JSONB, metadata),
            thong_ke = COALESCE($6::JSONB, thong_ke),
            ma_loi = NULL,
            thong_bao_loi = NULL,
            chi_tiet_loi = NULL,
            hoan_thanh_luc = NOW()
        WHERE id = $1
        AND trang_thai IN ('CHO_XU_LY','DANG_XU_LY')
        RETURNING *
    `, [
        id,
        data.phienBanKetQuaId || null,
        data.engine || null,
        data.phienBanEngine || null,
        data.metadata === undefined ? null : JSON.stringify(data.metadata),
        data.thongKe === undefined ? null : JSON.stringify(data.thongKe)
    ], db);
    return mapChuyenDoi(result.rows[0]);
}

async function thatBai(id, data = {}, db = null) {
    const result = await thucThi(`
        UPDATE chuyen_doi
        SET
            trang_thai = 'THAT_BAI',
            ma_loi = $2,
            thong_bao_loi = $3,
            chi_tiet_loi = $4::JSONB,
            metadata = COALESCE($5::JSONB, metadata),
            thong_ke = COALESCE($6::JSONB, thong_ke),
            hoan_thanh_luc = NOW()
        WHERE id = $1
        AND trang_thai IN ('CHO_XU_LY','DANG_XU_LY')
        RETURNING *
    `, [
        id,
        data.maLoi || null,
        data.thongBaoLoi || null,
        data.chiTietLoi === undefined ? null : JSON.stringify(data.chiTietLoi),
        data.metadata === undefined ? null : JSON.stringify(data.metadata),
        data.thongKe === undefined ? null : JSON.stringify(data.thongKe)
    ], db);
    return mapChuyenDoi(result.rows[0]);
}

async function huy(id, db = null) {
    const result = await thucThi(`
        UPDATE chuyen_doi
        SET trang_thai = 'DA_HUY', hoan_thanh_luc = NOW()
        WHERE id = $1
        AND trang_thai IN ('CHO_XU_LY','DANG_XU_LY')
        RETURNING *
    `, [id], db);
    return mapChuyenDoi(result.rows[0]);
}

module.exports = {
    tao,
    getTheoId,
    getTheoLan,
    getTheoLanXuLy,
    getTheoCongViec,
    batDau,
    hoanThanh,
    thatBai,
    huy
};