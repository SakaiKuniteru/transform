'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { Client } = require('pg');
const env = require('../config/env');
const MIGRATIONS_DIR = path.join(env.backendRoot, 'database/migrations');
const LOCK_KEY = 'transform:migrations';
const LEGACY_BASELINE_VERSION = 16;
const BANG_LEGACY_V16 = Object.freeze([
    'nguoi_dung',
    'tep',
    'phien_ban_tep',
    'cong_viec',
    'buoc_cong_viec',
    'chuyen_doi',
    'lich_su',
    'nhat_ky',
    'ma_xac_thuc',
    'phien_khach',
    'goi_dich_vu',
    'chinh_sach_han_muc',
    'dang_ky_goi',
    'su_dung_han_muc',
    'phien_dang_nhap'
]);

function quoteIdentifier(value) {
    const text = String(value || '');
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(text)) { throw new TypeError(`Identifier PostgreSQL không hợp lệ: ${text}`); }
    return `"${text.replaceAll('"', '""')}"`;
}

function taoClientConfig() {
    const ssl = env.database.ssl ? { rejectUnauthorized: env.database.sslRejectUnauthorized } : false;
    if (env.database.url) { return { connectionString: env.database.url, ssl, application_name: 'transform-migration' }; }
    return {
        host: env.database.host,
        port: env.database.port,
        database: env.database.name,
        user: env.database.user,
        password: env.database.password,
        ssl,
        connectionTimeoutMillis: env.database.connectionTimeoutMs,
        application_name: 'transform-migration'
    };
}

function layThongTinMigration(fileName) {
    const match = String(fileName).match(/^(\d+)_.*\.sql$/);
    if (!match) { throw new Error(`Tên migration không hợp lệ: ${fileName}`); }
    return { version: Number(match[1]), fileName };
}

function tinhChecksum(content) { return crypto.createHash('sha256').update(content).digest('hex'); }

function boTransactionNgoai(content, fileName) {
    let sql = String(content || '').trim();
    const coBegin = /^\s*BEGIN\s*;/i.test(sql);
    const coCommit = /COMMIT\s*;\s*$/i.test(sql);
    if (coBegin !== coCommit) { throw new Error(`Migration "${fileName}" phải có cả BEGIN và COMMIT hoặc không có cả hai.`); }
    if (coBegin) {
        sql = sql.replace(/^\s*BEGIN\s*;/i, '');
        sql = sql.replace(/COMMIT\s*;\s*$/i, '');
    }
    return sql.trim();
}

async function damBaoBangMigration(client) {
    const schema = quoteIdentifier(env.database.schema);
    await client.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
    await client.query(`SET search_path TO ${schema}, public`);
    await client.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.schema_migrations (
            version INTEGER PRIMARY KEY,
            filename TEXT NOT NULL UNIQUE,
            checksum CHAR(64) NOT NULL,
            executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
}

async function layMigrationDaChay(client) {
    const schema = quoteIdentifier(env.database.schema);
    const { rows } = await client.query(`
        SELECT version, filename, checksum, executed_at
        FROM ${schema}.schema_migrations
        ORDER BY version
    `);
    return new Map(rows.map((item) => [Number(item.version), item]));
}

async function bangTonTai(client, tenBang) {
    const quanHe = `${quoteIdentifier(env.database.schema)}.${quoteIdentifier(tenBang)}`;
    const { rows } = await client.query('SELECT to_regclass($1) AS quan_he', [quanHe]);
    return Boolean(rows[0]?.quan_he);
}

async function laLegacyV16HoanChinh(client) {
    const tonTai = await Promise.all(BANG_LEGACY_V16.map((tenBang) => bangTonTai(client, tenBang)));
    const soBangTonTai = tonTai.filter(Boolean).length;
    if (soBangTonTai === 0) { return false; }
    if (soBangTonTai !== BANG_LEGACY_V16.length) { throw new Error(`Database legacy chỉ có ${soBangTonTai}/${BANG_LEGACY_V16.length} bảng kỳ vọng. Không tự động baseline database chưa đầy đủ.`); }
    const { rows } = await client.query(`
        SELECT pg_get_constraintdef(c.oid) AS dinh_nghia
        FROM pg_constraint c
        INNER JOIN pg_class t ON t.oid = c.conrelid
        INNER JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname = $1
        AND t.relname = 'chinh_sach_han_muc'
        AND c.conname = 'chk_chinh_sach_han_muc_upload'
        LIMIT 1
    `, [env.database.schema]);
    const dinhNghia = String(rows[0]?.dinh_nghia || '');
    if (!dinhNghia.includes('UPLOAD_TONG_SO_LAN')) { throw new Error('Database legacy chưa có thay đổi của migration 016. Không tự động baseline.'); }
    const policyCu = await client.query(`
        SELECT COUNT(*)::INTEGER AS tong
        FROM ${quoteIdentifier(env.database.schema)}.chinh_sach_han_muc
        WHERE ma IN ('UPLOAD_KHACH_MAC_DINH','UPLOAD_NGUOI_DUNG_MAC_DINH')
        AND ma_hanh_dong = 'UPLOAD'
    `);
    if (Number(policyCu.rows[0]?.tong || 0) > 0) { throw new Error('Database legacy vẫn còn policy UPLOAD cũ, migration 016 chưa hoàn tất.'); }
    return true;
}

async function baselineLegacyNeuCan(client, migrations, daChay) {
    if (daChay.size > 0) { return false; }
    if (!await laLegacyV16HoanChinh(client)) { return false; }
    const baseline = migrations.filter((item) => item.version <= LEGACY_BASELINE_VERSION);
    for (let version = 1; version <= LEGACY_BASELINE_VERSION; version += 1) { if (!baseline.some((item) => item.version === version)) { throw new Error(`Thiếu migration ${version} nên không thể baseline database legacy.`); } }
    const schema = quoteIdentifier(env.database.schema);
    await client.query('BEGIN');
    try {
        for (const migration of baseline) {
            const content = await fs.promises.readFile(migration.duongDan, 'utf8');
            await client.query(`INSERT INTO ${schema}.schema_migrations (version, filename, checksum) VALUES ($1,$2,$3)`, [migration.version, migration.fileName, tinhChecksum(content)]);
        }
        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        throw error;
    }
    console.log(`[Migration] BASELINE legacy 001-${String(LEGACY_BASELINE_VERSION).padStart(3, '0')}.`);
    return true;
}

async function chayMotMigration(client, migration) {
    const schema = quoteIdentifier(env.database.schema);
    const content = await fs.promises.readFile(migration.duongDan, 'utf8');
    const checksum = tinhChecksum(content);
    const sql = boTransactionNgoai(content, migration.fileName);
    await client.query('BEGIN');
    try {
        if (sql) { await client.query(sql); }
        await client.query(`
            INSERT INTO ${schema}.schema_migrations (
                version,
                filename,
                checksum
            )
            VALUES ($1, $2, $3)
        `, [migration.version, migration.fileName, checksum]);
        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        throw error;
    }
    return checksum;
}

async function chayMigration() {
    const client = new Client(taoClientConfig());
    await client.connect();
    try {
        await client.query('SELECT pg_advisory_lock(hashtext($1))', [LOCK_KEY]);
        await damBaoBangMigration(client);
        const files = (await fs.promises.readdir(MIGRATIONS_DIR)).filter((item) => /^\d+_.*\.sql$/.test(item)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
        const migrations = files.map((fileName) => ({ ...layThongTinMigration(fileName), duongDan: path.join(MIGRATIONS_DIR, fileName) }));
        const versions = new Set();
        for (const migration of migrations) {
            if (versions.has(migration.version)) { throw new Error(`Trùng version migration ${migration.version}.`); }
            versions.add(migration.version);
        }
        let daChay = await layMigrationDaChay(client);
        if (await baselineLegacyNeuCan(client, migrations, daChay)) { daChay = await layMigrationDaChay(client); }
        for (const migration of migrations) {
            const content = await fs.promises.readFile(migration.duongDan, 'utf8');
            const checksum = tinhChecksum(content);
            const hienTai = daChay.get(migration.version);
            if (hienTai) {
                if (hienTai.filename !== migration.fileName || hienTai.checksum !== checksum) { throw new Error(`Migration ${migration.version} đã chạy nhưng file/checksum đã thay đổi.`); }
                console.log(`[Migration] SKIP ${migration.fileName}`);
                continue;
            }
            console.log(`[Migration] RUN ${migration.fileName}`);
            await chayMotMigration(client, migration);
            console.log(`[Migration] DONE ${migration.fileName}`);
        }
        console.log(`[Migration] Hoàn thành ${migrations.length} migration.`);
    } finally {
        await client.query('SELECT pg_advisory_unlock(hashtext($1))', [LOCK_KEY]).catch(() => {});
        await client.end();
    }
}

if (require.main === module) {
    void chayMigration().catch((error) => {
        console.error('[Migration] Thất bại:', error);
        process.exitCode = 1;
    });
}

module.exports = {
    taoClientConfig,
    layThongTinMigration,
    tinhChecksum,
    boTransactionNgoai,
    damBaoBangMigration,
    layMigrationDaChay,
    chayMotMigration,
    baselineLegacyNeuCan,
    chayMigration
};