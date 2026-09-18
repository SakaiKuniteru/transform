BEGIN;


/*
 * ============================================================
 * TỆP
 * ============================================================
 */

CREATE TABLE tep (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    nguoi_dung_id UUID,
    phien_khach_id UUID,

    ho_ten VARCHAR(255) NOT NULL,
    mo_ta TEXT,

    nguon_tao VARCHAR(30) NOT NULL DEFAULT 'UPLOAD',
    trang_thai VARCHAR(30) NOT NULL DEFAULT 'HOAT_DONG',

    thuoc_tinh JSONB NOT NULL DEFAULT '{}'::JSONB,

    het_han_luc TIMESTAMPTZ,
    xoa_luc TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_tep_nguoi_dung
        FOREIGN KEY (
            nguoi_dung_id
        )
        REFERENCES nguoi_dung (
            id
        )
        ON DELETE SET NULL,

    CONSTRAINT chk_tep_chu_so_huu
        CHECK (
            NOT (
                nguoi_dung_id IS NOT NULL
                AND phien_khach_id IS NOT NULL
            )
        ),

    CONSTRAINT chk_tep_nguon_tao
        CHECK (
            nguon_tao IN (
                'UPLOAD',
                'CONG_VIEC',
                'HE_THONG'
            )
        ),

    CONSTRAINT chk_tep_trang_thai
        CHECK (
            trang_thai IN (
                'HOAT_DONG',
                'HET_HAN',
                'DA_XOA'
            )
        )
);


CREATE INDEX idx_tep_nguoi_dung
ON tep (
    nguoi_dung_id,
    created_at DESC
)
WHERE xoa_luc IS NULL;


CREATE INDEX idx_tep_phien_khach
ON tep (
    phien_khach_id,
    created_at DESC
)
WHERE phien_khach_id IS NOT NULL
AND xoa_luc IS NULL;


CREATE INDEX idx_tep_trang_thai
ON tep (
    trang_thai,
    created_at DESC
);


CREATE INDEX idx_tep_het_han
ON tep (
    het_han_luc
)
WHERE het_han_luc IS NOT NULL
AND xoa_luc IS NULL;


CREATE TRIGGER trg_tep_updated_at
BEFORE UPDATE
ON tep
FOR EACH ROW
EXECUTE FUNCTION fn_cap_nhat_updated_at();


COMMIT;