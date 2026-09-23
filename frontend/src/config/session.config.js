'use strict';
const env = require('./env');
module.exports = Object.freeze({
    name: env.sessionName,
    secret: env.sessionSecret,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: Object.freeze({
        httpOnly: true,
        secure: env.sessionSecure,
        sameSite: env.sessionSameSite,
        maxAge: env.sessionMaxAgeMs,
        path: '/'
    })
});