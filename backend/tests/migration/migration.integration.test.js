'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const dotenv = require('dotenv');
const { Client } = require('pg');

const BACKEND_ROOT = path.resolve(__dirname, '../..');
dotenv.config({ path: path.join(BACKEND_ROOT, '.env'), quiet: true });

function taoSsl() { return ['1','true','yes','on'].includes(String(process.env.DB_SSL || '').toLowerCase()) ? { rejectUnauthorized: !['0','false','no','off'].includes(String(process.env.DB_SSL_REJECT_UNAUTHORIZED || 'true').toLowerCase()) } : false; }

function taoConfig(database) {
    if (process.env.DB_URL) {
        const url = new URL(process.env.DB_URL);
        url.pathname = `/${database}`;
        return { connectionString: url.toString(), ssl: taoSsl() };
    }
    return { host: process.env.DB_HOST || '127.0.0.1', port: Number(process.env.DB_PORT || 5432), database, user: process.env.DB_USER || 'postgres', password: process.env.DB_PASSWORD || '', ssl: taoSsl() };
}

function taoEnvMigration(database) {
    const env = { ...process.env, NODE_ENV: 'test', DB_NAME: database };
    if (process.env.DB_URL) {
        const url = new URL(process.env.DB_URL);
        url.pathname = `/${database}`;
        env.DB_URL = url.toString();
    } else { env.DB_URL = ''; }
    return env;
}

async function taoDatabase(database) {
    const client = new Client(taoConfig('postgres'));
    await client.connect();
    try {
        await client.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()', [database]);
        await client.query(`DROP DATABASE IF EXISTS "${database}"`);
        await client.query(`CREATE DATABASE "${database}"`);
    } finally { await client.end(); }
}

async function xoaDatabase(database) {
    const client = new Client(taoConfig('postgres'));
    await client.connect();
    try {
        await client.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()', [database]);
        await client.query(`DROP DATABASE IF EXISTS "${database}"`);
    } finally { await client.end(); }
}

function chayMigration(database) {
    const result = spawnSync(process.execPath, ['src/scripts/migrate.js'], { cwd: BACKEND_ROOT, env: taoEnvMigration(database), encoding: 'utf8', timeout: 60000 });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    return `${result.stdout}\n${result.stderr}`;
}

async function voiClient(database, callback) {
    const client = new Client(taoConfig(database));
    await client.connect();
    try { return await callback(client); } finally { await client.end(); }
}

test('DB trắng chạy 001-017 và chạy lần hai idempotent', async () => {
    const database = 'transform_migration_blank_test';
    await taoDatabase(database);
    try {
        chayMigration(database);
        await voiClient(database, async (client) => {
            const migration = await client.query('SELECT COUNT(*)::INTEGER AS tong FROM schema_migrations');
            const policy = await client.query(`SELECT COUNT(*)::INTEGER AS tong FROM chinh_sach_han_muc WHERE ma LIKE 'UPLOAD_%'`);
            assert.equal(Number(migration.rows[0].tong), 17);
            assert.equal(Number(policy.rows[0].tong), 8);
        });
        chayMigration(database);
        await voiClient(database, async (client) => {
            const migration = await client.query('SELECT COUNT(*)::INTEGER AS tong FROM schema_migrations');
            assert.equal(Number(migration.rows[0].tong), 17);
        });
    } finally { await xoaDatabase(database); }
});

test('DB legacy đã có 001-016 được baseline rồi chỉ chạy 017', async () => {
    const database = 'transform_migration_legacy_test';
    await taoDatabase(database);
    try {
        await voiClient(database, async (client) => {
            const dir = path.join(BACKEND_ROOT, 'database/migrations');
            const files = (await fs.promises.readdir(dir)).filter((item) => /^\d+_.*\.sql$/.test(item)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).filter((item) => Number(item.slice(0, 3)) <= 16);
            for (const file of files) { await client.query(await fs.promises.readFile(path.join(dir, file), 'utf8')); }
        });
        const output = chayMigration(database);
        assert.match(output, /BASELINE legacy 001-016/);
        await voiClient(database, async (client) => {
            const migration = await client.query('SELECT COUNT(*)::INTEGER AS tong FROM schema_migrations');
            const version17 = await client.query('SELECT COUNT(*)::INTEGER AS tong FROM schema_migrations WHERE version = 17');
            const policy = await client.query(`SELECT COUNT(*)::INTEGER AS tong FROM chinh_sach_han_muc WHERE ma LIKE 'UPLOAD_%'`);
            assert.equal(Number(migration.rows[0].tong), 17);
            assert.equal(Number(version17.rows[0].tong), 1);
            assert.equal(Number(policy.rows[0].tong), 8);
        });
    } finally { await xoaDatabase(database); }
});

test('migration lỗi phải rollback cả schema và schema_migrations', async () => {
    const database = 'transform_migration_rollback_test';
    await taoDatabase(database);
    const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'transform-migration-'));
    const migrationPath = path.join(tempDir, '999_test_rollback.sql');
    try {
        chayMigration(database);
        await fs.promises.writeFile(migrationPath, `CREATE TABLE migration_rollback_probe (id INTEGER PRIMARY KEY);\nINSERT INTO bang_khong_ton_tai(id) VALUES (1);`, 'utf8');
        const { chayMotMigration } = require('../../src/scripts/migrate');
        await voiClient(database, async (client) => {
            await assert.rejects(() => chayMotMigration(client, { version: 999, fileName: '999_test_rollback.sql', duongDan: migrationPath }));
            const table = await client.query(`SELECT to_regclass('public.migration_rollback_probe') AS ten`);
            const version = await client.query('SELECT COUNT(*)::INTEGER AS tong FROM schema_migrations WHERE version = 999');
            assert.equal(table.rows[0].ten, null);
            assert.equal(Number(version.rows[0].tong), 0);
        });
    } finally {
        await fs.promises.rm(tempDir, { recursive: true, force: true });
        await xoaDatabase(database);
    }
});