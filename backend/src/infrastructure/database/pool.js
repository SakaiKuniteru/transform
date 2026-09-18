'use strict';
const { Pool } = require('pg');
const { DATABASE_CONFIG, taoPoolConfig, layThongTinKetNoiAnToan } = require('../../config/database');
const poolConfig = taoPoolConfig();
const searchPath = DATABASE_CONFIG.schema === 'public'
    ? 'public'
    : `${DATABASE_CONFIG.schema},public`;
poolConfig.options = `-c search_path=${searchPath}`;
const pool = new Pool(poolConfig);
let daDongPool = false;

pool.on('error', (error) => { console.error('PostgreSQL Pool phát sinh lỗi ngoài truy vấn:', error); });

function layPool() {
    if (daDongPool) { throw new Error('PostgreSQL Pool đã được đóng.'); }
    return pool;
}

async function layClient() {
    if (daDongPool) { throw new Error('Không thể lấy PostgreSQL Client vì Pool đã được đóng.'); }
    return pool.connect();
}

async function kiemTraKetNoi() {
    const batDau = process.hrtime.bigint();

    const ketQua = await pool.query(`
        SELECT
            TRUE AS connected,
            current_database() AS database,
            current_schema() AS schema,
            current_user AS "user",
            NOW() AS server_time
    `);
    const ketThuc = process.hrtime.bigint();
    return {
        connected: Boolean(ketQua.rows[0]?.connected),
        database: ketQua.rows[0]?.database || null,
        schema: ketQua.rows[0]?.schema || null,
        user: ketQua.rows[0]?.user || null,
        serverTime: ketQua.rows[0]?.server_time || null,
        durationMs: Number(ketThuc - batDau) / 1_000_000
    };
}

function layThongKePool() {
    return {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount,
        closed: daDongPool
    };
}

function layThongTinKetNoi() {
    return {
        ...layThongTinKetNoiAnToan(),
        pool: layThongKePool()
    };
}

async function dongPool() {
    if (daDongPool) { return; }
    daDongPool = true;
    await pool.end();
}

module.exports = {
    layPool,
    layClient,
    kiemTraKetNoi,
    layThongKePool,
    layThongTinKetNoi,
    dongPool
};