'use strict';

const fs = require('node:fs');
const path = require('node:path');

function doiSangPosix(value = '') { return String(value).replaceAll('\\', '/'); }

function chuanHoaDuongDanTuongDoi(value) {
    if (typeof value !== 'string' || !value.trim()) { throw new TypeError('Đường dẫn tương đối không hợp lệ.'); }

    const ketQua = path.posix.normalize(doiSangPosix(value.trim())).replace(/^\/+/, '');
    if (!ketQua || ketQua === '.' || ketQua === '..' || ketQua.startsWith('../') || path.posix.isAbsolute(ketQua)) {
        throw new TypeError('Đường dẫn tương đối không hợp lệ.');
    }
    return ketQua;
}

function chuanHoaDuongDanTuyetDoi(value) {
    if (typeof value !== 'string' || !value.trim()) { throw new TypeError('Đường dẫn tuyệt đối không hợp lệ.'); }
    return path.resolve(value.trim());
}

function laNamTrongThuMuc(root, duongDan) {
    const rootHopLe = chuanHoaDuongDanTuyetDoi(root);
    const duongDanHopLe = chuanHoaDuongDanTuyetDoi(duongDan);
    const relative = path.relative(rootHopLe, duongDanHopLe);
    return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
}

function noiTrongThuMuc(root, duongDanTuongDoi) {
    const rootHopLe = chuanHoaDuongDanTuyetDoi(root);
    const relative = chuanHoaDuongDanTuongDoi(duongDanTuongDoi);
    const ketQua = path.resolve(rootHopLe, ...relative.split('/'));
    if (!laNamTrongThuMuc(rootHopLe, ketQua)) { throw new Error('Đường dẫn nằm ngoài thư mục cho phép.'); }
    return ketQua;
}

function layDuongDanTuongDoi(root, duongDan) {
    const rootHopLe = chuanHoaDuongDanTuyetDoi(root);
    const duongDanHopLe = chuanHoaDuongDanTuyetDoi(duongDan);
    if (!laNamTrongThuMuc(rootHopLe, duongDanHopLe)) { throw new Error('Đường dẫn nằm ngoài thư mục cho phép.'); }
    return doiSangPosix(path.relative(rootHopLe, duongDanHopLe));
}

async function damBaoThuMuc(duongDan) {
    const value = chuanHoaDuongDanTuyetDoi(duongDan);
    await fs.promises.mkdir(value, { recursive: true });
    return value;
}

async function damBaoThuMucCha(duongDanTep) {
    const value = chuanHoaDuongDanTuyetDoi(duongDanTep);
    await fs.promises.mkdir(path.dirname(value), { recursive: true });
    return value;
}

async function tonTai(duongDan) {
    try {
        await fs.promises.access(duongDan, fs.constants.F_OK);
        return true;
    } catch (error) {
        if (error.code === 'ENOENT') { return false; }
        throw error;
    }
}

module.exports = {
    doiSangPosix,
    chuanHoaDuongDanTuongDoi,
    chuanHoaDuongDanTuyetDoi,
    laNamTrongThuMuc,
    noiTrongThuMuc,
    layDuongDanTuongDoi,
    damBaoThuMuc,
    damBaoThuMucCha,
    tonTai
};