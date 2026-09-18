BEGIN;


/*
 * ============================================================
 * TÀI KHOẢN QUẢN TRỊ DEVELOPMENT
 * ============================================================
 */

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
SELECT
    'admin@transform.local',
    'admin',
    'Quản trị viên',
    crypt(
        'Admin@123456',
        gen_salt(
            'bf',
            12
        )
    ),
    'QUAN_TRI',
    'HOAT_DONG',
    NOW(),
    '{
        "ngonNgu": "vi",
        "muiGio": "Asia/Ho_Chi_Minh",
        "giaoDien": "system"
    }'::JSONB
WHERE NOT EXISTS (
    SELECT
        1
    FROM nguoi_dung
    WHERE LOWER(email) = LOWER(
        'admin@transform.local'
    )
    AND xoa_luc IS NULL
);


/*
 * ============================================================
 * HẠN MỨC UPLOAD DÀNH CHO KHÁCH
 * ============================================================
 */

INSERT INTO chinh_sach_han_muc (
    ma,
    ten,
    doi_tuong,
    ma_hanh_dong,
    don_vi,
    chu_ky,
    mui_gio,
    gioi_han,
    khong_gioi_han,
    hanh_dong_khi_vuot,
    muc_do_uu_tien
)
SELECT
    'UPLOAD_KHACH_MAC_DINH',
    'Upload dành cho khách',
    'KHACH',
    'UPLOAD',
    'LAN',
    'NGAY',
    'Asia/Ho_Chi_Minh',
    2,
    FALSE,
    'YEU_CAU_DANG_NHAP',
    100
WHERE NOT EXISTS (
    SELECT
        1
    FROM chinh_sach_han_muc
    WHERE LOWER(ma) = LOWER(
        'UPLOAD_KHACH_MAC_DINH'
    )
);


/*
 * ============================================================
 * HẠN MỨC UPLOAD DÀNH CHO NGƯỜI DÙNG
 * ============================================================
 */

INSERT INTO chinh_sach_han_muc (
    ma,
    ten,
    doi_tuong,
    ma_hanh_dong,
    don_vi,
    chu_ky,
    mui_gio,
    gioi_han,
    khong_gioi_han,
    hanh_dong_khi_vuot,
    muc_do_uu_tien
)
SELECT
    'UPLOAD_NGUOI_DUNG_MAC_DINH',
    'Upload dành cho người dùng',
    'NGUOI_DUNG',
    'UPLOAD',
    'LAN',
    'NGAY',
    'Asia/Ho_Chi_Minh',
    5,
    FALSE,
    'YEU_CAU_NANG_CAP',
    100
WHERE NOT EXISTS (
    SELECT
        1
    FROM chinh_sach_han_muc
    WHERE LOWER(ma) = LOWER(
        'UPLOAD_NGUOI_DUNG_MAC_DINH'
    )
);


/*
 * ============================================================
 * HẠN MỨC UPLOAD DÀNH CHO QUẢN TRỊ VIÊN
 * ============================================================
 */

INSERT INTO chinh_sach_han_muc (
    ma,
    ten,
    doi_tuong,
    loai_tai_khoan,
    ma_hanh_dong,
    don_vi,
    chu_ky,
    mui_gio,
    gioi_han,
    khong_gioi_han,
    hanh_dong_khi_vuot,
    muc_do_uu_tien
)
SELECT
    'UPLOAD_QUAN_TRI',
    'Upload dành cho quản trị viên',
    'LOAI_TAI_KHOAN',
    'QUAN_TRI',
    'UPLOAD',
    'LAN',
    'NGAY',
    'Asia/Ho_Chi_Minh',
    NULL,
    TRUE,
    'TU_CHOI',
    1000
WHERE NOT EXISTS (
    SELECT
        1
    FROM chinh_sach_han_muc
    WHERE LOWER(ma) = LOWER(
        'UPLOAD_QUAN_TRI'
    )
);


COMMIT;