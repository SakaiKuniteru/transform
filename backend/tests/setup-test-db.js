'use strict';

const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');
const { Client } = require('pg');

const BACKEND_ROOT = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(BACKEND_ROOT, '.env'), quiet: true });

function batBuocTenDatabase(value) {
    const ten = String(value || '').trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(ten)) { throw new TypeError('Tên database test không hợp lệ.'); }
    return ten;
}

function laTrue(value) { return ['1', 'true', 'yes', 'on'].includes(String(value || '').trim().toLowerCase()); }

function taoSsl() {
    if (!laTrue(process.env.DB_SSL)) { return false; }
    return { rejectUnauthorized: !['0', 'false', 'no', 'off'].includes(String(process.env.DB_SSL_REJECT_UNAUTHORIZED || 'true').trim().toLowerCase()) };
}

function taoConfig(database) {
    if (process.env.DB_URL) {
        const url = new URL(process.env.DB_URL);
        url.pathname = `/${database}`;
        return { connectionString: url.toString(), ssl: taoSsl() };
    }
    return {
        host: process.env.DB_HOST || '127.0.0.1',
        port: Number(process.env.DB_PORT || 5432),
        database,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        ssl: taoSsl()
    };
}

async function taoMoiDatabase(tenDatabase) {
    const client = new Client(taoConfig('postgres'));
    await client.connect();
    try {
        await client.query(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`, [tenDatabase]);
        await client.query(`DROP DATABASE IF EXISTS "${tenDatabase}"`);
        await client.query(`CREATE DATABASE "${tenDatabase}"`);
    } finally { await client.end(); }
}

async function chaySqlFile(client, duongDan) {
    const sql = await fs.promises.readFile(duongDan, 'utf8');
    if (!sql.trim()) { return; }
    await client.query(sql);
}

async function chuanBiDatabaseTest() {
    const databaseTest = batBuocTenDatabase(process.env.TEST_DB_NAME || 'transform_test');
    const databaseDev = batBuocTenDatabase(process.env.DB_NAME || 'transform');
    if (databaseTest === databaseDev) { throw new Error('Database test không được trùng database development.'); }
    await taoMoiDatabase(databaseTest);
    const client = new Client(taoConfig(databaseTest));
    await client.connect();
    try {
        const migrationsDir = path.join(BACKEND_ROOT, 'database/migrations');
        const migrations = (await fs.promises.readdir(migrationsDir)).filter((item) => item.endsWith('.sql')).sort();
        for (const migration of migrations) {
            console.log(`[TEST DB] Migration ${migration}`);
            await chaySqlFile(client, path.join(migrationsDir, migration));
        }
        await chaySqlFile(client, path.join(BACKEND_ROOT, 'database/seeds/development.sql'));
    } finally { await client.end(); }
    console.log(`[TEST DB] READY: ${databaseTest}`);
}

chuanBiDatabaseTest().catch((error) => {
    console.error('[TEST DB] FAIL:', error);
    process.exitCode = 1;
});