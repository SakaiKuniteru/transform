'use strict';

const database = require('../../infrastructure/database/query');


const COT_NGUOI_DUNG_XAC_THUC = `
    id,
    email,
    ten_dang_nhap AS "tenDangNhap",
    ho_ten AS "hoTen",
    mat_khau_hash AS "matKhauHash",
    loai_tai_khoan AS "loaiTaiKhoan",
    trang_thai AS "trangThai",
    email_xac_thuc_luc AS "emailXacThucLuc",
    lan_dang_nhap_cuoi_luc AS "lanDangNhapCuoiLuc",
    cai_dat AS "caiDat",
    created_at AS "createdAt",
    updated_at AS "updatedAt"
`;


async function timNguoiDungTheoTenDangNhap(tenDangNhap, db = database) {
    return db.layMotHoacNull(
        `
            SELECT
                ${COT_NGUOI_DUNG_XAC_THUC}
            FROM nguoi_dung
            WHERE (
                LOWER(email) = LOWER($1)
                OR LOWER(ten_dang_nhap) = LOWER($1)
            )
            AND xoa_luc IS NULL
            LIMIT 1
        `,
        [
            tenDangNhap
        ]
    );
}


async function timNguoiDungTheoEmail(email, db = database) {
    return db.layMotHoacNull(
        `
            SELECT
                ${COT_NGUOI_DUNG_XAC_THUC}
            FROM nguoi_dung
            WHERE LOWER(email) = LOWER($1)
            AND xoa_luc IS NULL
            LIMIT 1
        `,
        [
            email
        ]
    );
}


async function timNguoiDungTheoId(id, db = database) {
    return db.layMotHoacNull(
        `
            SELECT
                ${COT_NGUOI_DUNG_XAC_THUC}
            FROM nguoi_dung
            WHERE id = $1
            AND xoa_luc IS NULL
        `,
        [
            id
        ]
    );
}


async function capNhatMatKhau(nguoiDungId, matKhauHash, db = database) {
    return db.layMotHoacNull(
        `
            UPDATE nguoi_dung
            SET mat_khau_hash = $1
            WHERE id = $2
            AND xoa_luc IS NULL
            RETURNING id
        `,
        [
            matKhauHash,
            nguoiDungId
        ]
    );
}


async function xacThucEmail(nguoiDungId, db = database) {
    return db.layMotHoacNull(
        `
            UPDATE nguoi_dung
            SET email_xac_thuc_luc = COALESCE(email_xac_thuc_luc, NOW())
            WHERE id = $1
            AND xoa_luc IS NULL
            RETURNING
                id,
                email,
                ten_dang_nhap AS "tenDangNhap",
                ho_ten AS "hoTen",
                loai_tai_khoan AS "loaiTaiKhoan",
                trang_thai AS "trangThai",
                email_xac_thuc_luc AS "emailXacThucLuc",
                lan_dang_nhap_cuoi_luc AS "lanDangNhapCuoiLuc",
                cai_dat AS "caiDat",
                created_at AS "createdAt",
                updated_at AS "updatedAt"
        `,
        [
            nguoiDungId
        ]
    );
}


async function capNhatLanDangNhapCuoi(nguoiDungId, db = database) {
    return db.truyVan(
        `
            UPDATE nguoi_dung
            SET lan_dang_nhap_cuoi_luc = NOW()
            WHERE id = $1
            AND xoa_luc IS NULL
        `,
        [
            nguoiDungId
        ]
    );
}


/*
 * ============================================================
 * OTP
 * ============================================================
 */

async function layOtpMoiNhat({
    nguoiDungId,
    diaChi,
    mucDich
}, db = database) {
    return db.layMotHoacNull(
        `
            SELECT
                id,
                nguoi_dung_id AS "nguoiDungId",
                kenh,
                dia_chi AS "diaChi",
                muc_dich AS "mucDich",
                ma_hash AS "maHash",
                trang_thai AS "trangThai",
                so_lan_thu AS "soLanThu",
                so_lan_thu_toi_da AS "soLanThuToiDa",
                so_lan_gui AS "soLanGui",
                gui_lan_cuoi_luc AS "guiLanCuoiLuc",
                het_han_luc AS "hetHanLuc",
                xac_thuc_luc AS "xacThucLuc",
                vo_hieu_hoa_luc AS "voHieuHoaLuc",
                request_id AS "requestId",
                metadata,
                created_at AS "createdAt",
                updated_at AS "updatedAt"
            FROM ma_xac_thuc
            WHERE nguoi_dung_id = $1
            AND LOWER(dia_chi) = LOWER($2)
            AND muc_dich = $3
            ORDER BY created_at DESC
            LIMIT 1
        `,
        [
            nguoiDungId,
            diaChi,
            mucDich
        ]
    );
}


async function layOtpTheoIdDeCapNhat(id, db = database) {
    return db.layMotHoacNull(
        `
            SELECT
                id,
                nguoi_dung_id AS "nguoiDungId",
                dia_chi AS "diaChi",
                muc_dich AS "mucDich",
                ma_hash AS "maHash",
                trang_thai AS "trangThai",
                so_lan_thu AS "soLanThu",
                so_lan_thu_toi_da AS "soLanThuToiDa",
                het_han_luc AS "hetHanLuc",
                xac_thuc_luc AS "xacThucLuc",
                metadata
            FROM ma_xac_thuc
            WHERE id = $1
            FOR UPDATE
        `,
        [
            id
        ]
    );
}


async function demSoLanGuiOtpTrongGio({
    nguoiDungId,
    diaChi,
    mucDich
}, db = database) {
    return db.layGiaTri(
        `
            SELECT
                COALESCE(SUM(so_lan_gui), 0)::INTEGER
            FROM ma_xac_thuc
            WHERE nguoi_dung_id = $1
            AND LOWER(dia_chi) = LOWER($2)
            AND muc_dich = $3
            AND created_at >= NOW() - INTERVAL '1 hour'
        `,
        [
            nguoiDungId,
            diaChi,
            mucDich
        ]
    );
}


async function taoOtp({
    nguoiDungId,
    kenh = 'EMAIL',
    diaChi,
    mucDich,
    maHash,
    soLanThuToiDa,
    hetHanLuc,
    requestId = null,
    metadata = {}
}, db = database) {
    return db.layMot(
        `
            INSERT INTO ma_xac_thuc (
                nguoi_dung_id,
                kenh,
                dia_chi,
                muc_dich,
                ma_hash,
                trang_thai,
                so_lan_thu,
                so_lan_thu_toi_da,
                so_lan_gui,
                gui_lan_cuoi_luc,
                het_han_luc,
                request_id,
                metadata
            )
            VALUES (
                $1,
                $2,
                $3,
                $4,
                $5,
                'CHO_XAC_THUC',
                0,
                $6,
                1,
                NOW(),
                $7,
                $8,
                $9
            )
            RETURNING
                id,
                het_han_luc AS "hetHanLuc",
                gui_lan_cuoi_luc AS "guiLanCuoiLuc"
        `,
        [
            nguoiDungId,
            kenh,
            diaChi,
            mucDich,
            maHash,
            soLanThuToiDa,
            hetHanLuc,
            requestId,
            metadata
        ]
    );
}


async function guiLaiOtp(id, {
    maHash,
    soLanThuToiDa,
    hetHanLuc,
    requestId = null
}, db = database) {
    return db.layMot(
        `
            UPDATE ma_xac_thuc
            SET
                ma_hash = $1,
                trang_thai = 'CHO_XAC_THUC',
                so_lan_thu = 0,
                so_lan_thu_toi_da = $2,
                so_lan_gui = so_lan_gui + 1,
                gui_lan_cuoi_luc = NOW(),
                het_han_luc = $3,
                xac_thuc_luc = NULL,
                vo_hieu_hoa_luc = NULL,
                request_id = $4
            WHERE id = $5
            RETURNING
                id,
                het_han_luc AS "hetHanLuc",
                gui_lan_cuoi_luc AS "guiLanCuoiLuc"
        `,
        [
            maHash,
            soLanThuToiDa,
            hetHanLuc,
            requestId,
            id
        ]
    );
}


async function tangLanThuOtp(id, db = database) {
    return db.layMot(
        `
            UPDATE ma_xac_thuc
            SET
                so_lan_thu = so_lan_thu + 1,
                trang_thai = CASE
                    WHEN so_lan_thu + 1 >= so_lan_thu_toi_da THEN 'VUOT_SO_LAN_THU'
                    ELSE trang_thai
                END
            WHERE id = $1
            RETURNING
                so_lan_thu AS "soLanThu",
                so_lan_thu_toi_da AS "soLanThuToiDa",
                trang_thai AS "trangThai"
        `,
        [
            id
        ]
    );
}


async function danhDauOtpDaXacThuc(id, db = database) {
    return db.truyVan(
        `
            UPDATE ma_xac_thuc
            SET
                trang_thai = 'DA_XAC_THUC',
                xac_thuc_luc = NOW()
            WHERE id = $1
        `,
        [
            id
        ]
    );
}


async function danhDauOtpHetHan(id, db = database) {
    return db.truyVan(
        `
            UPDATE ma_xac_thuc
            SET trang_thai = 'HET_HAN'
            WHERE id = $1
            AND trang_thai = 'CHO_XAC_THUC'
        `,
        [
            id
        ]
    );
}


async function danhDauOtpDaDatLaiMatKhau(id, db = database) {
    return db.truyVan(
        `
            UPDATE ma_xac_thuc
            SET metadata = COALESCE(metadata, '{}'::JSONB) || jsonb_build_object(
                'datLaiMatKhauLuc',
                NOW()
            )
            WHERE id = $1
        `,
        [
            id
        ]
    );
}


/*
 * ============================================================
 * PHIÊN ĐĂNG NHẬP
 * ============================================================
 */

async function taoPhienDangNhap({
    nguoiDungId,
    jti,
    refreshTokenHash,
    diaChiIp = null,
    userAgent = null,
    hetHanLuc,
    metadata = {}
}, db = database) {
    return db.layMot(
        `
            INSERT INTO phien_dang_nhap (
                nguoi_dung_id,
                jti,
                refresh_token_hash,
                dia_chi_ip,
                user_agent,
                het_han_luc,
                metadata
            )
            VALUES (
                $1,
                $2,
                $3,
                $4,
                $5,
                $6,
                $7
            )
            RETURNING
                id,
                jti,
                het_han_luc AS "hetHanLuc",
                created_at AS "createdAt"
        `,
        [
            nguoiDungId,
            jti,
            refreshTokenHash,
            diaChiIp,
            userAgent,
            hetHanLuc,
            metadata
        ]
    );
}


async function timPhienTheoJtiDeCapNhat(jti, db = database) {
    return db.layMotHoacNull(
        `
            SELECT
                p.id AS "phienId",
                p.nguoi_dung_id AS "nguoiDungId",
                p.jti,
                p.refresh_token_hash AS "refreshTokenHash",
                p.het_han_luc AS "hetHanLuc",
                p.su_dung_lan_cuoi_luc AS "suDungLanCuoiLuc",
                p.vo_hieu_hoa_luc AS "voHieuHoaLuc",

                n.email,
                n.ten_dang_nhap AS "tenDangNhap",
                n.ho_ten AS "hoTen",
                n.loai_tai_khoan AS "loaiTaiKhoan",
                n.trang_thai AS "trangThai",
                n.email_xac_thuc_luc AS "emailXacThucLuc",
                n.cai_dat AS "caiDat"

            FROM phien_dang_nhap p

            INNER JOIN nguoi_dung n
                ON n.id = p.nguoi_dung_id

            WHERE p.jti = $1
            AND n.xoa_luc IS NULL

            FOR UPDATE
        `,
        [
            jti
        ]
    );
}


async function timPhienAccess(phienId, db = database) {
    return db.layMotHoacNull(
        `
            SELECT
                p.id AS "phienId",
                p.nguoi_dung_id AS "nguoiDungId",
                p.het_han_luc AS "hetHanLuc",
                p.vo_hieu_hoa_luc AS "voHieuHoaLuc",

                n.email,
                n.ten_dang_nhap AS "tenDangNhap",
                n.ho_ten AS "hoTen",
                n.loai_tai_khoan AS "loaiTaiKhoan",
                n.trang_thai AS "trangThai",
                n.email_xac_thuc_luc AS "emailXacThucLuc",
                n.cai_dat AS "caiDat"

            FROM phien_dang_nhap p

            INNER JOIN nguoi_dung n
                ON n.id = p.nguoi_dung_id

            WHERE p.id = $1
            AND n.xoa_luc IS NULL
        `,
        [
            phienId
        ]
    );
}


async function capNhatLanSuDungPhien(phienId, db = database) {
    return db.truyVan(
        `
            UPDATE phien_dang_nhap
            SET su_dung_lan_cuoi_luc = NOW()
            WHERE id = $1
            AND vo_hieu_hoa_luc IS NULL
        `,
        [
            phienId
        ]
    );
}


async function thuHoiPhien(phienId, lyDo = 'DANG_XUAT', db = database) {
    return db.truyVan(
        `
            UPDATE phien_dang_nhap
            SET
                vo_hieu_hoa_luc = COALESCE(vo_hieu_hoa_luc, NOW()),
                ly_do_vo_hieu_hoa = COALESCE(ly_do_vo_hieu_hoa, $2)
            WHERE id = $1
        `,
        [
            phienId,
            lyDo
        ]
    );
}


async function thuHoiTatCaPhien(nguoiDungId, lyDo = 'DANG_XUAT_TAT_CA', db = database) {
    return db.truyVan(
        `
            UPDATE phien_dang_nhap
            SET
                vo_hieu_hoa_luc = NOW(),
                ly_do_vo_hieu_hoa = $2
            WHERE nguoi_dung_id = $1
            AND vo_hieu_hoa_luc IS NULL
        `,
        [
            nguoiDungId,
            lyDo
        ]
    );
}


module.exports = {
    timNguoiDungTheoTenDangNhap,
    timNguoiDungTheoEmail,
    timNguoiDungTheoId,
    capNhatMatKhau,
    xacThucEmail,
    capNhatLanDangNhapCuoi,

    layOtpMoiNhat,
    layOtpTheoIdDeCapNhat,
    demSoLanGuiOtpTrongGio,
    taoOtp,
    guiLaiOtp,
    tangLanThuOtp,
    danhDauOtpDaXacThuc,
    danhDauOtpHetHan,
    danhDauOtpDaDatLaiMatKhau,

    taoPhienDangNhap,
    timPhienTheoJtiDeCapNhat,
    timPhienAccess,
    capNhatLanSuDungPhien,
    thuHoiPhien,
    thuHoiTatCaPhien
};