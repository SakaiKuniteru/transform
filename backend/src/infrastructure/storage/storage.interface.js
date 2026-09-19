'use strict';

class StorageInterface {
    constructor(config = {}) {
        this.config = config;
    }
    async damBaoSanSang() {}
    async luuTuBuffer() {
        throw new Error('Storage driver chưa triển khai luuTuBuffer().');
    }
    async luuTuTep() {
        throw new Error('Storage driver chưa triển khai luuTuTep().');
    }
    async taoReadStream() {
        throw new Error('Storage driver chưa triển khai taoReadStream().');
    }
    async docBuffer() {
        throw new Error('Storage driver chưa triển khai docBuffer().');
    }
    async tonTai() {
        throw new Error('Storage driver chưa triển khai tonTai().');
    }
    async layThongTin() {
        throw new Error('Storage driver chưa triển khai layThongTin().');
    }
    async xoa() {
        throw new Error('Storage driver chưa triển khai xoa().');
    }
    async diChuyen() {
        throw new Error('Storage driver chưa triển khai diChuyen().');
    }
    async taoUrlTamThoi() {
        throw new Error('Storage driver không hỗ trợ URL tạm thời.');
    }

}

module.exports = StorageInterface;