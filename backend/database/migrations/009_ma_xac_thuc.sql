BEGIN;


/*
 * ============================================================
 * MÃ XÁC THỰC
 * ============================================================
 */

CREATE TABLE ma_xac_thuc (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    nguoi_dung_id UUID,

    kenh VARCHAR(20) NOT NULL DEFAULT 'EMAIL',
    dia_chi VARCHAR(320) NOT NULL,

    muc_dich VARCHAR(50) NOT NULL,

    ma_hash CHAR(64) NOT NULL,

    trang_thai VARCHAR(30) NOT NULL DEFAULT 'CHO_XAC_THUC',

    so_lan_thu INTEGER NOT NULL DEFAULT 0,
    so_lan_thu_toi_da INTEGER NOT NULL DEFAULT 5,

    so_lan_gui INTEGER NOT NULL DEFAULT 1,
    gui_lan_cuoi_luc TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    het_han_luc TIMESTAMPTZ NOT NULL,

    xac_thuc_luc TIMESTAMPTZ,
    vo_hieu_luc TIMESTAMPTZ,

    request_id UUID NOT NULL DEFAULT gen_random_uuid(),

    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_ma_xac_thuc_nguoi_dung
        FOREIGN KEY (
            nguoi_dung_id
        )
        REFERENCES nguoi_dung (
            id
        )
        ON DELETE SET NULL,

    CONSTRAINT chk_ma_xac_thuc_kenh
        CHECK (
            kenh IN (
                'EMAIL',
                'SMS'
            )
        ),

    CONSTRAINT chk_ma_xac_thuc_trang_thai
        CHECK (
            trang_thai IN (
                'CHO_XAC_THUC',
                'DA_XAC_THUC',
                'HET_HAN',
                'VO_HIEU_HOA',
                'VUOT_SO_LAN_THU'
            )
        ),

    CONSTRAINT chk_ma_xac_thuc_so_lan
        CHECK (
            so_lan_thu >= 0
            AND so_lan_thu_toi_da > 0
            AND so_lan_gui > 0
        )
);


CREATE UNIQUE INDEX uq_ma_xac_thuc_request
ON ma_xac_thuc (
    request_id
);


CREATE INDEX idx_ma_xac_thuc_dia_chi
ON ma_xac_thuc (
    LOWER(dia_chi),
    muc_dich,
    created_at DESC
);


CREATE INDEX idx_ma_xac_thuc_nguoi_dung
ON ma_xac_thuc (
    nguoi_dung_id,
    created_at DESC
)
WHERE nguoi_dung_id IS NOT NULL;


CREATE INDEX idx_ma_xac_thuc_cho_xac_thuc
ON ma_xac_thuc (
    LOWER(dia_chi),
    muc_dich,
    het_han_luc
)
WHERE trang_thai = 'CHO_XAC_THUC';


CREATE TRIGGER trg_ma_xac_thuc_updated_at
BEFORE UPDATE
ON ma_xac_thuc
FOR EACH ROW
EXECUTE FUNCTION fn_cap_nhat_updated_at();


COMMIT;