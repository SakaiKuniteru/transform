BEGIN;


/*
 * ============================================================
 * SỬ DỤNG HẠN MỨC
 * ============================================================
 */

CREATE TABLE su_dung_han_muc (
    id BIGSERIAL PRIMARY KEY,

    nguoi_dung_id UUID,
    phien_khach_id UUID,

    chinh_sach_han_muc_id UUID,

    ma_hanh_dong VARCHAR(50) NOT NULL,
    don_vi VARCHAR(20) NOT NULL,

    ky_bat_dau TIMESTAMPTZ NOT NULL,
    ky_ket_thuc TIMESTAMPTZ NOT NULL,

    da_su_dung BIGINT NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_su_dung_han_muc_nguoi_dung
        FOREIGN KEY (
            nguoi_dung_id
        )
        REFERENCES nguoi_dung (
            id
        )
        ON DELETE CASCADE,

    CONSTRAINT fk_su_dung_han_muc_phien_khach
        FOREIGN KEY (
            phien_khach_id
        )
        REFERENCES phien_khach (
            id
        )
        ON DELETE CASCADE,

    CONSTRAINT fk_su_dung_han_muc_chinh_sach
        FOREIGN KEY (
            chinh_sach_han_muc_id
        )
        REFERENCES chinh_sach_han_muc (
            id
        )
        ON DELETE SET NULL,

    CONSTRAINT chk_su_dung_han_muc_chu_the
        CHECK (
            (
                nguoi_dung_id IS NOT NULL
                AND phien_khach_id IS NULL
            )
            OR
            (
                nguoi_dung_id IS NULL
                AND phien_khach_id IS NOT NULL
            )
        ),

    CONSTRAINT chk_su_dung_han_muc_don_vi
        CHECK (
            don_vi IN (
                'LAN',
                'TEP',
                'BYTE'
            )
        ),

    CONSTRAINT chk_su_dung_han_muc_so_luong
        CHECK (
            da_su_dung >= 0
        ),

    CONSTRAINT chk_su_dung_han_muc_ky
        CHECK (
            ky_bat_dau < ky_ket_thuc
        )
);


CREATE UNIQUE INDEX uq_su_dung_han_muc_nguoi_dung
ON su_dung_han_muc (
    nguoi_dung_id,
    ma_hanh_dong,
    don_vi,
    ky_bat_dau,
    ky_ket_thuc
)
WHERE nguoi_dung_id IS NOT NULL;


CREATE UNIQUE INDEX uq_su_dung_han_muc_phien_khach
ON su_dung_han_muc (
    phien_khach_id,
    ma_hanh_dong,
    don_vi,
    ky_bat_dau,
    ky_ket_thuc
)
WHERE phien_khach_id IS NOT NULL;


CREATE INDEX idx_su_dung_han_muc_ky
ON su_dung_han_muc (
    ky_ket_thuc
);


CREATE INDEX idx_su_dung_han_muc_hanh_dong
ON su_dung_han_muc (
    ma_hanh_dong,
    ky_bat_dau,
    ky_ket_thuc
);


CREATE TRIGGER trg_su_dung_han_muc_updated_at
BEFORE UPDATE
ON su_dung_han_muc
FOR EACH ROW
EXECUTE FUNCTION fn_cap_nhat_updated_at();


COMMIT;