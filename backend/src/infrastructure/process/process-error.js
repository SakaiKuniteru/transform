'use strict';

const MA_LOI_PROCESS = Object.freeze({
    KHONG_TIM_THAY_CONG_CU: 'PROCESS_KHONG_TIM_THAY_CONG_CU',
    KHOI_DONG_THAT_BAI: 'PROCESS_KHOI_DONG_THAT_BAI',
    THOAT_BAT_THUONG: 'PROCESS_THOAT_BAT_THUONG',
    QUA_THOI_GIAN: 'PROCESS_QUA_THOI_GIAN',
    VUOT_GIOI_HAN_BUFFER: 'PROCESS_VUOT_GIOI_HAN_BUFFER',
    BI_HUY: 'PROCESS_BI_HUY'
});

function rutGonNoiDung(value, maxLength = 4096) {
    if (value === undefined || value === null) { return null; }
    const text = Buffer.isBuffer(value) ? value.toString('utf8') : String(value);
    if (text.length <= maxLength) { return text; }
    return `${text.slice(0, maxLength)}…`;
}

class ProcessError extends Error {
    constructor(message, options = {}) {
        super(message, options.cause ? { cause: options.cause } : undefined);
        this.name = 'ProcessError';
        this.maLoi = options.maLoi || MA_LOI_PROCESS.THOAT_BAT_THUONG;
        this.code = this.maLoi;
        this.statusCode = 500;
        this.expose = false;
        this.command = options.command || null;
        this.exitCode = options.exitCode ?? null;
        this.signal = options.signal || null;
        this.timedOut = options.timedOut === true;
        this.aborted = options.aborted === true;
        this.bufferOverflow = options.bufferOverflow === true;
        this.stdout = rutGonNoiDung(options.stdout);
        this.stderr = rutGonNoiDung(options.stderr);
        this.metadata = options.metadata && typeof options.metadata === 'object' ? options.metadata : null;
        if (Error.captureStackTrace) { Error.captureStackTrace(this, ProcessError); }
    }
}

function taoProcessError(message, options = {}) { return new ProcessError(message, options); }

function loiKhongTimThayCongCu(command, cause = null) {
    return taoProcessError(`Không tìm thấy công cụ "${command}".`, {
        maLoi: MA_LOI_PROCESS.KHONG_TIM_THAY_CONG_CU,
        command,
        cause,
        metadata: { systemCode: cause?.code || null }
    });
}

function loiKhoiDongThatBai(command, cause = null) {
    return taoProcessError(`Không thể khởi động công cụ "${command}".`, {
        maLoi: MA_LOI_PROCESS.KHOI_DONG_THAT_BAI,
        command,
        cause,
        metadata: { systemCode: cause?.code || null }
    });
}

function loiQuaThoiGian(command, timeoutMs) {
    return taoProcessError(`Công cụ "${command}" vượt quá thời gian xử lý cho phép.`, {
        maLoi: MA_LOI_PROCESS.QUA_THOI_GIAN,
        command,
        timedOut: true,
        metadata: { timeoutMs }
    });
}

function loiVuotBuffer(command, maxBufferBytes) {
    return taoProcessError(`Dữ liệu đầu ra của công cụ "${command}" vượt quá giới hạn bộ nhớ cho phép.`, {
        maLoi: MA_LOI_PROCESS.VUOT_GIOI_HAN_BUFFER,
        command,
        bufferOverflow: true,
        metadata: { maxBufferBytes }
    });
}

function loiBiHuy(command) {
    return taoProcessError(`Tiến trình "${command}" đã bị hủy.`, {
        maLoi: MA_LOI_PROCESS.BI_HUY,
        command,
        aborted: true
    });
}

function loiThoatBatThuong(command, exitCode, signal, stdout, stderr) {
    return taoProcessError(`Công cụ "${command}" kết thúc không thành công.`, {
        maLoi: MA_LOI_PROCESS.THOAT_BAT_THUONG,
        command,
        exitCode,
        signal,
        stdout,
        stderr
    });
}

function laProcessError(error) { return error instanceof ProcessError || error?.name === 'ProcessError'; }

module.exports = {
    MA_LOI_PROCESS,
    ProcessError,
    taoProcessError,
    loiKhongTimThayCongCu,
    loiKhoiDongThatBai,
    loiQuaThoiGian,
    loiVuotBuffer,
    loiBiHuy,
    loiThoatBatThuong,
    laProcessError
};