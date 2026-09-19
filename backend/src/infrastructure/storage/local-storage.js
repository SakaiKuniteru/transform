'use strict';

const fs = require('node:fs');
const path = require('node:path');
const StorageInterface = require('./storage.interface');

function chuanHoaKhoa(khoa) {
    if (typeof khoa !== 'string' || !khoa.trim()) {
        throw new TypeError('Khóa lưu trữ không hợp lệ.');
    }
    const ketQua = path.posix.normalize(khoa.trim().replaceAll('\\', '/')).replace(/^\/+/, '');
    if (!ketQua || ketQua === '.' || ketQua === '..' || ketQua.startsWith('../')) {
        throw new TypeError('Khóa lưu trữ không hợp lệ.');
    }
    return ketQua;
}

class LocalStorage extends StorageInterface {

    constructor(config = {}) {
        super(config);
        if (!config.root) { throw new Error('Thiếu thư mục gốc của Local Storage.'); }
        this.root = path.resolve(config.root);
    }

    async damBaoSanSang() {
        await fs.promises.mkdir(this.root, { recursive: true });
        return true;
    }

    layDuongDanTuyetDoi(khoa) {
        const khoaHopLe = chuanHoaKhoa(khoa);
        const duongDan = path.resolve(this.root, ...khoaHopLe.split('/'));
        const relative = path.relative(this.root, duongDan);
        if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
            throw new Error('Đường dẫn lưu trữ không hợp lệ.');
        }
        return duongDan;
    }

    async damBaoThuMuc(khoa) {
        const duongDan = this.layDuongDanTuyetDoi(khoa);
        await fs.promises.mkdir(path.dirname(duongDan), { recursive: true });
        return duongDan;
    }

    async luuTuBuffer(khoa, buffer) {
        if (!Buffer.isBuffer(buffer)) { throw new TypeError('Dữ liệu lưu trữ phải là Buffer.'); }
        const duongDan = await this.damBaoThuMuc(khoa);
        await fs.promises.writeFile(duongDan, buffer);
        return {
            khoa: chuanHoaKhoa(khoa),
            kichThuoc: buffer.length,
            duongDan
        };
    }

    async luuTuTep(khoa, duongDanNguon) {
        if (typeof duongDanNguon !== 'string' || !duongDanNguon.trim()) {
            throw new TypeError('Đường dẫn tệp nguồn không hợp lệ.');
        }
        const duongDanDich = await this.damBaoThuMuc(khoa);
        await fs.promises.copyFile(duongDanNguon, duongDanDich);
        const thongTin = await fs.promises.stat(duongDanDich);
        return {
            khoa: chuanHoaKhoa(khoa),
            kichThuoc: thongTin.size,
            duongDan: duongDanDich
        };
    }

    async taoReadStream(khoa) {
        const duongDan = this.layDuongDanTuyetDoi(khoa);
        await fs.promises.access(duongDan, fs.constants.R_OK);
        return fs.createReadStream(duongDan);
    }

    async docBuffer(khoa) {
        return fs.promises.readFile(this.layDuongDanTuyetDoi(khoa));
    }

    async tonTai(khoa) {
        try {
            await fs.promises.access(this.layDuongDanTuyetDoi(khoa), fs.constants.F_OK);
            return true;
        } catch (error) {
            if (error.code === 'ENOENT') { return false; }
            throw error;
        }
    }

    async layThongTin(khoa) {
        try {
            const duongDan = this.layDuongDanTuyetDoi(khoa);
            const thongTin = await fs.promises.stat(duongDan);
            return {
                khoa: chuanHoaKhoa(khoa),
                kichThuoc: thongTin.size,
                createdAt: thongTin.birthtime,
                updatedAt: thongTin.mtime,
                duongDan
            };
        } catch (error) {
            if (error.code === 'ENOENT') { return null; }
            throw error;
        }
    }

    async xoa(khoa) {
        const duongDan = this.layDuongDanTuyetDoi(khoa);
        await fs.promises.rm(duongDan, { force: true });
        return true;
    }

    async diChuyen(khoaNguon, khoaDich) {
        const duongDanNguon = this.layDuongDanTuyetDoi(khoaNguon);
        const duongDanDich = await this.damBaoThuMuc(khoaDich);
        await fs.promises.rename(duongDanNguon, duongDanDich);
        return {
            khoa: chuanHoaKhoa(khoaDich),
            duongDan: duongDanDich
        };
    }
}

module.exports = LocalStorage;