BEGIN;


/*
 * ============================================================
 * LỊCH SỬ
 * ============================================================
 */

CREATE TABLE lich_su (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    nguoi_dung_id UUID,
    phien_khach_id UUID,

    cong_viec_id UUID,
    tep_id UUID,
    phien_ban_tep_id UUID,

    loai_su_kien VARCHAR(100) NOT NULL,
    nguon VARCHAR(50) NOT NULL DEFAULT 'HE_THONG',

    tieu_de VARCHAR(255) NOT NULL,
    mo_ta TEXT,

    du_lieu JSONB NOT NULL DEFAULT '{}'::JSONB,

    hien_thi_cho_nguoi_dung BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_lich_su_nguoi_dung
        FOREIGN KEY (
            nguoi_dung_id
        )
        REFERENCES nguoi_dung (
            id
        )
        ON DELETE SET NULL,

    CONSTRAINT fk_lich_su_cong_viec
        FOREIGN KEY (
            cong_viec_id
        )
        REFERENCES cong_viec (
            id
        )
        ON DELETE SET NULL,

    CONSTRAINT fk_lich_su_tep
        FOREIGN KEY (
            tep_id
        )
        REFERENCES tep (
            id
        )
        ON DELETE SET NULL,

    CONSTRAINT fk_lich_su_phien_ban_tep
        FOREIGN KEY (
            phien_ban_tep_id
        )
        REFERENCES phien_ban_tep (
            id
        )
        ON DELETE SET NULL,

    CONSTRAINT chk_lich_su_chu_so_huu
        CHECK (
            NOT (
                nguoi_dung_id IS NOT NULL
                AND phien_khach_id IS NOT NULL
            )
        )
);


CREATE INDEX idx_lich_su_nguoi_dung
ON lich_su (
    nguoi_dung_id,
    created_at DESC
)
WHERE nguoi_dung_id IS NOT NULL;


CREATE INDEX idx_lich_su_phien_khach
ON lich_su (
    phien_khach_id,
    created_at DESC
)
WHERE phien_khach_id IS NOT NULL;


CREATE INDEX idx_lich_su_cong_viec
ON lich_su (
    cong_viec_id,
    created_at DESC
)
WHERE cong_viec_id IS NOT NULL;


CREATE INDEX idx_lich_su_tep
ON lich_su (
    tep_id,
    created_at DESC
)
WHERE tep_id IS NOT NULL;


CREATE INDEX idx_lich_su_loai_su_kien
ON lich_su (
    loai_su_kien,
    created_at DESC
);


CREATE INDEX idx_lich_su_hien_thi
ON lich_su (
    created_at DESC
)
WHERE hien_thi_cho_nguoi_dung = TRUE;


COMMIT;