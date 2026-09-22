'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { Client } = require('pg');
const env = require('../config/env');

const MIGRATIONS_DIR = path.join(env.backendRoot, 'database/migrations');
const LOCK_KEY = 'transform:migrations';

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
        const daChay = await layMigrationDaChay(client);
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

void chayMigration().catch((error) => {
    console.error('[Migration] Thất bại:', error);
    process.exitCode = 1;
});