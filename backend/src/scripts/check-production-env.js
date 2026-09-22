'use strict';

const BAT_BUOC = Object.freeze(['DB_NAME','DB_USER','DB_PASSWORD','REDIS_PASSWORD','MINIO_ACCESS_KEY','MINIO_SECRET_KEY','JWT_ACCESS_SECRET','JWT_REFRESH_SECRET','OTP_SECRET','COOKIE_SECRET']);
const BI_MAT_32 = new Set(['JWT_ACCESS_SECRET','JWT_REFRESH_SECRET','OTP_SECRET','COOKIE_SECRET']);
const PLACEHOLDER = /(change[_-]?me|changeme|replace[_-]?me|your[_-]?(secret|password|key)|example[_-]?(secret|password|key)|placeholder)/i;

function lay(key) { return String(process.env[key] || '').trim(); }

function kiemTra() {
    const loi = [];
    if (lay('NODE_ENV') !== 'production') { loi.push('NODE_ENV phải là production.'); }
    if (lay('STORAGE_DRIVER').toLowerCase() !== 'minio') { loi.push('STORAGE_DRIVER production phải là minio.'); }
    for (const key of BAT_BUOC) {
        const value = lay(key);
        if (!value) { loi.push(`${key} không được để trống.`); continue; }
        if (PLACEHOLDER.test(value)) { loi.push(`${key} vẫn là placeholder.`); }
        if (BI_MAT_32.has(key) && value.length < 32) { loi.push(`${key} phải có ít nhất 32 ký tự.`); }
    }
    if (loi.length) { throw new Error(`Cấu hình production chưa hợp lệ:\n- ${loi.join('\n- ')}`); }
    console.log('[ProductionEnv] PASS');
    return true;
}

if (require.main === module) { try { kiemTra(); } catch (error) { console.error(`[ProductionEnv] FAIL: ${error.message}`); process.exitCode = 1; } }

module.exports = { BAT_BUOC, kiemTra };