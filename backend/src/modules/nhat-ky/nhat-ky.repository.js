'use strict';

const { layClient } = require('../../infrastructure/database/pool');

async function thucThi(sql, values = [], db = null) {
    if (db && typeof db.query === 'function') { return db.query(sql, values); }
    if (db && typeof db.truyVan === 'function') { return db.truyVan(sql, values); }
    const client = await layClient();
    try { return await client.query(sql, values); } finally { client.release(); }
}

function mapNhatKy(row) {
    if (!row) { return null; }
    return {
        id: row.id,
        mucDo: row.muc_do,
        nguon: row.nguon,
        maSuKien: row.ma_su_kien,
        requestId: row.request_id,
        traceId: row.trace_id,
        nguoiDungId: row.nguoi_dung_id,
        phienKhachId: row.phien_khach_id,
        congViecId: row.cong_viec_id,
        buocCongViecId: row.buoc_cong_viec_id,
        tepId: row.tep_id,
        phuongThucHttp: row.phuong_thuc_http,
        duongDanHttp: row.duong_dan_http,
        httpStatus: row.http_status,
        diaChiIp: row.dia_chi_ip,
        userAgent: row.user_agent,
        thongDiep: row.thong_diep,
        duLieu: row.du_lieu || {},
        stackTrace: row.stack_trace,
        hetHanLuc: row.het_han_luc,
        createdAt: row.created_at
    };
}

async function ghi(data, db = null) {
    const result = await thucThi(`
        INSERT INTO nhat_ky (
            muc_do,
            nguon,
            ma_su_kien,
            request_id,
            trace_id,
            nguoi_dung_id,
            phien_khach_id,
            cong_viec_id,
            buoc_cong_viec_id,
            tep_id,
            phuong_thuc_http,
            duong_dan_http,
            http_status,
            dia_chi_ip,
            user_agent,
            thong_diep,
            du_lieu,
            stack_trace,
            het_han_luc
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::INET,$15,$16,$17::JSONB,$18,$19)
        RETURNING *
    `, [
        data.mucDo,
        data.nguon,
        data.maSuKien || null,
        data.requestId || null,
        data.traceId || null,
        data.nguoiDungId || null,
        data.phienKhachId || null,
        data.congViecId || null,
        data.buocCongViecId || null,
        data.tepId || null,
        data.phuongThucHttp || null,
        data.duongDanHttp || null,
        data.httpStatus || null,
        data.diaChiIp || null,
        data.userAgent || null,
        data.thongDiep,
        JSON.stringify(data.duLieu || {}),
        data.stackTrace || null,
        data.hetHanLuc || null
    ], db);
    return mapNhatKy(result.rows[0]);
}

async function getTheoId(id, db = null) {
    const result = await thucThi(`SELECT * FROM nhat_ky WHERE id = $1 LIMIT 1`, [id], db);
    return mapNhatKy(result.rows[0]);
}

async function getTheoRequestId(requestId, gioiHan = 100, db = null) {
    const result = await thucThi(`SELECT * FROM nhat_ky WHERE request_id = $1 ORDER BY created_at ASC, id ASC LIMIT $2`, [requestId, gioiHan], db);
    return result.rows.map(mapNhatKy);
}

async function getTheoTraceId(traceId, gioiHan = 100, db = null) {
    const result = await thucThi(`SELECT * FROM nhat_ky WHERE trace_id = $1 ORDER BY created_at ASC, id ASC LIMIT $2`, [traceId, gioiHan], db);
    return result.rows.map(mapNhatKy);
}

async function getTheoCongViec(congViecId, gioiHan = 500, db = null) {
    const result = await thucThi(`SELECT * FROM nhat_ky WHERE cong_viec_id = $1 ORDER BY created_at ASC, id ASC LIMIT $2`, [congViecId, gioiHan], db);
    return result.rows.map(mapNhatKy);
}

async function xoaHetHan(gioiHan = 5000, db = null) {
    const result = await thucThi(`
        DELETE FROM nhat_ky
        WHERE id IN (
            SELECT id
            FROM nhat_ky
            WHERE het_han_luc IS NOT NULL
            AND het_han_luc <= NOW()
            ORDER BY het_han_luc ASC, id ASC
            LIMIT $1
        )
        RETURNING id
    `, [gioiHan], db);
    return result.rowCount;
}

module.exports = {
    ghi,
    getTheoId,
    getTheoRequestId,
    getTheoTraceId,
    getTheoCongViec,
    xoaHetHan
};