'use strict';

const database = require('../../infrastructure/database/query');


const COT_NGUOI_DUNG = `
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
`;


function taoBoLoc({
    tuKhoa = null,
    loaiTaiKhoan = null,
    trangThai = null
} = {}) {
    const dieuKien = ['xoa_luc IS NULL'];
    const thamSo = [];

    if (tuKhoa) {
        thamSo.push(`%${tuKhoa}%`);
        const viTri = thamSo.length;

        dieuKien.push(`(
            email ILIKE $${viTri}
            OR ten_dang_nhap ILIKE $${viTri}
            OR ho_ten ILIKE $${viTri}
        )`);
    }

    if (loaiTaiKhoan) {
        thamSo.push(loaiTaiKhoan);
        dieuKien.push(`loai_tai_khoan = $${thamSo.length}`);
    }

    if (trangThai) {
        thamSo.push(trangThai);
        dieuKien.push(`trang_thai = $${thamSo.length}`);
    }

    return {
        where: dieuKien.join(' AND '),
        thamSo
    };
}


async function layDanhSach({
    page = 1,
    pageSize = 20,
    tuKhoa = null,
    loaiTaiKhoan = null,
    trangThai = null
} = {}, db = database) {
    const offset = (page - 1) * pageSize;

    const boLoc = taoBoLoc({
        tuKhoa,
        loaiTaiKhoan,
        trangThai
    });

    const tong = await db.layGiaTri(
        `
            SELECT
                COUNT(*)::INTEGER
            FROM nguoi_dung
            WHERE ${boLoc.where}
        `,
        boLoc.thamSo
    );

    const thamSo = [
        ...boLoc.thamSo,
        pageSize,
        offset
    ];

    const viTriPageSize = boLoc.thamSo.length + 1;
    const viTriOffset = boLoc.thamSo.length + 2;

    const danhSach = await db.layDanhSach(
        `
            SELECT
                ${COT_NGUOI_DUNG}
            FROM nguoi_dung
            WHERE ${boLoc.where}
            ORDER BY created_at DESC, id DESC
            LIMIT $${viTriPageSize}
            OFFSET $${viTriOffset}
        `,
        thamSo
    );

    return {
        danhSach,
        tong
    };
}


async function timTheoId(id, db = database) {
    return db.layMotHoacNull(
        `
            SELECT
                ${COT_NGUOI_DUNG}
            FROM nguoi_dung
            WHERE id = $1
            AND xoa_luc IS NULL
        `,
        [
            id
        ]
    );
}


async function timTheoEmail(email, db = database) {
    return db.layMotHoacNull(
        `
            SELECT
                ${COT_NGUOI_DUNG}
            FROM nguoi_dung
            WHERE LOWER(email) = LOWER($1)
            AND xoa_luc IS NULL
        `,
        [
            email
        ]
    );
}


async function timTheoTenDangNhap(tenDangNhap, db = database) {
    if (!tenDangNhap) { return null; }

    return db.layMotHoacNull(
        `
            SELECT
                ${COT_NGUOI_DUNG}
            FROM nguoi_dung
            WHERE LOWER(ten_dang_nhap) = LOWER($1)
            AND xoa_luc IS NULL
        `,
        [
            tenDangNhap
        ]
    );
}


async function timThongTinXacThucTheoEmail(email, db = database) {
    return db.layMotHoacNull(
        `
            SELECT
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
            FROM nguoi_dung
            WHERE LOWER(email) = LOWER($1)
            AND xoa_luc IS NULL
        `,
        [
            email
        ]
    );
}


async function emailDaTonTai(email, boQuaId = null, db = database) {
    const thamSo = [
        email
    ];

    let boQua = '';

    if (boQuaId) {
        thamSo.push(boQuaId);
        boQua = `AND id <> $${thamSo.length}`;
    }

    const tonTai = await db.layGiaTri(
        `
            SELECT
                EXISTS (
                    SELECT
                        1
                    FROM nguoi_dung
                    WHERE LOWER(email) = LOWER($1)
                    AND xoa_luc IS NULL
                    ${boQua}
                )
        `,
        thamSo
    );

    return Boolean(tonTai);
}


async function tenDangNhapDaTonTai(tenDangNhap, boQuaId = null, db = database) {
    if (!tenDangNhap) { return false; }

    const thamSo = [
        tenDangNhap
    ];

    let boQua = '';

    if (boQuaId) {
        thamSo.push(boQuaId);
        boQua = `AND id <> $${thamSo.length}`;
    }

    const tonTai = await db.layGiaTri(
        `
            SELECT
                EXISTS (
                    SELECT
                        1
                    FROM nguoi_dung
                    WHERE LOWER(ten_dang_nhap) = LOWER($1)
                    AND xoa_luc IS NULL
                    ${boQua}
                )
        `,
        thamSo
    );

    return Boolean(tonTai);
}


async function demQuanTriHoatDong(db = database) {
    return db.layGiaTri(
        `
            SELECT
                COUNT(*)::INTEGER
            FROM nguoi_dung
            WHERE loai_tai_khoan = 'QUAN_TRI'
            AND trang_thai = 'HOAT_DONG'
            AND xoa_luc IS NULL
        `
    );
}


async function taoMoi({
    email,
    tenDangNhap = null,
    hoTen,
    matKhauHash,
    loaiTaiKhoan = 'NGUOI_DUNG',
    trangThai = 'HOAT_DONG',
    emailXacThucLuc = null,
    caiDat = {}
}, db = database) {
    return db.layMot(
        `
            INSERT INTO nguoi_dung (
                email,
                ten_dang_nhap,
                ho_ten,
                mat_khau_hash,
                loai_tai_khoan,
                trang_thai,
                email_xac_thuc_luc,
                cai_dat
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
            RETURNING
                ${COT_NGUOI_DUNG}
        `,
        [
            email,
            tenDangNhap,
            hoTen,
            matKhauHash,
            loaiTaiKhoan,
            trangThai,
            emailXacThucLuc,
            caiDat
        ]
    );
}


async function capNhat(id, duLieu = {}, db = database) {
    const ganGiaTri = [];
    const thamSo = [];

    function them(cot, giaTri) {
        thamSo.push(giaTri);
        ganGiaTri.push(`${cot} = $${thamSo.length}`);
    }

    if (Object.hasOwn(duLieu, 'email')) {
        them('email', duLieu.email);
        ganGiaTri.push('email_xac_thuc_luc = NULL');
    }

    if (Object.hasOwn(duLieu, 'tenDangNhap')) { them('ten_dang_nhap', duLieu.tenDangNhap); }
    if (Object.hasOwn(duLieu, 'hoTen')) { them('ho_ten', duLieu.hoTen); }
    if (Object.hasOwn(duLieu, 'loaiTaiKhoan')) { them('loai_tai_khoan', duLieu.loaiTaiKhoan); }

    if (Object.hasOwn(duLieu, 'caiDat')) {
        thamSo.push(duLieu.caiDat);
        ganGiaTri.push(`cai_dat = cai_dat || $${thamSo.length}::JSONB`);
    }

    if (!ganGiaTri.length) { return timTheoId(id, db); }

    thamSo.push(id);

    return db.layMotHoacNull(
        `
            UPDATE nguoi_dung
            SET
                ${ganGiaTri.join(',\n                ')}
            WHERE id = $${thamSo.length}
            AND xoa_luc IS NULL
            RETURNING
                ${COT_NGUOI_DUNG}
        `,
        thamSo
    );
}


async function capNhatTrangThai(id, trangThai, db = database) {
    return db.layMotHoacNull(
        `
            UPDATE nguoi_dung
            SET trang_thai = $1
            WHERE id = $2
            AND xoa_luc IS NULL
            RETURNING
                ${COT_NGUOI_DUNG}
        `,
        [
            trangThai,
            id
        ]
    );
}


async function capNhatLanDangNhapCuoi(id, db = database) {
    return db.layMotHoacNull(
        `
            UPDATE nguoi_dung
            SET lan_dang_nhap_cuoi_luc = NOW()
            WHERE id = $1
            AND xoa_luc IS NULL
            RETURNING
                ${COT_NGUOI_DUNG}
        `,
        [
            id
        ]
    );
}


async function xacThucEmail(id, db = database) {
    return db.layMotHoacNull(
        `
            UPDATE nguoi_dung
            SET email_xac_thuc_luc = COALESCE(email_xac_thuc_luc, NOW())
            WHERE id = $1
            AND xoa_luc IS NULL
            RETURNING
                ${COT_NGUOI_DUNG}
        `,
        [
            id
        ]
    );
}


async function xoaMem(id, db = database) {
    return db.layMotHoacNull(
        `
            UPDATE nguoi_dung
            SET
                trang_thai = 'VO_HIEU_HOA',
                xoa_luc = NOW()
            WHERE id = $1
            AND xoa_luc IS NULL
            RETURNING
                ${COT_NGUOI_DUNG}
        `,
        [
            id
        ]
    );
}


module.exports = {
    layDanhSach,
    timTheoId,
    timTheoEmail,
    timTheoTenDangNhap,
    timThongTinXacThucTheoEmail,
    emailDaTonTai,
    tenDangNhapDaTonTai,
    demQuanTriHoatDong,
    taoMoi,
    capNhat,
    capNhatTrangThai,
    capNhatLanDangNhapCuoi,
    xacThucEmail,
    xoaMem
};