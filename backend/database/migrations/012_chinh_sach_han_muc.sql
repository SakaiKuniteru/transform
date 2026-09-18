BEGIN;


/*
 * ============================================================
 * CHÍNH SÁCH HẠN MỨC
 * ============================================================
 */

CREATE TABLE chinh_sach_han_muc (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    ma VARCHAR(100) NOT NULL,
    ten VARCHAR(255) NOT NULL,

    doi_tuong VARCHAR(30) NOT NULL,

    loai_tai_khoan VARCHAR(30),
    goi_dich_vu_id UUID,

    ma_hanh_dong VARCHAR(50) NOT NULL,

    don_vi VARCHAR(20) NOT NULL DEFAULT 'LAN',
    chu_ky VARCHAR(20) NOT NULL DEFAULT 'NGAY',

    mui_gio VARCHAR(64) NOT NULL DEFAULT 'UTC',

    gioi_han BIGINT,

    khong_gioi_han BOOLEAN NOT NULL DEFAULT FALSE,

    hanh_dong_khi_vuot VARCHAR(30) NOT NULL DEFAULT 'TU_CHOI',

    muc_do_uu_tien INTEGER NOT NULL DEFAULT 100,

    hieu_luc_tu TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    hieu_luc_den TIMESTAMPTZ,

    active BOOLEAN NOT NULL DEFAULT TRUE,

    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_chinh_sach_han_muc_goi
        FOREIGN KEY (
            goi_dich_vu_id
        )
        REFERENCES goi_dich_vu (
            id
        )
        ON DELETE CASCADE,

    CONSTRAINT chk_chinh_sach_han_muc_doi_tuong
        CHECK (
            doi_tuong IN (
                'KHACH',
                'NGUOI_DUNG',
                'LOAI_TAI_KHOAN',
                'GOI_DICH_VU'
            )
        ),

    CONSTRAINT chk_chinh_sach_han_muc_doi_tuong_chi_tiet
        CHECK (
            (
                doi_tuong = 'KHACH'
                AND loai_tai_khoan IS NULL
                AND goi_dich_vu_id IS NULL
            )
            OR
            (
                doi_tuong = 'NGUOI_DUNG'
                AND loai_tai_khoan IS NULL
                AND goi_dich_vu_id IS NULL
            )
            OR
            (
                doi_tuong = 'LOAI_TAI_KHOAN'
                AND loai_tai_khoan IS NOT NULL
                AND goi_dich_vu_id IS NULL
            )
            OR
            (
                doi_tuong = 'GOI_DICH_VU'
                AND loai_tai_khoan IS NULL
                AND goi_dich_vu_id IS NOT NULL
            )
        ),

    CONSTRAINT chk_chinh_sach_han_muc_don_vi
        CHECK (
            don_vi IN (
                'LAN',
                'TEP',
                'BYTE'
            )
        ),

    CONSTRAINT chk_chinh_sach_han_muc_chu_ky
        CHECK (
            chu_ky IN (
                'NGAY',
                'TUAN',
                'THANG',
                'TOAN_THOI_GIAN'
            )
        ),

    CONSTRAINT chk_chinh_sach_han_muc_gioi_han
        CHECK (
            (
                khong_gioi_han = TRUE
                AND gioi_han IS NULL
            )
            OR
            (
                khong_gioi_han = FALSE
                AND gioi_han IS NOT NULL
                AND gioi_han >= 0
            )
        ),

    CONSTRAINT chk_chinh_sach_han_muc_khi_vuot
        CHECK (
            hanh_dong_khi_vuot IN (
                'TU_CHOI',
                'YEU_CAU_DANG_NHAP',
                'YEU_CAU_NANG_CAP'
            )
        ),

    CONSTRAINT chk_chinh_sach_han_muc_hieu_luc
        CHECK (
            hieu_luc_den IS NULL
            OR hieu_luc_tu < hieu_luc_den
        ),

    CONSTRAINT chk_chinh_sach_han_muc_uu_tien
        CHECK (
            muc_do_uu_tien >= 1
        )
);


CREATE UNIQUE INDEX uq_chinh_sach_han_muc_ma
ON chinh_sach_han_muc (
    LOWER(ma)
);


CREATE INDEX idx_chinh_sach_han_muc_tim_kiem
ON chinh_sach_han_muc (
    doi_tuong,
    ma_hanh_dong,
    active,
    muc_do_uu_tien
);


CREATE INDEX idx_chinh_sach_han_muc_goi
ON chinh_sach_han_muc (
    goi_dich_vu_id,
    ma_hanh_dong
)
WHERE goi_dich_vu_id IS NOT NULL;


CREATE TRIGGER trg_chinh_sach_han_muc_updated_at
BEFORE UPDATE
ON chinh_sach_han_muc
FOR EACH ROW
EXECUTE FUNCTION fn_cap_nhat_updated_at();


COMMIT;