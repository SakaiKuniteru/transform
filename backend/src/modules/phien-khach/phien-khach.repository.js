'use strict';

const { layClient } = require('../../infrastructure/database/pool');

async function thucThi(sql, values = [], db = null) {
    if (db && typeof db.query === 'function') { return db.query(sql, values); }
    const client = await layClient();
    try {
        return await client.query(sql, values);
    } finally { client.release(); }
}

function mapPhienKhach(row) {
    if (!row) { return null; }
    return {
        id: row.id,
        trangThai: row.trang_thai,
        diaChiIpDau: row.dia_chi_ip_dau,
        diaChiIpCuoi: row.dia_chi_ip_cuoi,
        userAgentHash: row.user_agent_hash,
        lanSuDungCuoiLuc: row.lan_su_dung_cuoi_luc,
        hetHanLuc: row.het_han_luc,
        metadata: row.metadata || {},
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

async function timVaCham(tokenHash, data = {}, db = null) {
    const result = await thucThi(`
        UPDATE phien_khach
        SET
            dia_chi_ip_cuoi = COALESCE($2::INET, dia_chi_ip_cuoi),
            lan_su_dung_cuoi_luc = NOW(),
            het_han_luc = $3
        WHERE token_hash = $1
        AND trang_thai = 'HOAT_DONG'
        AND (
            het_han_luc IS NULL
            OR het_han_luc > NOW()
        )
        RETURNING *
    `, [
        tokenHash,
        data.diaChiIp || null,
        data.hetHanLuc
    ], db);
    return mapPhienKhach(result.rows[0]);
}

async function tao(data, db = null) {
    const result = await thucThi(`
        INSERT INTO phien_khach (
            token_hash,
            trang_thai,
            dia_chi_ip_dau,
            dia_chi_ip_cuoi,
            user_agent_hash,
            lan_su_dung_cuoi_luc,
            het_han_luc,
            metadata
        )
        VALUES (
            $1,
            'HOAT_DONG',
            $2,
            $2,
            $3,
            NOW(),
            $4,
            $5
        )
        RETURNING *
    `, [
        data.tokenHash,
        data.diaChiIp || null,
        data.userAgentHash || null,
        data.hetHanLuc,
        data.metadata || {}
    ], db);
    return mapPhienKhach(result.rows[0]);
}

module.exports = {
    timVaCham,
    tao
};