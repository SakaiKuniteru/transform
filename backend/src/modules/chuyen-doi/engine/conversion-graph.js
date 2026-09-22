'use strict';

function laDinhDangCuThe(value) { return Boolean(value && value !== '*'); }

function taoCanh(converter, nguon, dich) {
    return Object.freeze({
        converter,
        converterKey: converter.key,
        dinhDangNguon: nguon,
        dinhDangDich: dich,
        chiPhi: converter.chiPhi,
        uuTien: converter.uuTien
    });
}

function taoDoThi(danhSachConverter = []) {
    if (!Array.isArray(danhSachConverter)) { throw new TypeError('Danh sách converter phải là array.'); }
    const adjacency = new Map();
    for (const converter of danhSachConverter) {
        for (const nguon of converter.dinhDangNguon || []) {
            if (!laDinhDangCuThe(nguon)) { continue; }
            for (const dich of converter.dinhDangDich || []) {
                if (!laDinhDangCuThe(dich) || nguon === dich) { continue; }
                if (!adjacency.has(nguon)) { adjacency.set(nguon, []); }
                adjacency.get(nguon).push(taoCanh(converter, nguon, dich));
            }
        }
    }
    for (const canh of adjacency.values()) { canh.sort((a, b) => a.chiPhi - b.chiPhi || b.uuTien - a.uuTien || a.converterKey.localeCompare(b.converterKey)); }
    return adjacency;
}

function soSanhDuongDi(a, b) {
    if (a.chiPhi !== b.chiPhi) { return a.chiPhi - b.chiPhi; }
    if (a.cacBuoc.length !== b.cacBuoc.length) { return a.cacBuoc.length - b.cacBuoc.length; }
    return b.tongUuTien - a.tongUuTien;
}

function timDuongDi(doThi, dinhDangNguon, dinhDangDich, options = {}) {
    if (!(doThi instanceof Map)) { throw new TypeError('Đồ thị chuyển đổi không hợp lệ.'); }
    if (!dinhDangNguon || !dinhDangDich) { throw new TypeError('Phải cung cấp định dạng nguồn và đích.'); }
    if (dinhDangNguon === dinhDangDich) { return { dinhDangNguon, dinhDangDich, chiPhi: 0, tongUuTien: 0, cacBuoc: [] }; }
    const soBuocToiDa = Number.isSafeInteger(options.soBuocToiDa) && options.soBuocToiDa > 0 ? options.soBuocToiDa : 8;
    const hangDoi = [{
        dinhDang: dinhDangNguon,
        chiPhi: 0,
        tongUuTien: 0,
        cacBuoc: [],
        daDiQua: new Set([dinhDangNguon])
    }];
    let totNhat = null;
    while (hangDoi.length) {
        hangDoi.sort(soSanhDuongDi);
        const hienTai = hangDoi.shift();
        if (totNhat && hienTai.chiPhi > totNhat.chiPhi) { break; }
        if (hienTai.dinhDang === dinhDangDich) {
            if (!totNhat || soSanhDuongDi(hienTai, totNhat) < 0) { totNhat = hienTai; }
            continue;
        }
        if (hienTai.cacBuoc.length >= soBuocToiDa) { continue; }
        for (const canh of doThi.get(hienTai.dinhDang) || []) {
            if (hienTai.daDiQua.has(canh.dinhDangDich)) { continue; }
            const daDiQua = new Set(hienTai.daDiQua);
            daDiQua.add(canh.dinhDangDich);
            hangDoi.push({
                dinhDang: canh.dinhDangDich,
                chiPhi: hienTai.chiPhi + canh.chiPhi,
                tongUuTien: hienTai.tongUuTien + canh.uuTien,
                cacBuoc: [...hienTai.cacBuoc, canh],
                daDiQua
            });
        }
    }
    if (!totNhat) { return null; }
    return {
        dinhDangNguon,
        dinhDangDich,
        chiPhi: totNhat.chiPhi,
        tongUuTien: totNhat.tongUuTien,
        cacBuoc: totNhat.cacBuoc
    };
}

module.exports = {
    taoDoThi,
    timDuongDi
};