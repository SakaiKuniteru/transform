BEGIN;


/*
 * ============================================================
 * PHIÊN KHÁCH
 * ============================================================
 */

CREATE TABLE phien_khach (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    token_hash CHAR(64) NOT NULL,

    trang_thai VARCHAR(30) NOT NULL DEFAULT 'HOAT_DONG',

    dia_chi_ip_dau INET,
    dia_chi_ip_cuoi INET,

    user_agent_hash CHAR(64),

    lan_su_dung_cuoi_luc TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    het_han_luc TIMESTAMPTZ,

    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_phien_khach_trang_thai
        CHECK (
            trang_thai IN (
                'HOAT_DONG',
                'VO_HIEU_HOA'
            )
        )
);


CREATE UNIQUE INDEX uq_phien_khach_token
ON phien_khach (
    token_hash
);


CREATE INDEX idx_phien_khach_hoat_dong
ON phien_khach (
    lan_su_dung_cuoi_luc DESC
)
WHERE trang_thai = 'HOAT_DONG';


CREATE INDEX idx_phien_khach_het_han
ON phien_khach (
    het_han_luc
)
WHERE het_han_luc IS NOT NULL;


CREATE TRIGGER trg_phien_khach_updated_at
BEFORE UPDATE
ON phien_khach
FOR EACH ROW
EXECUTE FUNCTION fn_cap_nhat_updated_at();


/*
 * ============================================================
 * LIÊN KẾT CÁC BẢNG ĐÃ CÓ
 * ============================================================
 */

ALTER TABLE tep
ADD CONSTRAINT fk_tep_phien_khach
FOREIGN KEY (
    phien_khach_id
)
REFERENCES phien_khach (
    id
)
ON DELETE SET NULL;


ALTER TABLE cong_viec
ADD CONSTRAINT fk_cong_viec_phien_khach
FOREIGN KEY (
    phien_khach_id
)
REFERENCES phien_khach (
    id
)
ON DELETE SET NULL;


ALTER TABLE lich_su
ADD CONSTRAINT fk_lich_su_phien_khach
FOREIGN KEY (
    phien_khach_id
)
REFERENCES phien_khach (
    id
)
ON DELETE SET NULL;


ALTER TABLE nhat_ky
ADD CONSTRAINT fk_nhat_ky_phien_khach
FOREIGN KEY (
    phien_khach_id
)
REFERENCES phien_khach (
    id
)
ON DELETE SET NULL;


COMMIT;