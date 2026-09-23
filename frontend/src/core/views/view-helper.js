'use strict';
const assetConfig = require('../../config/asset.config');

function eq(a, b) { return a === b; }

function ne(a, b) { return a !== b; }

function gt(a, b) { return Number(a) > Number(b); }

function gte(a, b) { return Number(a) >= Number(b); }

function lt(a, b) { return Number(a) < Number(b); }

function lte(a, b) { return Number(a) <= Number(b); }

function and(...args) { args.pop(); return args.every(Boolean); }

function or(...args) { args.pop(); return args.some(Boolean); }

function not(value) { return !value; }

function includes(collection, value) {
    if (Array.isArray(collection) || typeof collection === 'string') { return collection.includes(value); }
    if (collection instanceof Set) { return collection.has(value); }
    return false;
}

function add(a, b) { return Number(a || 0) + Number(b || 0); }

function subtract(a, b) { return Number(a || 0) - Number(b || 0); }

function concat(...args) { args.pop(); return args.map((value) => value ?? '').join(''); }

function asset(value = '') {
    const giaTri = String(value || '').trim();
    if (!giaTri) { return assetConfig.urlPrefix; }
    if (/^[a-z][a-z\d+.-]*:/i.test(giaTri) || giaTri.startsWith('//') || giaTri.includes('\\') || giaTri.split('/').includes('..')) { throw new TypeError('Đường dẫn asset không hợp lệ.'); }
    if (giaTri === assetConfig.urlPrefix || giaTri.startsWith(`${assetConfig.urlPrefix}/`)) { return giaTri; }
    return `${assetConfig.urlPrefix}/${giaTri.replace(/^\/+/, '')}`;
}

function layViewHelpers() {
    return {
        eq,
        ne,
        gt,
        gte,
        lt,
        lte,
        and,
        or,
        not,
        includes,
        add,
        subtract,
        concat,
        asset
    };
}

module.exports = {
    eq,
    ne,
    gt,
    gte,
    lt,
    lte,
    and,
    or,
    not,
    includes,
    add,
    subtract,
    concat,
    asset,
    layViewHelpers
};