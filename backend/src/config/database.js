'use strict';

const env = require('./env');

const DATABASE_CONFIG = Object.freeze({
    url: env.database.url,
    host: env.database.host,
    port: env.database.port,
    database: env.database.name,
    user: env.database.user,
    password: env.database.password,
    schema: env.database.schema,
    ssl: env.database.ssl
        ? Object.freeze({
            rejectUnauthorized: env.database.sslRejectUnauthorized
        })
        : false,
    max: env.database.poolMax,
    idleTimeoutMillis: env.database.idleTimeoutMs,
    connectionTimeoutMillis: env.database.connectionTimeoutMs,
    statement_timeout: env.database.statementTimeoutMs,
    query_timeout: env.database.queryTimeoutMs,
    application_name: env.database.applicationName
});

function taoPoolConfig() {
    const chung = {
        ssl: DATABASE_CONFIG.ssl,
        max: DATABASE_CONFIG.max,
        idleTimeoutMillis: DATABASE_CONFIG.idleTimeoutMillis,
        connectionTimeoutMillis: DATABASE_CONFIG.connectionTimeoutMillis,
        statement_timeout: DATABASE_CONFIG.statement_timeout,
        query_timeout: DATABASE_CONFIG.query_timeout,
        application_name: DATABASE_CONFIG.application_name,
        keepAlive: true,
        allowExitOnIdle: env.laTest
    };

    if (DATABASE_CONFIG.url) {
        return {
            connectionString: DATABASE_CONFIG.url,
            ...chung
        };
    }

    return {
        host: DATABASE_CONFIG.host,
        port: DATABASE_CONFIG.port,
        database: DATABASE_CONFIG.database,
        user: DATABASE_CONFIG.user,
        password: DATABASE_CONFIG.password,
        ...chung
    };
}

function layThongTinKetNoiAnToan() {
    if (DATABASE_CONFIG.url) {
        return {
            mode: 'url',
            schema: DATABASE_CONFIG.schema,
            ssl: Boolean(DATABASE_CONFIG.ssl),
            poolMax: DATABASE_CONFIG.max
        };
    }

    return {
        mode: 'host',
        host: DATABASE_CONFIG.host,
        port: DATABASE_CONFIG.port,
        database: DATABASE_CONFIG.database,
        user: DATABASE_CONFIG.user,
        schema: DATABASE_CONFIG.schema,
        ssl: Boolean(DATABASE_CONFIG.ssl),
        poolMax: DATABASE_CONFIG.max
    };
}

module.exports = {
    DATABASE_CONFIG,
    taoPoolConfig,
    layThongTinKetNoiAnToan
};