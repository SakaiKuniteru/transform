BEGIN;


/*
 * ============================================================
 * BỔ SUNG HẠN MỨC ĐẾM SỐ LẦN UPLOAD
 * ============================================================
 */

ALTER TABLE chinh_sach_han_muc
DROP CONSTRAINT IF EXISTS chk_chinh_sach_han_muc_upload;


ALTER TABLE chinh_sach_han_muc
ADD CONSTRAINT chk_chinh_sach_han_muc_upload
CHECK (
    ma_hanh_dong NOT IN (
        'UPLOAD_TONG_SO_LAN',
        'UPLOAD_TONG_SO_TEP',
        'UPLOAD_SO_TEP_MOI_LAN',
        'UPLOAD_KICH_THUOC_MOI_TEP'
    )
    OR (
        ma_hanh_dong = 'UPLOAD_TONG_SO_LAN'
        AND don_vi = 'LAN'
        AND chu_ky = 'NGAY'
    )
    OR (
        ma_hanh_dong = 'UPLOAD_TONG_SO_TEP'
        AND don_vi = 'TEP'
        AND chu_ky = 'THEO_GOI'
        AND (
            khong_gioi_han = TRUE
            OR doi_tuong = 'GOI_DICH_VU'
        )
    )
    OR (
        ma_hanh_dong = 'UPLOAD_SO_TEP_MOI_LAN'
        AND don_vi = 'TEP'
        AND chu_ky = 'MOI_REQUEST'
    )
    OR (
        ma_hanh_dong = 'UPLOAD_KICH_THUOC_MOI_TEP'
        AND don_vi = 'BYTE'
        AND chu_ky = 'MOI_TEP'
    )
);


/*
 * ============================================================
 * CHUYỂN POLICY DEVELOPMENT CŨ
 * ============================================================
 */

UPDATE chinh_sach_han_muc
SET
    ma_hanh_dong = 'UPLOAD_TONG_SO_LAN',
    don_vi = 'LAN',
    chu_ky = 'NGAY'
WHERE ma IN (
    'UPLOAD_KHACH_MAC_DINH',
    'UPLOAD_NGUOI_DUNG_MAC_DINH'
)
AND ma_hanh_dong = 'UPLOAD';


/*
 * Quản trị viên đã được bypass hạn mức ở service.
 * Không cần giữ policy UPLOAD_QUAN_TRI cũ.
 */

DELETE FROM chinh_sach_han_muc
WHERE ma = 'UPLOAD_QUAN_TRI'
AND ma_hanh_dong = 'UPLOAD';


COMMIT;