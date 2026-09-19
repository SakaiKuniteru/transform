'use strict';

const MUI_GIO_MAC_DINH = 'UTC';
const ISO_DATE_TIME_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

function laMuiGioHopLe(muiGio) {
    try {
        new Intl.DateTimeFormat('en-US', { timeZone: muiGio }).format();
        return true;
    } catch { return false; }
}

function layMuiGio(muiGio) {
    if (typeof muiGio === 'string' && muiGio.trim() && laMuiGioHopLe(muiGio.trim())) { return muiGio.trim(); }
    return MUI_GIO_MAC_DINH;
}

function dinhDangNgayGio(value, muiGio = MUI_GIO_MAC_DINH) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    const timeZone = layMuiGio(muiGio);
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
        timeZoneName: 'longOffset'
    });
    const parts = formatter.formatToParts(date);
    const lay = (type) => parts.find((item) => item.type === type)?.value;
    const tenMuiGio = lay('timeZoneName');
    let offset = '+00:00';
    if (tenMuiGio && tenMuiGio !== 'GMT') { offset = tenMuiGio.replace('GMT', ''); }
    return (`${lay('year')}-${lay('month')}-${lay('day')}` + `T${lay('hour')}:${lay('minute')}:${lay('second')}` + offset);
}

function chuanHoaNgayGioTrongDuLieu(value, muiGio = MUI_GIO_MAC_DINH) {
    if (value === null || value === undefined) return value;
    if (value instanceof Date) {
        return dinhDangNgayGio(value, muiGio);
    }
    if (typeof value === 'string' && ISO_DATE_TIME_REGEX.test(value)) {
        return dinhDangNgayGio(value, muiGio);
    }
    if (Array.isArray(value)) {
        return value.map((item) => chuanHoaNgayGioTrongDuLieu(item, muiGio));
    }
    if (typeof value === 'object') {
        return Object.fromEntries(Object.entries(value).map(
            ([key, item]) => [ key, chuanHoaNgayGioTrongDuLieu(item, muiGio) ]
        ));
    }
    return value;
}

module.exports = {
    MUI_GIO_MAC_DINH,
    laMuiGioHopLe,
    layMuiGio,
    dinhDangNgayGio,
    chuanHoaNgayGioTrongDuLieu
};