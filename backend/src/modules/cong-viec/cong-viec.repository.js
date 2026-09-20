'use strict';

const { layClient } = require('../../infrastructure/database/pool');

async function thucThi(sql, values = [], db = null) {
    if (db && typeof db.query === 'function') { return db.query(sql, values); }
    const client = await layClient();
    try {
        return await client.query(sql, values);
    } finally { client.release(); }
}

function mapBuoc(row) {
    if (!row) { return null; }
    return {
        id: row.id,
        congViecId: row.cong_viec_id,
        thuTu: row.thu_tu,
        maBuoc: row.ma_buoc,
        tenBuoc: row.ten_buoc,
        loaiBuoc: row.loai_buoc,
        trangThai: row.trang_thai,
        tienTrinh: Number(row.tien_trinh || 0),
        batBuoc: row.bat_buoc,
        queueName: row.queue_name,
        queueJobId: row.queue_job_id,
        boXuLy: row.bo_xu_ly,
        congCu: row.cong_cu,
        phienBanCongCu: row.phien_ban_cong_cu,
        dauVao: row.dau_vao || {},
        tuyChon: row.tuy_chon || {},
        dauRa: row.dau_ra || {},
        thongKe: row.thong_ke || {},
        soLanThu: row.so_lan_thu,
        soLanThuToiDa: row.so_lan_thu_toi_da,
        maLoi: row.ma_loi,
        thongBaoLoi: row.thong_bao_loi,
        chiTietLoi: row.chi_tiet_loi,
        batDauLuc: row.bat_dau_luc,
        hoanThanhLuc: row.hoan_thanh_luc,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

function mapCongViec(row) {
    if (!row) { return null; }
    return {
        id: row.id,
        nguoiDungId: row.nguoi_dung_id,
        phienKhachId: row.phien_khach_id,
        requestId: row.request_id,
        khoaIdempotency: row.khoa_idempotency,
        loaiCongViec: row.loai_cong_viec,
        trangThai: row.trang_thai,
        mucDoUuTien: row.muc_do_uu_tien,
        tienTrinh: Number(row.tien_trinh || 0),
        buocHienTai: row.buoc_hien_tai,
        tepNguonId: row.tep_nguon_id,
        phienBanNguonId: row.phien_ban_nguon_id,
        tepKetQuaId: row.tep_ket_qua_id,
        phienBanKetQuaId: row.phien_ban_ket_qua_id,
        dinhDangNguon: row.dinh_dang_nguon,
        dinhDangDich: row.dinh_dang_dich,
        dauVao: row.dau_vao || {},
        tuyChon: row.tuy_chon || {},
        dauRa: row.dau_ra || {},
        queueName: row.queue_name,
        queueJobId: row.queue_job_id,
        soLanThu: row.so_lan_thu,
        soLanThuToiDa: row.so_lan_thu_toi_da,
        maLoi: row.ma_loi,
        thongBaoLoi: row.thong_bao_loi,
        chiTietLoi: row.chi_tiet_loi,
        xepHangLuc: row.xep_hang_luc,
        batDauLuc: row.bat_dau_luc,
        hoanThanhLuc: row.hoan_thanh_luc,
        huyLuc: row.huy_luc,
        hetHanLuc: row.het_han_luc,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        tepNguon: row.tep_nguon_ten
            ? {
                id: row.tep_nguon_id,
                tenTep: row.tep_nguon_ten
            }
            : null,
        phienBanNguon: row.phien_ban_nguon_id
            ? {
                id: row.phien_ban_nguon_id,
                tenTep: row.phien_ban_nguon_ten,
                dinhDang: row.phien_ban_nguon_dinh_dang,
                mimeType: row.phien_ban_nguon_mime_type,
                kichThuocBytes: Number(row.phien_ban_nguon_kich_thuoc_bytes || 0)
            }
            : null,
        tepKetQua: row.tep_ket_qua_ten
            ? {
                id: row.tep_ket_qua_id,
                tenTep: row.tep_ket_qua_ten
            }
            : null,
        phienBanKetQua: row.phien_ban_ket_qua_id
            ? {
                id: row.phien_ban_ket_qua_id,
                tenTep: row.phien_ban_ket_qua_ten,
                dinhDang: row.phien_ban_ket_qua_dinh_dang,
                mimeType: row.phien_ban_ket_qua_mime_type,
                kichThuocBytes: Number(row.phien_ban_ket_qua_kich_thuoc_bytes || 0)
            }
            : null
    };
}

function layChuSoHuu(chuThe, alias = 'cv') {
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
    throw new TypeError('Chủ sở hữu công việc không hợp lệ.');
}

function selectCoBan() {
    return `
        SELECT
            cv.*,
            tn.ten_tep AS tep_nguon_ten,
            pbn.ten_tep AS phien_ban_nguon_ten,
            pbn.dinh_dang AS phien_ban_nguon_dinh_dang,
            pbn.mime_type AS phien_ban_nguon_mime_type,
            pbn.kich_thuoc_bytes AS phien_ban_nguon_kich_thuoc_bytes,
            tkq.ten_tep AS tep_ket_qua_ten,
            pbkq.ten_tep AS phien_ban_ket_qua_ten,
            pbkq.dinh_dang AS phien_ban_ket_qua_dinh_dang,
            pbkq.mime_type AS phien_ban_ket_qua_mime_type,
            pbkq.kich_thuoc_bytes AS phien_ban_ket_qua_kich_thuoc_bytes
        FROM cong_viec cv
        LEFT JOIN tep tn ON tn.id = cv.tep_nguon_id
        LEFT JOIN phien_ban_tep pbn ON pbn.id = cv.phien_ban_nguon_id
        LEFT JOIN tep tkq ON tkq.id = cv.tep_ket_qua_id
        LEFT JOIN phien_ban_tep pbkq ON pbkq.id = cv.phien_ban_ket_qua_id
    `;
}

async function getNguonHopLe(tepId, phienBanId, chuThe, db = null) {
    const chuSoHuu = layChuSoHuu(chuThe, 't');
    const result = await thucThi(`
        SELECT
            t.id AS tep_id,
            t.ten_tep,
            pb.id AS phien_ban_id,
            pb.so_phien_ban,
            pb.dinh_dang,
            pb.mime_type,
            pb.kich_thuoc_bytes,
            pb.storage_driver,
            pb.storage_bucket,
            pb.storage_key
        FROM tep t
        INNER JOIN phien_ban_tep pb ON pb.tep_id = t.id
        WHERE ${chuSoHuu.sql}
        AND t.id = $2
        AND ($3::INTEGER IS NULL OR pb.id = $3)
        AND t.xoa_luc IS NULL
        AND t.trang_thai = 'HOAT_DONG'
        AND pb.xoa_luc IS NULL
        AND pb.trang_thai = 'SAN_SANG'
        ORDER BY pb.so_phien_ban DESC
        LIMIT 1
    `, [
        chuSoHuu.value,
        tepId,
        phienBanId || null
    ], db);
    const row = result.rows[0];
    if (!row) { return null; }
    return {
        tepId: row.tep_id,
        tenTep: row.ten_tep,
        phienBanId: row.phien_ban_id,
        soPhienBan: row.so_phien_ban,
        dinhDang: row.dinh_dang,
        mimeType: row.mime_type,
        kichThuocBytes: Number(row.kich_thuoc_bytes || 0),
        storageDriver: row.storage_driver,
        storageBucket: row.storage_bucket,
        storageKey: row.storage_key
    };
}

async function getByIdempotency(chuThe, khoaIdempotency, db = null) {
    const chuSoHuu = layChuSoHuu(chuThe);
    const result = await thucThi(`
        ${selectCoBan()}
        WHERE ${chuSoHuu.sql}
        AND cv.khoa_idempotency = $2
        LIMIT 1
    `, [
        chuSoHuu.value,
        khoaIdempotency
    ], db);
    return mapCongViec(result.rows[0]);
}

async function tao(data, db) {
    const result = await thucThi(`
        INSERT INTO cong_viec (
            nguoi_dung_id,
            phien_khach_id,
            khoa_idempotency,
            loai_cong_viec,
            trang_thai,
            muc_do_uu_tien,
            tien_trinh,
            buoc_hien_tai,
            tep_nguon_id,
            phien_ban_nguon_id,
            dinh_dang_nguon,
            dinh_dang_dich,
            dau_vao,
            tuy_chon,
            dau_ra,
            so_lan_thu,
            so_lan_thu_toi_da,
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
        data.nguoiDungId || null,
        data.phienKhachId || null,
        data.khoaIdempotency || null,
        data.loaiCongViec,
        data.trangThai || 'CHO_XU_LY',
        data.mucDoUuTien ?? 5,
        data.tienTrinh ?? 0,
        data.buocHienTai || null,
        data.tepNguonId || null,
        data.phienBanNguonId || null,
        data.dinhDangNguon || null,
        data.dinhDangDich || null,
        data.dauVao || {},
        data.tuyChon || {},
        data.dauRa || {},
        data.soLanThu ?? 0,
        data.soLanThuToiDa ?? 3,
        data.hetHanLuc || null
    ], db);
    return mapCongViec(result.rows[0]);
}

async function taoBuoc(data, db) {
    const result = await thucThi(`
        INSERT INTO buoc_cong_viec (
            cong_viec_id,
            thu_tu,
            ma_buoc,
            ten_buoc,
            loai_buoc,
            trang_thai,
            tien_trinh,
            bat_buoc,
            dau_vao,
            tuy_chon,
            dau_ra,
            thong_ke,
            so_lan_thu,
            so_lan_thu_toi_da
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
            $14
        )
        RETURNING *
    `, [
        data.congViecId,
        data.thuTu,
        data.maBuoc,
        data.tenBuoc,
        data.loaiBuoc,
        data.trangThai || 'CHO_XU_LY',
        data.tienTrinh ?? 0,
        data.batBuoc !== false,
        data.dauVao || {},
        data.tuyChon || {},
        data.dauRa || {},
        data.thongKe || {},
        data.soLanThu ?? 0,
        data.soLanThuToiDa ?? 1
    ], db);
    return mapBuoc(result.rows[0]);
}

async function getChiTiet(id, chuThe, db = null) {
    const chuSoHuu = layChuSoHuu(chuThe);
    const result = await thucThi(`
        ${selectCoBan()}
        WHERE ${chuSoHuu.sql}
        AND cv.id = $2
        LIMIT 1
    `, [
        chuSoHuu.value,
        id
    ], db);
    return mapCongViec(result.rows[0]);
}

async function getChiTietNoiBo(id, db = null) {
    const result = await thucThi(`
        ${selectCoBan()}
        WHERE cv.id = $1
        LIMIT 1
    `, [id], db);
    return mapCongViec(result.rows[0]);
}

async function getDanhSachBuoc(congViecId, db = null) {
    const result = await thucThi(`
        SELECT *
        FROM buoc_cong_viec
        WHERE cong_viec_id = $1
        ORDER BY thu_tu ASC, id ASC
    `, [congViecId], db);
    return result.rows.map(mapBuoc);
}

async function getDanhSach(chuThe, filters, db = null) {
    const chuSoHuu = layChuSoHuu(chuThe);
    const values = [chuSoHuu.value];
    const conditions = [chuSoHuu.sql];
    if (filters.trangThai) {
        values.push(filters.trangThai);
        conditions.push(`cv.trang_thai = $${values.length}`);
    }
    if (filters.loaiCongViec) {
        values.push(filters.loaiCongViec);
        conditions.push(`cv.loai_cong_viec = $${values.length}`);
    }
    if (filters.tuKhoa) {
        values.push(`%${filters.tuKhoa}%`);
        conditions.push(`(
            cv.request_id::TEXT ILIKE $${values.length}
            OR cv.loai_cong_viec ILIKE $${values.length}
            OR COALESCE(cv.dinh_dang_nguon, '') ILIKE $${values.length}
            OR COALESCE(cv.dinh_dang_dich, '') ILIKE $${values.length}
            OR COALESCE(tn.ten_tep, '') ILIKE $${values.length}
        )`);
    }
    if (filters.tuNgay) {
        values.push(filters.tuNgay);
        conditions.push(`cv.created_at >= $${values.length}`);
    }
    if (filters.denNgay) {
        values.push(filters.denNgay);
        conditions.push(`cv.created_at <= $${values.length}`);
    }
    values.push(filters.gioiHan);
    const limitIndex = values.length;
    values.push(filters.offset);
    const offsetIndex = values.length;
    const result = await thucThi(`
        ${selectCoBan()}
        WHERE ${conditions.join('\n        AND ')}
        ORDER BY cv.created_at DESC, cv.id DESC
        LIMIT $${limitIndex}
        OFFSET $${offsetIndex}
    `, values, db);
    return result.rows.map(mapCongViec);
}

async function demDanhSach(chuThe, filters, db = null) {
    const chuSoHuu = layChuSoHuu(chuThe);
    const values = [chuSoHuu.value];
    const conditions = [chuSoHuu.sql];
    if (filters.trangThai) {
        values.push(filters.trangThai);
        conditions.push(`cv.trang_thai = $${values.length}`);
    }
    if (filters.loaiCongViec) {
        values.push(filters.loaiCongViec);
        conditions.push(`cv.loai_cong_viec = $${values.length}`);
    }
    if (filters.tuKhoa) {
        values.push(`%${filters.tuKhoa}%`);
        conditions.push(`(
            cv.request_id::TEXT ILIKE $${values.length}
            OR cv.loai_cong_viec ILIKE $${values.length}
            OR COALESCE(cv.dinh_dang_nguon, '') ILIKE $${values.length}
            OR COALESCE(cv.dinh_dang_dich, '') ILIKE $${values.length}
            OR COALESCE(tn.ten_tep, '') ILIKE $${values.length}
        )`);
    }
    if (filters.tuNgay) {
        values.push(filters.tuNgay);
        conditions.push(`cv.created_at >= $${values.length}`);
    }
    if (filters.denNgay) {
        values.push(filters.denNgay);
        conditions.push(`cv.created_at <= $${values.length}`);
    }
    const result = await thucThi(`
        SELECT COUNT(*)::INTEGER AS tong_so
        FROM cong_viec cv
        LEFT JOIN tep tn ON tn.id = cv.tep_nguon_id
        WHERE ${conditions.join('\n        AND ')}
    `, values, db);
    return Number(result.rows[0]?.tong_so || 0);
}

async function yeuCauHuy(id, chuThe, db) {
    const chuSoHuu = layChuSoHuu(chuThe);
    const result = await thucThi(`
        UPDATE cong_viec cv
        SET
            trang_thai = CASE
                WHEN cv.trang_thai = 'CHO_XU_LY' THEN 'DA_HUY'
                ELSE 'DANG_HUY'
            END,
            huy_luc = CASE
                WHEN cv.trang_thai = 'CHO_XU_LY' THEN NOW()
                ELSE cv.huy_luc
            END
        WHERE cv.id = $2
        AND ${chuSoHuu.sql}
        AND cv.trang_thai NOT IN ('HOAN_THANH', 'THAT_BAI', 'DA_HUY', 'DANG_HUY')
        RETURNING *
    `, [
        chuSoHuu.value,
        id
    ], db);
    return mapCongViec(result.rows[0]);
}

async function huyBuocChuaXuLy(congViecId, db) {
    await thucThi(`
        UPDATE buoc_cong_viec
        SET trang_thai = 'DA_HUY'
        WHERE cong_viec_id = $1
        AND trang_thai = 'CHO_XU_LY'
    `, [congViecId], db);
}

async function ganQueue(id, queueName, queueJobId, db = null) {
    const result = await thucThi(`
        UPDATE cong_viec
        SET
            queue_name = $2,
            queue_job_id = $3,
            xep_hang_luc = NOW()
        WHERE id = $1
        RETURNING *
    `, [
        id,
        queueName,
        queueJobId
    ], db);
    return mapCongViec(result.rows[0]);
}

async function capNhatTrangThai(id, data, db = null) {
    const result = await thucThi(`
        UPDATE cong_viec
        SET
            trang_thai = $2,
            tien_trinh = COALESCE($3, tien_trinh),
            buoc_hien_tai = CASE WHEN $4::BOOLEAN THEN $5 ELSE buoc_hien_tai END,
            bat_dau_luc = CASE WHEN $6::BOOLEAN AND bat_dau_luc IS NULL THEN NOW() ELSE bat_dau_luc END
        WHERE id = $1
        RETURNING *
    `, [
        id,
        data.trangThai,
        data.tienTrinh ?? null,
        data.coBuocHienTai === true,
        data.buocHienTai ?? null,
        data.danhDauBatDau === true
    ], db);
    return mapCongViec(result.rows[0]);
}

async function capNhatTienTrinh(id, tienTrinh, buocHienTai, db = null) {
    const result = await thucThi(`
        UPDATE cong_viec
        SET
            tien_trinh = $2,
            buoc_hien_tai = COALESCE($3, buoc_hien_tai)
        WHERE id = $1
        AND trang_thai NOT IN ('HOAN_THANH', 'THAT_BAI', 'DA_HUY')
        RETURNING *
    `, [
        id,
        tienTrinh,
        buocHienTai || null
    ], db);
    return mapCongViec(result.rows[0]);
}

async function hoanThanh(id, data, db = null) {
    const result = await thucThi(`
        UPDATE cong_viec
        SET
            trang_thai = 'HOAN_THANH',
            tien_trinh = 100,
            buoc_hien_tai = NULL,
            tep_ket_qua_id = $2,
            phien_ban_ket_qua_id = $3,
            dau_ra = $4,
            ma_loi = NULL,
            thong_bao_loi = NULL,
            chi_tiet_loi = NULL,
            hoan_thanh_luc = NOW()
        WHERE id = $1
        AND trang_thai NOT IN ('HOAN_THANH', 'THAT_BAI', 'DA_HUY')
        RETURNING *
    `, [
        id,
        data.tepKetQuaId || null,
        data.phienBanKetQuaId || null,
        data.dauRa || {}
    ], db);
    return mapCongViec(result.rows[0]);
}

async function thatBai(id, data, db = null) {
    const result = await thucThi(`
        UPDATE cong_viec
        SET
            trang_thai = 'THAT_BAI',
            ma_loi = $2,
            thong_bao_loi = $3,
            chi_tiet_loi = $4,
            hoan_thanh_luc = NOW()
        WHERE id = $1
        AND trang_thai NOT IN ('HOAN_THANH', 'DA_HUY')
        RETURNING *
    `, [
        id,
        data.maLoi || 'LOI_XU_LY',
        data.thongBaoLoi || null,
        data.chiTietLoi || null
    ], db);
    return mapCongViec(result.rows[0]);
}

async function danhDauDaHuy(id, db = null) {
    const result = await thucThi(`
        UPDATE cong_viec
        SET
            trang_thai = 'DA_HUY',
            huy_luc = NOW()
        WHERE id = $1
        AND trang_thai = 'DANG_HUY'
        RETURNING *
    `, [id], db);
    return mapCongViec(result.rows[0]);
}

async function capNhatBuoc(id, data, db = null) {
    const result = await thucThi(`
        UPDATE buoc_cong_viec
        SET
            trang_thai = COALESCE($2, trang_thai),
            tien_trinh = COALESCE($3, tien_trinh),
            queue_name = COALESCE($4, queue_name),
            queue_job_id = COALESCE($5, queue_job_id),
            bo_xu_ly = COALESCE($6, bo_xu_ly),
            cong_cu = COALESCE($7, cong_cu),
            phien_ban_cong_cu = COALESCE($8, phien_ban_cong_cu),
            dau_ra = COALESCE($9::JSONB, dau_ra),
            thong_ke = COALESCE($10::JSONB, thong_ke),
            ma_loi = $11,
            thong_bao_loi = $12,
            chi_tiet_loi = $13,
            bat_dau_luc = CASE WHEN $14::BOOLEAN AND bat_dau_luc IS NULL THEN NOW() ELSE bat_dau_luc END,
            hoan_thanh_luc = CASE WHEN $15::BOOLEAN THEN NOW() ELSE hoan_thanh_luc END
        WHERE id = $1
        RETURNING *
    `, [
        id,
        data.trangThai || null,
        data.tienTrinh ?? null,
        data.queueName || null,
        data.queueJobId || null,
        data.boXuLy || null,
        data.congCu || null,
        data.phienBanCongCu || null,
        data.dauRa === undefined ? null : JSON.stringify(data.dauRa),
        data.thongKe === undefined ? null : JSON.stringify(data.thongKe),
        data.maLoi ?? null,
        data.thongBaoLoi ?? null,
        data.chiTietLoi ?? null,
        data.danhDauBatDau === true,
        data.danhDauHoanThanh === true
    ], db);
    return mapBuoc(result.rows[0]);
}

module.exports = {
    getNguonHopLe,
    getByIdempotency,
    tao,
    taoBuoc,
    getChiTiet,
    getChiTietNoiBo,
    getDanhSachBuoc,
    getDanhSach,
    demDanhSach,
    yeuCauHuy,
    huyBuocChuaXuLy,
    ganQueue,
    capNhatTrangThai,
    capNhatTienTrinh,
    hoanThanh,
    thatBai,
    danhDauDaHuy,
    capNhatBuoc
};