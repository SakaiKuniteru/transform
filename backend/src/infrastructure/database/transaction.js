'use strict';

const { layClient } = require('./pool');
const { taoBoTruyVan } = require('./query');
const ISOLATION_LEVEL = Object.freeze({
    READ_COMMITTED: 'READ COMMITTED',
    REPEATABLE_READ: 'REPEATABLE READ',
    SERIALIZABLE: 'SERIALIZABLE'
});
const LOI_CO_THE_THU_LAI = new Set([ '40001', '40P01' ]);

function chuanHoaTuyChon(options = {}) {
    if (!options || typeof options !== 'object' || Array.isArray(options)) {
        throw new TypeError('Tùy chọn transaction phải là một object.');
    }
    const isolationLevel = options.isolationLevel || null;
    const readOnly = options.readOnly ?? null;
    const deferrable = options.deferrable ?? null;
    const soLanThuLai = options.soLanThuLai ?? 0;
    if (isolationLevel !== null && !Object.values(ISOLATION_LEVEL).includes(isolationLevel)) {
        throw new TypeError('Isolation level không hợp lệ.');
    }
    if (readOnly !== null && typeof readOnly !== 'boolean') {
        throw new TypeError('readOnly phải là boolean hoặc null.');
    }
    if (deferrable !== null && typeof deferrable !== 'boolean') {
        throw new TypeError('deferrable phải là boolean hoặc null.');
    }
    if (!Number.isSafeInteger(soLanThuLai) || soLanThuLai < 0) {
        throw new TypeError('soLanThuLai phải là số nguyên không âm.');
    }

    return {
        isolationLevel,
        readOnly,
        deferrable,
        soLanThuLai
    };
}

function taoLenhBegin(options) {
    const thanhPhan = ['BEGIN'];
    if (options.isolationLevel) {
        thanhPhan.push(`ISOLATION LEVEL ${options.isolationLevel}`);
    }
    if (options.readOnly !== null) {
        thanhPhan.push(options.readOnly ? 'READ ONLY' : 'READ WRITE');
    }
    if (options.deferrable !== null) {
        thanhPhan.push(options.deferrable ? 'DEFERRABLE' : 'NOT DEFERRABLE');
    }
    return thanhPhan.join(' ');
}

function coTheThuLai(error) {
    return Boolean(error && LOI_CO_THE_THU_LAI.has(error.code));
}

function taoTransactionContext(client) {
    const database = taoBoTruyVan(client);
    let savepointIndex = 0;
    async function savepoint(callback) {
        if (typeof callback !== 'function') { throw new TypeError('Callback savepoint phải là một function.'); }
        savepointIndex += 1;
        const tenSavepoint = `sp_${savepointIndex}`;
        await client.query(`SAVEPOINT ${tenSavepoint}`);
        try {
            const ketQua = await callback(context);
            await client.query(`RELEASE SAVEPOINT ${tenSavepoint}`);
            return ketQua;
        } catch (error) {
            try {
                await client.query(`ROLLBACK TO SAVEPOINT ${tenSavepoint}`);
                await client.query(`RELEASE SAVEPOINT ${tenSavepoint}`);
            } catch (rollbackError) {
                if (!error.rollbackError) { error.rollbackError = rollbackError;}
            }
            throw error;
        }
    }
    const context = Object.freeze({
        ...database,
        query: database.truyVan,
        savepoint
    });
    return context;
}

async function thucThiMotLan(callback, options) {
    const client = await layClient();
    let daBegin = false;
    try {
        await client.query(taoLenhBegin(options));
        daBegin = true;
        const transaction = taoTransactionContext(client);
        const ketQua = await callback(transaction);
        await client.query('COMMIT');
        return ketQua;
    } catch (error) {
        if (daBegin) {
            try {
                await client.query( 'ROLLBACK' );
            } catch (rollbackError) {
                if (!error.rollbackError) { error.rollbackError = rollbackError; }
            }
        }
        throw error;
    } finally { client.release(); }
}

async function giaoDich(callback, options = {}) {
    if (typeof callback !== 'function') { throw new TypeError('Callback transaction phải là một function.'); }
    const tuyChon = chuanHoaTuyChon(options);
    let lanThu = 0;
    while (true) {
        try {
            return await thucThiMotLan( callback, tuyChon);
        } catch (error) {
            if (lanThu >= tuyChon.soLanThuLai || !coTheThuLai(error) ) { throw error; }
            lanThu += 1;
        }
    }
}

async function giaoDichChiDoc(callback, options = {}) {
    return giaoDich( callback, {
        ...options,
        readOnly: true
    });
}


module.exports = {
    ISOLATION_LEVEL,
    giaoDich,
    giaoDichChiDoc,
    coTheThuLai
};