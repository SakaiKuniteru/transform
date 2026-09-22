'use strict';
const { layPool } = require('./pool');

function chuanHoaTruyVan(sql, thamSo = []) {
    if (typeof sql === 'string') {
        if (!sql.trim()) { throw new TypeError('Câu SQL không được để trống.'); }
        if (!Array.isArray(thamSo)) { throw new TypeError('Tham số SQL phải là một mảng.'); }
        return {
            text: sql,
            values: thamSo
        };
    }
    if (!sql || typeof sql !== 'object' || Array.isArray(sql)) {
        throw new TypeError('Truy vấn phải là chuỗi SQL hoặc PostgreSQL QueryConfig.');
    }
    if (typeof sql.text !== 'string' || !sql.text.trim()) {
        throw new TypeError('QueryConfig.text phải là chuỗi SQL hợp lệ.');
    }
    if (sql.values !== undefined && !Array.isArray(sql.values)) {
        throw new TypeError('QueryConfig.values phải là một mảng.');
    }

    return {
        ...sql,
        values: sql.values ?? thamSo
    };
}

async function thucThiTruyVan(doiTuongTruyVan, sql, thamSo = []) {
    if (!doiTuongTruyVan || typeof doiTuongTruyVan.query !== 'function') {
        throw new TypeError('Đối tượng truy vấn PostgreSQL không hợp lệ.');
    }
    const truyVan = chuanHoaTruyVan(sql, thamSo);
    try {
        return await doiTuongTruyVan.query(truyVan);
    } catch (error) {
        if (truyVan.name && !error.queryName) { error.queryName = truyVan.name; }
        throw error;
    }
}

function taoBoTruyVan(doiTuongTruyVan) {
    if (!doiTuongTruyVan || typeof doiTuongTruyVan.query !== 'function') { throw new TypeError('Đối tượng truy vấn PostgreSQL không hợp lệ.'); }

    async function truyVan(sql, thamSo = []) { return thucThiTruyVan(doiTuongTruyVan, sql, thamSo); }

    async function layDanhSach(sql, thamSo = []) {
        const ketQua = await truyVan(sql, thamSo);
        return ketQua.rows;
    }

    async function layMot(sql, thamSo = []) {
        const ketQua = await truyVan(sql, thamSo);
        if (ketQua.rows.length !== 1) { throw new Error(`Truy vấn yêu cầu đúng 1 bản ghi nhưng nhận được ${ketQua.rows.length} bản ghi.`); }
        return ketQua.rows[0];
    }

    async function layMotHoacNull(sql, thamSo = []) {
        const ketQua = await truyVan(sql, thamSo);
        if (ketQua.rows.length > 1) { throw new Error(`Truy vấn yêu cầu tối đa 1 bản ghi nhưng nhận được ${ketQua.rows.length} bản ghi.`); }
        return ketQua.rows[0] || null;
    }

    async function layGiaTri(sql, thamSo = []) {
        const dong = await layMotHoacNull(sql, thamSo);
        if (!dong) { return null; }
        const cot = Object.keys(dong);
        if (cot.length !== 1) { throw new Error(`Truy vấn lấy giá trị yêu cầu đúng 1 cột nhưng nhận được ${cot.length} cột.`); }
        return dong[cot[0]];
    }

    return Object.freeze({
        truyVan,
        layDanhSach,
        layMot,
        layMotHoacNull,
        layGiaTri
    });
}

const boTruyVan = taoBoTruyVan({
    query(truyVan) { return layPool().query(truyVan); }
});

module.exports = {
    ...boTruyVan,
    chuanHoaTruyVan,
    thucThiTruyVan,
    taoBoTruyVan
};