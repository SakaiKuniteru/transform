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

function mapChinhSach(row) {
    if (!row) { return null; }
    return {
        id: row.id,
        ma: row.ma,
        ten: row.ten,
        doiTuong: row.doi_tuong,
        loaiTaiKhoan: row.loai_tai_khoan,
        goiDichVuId: row.goi_dich_vu_id,
        maHanhDong: row.ma_hanh_dong,
        donVi: row.don_vi,
        chuKy: row.chu_ky,
        muiGio: row.mui_gio,
        gioiHan: row.gioi_han,
        khongGioiHan: row.khong_gioi_han,
        hanhDongKhiVuot: row.hanh_dong_khi_vuot,
        mucDoUuTien: row.muc_do_uu_tien,
        hieuLucTu: row.hieu_luc_tu,
        hieuLucDen: row.hieu_luc_den,
        active: row.active,
        metadata: row.metadata || {}
    };
}

function mapSuDung(row) {
    if (!row) { return null; }
    return {
        id: row.id,
        nguoiDungId: row.nguoi_dung_id,
        phienKhachId: row.phien_khach_id,
        chinhSachHanMucId: row.chinh_sach_han_muc_id,
        maHanhDong: row.ma_hanh_dong,
        donVi: row.don_vi,
        kyBatDau: row.ky_bat_dau,
        kyKetThuc: row.ky_ket_thuc,
        daSuDung: row.da_su_dung,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

async function getNguoiDungContext(id, thoiDiem = new Date(), db = null) {
    const result = await thucThi(`
        SELECT
            nd.id,
            nd.email,
            nd.ten_dang_nhap,
            nd.ho_ten,
            nd.loai_tai_khoan,
            nd.trang_thai,
            nd.xoa_luc,
            dkg.id AS dang_ky_goi_id,
            dkg.goi_dich_vu_id,
            dkg.trang_thai AS trang_thai_dang_ky_goi,
            dkg.nguon_kich_hoat,
            dkg.bat_dau_luc,
            dkg.het_han_luc,
            dkg.tu_dong_gia_han,
            gdv.ma AS ma_goi_dich_vu,
            gdv.ten AS ten_goi_dich_vu,
            gdv.mo_ta AS mo_ta_goi_dich_vu,
            gdv.gia AS gia_goi_dich_vu,
            gdv.tien_te AS tien_te_goi_dich_vu,
            gdv.chu_ky AS chu_ky_goi_dich_vu,
            gdv.so_chu_ky AS so_chu_ky_goi_dich_vu
        FROM nguoi_dung nd
        LEFT JOIN LATERAL (
            SELECT
                x.id,
                x.goi_dich_vu_id,
                x.trang_thai,
                x.nguon_kich_hoat,
                x.bat_dau_luc,
                x.het_han_luc,
                x.tu_dong_gia_han,
                x.created_at
            FROM dang_ky_goi x
            WHERE x.nguoi_dung_id = nd.id
            AND x.trang_thai = 'HOAT_DONG'
            AND (x.bat_dau_luc IS NULL OR x.bat_dau_luc <= $2)
            AND (x.het_han_luc IS NULL OR x.het_han_luc > $2)
            ORDER BY x.created_at DESC
            LIMIT 1
        ) dkg ON TRUE
        LEFT JOIN goi_dich_vu gdv ON gdv.id = dkg.goi_dich_vu_id
        WHERE nd.id = $1
        AND nd.xoa_luc IS NULL
        LIMIT 1
    `, [id, thoiDiem], db);
    const row = result.rows[0];
    if (!row) { return null; }
    return {
        id: row.id,
        email: row.email,
        tenDangNhap: row.ten_dang_nhap,
        hoTen: row.ho_ten,
        loaiTaiKhoan: row.loai_tai_khoan,
        trangThai: row.trang_thai,
        dangKyGoi: row.dang_ky_goi_id
            ? {
                id: row.dang_ky_goi_id,
                goiDichVuId: row.goi_dich_vu_id,
                trangThai: row.trang_thai_dang_ky_goi,
                nguonKichHoat: row.nguon_kich_hoat,
                batDauLuc: row.bat_dau_luc,
                hetHanLuc: row.het_han_luc,
                tuDongGiaHan: row.tu_dong_gia_han,
                goiDichVu: {
                    id: row.goi_dich_vu_id,
                    ma: row.ma_goi_dich_vu,
                    ten: row.ten_goi_dich_vu,
                    moTa: row.mo_ta_goi_dich_vu,
                    gia: row.gia_goi_dich_vu === null ? null : Number(row.gia_goi_dich_vu),
                    tienTe: row.tien_te_goi_dich_vu,
                    chuKy: row.chu_ky_goi_dich_vu,
                    soChuKy: row.so_chu_ky_goi_dich_vu
                }
            }
            : null
    };
}

async function getPhienKhachContext(id, thoiDiem = new Date(), db = null) {
    const result = await thucThi(`
        SELECT
            id,
            trang_thai,
            het_han_luc
        FROM phien_khach
        WHERE id = $1
        AND trang_thai = 'HOAT_DONG'
        AND (het_han_luc IS NULL OR het_han_luc > $2)
        LIMIT 1
    `, [id, thoiDiem], db);
    const row = result.rows[0];
    if (!row) { return null; }
    return {
        id: row.id,
        trangThai: row.trang_thai,
        hetHanLuc: row.het_han_luc
    };
}

async function getChinhSachHieuLuc({ maHanhDong, laKhach, loaiTaiKhoan = null, goiDichVuId = null, thoiDiem = new Date() }, db = null) {
    const result = await thucThi(`
        SELECT
            id,
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
        FROM chinh_sach_han_muc
        WHERE ma_hanh_dong = $1
        AND active = TRUE
        AND hieu_luc_tu <= $2
        AND (hieu_luc_den IS NULL OR hieu_luc_den > $2)
        AND (
            ($3 = TRUE AND doi_tuong = 'KHACH')
            OR (
                $3 = FALSE
                AND (
                    doi_tuong = 'NGUOI_DUNG'
                    OR (
                        doi_tuong = 'LOAI_TAI_KHOAN'
                        AND loai_tai_khoan = $4
                    )
                    OR (
                        doi_tuong = 'GOI_DICH_VU'
                        AND $5::INTEGER IS NOT NULL
                        AND goi_dich_vu_id = $5
                    )
                )
            )
        )
        ORDER BY
            CASE doi_tuong
                WHEN 'GOI_DICH_VU' THEN 1
                WHEN 'LOAI_TAI_KHOAN' THEN 2
                WHEN 'NGUOI_DUNG' THEN 3
                WHEN 'KHACH' THEN 4
                ELSE 9
            END ASC,
            muc_do_uu_tien ASC,
            id DESC
        LIMIT 1
    `, [
        maHanhDong,
        thoiDiem,
        laKhach,
        loaiTaiKhoan,
        goiDichVuId
    ], db);
    return mapChinhSach(result.rows[0]);
}

async function getSuDung({ nguoiDungId = null, phienKhachId = null, maHanhDong, donVi, kyBatDau, kyKetThuc }, db = null) {
    const result = await thucThi(`
        SELECT
            id,
            nguoi_dung_id,
            phien_khach_id,
            chinh_sach_han_muc_id,
            ma_hanh_dong,
            don_vi,
            ky_bat_dau,
            ky_ket_thuc,
            da_su_dung,
            created_at,
            updated_at
        FROM su_dung_han_muc
        WHERE (
            ($1::INTEGER IS NOT NULL AND nguoi_dung_id = $1 AND phien_khach_id IS NULL)
            OR
            ($2::INTEGER IS NOT NULL AND phien_khach_id = $2 AND nguoi_dung_id IS NULL)
        )
        AND ma_hanh_dong = $3
        AND don_vi = $4
        AND ky_bat_dau = $5
        AND ky_ket_thuc = $6
        LIMIT 1
    `, [
        nguoiDungId,
        phienKhachId,
        maHanhDong,
        donVi,
        kyBatDau,
        kyKetThuc
    ], db);
    return mapSuDung(result.rows[0]);
}

async function damBaoDongSuDung(data, db) {
    if (data.nguoiDungId) {
        await thucThi(`
            INSERT INTO su_dung_han_muc (
                nguoi_dung_id,
                phien_khach_id,
                chinh_sach_han_muc_id,
                ma_hanh_dong,
                don_vi,
                ky_bat_dau,
                ky_ket_thuc,
                da_su_dung
            )
            VALUES (
                $1,
                NULL,
                $2,
                $3,
                $4,
                $5,
                $6,
                0
            )
            ON CONFLICT (
                nguoi_dung_id,
                ma_hanh_dong,
                don_vi,
                ky_bat_dau,
                ky_ket_thuc
            )
            WHERE nguoi_dung_id IS NOT NULL
            DO UPDATE SET
                chinh_sach_han_muc_id = EXCLUDED.chinh_sach_han_muc_id
        `, [
            data.nguoiDungId,
            data.chinhSachHanMucId,
            data.maHanhDong,
            data.donVi,
            data.kyBatDau,
            data.kyKetThuc
        ], db);
        return;
    }
    await thucThi(`
        INSERT INTO su_dung_han_muc (
            nguoi_dung_id,
            phien_khach_id,
            chinh_sach_han_muc_id,
            ma_hanh_dong,
            don_vi,
            ky_bat_dau,
            ky_ket_thuc,
            da_su_dung
        )
        VALUES (
            NULL,
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            0
        )
        ON CONFLICT (
            phien_khach_id,
            ma_hanh_dong,
            don_vi,
            ky_bat_dau,
            ky_ket_thuc
        )
        WHERE phien_khach_id IS NOT NULL
        DO UPDATE SET
            chinh_sach_han_muc_id = EXCLUDED.chinh_sach_han_muc_id
    `, [
        data.phienKhachId,
        data.chinhSachHanMucId,
        data.maHanhDong,
        data.donVi,
        data.kyBatDau,
        data.kyKetThuc
    ], db);
}

async function giuSuDung(data, db) {
    await damBaoDongSuDung(data, db);
    const result = await thucThi(`
        UPDATE su_dung_han_muc
        SET
            da_su_dung = da_su_dung + $7::BIGINT,
            chinh_sach_han_muc_id = $8
        WHERE (
            ($1::INTEGER IS NOT NULL AND nguoi_dung_id = $1 AND phien_khach_id IS NULL)
            OR
            ($2::INTEGER IS NOT NULL AND phien_khach_id = $2 AND nguoi_dung_id IS NULL)
        )
        AND ma_hanh_dong = $3
        AND don_vi = $4
        AND ky_bat_dau = $5
        AND ky_ket_thuc = $6
        AND da_su_dung + $7::BIGINT <= $9::BIGINT
        RETURNING *
    `, [
        data.nguoiDungId,
        data.phienKhachId,
        data.maHanhDong,
        data.donVi,
        data.kyBatDau,
        data.kyKetThuc,
        data.soLuong,
        data.chinhSachHanMucId,
        data.gioiHan
    ], db);
    return mapSuDung(result.rows[0]);
}

async function hoanTraSuDung(data, db = null) {
    const result = await thucThi(`
        UPDATE su_dung_han_muc
        SET da_su_dung = GREATEST(0, da_su_dung - $7::BIGINT)
        WHERE (
            ($1::INTEGER IS NOT NULL AND nguoi_dung_id = $1 AND phien_khach_id IS NULL)
            OR
            ($2::INTEGER IS NOT NULL AND phien_khach_id = $2 AND nguoi_dung_id IS NULL)
        )
        AND ma_hanh_dong = $3
        AND don_vi = $4
        AND ky_bat_dau = $5
        AND ky_ket_thuc = $6
        RETURNING *
    `, [
        data.nguoiDungId,
        data.phienKhachId,
        data.maHanhDong,
        data.donVi,
        data.kyBatDau,
        data.kyKetThuc,
        data.soLuong
    ], db);
    return mapSuDung(result.rows[0]);
}

module.exports = {
    getNguoiDungContext,
    getPhienKhachContext,
    getChinhSachHieuLuc,
    getSuDung,
    damBaoDongSuDung,
    giuSuDung,
    hoanTraSuDung
};