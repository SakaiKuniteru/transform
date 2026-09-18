BEGIN;


/*
 * ============================================================
 * PHIÊN BẢN TỆP
 * ============================================================
 */

CREATE TABLE phien_ban_tep (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    tep_id UUID NOT NULL,

    phien_ban_cha_id UUID,
    cong_viec_tao_id UUID,

    so_phien_ban INTEGER NOT NULL,

    loai_phien_ban VARCHAR(30) NOT NULL DEFAULT 'GOC',

    ten_tep VARCHAR(255) NOT NULL,
    phan_mo_rong VARCHAR(32),

    dinh_dang VARCHAR(50),
    mime_type VARCHAR(255),

    kich_thuoc_bytes BIGINT NOT NULL DEFAULT 0,

    hash_sha256 VARCHAR(64),

    storage_driver VARCHAR(30) NOT NULL,
    storage_bucket VARCHAR(255),
    storage_key TEXT NOT NULL,
    storage_etag VARCHAR(255),

    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,

    trang_thai VARCHAR(30) NOT NULL DEFAULT 'DANG_TAO',

    het_han_luc TIMESTAMPTZ,
    xoa_luc TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_phien_ban_tep_tep
        FOREIGN KEY (
            tep_id
        )
        REFERENCES tep (
            id
        )
        ON DELETE CASCADE,

    CONSTRAINT fk_phien_ban_tep_cha
        FOREIGN KEY (
            phien_ban_cha_id
        )
        REFERENCES phien_ban_tep (
            id
        )
        ON DELETE SET NULL,

    CONSTRAINT chk_phien_ban_tep_so_phien_ban
        CHECK (
            so_phien_ban > 0
        ),

    CONSTRAINT chk_phien_ban_tep_kich_thuoc
        CHECK (
            kich_thuoc_bytes >= 0
        ),

    CONSTRAINT chk_phien_ban_tep_hash
        CHECK (
            hash_sha256 IS NULL
            OR hash_sha256 ~ '^[0-9a-f]{64}$'
        ),

    CONSTRAINT chk_phien_ban_tep_loai
        CHECK (
            loai_phien_ban IN (
                'GOC',
                'LAM_VIEC',
                'KET_QUA',
                'TRUNG_GIAN',
                'XEM_TRUOC'
            )
        ),

    CONSTRAINT chk_phien_ban_tep_trang_thai
        CHECK (
            trang_thai IN (
                'DANG_TAO',
                'SAN_SANG',
                'LOI',
                'DA_XOA'
            )
        ),

    CONSTRAINT uq_phien_ban_tep_so
        UNIQUE (
            tep_id,
            so_phien_ban
        )
);


CREATE UNIQUE INDEX uq_phien_ban_tep_storage
ON phien_ban_tep (
    storage_driver,
    COALESCE(
        storage_bucket,
        ''
    ),
    storage_key
)
WHERE xoa_luc IS NULL;


CREATE INDEX idx_phien_ban_tep_tep
ON phien_ban_tep (
    tep_id,
    so_phien_ban DESC
);


CREATE INDEX idx_phien_ban_tep_cha
ON phien_ban_tep (
    phien_ban_cha_id
)
WHERE phien_ban_cha_id IS NOT NULL;


CREATE INDEX idx_phien_ban_tep_cong_viec_tao
ON phien_ban_tep (
    cong_viec_tao_id
)
WHERE cong_viec_tao_id IS NOT NULL;


CREATE INDEX idx_phien_ban_tep_hash
ON phien_ban_tep (
    hash_sha256
)
WHERE hash_sha256 IS NOT NULL;


CREATE INDEX idx_phien_ban_tep_het_han
ON phien_ban_tep (
    het_han_luc
)
WHERE het_han_luc IS NOT NULL
AND xoa_luc IS NULL;


CREATE TRIGGER trg_phien_ban_tep_updated_at
BEFORE UPDATE
ON phien_ban_tep
FOR EACH ROW
EXECUTE FUNCTION fn_cap_nhat_updated_at();


COMMIT;