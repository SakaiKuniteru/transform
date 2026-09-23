'use strict';
const authService = require('./auth.service');
const permissionService = require('../../core/auth/permission.service');
const { renderForm } = require('../../core/forms/form-renderer');
const { batBuocHopLe } = require('../../core/forms/form-validator');
const { FormError } = require('../../core/forms/form-error');
const { taoViewContext } = require('../../core/views/view-context');
const { dangNhapForm } = require('./forms/dang-nhap.form');
const { dangKyForm } = require('./forms/dang-ky.form');
const { xacThucEmailForm } = require('./forms/xac-thuc-email.form');
const { guiLaiOtpForm } = require('./forms/gui-lai-otp.form');
const { quenMatKhauForm } = require('./forms/quen-mat-khau.form');
const { taoDatLaiMatKhauForm } = require('./forms/dat-lai-mat-khau.form');
const { doiMatKhauForm } = require('./forms/doi-mat-khau.form');
const TEN_AUTH_FLOW = '_authFlow';

function layAuthFlow(req) {
    if (!req.session[TEN_AUTH_FLOW] || typeof req.session[TEN_AUTH_FLOW] !== 'object') { req.session[TEN_AUTH_FLOW] = {}; }
    return req.session[TEN_AUTH_FLOW];
}

function capNhatAuthFlow(req, data = {}) {
    const flow = layAuthFlow(req);
    Object.assign(flow, data);
    return flow;
}

function xoaAuthFlow(req, ...keys) {
    const flow = layAuthFlow(req);
    for (const key of keys.flat(Infinity).filter(Boolean)) { delete flow[key]; }
    if (!Object.keys(flow).length) { delete req.session[TEN_AUTH_FLOW]; }
}

function taoFormState(values = {}, error = null) {
    if (!error) { return { values }; }
    const formError = error instanceof FormError ? error : FormError.tuApiError(error);
    return { values, errors: formError.errors, globalErrors: formError.globalErrors, submitted: true, valid: false };
}

function renderAuthPage(req, res, options) {
    const form = renderForm(options.form, options.state || {}, { csrfToken: res.locals.csrfToken, ...(options.context || {}) });
    const data = taoViewContext(req, res, { layout: 'auth', page: { title: options.title, noIndex: true }, form, ...(options.data || {}) });
    return res.status(options.statusCode || 200).render(options.view, data);
}

function xuLyLoiForm(error, req, res, next, options) {
    const statusCode = Number(error?.statusCode || 400);
    if (statusCode >= 500) { return next(error); }
    return renderAuthPage(req, res, { ...options, statusCode, state: taoFormState(options.values || req.body || {}, error) });
}

function layTrangSauDangNhap(nguoiDung) {
    if (permissionService.laQuanTri(nguoiDung)) { return '/admin'; }
    if (permissionService.laNguoiDung(nguoiDung)) { return '/user'; }
    return '/';
}

function dangNhapPage(req, res) { return renderAuthPage(req, res, { view: 'pages/auth/dang-nhap', title: 'Đăng nhập | Transform', form: dangNhapForm }); }

async function dangNhapPost(req, res, next) {
    try { const values = await batBuocHopLe(dangNhapForm, req.body, { req }); const ketQua = await authService.dangNhap(req, values); req.flash('success', 'Đăng nhập thành công.'); return res.redirect(303, layTrangSauDangNhap(ketQua.nguoiDung)); } catch (error) { return xuLyLoiForm(error, req, res, next, { view: 'pages/auth/dang-nhap', title: 'Đăng nhập | Transform', form: dangNhapForm }); }
}

function dangKyPage(req, res) { return renderAuthPage(req, res, { view: 'pages/auth/dang-ky', title: 'Đăng ký | Transform', form: dangKyForm }); }

async function dangKyPost(req, res, next) {
    try { const values = await batBuocHopLe(dangKyForm, req.body, { req }); const ketQua = await authService.dangKy(req, values); capNhatAuthFlow(req, { emailXacThuc: values.email, otpXacThucHetHanLuc: ketQua?.otpHetHanLuc || null }); req.flash('success', 'Tài khoản đã được tạo. Vui lòng kiểm tra email để lấy mã xác thực.'); return res.redirect(303, '/xac-thuc-email'); } catch (error) { return xuLyLoiForm(error, req, res, next, { view: 'pages/auth/dang-ky', title: 'Đăng ký | Transform', form: dangKyForm }); }
}

function xacThucEmailPage(req, res) {
    const flow = layAuthFlow(req);
    return renderAuthPage(req, res, { view: 'pages/auth/xac-thuc-email', title: 'Xác thực email | Transform', form: xacThucEmailForm, state: { values: { email: flow.emailXacThuc || '' } }, data: { otpHetHanLuc: flow.otpXacThucHetHanLuc || null, guiLaiOtpForm: renderForm(guiLaiOtpForm, { values: { email: flow.emailXacThuc || '' } }, { csrfToken: res.locals.csrfToken }) } });
}

async function xacThucEmailPost(req, res, next) {
    try { const values = await batBuocHopLe(xacThucEmailForm, req.body, { req }); await authService.xacThucEmail(req, values); xoaAuthFlow(req, 'emailXacThuc', 'otpXacThucHetHanLuc'); req.flash('success', 'Xác thực email thành công. Bạn có thể đăng nhập.'); return res.redirect(303, '/dang-nhap'); } catch (error) { const email = req.body?.email || layAuthFlow(req).emailXacThuc || ''; return xuLyLoiForm(error, req, res, next, { view: 'pages/auth/xac-thuc-email', title: 'Xác thực email | Transform', form: xacThucEmailForm, data: { otpHetHanLuc: layAuthFlow(req).otpXacThucHetHanLuc || null, guiLaiOtpForm: renderForm(guiLaiOtpForm, { values: { email } }, { csrfToken: res.locals.csrfToken }) } }); }
}

async function guiLaiOtpPost(req, res, next) {
    try { const flow = layAuthFlow(req); const input = { ...req.body, email: req.body?.email || flow.emailXacThuc || '' }; const values = await batBuocHopLe(guiLaiOtpForm, input, { req }); const ketQua = await authService.guiLaiOtp(req, values); capNhatAuthFlow(req, { emailXacThuc: values.email, otpXacThucHetHanLuc: ketQua?.otpHetHanLuc || null }); req.flash('success', 'Nếu tài khoản hợp lệ, mã xác thực đã được gửi lại.'); return res.redirect(303, '/xac-thuc-email'); } catch (error) { if (Number(error?.statusCode || 400) >= 500) { return next(error); } req.flash('error', error.message || 'Không thể gửi lại mã xác thực.'); return res.redirect(303, '/xac-thuc-email'); }
}

function quenMatKhauPage(req, res) { return renderAuthPage(req, res, { view: 'pages/auth/quen-mat-khau', title: 'Quên mật khẩu | Transform', form: quenMatKhauForm }); }

async function quenMatKhauPost(req, res, next) {
    try { const values = await batBuocHopLe(quenMatKhauForm, req.body, { req }); const ketQua = await authService.quenMatKhau(req, values); capNhatAuthFlow(req, { emailDatLaiMatKhau: values.email, resetToken: null, otpDatLaiHetHanLuc: ketQua?.otpHetHanLuc || null }); req.flash('success', 'Nếu email tồn tại, mã xác thực đã được gửi.'); return res.redirect(303, '/dat-lai-mat-khau'); } catch (error) { return xuLyLoiForm(error, req, res, next, { view: 'pages/auth/quen-mat-khau', title: 'Quên mật khẩu | Transform', form: quenMatKhauForm }); }
}

function datLaiMatKhauPage(req, res) {
    const flow = layAuthFlow(req);
    if (!flow.emailDatLaiMatKhau) { req.flash('warning', 'Vui lòng yêu cầu mã đặt lại mật khẩu trước.'); return res.redirect(303, '/quen-mat-khau'); }
    const buoc = flow.resetToken ? 'mat-khau' : 'otp';
    return renderAuthPage(req, res, { view: 'pages/auth/dat-lai-mat-khau', title: 'Đặt lại mật khẩu | Transform', form: taoDatLaiMatKhauForm({ buoc }), context: { buoc }, data: { buoc, email: flow.emailDatLaiMatKhau, otpHetHanLuc: flow.otpDatLaiHetHanLuc || null } });
}

async function datLaiMatKhauPost(req, res, next) {
    const flow = layAuthFlow(req);
    if (!flow.emailDatLaiMatKhau) { req.flash('warning', 'Vui lòng yêu cầu mã đặt lại mật khẩu trước.'); return res.redirect(303, '/quen-mat-khau'); }
    const buoc = flow.resetToken ? 'mat-khau' : 'otp';
    const form = taoDatLaiMatKhauForm({ buoc });
    try {
        const values = await batBuocHopLe(form, req.body, { req, buoc });
        if (buoc === 'otp') { const ketQua = await authService.xacThucOtpDatLaiMatKhau(req, { email: flow.emailDatLaiMatKhau, maOtp: values.maOtp }); capNhatAuthFlow(req, { resetToken: ketQua.resetToken }); req.flash('success', 'Mã xác thực hợp lệ. Hãy tạo mật khẩu mới.'); return res.redirect(303, '/dat-lai-mat-khau'); }
        await authService.datLaiMatKhau(req, { resetToken: flow.resetToken, matKhauMoi: values.matKhauMoi });
        xoaAuthFlow(req, 'emailDatLaiMatKhau', 'resetToken', 'otpDatLaiHetHanLuc');
        req.flash('success', 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới.');
        return res.redirect(303, '/dang-nhap');
    } catch (error) {
        if (buoc === 'mat-khau' && [ 'TOKEN_KHONG_HOP_LE', 'TOKEN_HET_HAN' ].includes(error?.code)) { xoaAuthFlow(req, 'emailDatLaiMatKhau', 'resetToken', 'otpDatLaiHetHanLuc'); req.flash('warning', 'Phiên đặt lại mật khẩu đã hết hiệu lực. Vui lòng yêu cầu mã mới.'); return res.redirect(303, '/quen-mat-khau'); }
        return xuLyLoiForm(error, req, res, next, { view: 'pages/auth/dat-lai-mat-khau', title: 'Đặt lại mật khẩu | Transform', form, context: { buoc }, data: { buoc, email: flow.emailDatLaiMatKhau, otpHetHanLuc: flow.otpDatLaiHetHanLuc || null } });
    }
}

async function doiMatKhauPost(req, res, next) {
    try { const values = await batBuocHopLe(doiMatKhauForm, req.body, { req }); await authService.doiMatKhau(req, values); req.flash('success', 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.'); return res.redirect(303, '/dang-nhap'); } catch (error) { return next(error); }
}

async function dangXuatPost(req, res, next) {
    try { await authService.dangXuat(req); req.flash('success', 'Đã đăng xuất.'); return res.redirect(303, '/dang-nhap'); } catch (error) { return next(error); }
}

async function dangXuatTatCaPost(req, res, next) {
    try { await authService.dangXuatTatCa(req); req.flash('success', 'Đã đăng xuất khỏi tất cả phiên.'); return res.redirect(303, '/dang-nhap'); } catch (error) { return next(error); }
}

module.exports = {
    dangNhapPage,
    dangNhapPost,
    dangKyPage,
    dangKyPost,
    xacThucEmailPage,
    xacThucEmailPost,
    guiLaiOtpPost,
    quenMatKhauPage,
    quenMatKhauPost,
    datLaiMatKhauPage,
    datLaiMatKhauPost,
    doiMatKhauPost,
    dangXuatPost,
    dangXuatTatCaPost
};