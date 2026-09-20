'use strict';

const crypto = require('node:crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const env = require('../../config/env');
const { JWT_CONFIG } = require('../../config/security');
const MA_LOI = require('../../constants/ma-loi');
const {
    loiYeuCau,
    loiChuaXacThuc,
    loiKhongCoQuyen,
    loiXungDot,
    loiQuaNhieuYeuCau
} = require('../../utils/loi');
const { giaoDich } = require('../../infrastructure/database/transaction');
const nguoiDungRepository = require('../nguoi-dung/nguoi-dung.repository');
const repository = require('./xac-thuc.repository');
const MUC_DICH_OTP = Object.freeze({
    XAC_THUC_EMAIL: 'XAC_THUC_EMAIL',
    DAT_LAI_MAT_KHAU: 'DAT_LAI_MAT_KHAU'
});

function batBuocCauHinh(value, ten) {
    if (!value) { throw new Error(`Thiếu cấu hình ${ten}.`); }
    return value;
}

function layJwtConfig() {
    return {
        accessSecret: batBuocCauHinh(env.baoMat.jwtAccessSecret, 'JWT access secret'),
        refreshSecret: batBuocCauHinh(env.baoMat.jwtRefreshSecret, 'JWT refresh secret'),
        accessExpiresIn: env.baoMat.jwtAccessExpiresIn || '20m',
        refreshExpiresIn: env.baoMat.jwtRefreshExpiresIn || '30d',
        resetExpiresIn: '15m',
        issuer: env.baoMat.jwtIssuer || 'transform-backend',
        audience: env.baoMat.jwtAudience || 'transform-client'
    };
}

function layOtpConfig() {
    return {
        secret: batBuocCauHinh(env.otp?.secret, 'OTP_SECRET'),
        length: Number(env.otp?.length || 6),
        ttlSeconds: Number(env.otp?.ttlSeconds || 300),
        maxAttempts: Number(env.otp?.maxAttempts || 5),
        resendCooldownSeconds: Number(env.otp?.resendCooldownSeconds || 60),
        maxSendsPerHour: Number(env.otp?.maxSendsPerHour || 5)
    };
}

function chuanHoaEmail(value) {
    return String(value).trim().toLowerCase();
}

function chuanHoaTenDangNhap(value) {
    if (value === null || value === undefined || value === '') { return null; }
    return String(value).trim().toLowerCase();
}

function taoNguoiDungAnToan(nguoiDung) {
    if (!nguoiDung) { return null; }
    const { matKhauHash, ...anToan } = nguoiDung;
    return anToan;
}

function kiemTraTrangThaiTaiKhoan(nguoiDung, { yeuCauXacThucEmail = true } = {}) {
    if (nguoiDung.trangThai === 'TAM_KHOA') {
        throw loiKhongCoQuyen('Tài khoản đang bị tạm khóa.', MA_LOI.TAI_KHOAN_BI_KHOA);
    }
    if (nguoiDung.trangThai === 'VO_HIEU_HOA') {
        throw loiKhongCoQuyen('Tài khoản đã bị vô hiệu hóa.', MA_LOI.TAI_KHOAN_BI_VO_HIEU_HOA);
    }
    if (yeuCauXacThucEmail && !nguoiDung.emailXacThucLuc) {
        throw loiKhongCoQuyen('Email chưa được xác thực.', MA_LOI.EMAIL_CHUA_XAC_THUC);
    }
}

function taoOtpSo(length) {
    let ma = '';
    for (let i = 0; i < length; i += 1) { ma += crypto.randomInt(0, 10).toString(); }
    return ma;
}

function bamOtp(diaChi, mucDich, maOtp) {
    const config = layOtpConfig();
    return crypto
        .createHmac('sha256', config.secret)
        .update(`${mucDich}:${diaChi.toLowerCase()}:${maOtp}`)
        .digest('hex');
}

function bamToken(token) {
    return crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');
}

function soSanhHash(hashA, hashB) {
    if (!hashA || !hashB || hashA.length !== hashB.length) { return false; }
    return crypto.timingSafeEqual(
        Buffer.from(hashA, 'utf8'),
        Buffer.from(hashB, 'utf8')
    );
}

function layNgayHetHanToken(token) {
    const payload = jwt.decode(token);
    if (!payload?.exp) { throw new Error('Token không có thời gian hết hạn.'); }
    return new Date(payload.exp * 1000);
}

function taoAccessToken(nguoiDung, phienId) {
    const config = layJwtConfig();
    return jwt.sign(
        {
            typ: 'access',
            sid: phienId,
            loaiTaiKhoan: nguoiDung.loaiTaiKhoan
        },
        config.accessSecret,
        {
            algorithm: 'HS256',
            subject: String(nguoiDung.id),
            jwtid: crypto.randomUUID(),
            issuer: config.issuer,
            audience: config.audience,
            expiresIn: config.accessExpiresIn
        }
    );
}

function taoRefreshToken(nguoiDungId, jti) {
    const config = layJwtConfig();
    return jwt.sign(
        { typ: 'refresh' },
        config.refreshSecret,
        {
            algorithm: 'HS256',
            subject: String(nguoiDungId),
            jwtid: jti,
            issuer: config.issuer,
            audience: config.audience,
            expiresIn: config.refreshExpiresIn
        }
    );
}

function taoResetToken(nguoiDungId, otpId) {
    const config = layJwtConfig();
    return jwt.sign(
        { typ: 'password-reset', otpId },
        config.accessSecret,
        {
            algorithm: 'HS256',
            subject: String(nguoiDungId),
            jwtid: crypto.randomUUID(),
            issuer: config.issuer,
            audience: config.audience,
            expiresIn: config.resetExpiresIn
        }
    );
}

function xacThucJwt(token, secret) {
    const config = layJwtConfig();
    return jwt.verify(
        token,
        secret,
        {
            algorithms: ['HS256'],
            issuer: config.issuer,
            audience: config.audience
        }
    );
}


function xacThucRefreshToken(token) {
    const config = layJwtConfig();
    try {
        const payload = xacThucJwt(token, config.refreshSecret);
        if (payload.typ !== 'refresh' || !payload.sub || !payload.jti) {
            throw loiChuaXacThuc(
                'Refresh token không hợp lệ.',
                MA_LOI.REFRESH_TOKEN_KHONG_HOP_LE
            );
        }
        return payload;
    } catch (error) {
        if (error?.name === 'TokenExpiredError') {
            throw loiChuaXacThuc(
                'Refresh token đã hết hạn.',
                MA_LOI.REFRESH_TOKEN_HET_HAN
            );
        }
        if (error?.maLoi) { throw error; }
        throw loiChuaXacThuc(
            'Refresh token không hợp lệ.',
            MA_LOI.REFRESH_TOKEN_KHONG_HOP_LE
        );
    }
}


function xacThucResetToken(token) {
    const config = layJwtConfig();

    try {
        const payload = xacThucJwt(token, config.accessSecret);

        if (payload.typ !== 'password-reset' || !payload.sub || !payload.otpId) {
            throw loiChuaXacThuc(
                'Token đặt lại mật khẩu không hợp lệ.',
                MA_LOI.TOKEN_KHONG_HOP_LE
            );
        }

        return payload;
    } catch (error) {
        if (error?.name === 'TokenExpiredError') {
            throw loiChuaXacThuc(
                'Token đặt lại mật khẩu đã hết hạn.',
                MA_LOI.TOKEN_HET_HAN
            );
        }

        if (error?.maLoi) { throw error; }

        throw loiChuaXacThuc(
            'Token đặt lại mật khẩu không hợp lệ.',
            MA_LOI.TOKEN_KHONG_HOP_LE
        );
    }
}


function taoContextRequest(context = {}) {
    return {
        diaChiIp: context.diaChiIp || null,
        userAgent: context.userAgent || null
    };
}


async function taoCapToken(nguoiDung, context = {}, db) {
    const jti = crypto.randomUUID();
    const refreshToken = taoRefreshToken(nguoiDung.id, jti);
    const refreshTokenExpiresAt = layNgayHetHanToken(refreshToken);

    const phien = await repository.taoPhienDangNhap(
        {
            nguoiDungId: nguoiDung.id,
            jti,
            refreshTokenHash: bamToken(refreshToken),
            diaChiIp: context.diaChiIp,
            userAgent: context.userAgent,
            hetHanLuc: refreshTokenExpiresAt
        },
        db
    );

    const accessToken = taoAccessToken(nguoiDung, phien.id);

    return {
        accessToken,
        accessTokenExpiresAt: layNgayHetHanToken(accessToken),
        refreshToken,
        refreshTokenExpiresAt
    };
}


async function guiOtpNoiBo({
    nguoiDung,
    mucDich,
    requestId = null
}, db) {
    const config = layOtpConfig();
    const diaChi = chuanHoaEmail(nguoiDung.email);

    const tongGui = await repository.demSoLanGuiOtpTrongGio(
        {
            nguoiDungId: nguoiDung.id,
            diaChi,
            mucDich
        },
        db
    );

    if (tongGui >= config.maxSendsPerHour) {
        throw loiQuaNhieuYeuCau(
            'Bạn đã yêu cầu gửi mã xác thực quá nhiều lần.',
            MA_LOI.OTP_VUOT_SO_LAN_GUI
        );
    }

    const otpMoiNhat = await repository.layOtpMoiNhat(
        {
            nguoiDungId: nguoiDung.id,
            diaChi,
            mucDich
        },
        db
    );

    if (otpMoiNhat?.guiLanCuoiLuc) {
        const daQua = Math.floor((Date.now() - new Date(otpMoiNhat.guiLanCuoiLuc).getTime()) / 1000);

        if (daQua < config.resendCooldownSeconds) {
            throw loiQuaNhieuYeuCau(
                'Vui lòng chờ trước khi yêu cầu gửi lại mã xác thực.',
                MA_LOI.OTP_GUI_QUA_NHANH,
                null,
                {
                    thuLaiSauGiay: config.resendCooldownSeconds - daQua
                }
            );
        }
    }

    const maOtp = taoOtpSo(config.length);
    const maHash = bamOtp(diaChi, mucDich, maOtp);
    const hetHanLuc = new Date(Date.now() + config.ttlSeconds * 1000);

    let otp;

    if (otpMoiNhat?.trangThai === 'CHO_XAC_THUC') {
        otp = await repository.guiLaiOtp(
            otpMoiNhat.id,
            {
                maHash,
                soLanThuToiDa: config.maxAttempts,
                hetHanLuc,
                requestId
            },
            db
        );
    } else {
        otp = await repository.taoOtp(
            {
                nguoiDungId: nguoiDung.id,
                diaChi,
                mucDich,
                maHash,
                soLanThuToiDa: config.maxAttempts,
                hetHanLuc,
                requestId
            },
            db
        );
    }

    return {
        otpId: otp.id,
        hetHanLuc: otp.hetHanLuc,
        maOtpDevelopment: env.laDevelopment ? maOtp : null
    };
}


async function xacThucOtpNoiBo({
    nguoiDung,
    mucDich,
    maOtp
}, db) {
    const diaChi = chuanHoaEmail(nguoiDung.email);

    const otp = await repository.layOtpMoiNhat(
        {
            nguoiDungId: nguoiDung.id,
            diaChi,
            mucDich
        },
        db
    );

    if (!otp) {
        throw loiYeuCau(
            'Không tìm thấy mã xác thực.',
            MA_LOI.OTP_KHONG_TIM_THAY
        );
    }

    if (otp.trangThai === 'DA_XAC_THUC') {
        throw loiYeuCau(
            'Mã xác thực đã được sử dụng.',
            MA_LOI.OTP_DA_SU_DUNG
        );
    }

    if (otp.trangThai === 'VO_HIEU_HOA') {
        throw loiYeuCau(
            'Mã xác thực đã bị vô hiệu hóa.',
            MA_LOI.OTP_DA_VO_HIEU_HOA
        );
    }

    if (otp.trangThai === 'VUOT_SO_LAN_THU') {
        throw loiYeuCau(
            'Mã xác thực đã vượt quá số lần thử cho phép.',
            MA_LOI.OTP_VUOT_SO_LAN_THU
        );
    }

    if (otp.trangThai === 'HET_HAN' || new Date(otp.hetHanLuc).getTime() <= Date.now()) {
        await repository.danhDauOtpHetHan(otp.id, db);

        throw loiYeuCau(
            'Mã xác thực đã hết hạn.',
            MA_LOI.OTP_HET_HAN
        );
    }

    const maHash = bamOtp(diaChi, mucDich, maOtp);

    if (!soSanhHash(maHash, otp.maHash)) {
        const ketQua = await repository.tangLanThuOtp(otp.id, db);

        if (ketQua.trangThai === 'VUOT_SO_LAN_THU') {
            throw loiYeuCau(
                'Mã xác thực đã vượt quá số lần thử cho phép.',
                MA_LOI.OTP_VUOT_SO_LAN_THU
            );
        }

        throw loiYeuCau(
            'Mã xác thực không đúng.',
            MA_LOI.OTP_KHONG_HOP_LE
        );
    }

    await repository.danhDauOtpDaXacThuc(otp.id, db);

    return otp;
}


/*
 * ============================================================
 * ĐĂNG KÝ
 * ============================================================
 */

async function dangKy({
    email,
    tenDangNhap = null,
    hoTen,
    matKhau
}, context = {}) {
    const emailChuan = chuanHoaEmail(email);
    const tenDangNhapChuan = chuanHoaTenDangNhap(tenDangNhap);

    if (await nguoiDungRepository.emailDaTonTai(emailChuan)) {
        throw loiXungDot(
            'Email đã được sử dụng.',
            MA_LOI.EMAIL_DA_TON_TAI
        );
    }

    if (tenDangNhapChuan && await nguoiDungRepository.tenDangNhapDaTonTai(tenDangNhapChuan)) {
        throw loiXungDot(
            'Tên đăng nhập đã được sử dụng.',
            MA_LOI.TEN_DANG_NHAP_DA_TON_TAI
        );
    }

    const matKhauHash = await bcrypt.hash(
        matKhau,
        env.baoMat.bcryptRounds
    );

    return giaoDich(async (db) => {
        const nguoiDung = await nguoiDungRepository.taoMoi(
            {
                email: emailChuan,
                tenDangNhap: tenDangNhapChuan,
                hoTen: hoTen.trim(),
                matKhauHash,
                loaiTaiKhoan: LOAI_TAI_KHOAN.NGUOI_DUNG,
                trangThai: 'HOAT_DONG',
                emailXacThucLuc: null,
                caiDat: {
                    ngonNgu: 'vi',
                    muiGio: 'Asia/Ho_Chi_Minh',
                    giaoDien: 'system'
                }
            },
            db
        );

        const otp = await guiOtpNoiBo(
            {
                nguoiDung,
                mucDich: MUC_DICH_OTP.XAC_THUC_EMAIL,
                requestId: context.requestId
            },
            db
        );

        return {
            nguoiDung,
            ...otp
        };
    });
}


/*
 * ============================================================
 * XÁC THỰC EMAIL
 * ============================================================
 */

async function xacThucEmail({
    email,
    maOtp
}) {
    const nguoiDung = await repository.timNguoiDungTheoEmail(
        chuanHoaEmail(email)
    );

    if (!nguoiDung) {
        throw loiYeuCau(
            'Email hoặc mã xác thực không hợp lệ.',
            MA_LOI.OTP_KHONG_HOP_LE
        );
    }

    if (nguoiDung.emailXacThucLuc) {
        return taoNguoiDungAnToan(nguoiDung);
    }

    return giaoDich(async (db) => {
        await xacThucOtpNoiBo(
            {
                nguoiDung,
                mucDich: MUC_DICH_OTP.XAC_THUC_EMAIL,
                maOtp
            },
            db
        );

        return repository.xacThucEmail(
            nguoiDung.id,
            db
        );
    });
}


async function guiLaiOtpXacThucEmail({
    email
}, context = {}) {
    const nguoiDung = await repository.timNguoiDungTheoEmail(
        chuanHoaEmail(email)
    );

    if (!nguoiDung || nguoiDung.emailXacThucLuc) {
        return {
            daGui: true,
            maOtpDevelopment: null
        };
    }

    const otp = await guiOtpNoiBo({
        nguoiDung,
        mucDich: MUC_DICH_OTP.XAC_THUC_EMAIL,
        requestId: context.requestId
    });

    return {
        daGui: true,
        ...otp
    };
}


/*
 * ============================================================
 * ĐĂNG NHẬP
 * ============================================================
 */

async function dangNhap({
    tenDangNhap,
    matKhau
}, context = {}) {
    const nguoiDung = await repository.timNguoiDungTheoTenDangNhap(
        String(tenDangNhap).trim()
    );

    if (!nguoiDung) {
        throw loiChuaXacThuc(
            'Thông tin đăng nhập không đúng.',
            MA_LOI.THONG_TIN_DANG_NHAP_KHONG_DUNG
        );
    }

    const matKhauDung = await bcrypt.compare(
        matKhau,
        nguoiDung.matKhauHash
    );

    if (!matKhauDung) {
        throw loiChuaXacThuc(
            'Thông tin đăng nhập không đúng.',
            MA_LOI.THONG_TIN_DANG_NHAP_KHONG_DUNG
        );
    }

    kiemTraTrangThaiTaiKhoan(nguoiDung);

    const requestContext = taoContextRequest(context);

    const token = await giaoDich(async (db) => {
        const capToken = await taoCapToken(
            nguoiDung,
            requestContext,
            db
        );

        await repository.capNhatLanDangNhapCuoi(
            nguoiDung.id,
            db
        );

        return capToken;
    });

    return {
        nguoiDung: taoNguoiDungAnToan(nguoiDung),
        ...token
    };
}


/*
 * ============================================================
 * LÀM MỚI TOKEN
 * ============================================================
 */

async function lamMoiToken(refreshToken, context = {}) {
    if (!refreshToken) {
        throw loiChuaXacThuc(
            'Không tìm thấy refresh token.',
            MA_LOI.REFRESH_TOKEN_KHONG_HOP_LE
        );
    }

    const payload = xacThucRefreshToken(refreshToken);
    const refreshTokenHash = bamToken(refreshToken);
    const requestContext = taoContextRequest(context);

    return giaoDich(async (db) => {
        const phien = await repository.timPhienTheoJtiDeCapNhat(
            payload.jti,
            db
        );

        if (!phien || phien.voHieuHoaLuc) {
            throw loiChuaXacThuc(
                'Refresh token không còn hiệu lực.',
                MA_LOI.REFRESH_TOKEN_KHONG_HOP_LE
            );
        }

        if (String(phien.nguoiDungId) !== String(payload.sub)) {
            throw loiChuaXacThuc(
                'Refresh token không hợp lệ.',
                MA_LOI.REFRESH_TOKEN_KHONG_HOP_LE
            );
        }

        if (!soSanhHash(phien.refreshTokenHash, refreshTokenHash)) {
            throw loiChuaXacThuc(
                'Refresh token không hợp lệ.',
                MA_LOI.REFRESH_TOKEN_KHONG_HOP_LE
            );
        }

        if (new Date(phien.hetHanLuc).getTime() <= Date.now()) {
            await repository.thuHoiPhien(
                phien.phienId,
                'HET_HAN',
                db
            );

            throw loiChuaXacThuc(
                'Refresh token đã hết hạn.',
                MA_LOI.REFRESH_TOKEN_HET_HAN
            );
        }

        kiemTraTrangThaiTaiKhoan(phien);

        await repository.thuHoiPhien(
            phien.phienId,
            'LAM_MOI_TOKEN',
            db
        );

        const token = await taoCapToken(
            phien,
            requestContext,
            db
        );

        return {
            nguoiDung: taoNguoiDungAnToan(phien),
            ...token
        };
    });
}


/*
 * ============================================================
 * ĐĂNG XUẤT
 * ============================================================
 */

async function dangXuat(refreshToken) {
    if (!refreshToken) { return true; }

    let payload;

    try {
        payload = xacThucRefreshToken(refreshToken);
    } catch (error) {
        return true;
    }

    const phien = await repository.timPhienTheoJtiDeCapNhat(
        payload.jti
    );

    if (!phien) { return true; }

    if (soSanhHash(phien.refreshTokenHash, bamToken(refreshToken))) {
        await repository.thuHoiPhien(
            phien.phienId,
            'DANG_XUAT'
        );
    }

    return true;
}


async function dangXuatTatCa(nguoiDungId) {
    await repository.thuHoiTatCaPhien(
        nguoiDungId,
        'DANG_XUAT_TAT_CA'
    );

    return true;
}


/*
 * ============================================================
 * QUÊN MẬT KHẨU
 * ============================================================
 */

async function quenMatKhau({
    email
}, context = {}) {
    const nguoiDung = await repository.timNguoiDungTheoEmail(
        chuanHoaEmail(email)
    );

    if (!nguoiDung || nguoiDung.trangThai !== 'HOAT_DONG' || !nguoiDung.emailXacThucLuc) {
        return {
            daGui: true,
            maOtpDevelopment: null
        };
    }

    const otp = await guiOtpNoiBo({
        nguoiDung,
        mucDich: MUC_DICH_OTP.DAT_LAI_MAT_KHAU,
        requestId: context.requestId
    });

    return {
        daGui: true,
        ...otp
    };
}


async function xacThucOtpDatLaiMatKhau({
    email,
    maOtp
}) {
    const nguoiDung = await repository.timNguoiDungTheoEmail(
        chuanHoaEmail(email)
    );

    if (!nguoiDung) {
        throw loiYeuCau(
            'Email hoặc mã xác thực không hợp lệ.',
            MA_LOI.OTP_KHONG_HOP_LE
        );
    }

    const otp = await giaoDich(async (db) => {
        return xacThucOtpNoiBo(
            {
                nguoiDung,
                mucDich: MUC_DICH_OTP.DAT_LAI_MAT_KHAU,
                maOtp
            },
            db
        );
    });

    return {
        resetToken: taoResetToken(
            nguoiDung.id,
            otp.id
        )
    };
}


async function datLaiMatKhau({
    resetToken,
    matKhauMoi
}) {
    const payload = xacThucResetToken(resetToken);

    const matKhauHash = await bcrypt.hash(
        matKhauMoi,
        env.baoMat.bcryptRounds
    );

    await giaoDich(async (db) => {
        const otp = await repository.layOtpTheoIdDeCapNhat(
            payload.otpId,
            db
        );

        if (
            !otp
            || String(otp.nguoiDungId) !== String(payload.sub)
            || otp.mucDich !== MUC_DICH_OTP.DAT_LAI_MAT_KHAU
            || otp.trangThai !== 'DA_XAC_THUC'
        ) {
            throw loiChuaXacThuc(
                'Token đặt lại mật khẩu không hợp lệ.',
                MA_LOI.TOKEN_KHONG_HOP_LE
            );
        }

        if (otp.metadata?.datLaiMatKhauLuc) {
            throw loiChuaXacThuc(
                'Token đặt lại mật khẩu đã được sử dụng.',
                MA_LOI.TOKEN_KHONG_HOP_LE
            );
        }

        await repository.capNhatMatKhau(
            payload.sub,
            matKhauHash,
            db
        );

        await repository.danhDauOtpDaDatLaiMatKhau(
            otp.id,
            db
        );

        await repository.thuHoiTatCaPhien(
            payload.sub,
            'DAT_LAI_MAT_KHAU',
            db
        );
    });

    return true;
}


/*
 * ============================================================
 * ĐỔI MẬT KHẨU
 * ============================================================
 */

async function doiMatKhau(nguoiDungId, {
    matKhauHienTai,
    matKhauMoi
}) {
    const nguoiDung = await repository.timNguoiDungTheoId(
        nguoiDungId
    );

    if (!nguoiDung) {
        throw loiChuaXacThuc(
            'Tài khoản không còn tồn tại.',
            MA_LOI.CHUA_XAC_THUC
        );
    }

    const matKhauDung = await bcrypt.compare(
        matKhauHienTai,
        nguoiDung.matKhauHash
    );

    if (!matKhauDung) {
        throw loiYeuCau(
            'Mật khẩu hiện tại không đúng.',
            MA_LOI.MAT_KHAU_KHONG_DUNG
        );
    }

    const trungMatKhauCu = await bcrypt.compare(
        matKhauMoi,
        nguoiDung.matKhauHash
    );

    if (trungMatKhauCu) {
        throw loiYeuCau(
            'Mật khẩu mới phải khác mật khẩu hiện tại.',
            MA_LOI.MAT_KHAU_KHONG_HOP_LE
        );
    }

    const matKhauHash = await bcrypt.hash(
        matKhauMoi,
        env.baoMat.bcryptRounds
    );

    await giaoDich(async (db) => {
        await repository.capNhatMatKhau(
            nguoiDungId,
            matKhauHash,
            db
        );

        await repository.thuHoiTatCaPhien(
            nguoiDungId,
            'DOI_MAT_KHAU',
            db
        );
    });

    return true;
}


/*
 * ============================================================
 * XÁC THỰC ACCESS TOKEN
 * ============================================================
 */

async function xacThucAccessToken(accessToken) {
    const config = layJwtConfig();

    let payload;

    try {
        payload = xacThucJwt(
            accessToken,
            config.accessSecret
        );
    } catch (error) {
        if (error?.name === 'TokenExpiredError') {
            throw loiChuaXacThuc(
                'Access token đã hết hạn.',
                MA_LOI.TOKEN_HET_HAN
            );
        }

        throw loiChuaXacThuc(
            'Access token không hợp lệ.',
            MA_LOI.TOKEN_KHONG_HOP_LE
        );
    }
    if (payload.typ !== 'access' || !payload.sub || !payload.sid) {
        throw loiChuaXacThuc(
            'Access token không hợp lệ.',
            MA_LOI.TOKEN_KHONG_HOP_LE
        );
    }
    const phien = await repository.timPhienAccess(
        payload.sid
    );
    if (!phien || phien.voHieuHoaLuc) {
        throw loiChuaXacThuc(
            'Phiên đăng nhập không còn hiệu lực.',
            MA_LOI.TOKEN_KHONG_HOP_LE
        );
    }
    if (String(phien.nguoiDungId) !== String(payload.sub)) {
        throw loiChuaXacThuc(
            'Access token không hợp lệ.',
            MA_LOI.TOKEN_KHONG_HOP_LE
        );
    }
    if (new Date(phien.hetHanLuc).getTime() <= Date.now()) {
        throw loiChuaXacThuc(
            'Phiên đăng nhập đã hết hạn.',
            MA_LOI.TOKEN_HET_HAN
        );
    }
    kiemTraTrangThaiTaiKhoan(phien);
    return {
        user: {
            id: phien.nguoiDungId,
            email: phien.email,
            tenDangNhap: phien.tenDangNhap,
            hoTen: phien.hoTen,
            loaiTaiKhoan: phien.loaiTaiKhoan,
            trangThai: phien.trangThai,
            emailXacThucLuc: phien.emailXacThucLuc,
            caiDat: phien.caiDat
        },
        auth: {
            sessionId: phien.phienId,
            tokenId: payload.jti
        }
    };
}

module.exports = {
    MUC_DICH_OTP,
    dangKy,
    xacThucEmail,
    guiLaiOtpXacThucEmail,
    dangNhap,
    lamMoiToken,
    dangXuat,
    dangXuatTatCa,
    quenMatKhau,
    xacThucOtpDatLaiMatKhau,
    datLaiMatKhau,
    doiMatKhau,
    xacThucAccessToken
};