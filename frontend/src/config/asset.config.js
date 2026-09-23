'use strict';
const path = require('node:path');
const env = require('./env');
module.exports = Object.freeze({
    urlPrefix: '/assets',
    rootDir: path.join(env.root, 'public', 'dist'),
    maxAge: env.assetMaxAgeMs,
    immutable: env.isProduction && env.assetMaxAgeMs > 0,
    index: false,
    fallthrough: true
});