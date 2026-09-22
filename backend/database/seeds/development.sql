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
VALUES
(
    'UPLOAD_KHACH_MAC_DINH',
    'Số lần upload mỗi ngày dành cho khách',
    'KHACH',
    'UPLOAD_TONG_SO_LAN',
    'LAN',
    'NGAY',
    'Asia/Ho_Chi_Minh',
    2,
    FALSE,
    'YEU_CAU_DANG_NHAP',
    100
),
(
    'UPLOAD_KHACH_TONG_SO_TEP',
    'Tổng số tệp upload dành cho khách',
    'KHACH',
    'UPLOAD_TONG_SO_TEP',
    'TEP',
    'THEO_GOI',
    'Asia/Ho_Chi_Minh',
    NULL,
    TRUE,
    'TU_CHOI',
    100
),
(
    'UPLOAD_KHACH_SO_TEP_MOI_LAN',
    'Số tệp tối đa mỗi lần upload dành cho khách',
    'KHACH',
    'UPLOAD_SO_TEP_MOI_LAN',
    'TEP',
    'MOI_REQUEST',
    'Asia/Ho_Chi_Minh',
    20,
    FALSE,
    'TU_CHOI',
    100
),
(
    'UPLOAD_KHACH_KICH_THUOC_MOI_TEP',
    'Kích thước tối đa mỗi tệp upload dành cho khách',
    'KHACH',
    'UPLOAD_KICH_THUOC_MOI_TEP',
    'BYTE',
    'MOI_TEP',
    'Asia/Ho_Chi_Minh',
    1073741824,
    FALSE,
    'TU_CHOI',
    100
)
ON CONFLICT DO NOTHING;


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
VALUES
(
    'UPLOAD_NGUOI_DUNG_MAC_DINH',
    'Số lần upload mỗi ngày dành cho người dùng',
    'NGUOI_DUNG',
    'UPLOAD_TONG_SO_LAN',
    'LAN',
    'NGAY',
    'Asia/Ho_Chi_Minh',
    5,
    FALSE,
    'YEU_CAU_NANG_CAP',
    100
),
(
    'UPLOAD_NGUOI_DUNG_TONG_SO_TEP',
    'Tổng số tệp upload mặc định dành cho người dùng',
    'NGUOI_DUNG',
    'UPLOAD_TONG_SO_TEP',
    'TEP',
    'THEO_GOI',
    'Asia/Ho_Chi_Minh',
    NULL,
    TRUE,
    'TU_CHOI',
    100
),
(
    'UPLOAD_NGUOI_DUNG_SO_TEP_MOI_LAN',
    'Số tệp tối đa mỗi lần upload dành cho người dùng',
    'NGUOI_DUNG',
    'UPLOAD_SO_TEP_MOI_LAN',
    'TEP',
    'MOI_REQUEST',
    'Asia/Ho_Chi_Minh',
    20,
    FALSE,
    'TU_CHOI',
    100
),
(
    'UPLOAD_NGUOI_DUNG_KICH_THUOC_MOI_TEP',
    'Kích thước tối đa mỗi tệp upload dành cho người dùng',
    'NGUOI_DUNG',
    'UPLOAD_KICH_THUOC_MOI_TEP',
    'BYTE',
    'MOI_TEP',
    'Asia/Ho_Chi_Minh',
    1073741824,
    FALSE,
    'TU_CHOI',
    100
)
ON CONFLICT DO NOTHING;

COMMIT;