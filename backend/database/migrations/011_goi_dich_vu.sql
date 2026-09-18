BEGIN;


/*
 * ============================================================
 * GÓI DỊCH VỤ
 * ============================================================
 */

CREATE TABLE goi_dich_vu (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    ma VARCHAR(50) NOT NULL,
    ten VARCHAR(255) NOT NULL,

    mo_ta TEXT,

    gia NUMERIC(18,2) NOT NULL DEFAULT 0,
    tien_te VARCHAR(3) NOT NULL DEFAULT 'VND',

    yeu_cau_thanh_toan BOOLEAN NOT NULL DEFAULT TRUE,

    chu_ky VARCHAR(30) NOT NULL DEFAULT 'THANG',
    so_chu_ky INTEGER NOT NULL DEFAULT 1,

    thu_tu INTEGER NOT NULL DEFAULT 0,

    active BOOLEAN NOT NULL DEFAULT TRUE,

    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xoa_luc TIMESTAMPTZ,

    CONSTRAINT chk_goi_dich_vu_gia
        CHECK (
            gia >= 0
        ),

    CONSTRAINT chk_goi_dich_vu_tien_te
        CHECK (
            tien_te ~ '^[A-Z]{3}$'
        ),

    CONSTRAINT chk_goi_dich_vu_chu_ky
        CHECK (
            chu_ky IN (
                'THANG',
                'NAM',
                'MOT_LAN'
            )
        ),

    CONSTRAINT chk_goi_dich_vu_so_chu_ky
        CHECK (
            so_chu_ky > 0
        ),

    CONSTRAINT chk_goi_dich_vu_mien_phi
        CHECK (
            yeu_cau_thanh_toan = TRUE
            OR gia = 0
        )
);


CREATE UNIQUE INDEX uq_goi_dich_vu_ma
ON goi_dich_vu (
    LOWER(ma)
)
WHERE xoa_luc IS NULL;


CREATE INDEX idx_goi_dich_vu_active
ON goi_dich_vu (
    active,
    thu_tu,
    created_at
)
WHERE xoa_luc IS NULL;


CREATE TRIGGER trg_goi_dich_vu_updated_at
BEFORE UPDATE
ON goi_dich_vu
FOR EACH ROW
EXECUTE FUNCTION fn_cap_nhat_updated_at();


COMMIT;