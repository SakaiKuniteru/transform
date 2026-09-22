'use strict';

const crypto = require('node:crypto');
const { layPool } = require('./runtime-test.helper');
const { bamOtp } = require('../../src/modules/xac-thuc/otp/otp.service');
const { MUC_DICH_OTP } = require('../../src/modules/xac-thuc/otp/otp.constant');

function taoDanhTinh(prefix = 'auth') {
    const suffix = `${Date.now()}-${crypto.randomBytes(5).toString('hex')}`;
    return {
        email: `${prefix}-${suffix}@transform.local`,
        tenDangNhap: `${prefix}_${suffix.replaceAll('-', '_')}`,
        hoTen: 'Người dùng Auth Test',
        matKhau: 'Test@123456'
    };
}

async function dangKyQuaApi(agent, options = {}) {
    const duLieu = { ...taoDanhTinh(options.prefix || 'auth'), ...options };
    delete duLieu.prefix;
    const response = await agent.post('/api/v1/xac-thuc/dang-ky').send(duLieu);
    return { duLieu, response };
}

async function layNguoiDungTheoEmail(email) {
    const result = await layPool().query(`
        SELECT id,email,ten_dang_nhap AS "tenDangNhap",ho_ten AS "hoTen",trang_thai AS "trangThai",email_xac_thuc_luc AS "emailXacThucLuc"
        FROM nguoi_dung
        WHERE LOWER(email)=LOWER($1)
        AND xoa_luc IS NULL
        LIMIT 1
    `, [email]);
    return result.rows[0] || null;
}

async function layOtpMoiNhat(email, mucDich) {
    const result = await layPool().query(`
        SELECT id,nguoi_dung_id AS "nguoiDungId",dia_chi AS "diaChi",muc_dich AS "mucDich",ma_hash AS "maHash",trang_thai AS "trangThai",so_lan_thu AS "soLanThu",so_lan_gui AS "soLanGui",gui_lan_cuoi_luc AS "guiLanCuoiLuc",het_han_luc AS "hetHanLuc",xac_thuc_luc AS "xacThucLuc",metadata
        FROM ma_xac_thuc
        WHERE LOWER(dia_chi)=LOWER($1)
        AND muc_dich=$2
        ORDER BY created_at DESC
        LIMIT 1
    `, [email, mucDich]);
    return result.rows[0] || null;
}

async function datMaOtpTest(email, mucDich, maOtp = '123456') {
    const maHash = bamOtp(email, mucDich, maOtp);
    const result = await layPool().query(`
        UPDATE ma_xac_thuc
        SET ma_hash=$1,trang_thai='CHO_XAC_THUC',so_lan_thu=0,het_han_luc=NOW()+INTERVAL '10 minutes',xac_thuc_luc=NULL,vo_hieu_hoa_luc=NULL
        WHERE id=(
            SELECT id
            FROM ma_xac_thuc
            WHERE LOWER(dia_chi)=LOWER($2)
            AND muc_dich=$3
            ORDER BY created_at DESC
            LIMIT 1
        )
        RETURNING id
    `, [maHash, email, mucDich]);
    if (!result.rows[0]) { throw new Error(`Không tìm thấy OTP ${mucDich} của ${email}.`); }
    return maOtp;
}

async function choPhepGuiLaiOtp(email, mucDich) {
    const result = await layPool().query(`
        UPDATE ma_xac_thuc
        SET gui_lan_cuoi_luc=NOW()-INTERVAL '10 minutes'
        WHERE id=(
            SELECT id
            FROM ma_xac_thuc
            WHERE LOWER(dia_chi)=LOWER($1)
            AND muc_dich=$2
            ORDER BY created_at DESC
            LIMIT 1
        )
        RETURNING id
    `, [email, mucDich]);
    if (!result.rows[0]) { throw new Error(`Không tìm thấy OTP ${mucDich} để mở cooldown.`); }
}

async function xacThucEmailQuaApi(agent, email, maOtp = '123456') { return agent.post('/api/v1/xac-thuc/xac-thuc-email').send({ email, maOtp }); }

module.exports = {
    MUC_DICH_OTP,
    taoDanhTinh,
    dangKyQuaApi,
    layNguoiDungTheoEmail,
    layOtpMoiNhat,
    datMaOtpTest,
    choPhepGuiLaiOtp,
    xacThucEmailQuaApi
};