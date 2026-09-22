'use strict';

const { layClient } = require('../../infrastructure/database/pool');

async function thucThi(sql, values = [], db = null) {
    if (db && typeof db.query === 'function') { return db.query(sql, values); }
    if (db && typeof db.truyVan === 'function') { return db.truyVan(sql, values); }
    const client = await layClient();
    try { return await client.query(sql, values); } finally { client.release(); }
}

function mapLichSu(row) {
    if (!row) { return null; }
    return {
        id: row.id,
        nguoiDungId: row.nguoi_dung_id,
        phienKhachId: row.phien_khach_id,
        congViecId: row.cong_viec_id,
        tepId: row.tep_id,
        phienBanTepId: row.phien_ban_tep_id,
        loaiSuKien: row.loai_su_kien,
        nguon: row.nguon,
        tieuDe: row.tieu_de,
        moTa: row.mo_ta,
        duLieu: row.du_lieu || {},
        hienThiChoNguoiDung: row.hien_thi_cho_nguoi_dung,
        createdAt: row.created_at,
        congViec: row.cong_viec_id ? {
            id: row.cong_viec_id,
            loaiCongViec: row.cong_viec_loai ?? null,
            trangThai: row.cong_viec_trang_thai ?? null
        } : null,
        tep: row.tep_id ? {
            id: row.tep_id,
            tenTep: row.tep_ten ?? null
        } : null,
        phienBanTep: row.phien_ban_tep_id ? {
            id: row.phien_ban_tep_id,
            tenTep: row.phien_ban_ten ?? null,
            soPhienBan: row.phien_ban_so ?? null,
            dinhDang: row.phien_ban_dinh_dang ?? null
        } : null
    };
}

function layChuSoHuu(chuThe, alias = 'ls') {
    if (chuThe?.nguoiDungId) { return { sql: `${alias}.nguoi_dung_id = $1 AND ${alias}.phien_khach_id IS NULL`, value: chuThe.nguoiDungId }; }
    if (chuThe?.phienKhachId) { return { sql: `${alias}.phien_khach_id = $1 AND ${alias}.nguoi_dung_id IS NULL`, value: chuThe.phienKhachId }; }
    throw new TypeError('Chủ sở hữu lịch sử không hợp lệ.');
}

function selectCoBan() {
    return `
        SELECT
            ls.*,
            cv.loai_cong_viec AS cong_viec_loai,
            cv.trang_thai AS cong_viec_trang_thai,
            t.ten_tep AS tep_ten,
            pb.ten_tep AS phien_ban_ten,
            pb.so_phien_ban AS phien_ban_so,
            pb.dinh_dang AS phien_ban_dinh_dang
        FROM lich_su ls
        LEFT JOIN cong_viec cv ON cv.id = ls.cong_viec_id
        LEFT JOIN tep t ON t.id = ls.tep_id
        LEFT JOIN phien_ban_tep pb ON pb.id = ls.phien_ban_tep_id
    `;
}

function taoDieuKien(chuThe, filters = {}) {
    const chuSoHuu = layChuSoHuu(chuThe);
    const values = [chuSoHuu.value];
    const conditions = [chuSoHuu.sql, 'ls.hien_thi_cho_nguoi_dung = TRUE'];
    if (filters.loaiSuKien) { values.push(filters.loaiSuKien); conditions.push(`ls.loai_su_kien = $${values.length}`); }
    if (filters.nguon) { values.push(filters.nguon); conditions.push(`ls.nguon = $${values.length}`); }
    if (filters.congViecId) { values.push(filters.congViecId); conditions.push(`ls.cong_viec_id = $${values.length}`); }
    if (filters.tepId) { values.push(filters.tepId); conditions.push(`ls.tep_id = $${values.length}`); }
    if (filters.phienBanTepId) { values.push(filters.phienBanTepId); conditions.push(`ls.phien_ban_tep_id = $${values.length}`); }
    if (filters.tuKhoa) {
        values.push(`%${filters.tuKhoa}%`);
        conditions.push(`(
            ls.tieu_de ILIKE $${values.length}
            OR COALESCE(ls.mo_ta, '') ILIKE $${values.length}
            OR ls.loai_su_kien ILIKE $${values.length}
            OR ls.nguon ILIKE $${values.length}
            OR COALESCE(t.ten_tep, '') ILIKE $${values.length}
            OR COALESCE(pb.ten_tep, '') ILIKE $${values.length}
        )`);
    }
    if (filters.tuNgay) { values.push(filters.tuNgay); conditions.push(`ls.created_at >= $${values.length}`); }
    if (filters.denNgay) { values.push(filters.denNgay); conditions.push(`ls.created_at <= $${values.length}`); }
    return { values, conditions };
}

async function tao(data, db = null) {
    const result = await thucThi(`
        INSERT INTO lich_su (
            nguoi_dung_id,
            phien_khach_id,
            cong_viec_id,
            tep_id,
            phien_ban_tep_id,
            loai_su_kien,
            nguon,
            tieu_de,
            mo_ta,
            du_lieu,
            hien_thi_cho_nguoi_dung
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::JSONB,$11)
        RETURNING *
    `, [
        data.nguoiDungId || null,
        data.phienKhachId || null,
        data.congViecId || null,
        data.tepId || null,
        data.phienBanTepId || null,
        data.loaiSuKien,
        data.nguon,
        data.tieuDe,
        data.moTa || null,
        JSON.stringify(data.duLieu || {}),
        data.hienThiChoNguoiDung !== false
    ], db);
    return mapLichSu(result.rows[0]);
}

async function getDanhSach(chuThe, filters = {}, db = null) {
    const { values, conditions } = taoDieuKien(chuThe, filters);
    values.push(filters.gioiHan);
    const limitIndex = values.length;
    values.push(filters.offset);
    const offsetIndex = values.length;
    const result = await thucThi(`
        ${selectCoBan()}
        WHERE ${conditions.join('\n        AND ')}
        ORDER BY ls.created_at DESC, ls.id DESC
        LIMIT $${limitIndex}
        OFFSET $${offsetIndex}
    `, values, db);
    return result.rows.map(mapLichSu);
}

async function demDanhSach(chuThe, filters = {}, db = null) {
    const { values, conditions } = taoDieuKien(chuThe, filters);
    const result = await thucThi(`
        SELECT COUNT(*)::INTEGER AS tong_so
        FROM lich_su ls
        LEFT JOIN tep t ON t.id = ls.tep_id
        LEFT JOIN phien_ban_tep pb ON pb.id = ls.phien_ban_tep_id
        WHERE ${conditions.join('\n        AND ')}
    `, values, db);
    return Number(result.rows[0]?.tong_so || 0);
}

async function getChiTiet(id, chuThe, db = null) {
    const chuSoHuu = layChuSoHuu(chuThe);
    const result = await thucThi(`
        ${selectCoBan()}
        WHERE ${chuSoHuu.sql}
        AND ls.id = $2
        AND ls.hien_thi_cho_nguoi_dung = TRUE
        LIMIT 1
    `, [chuSoHuu.value, id], db);
    return mapLichSu(result.rows[0]);
}

module.exports = {
    tao,
    getDanhSach,
    demDanhSach,
    getChiTiet
};