'use strict';
const env = require('./env');
module.exports = Object.freeze({
    helmet: Object.freeze({
        contentSecurityPolicy: Object.freeze({
            directives: Object.freeze({
                defaultSrc: Object.freeze([ "'self'" ]),
                baseUri: Object.freeze([ "'self'" ]),
                fontSrc: Object.freeze([ "'self'", 'https:', 'data:' ]),
                formAction: Object.freeze([ "'self'" ]),
                frameAncestors: Object.freeze([ "'self'" ]),
                imgSrc: Object.freeze([ "'self'", 'data:', 'blob:' ]),
                objectSrc: Object.freeze([ "'none'" ]),
                scriptSrc: Object.freeze([ "'self'" ]),
                scriptSrcAttr: Object.freeze([ "'none'" ]),
                styleSrc: Object.freeze([ "'self'", 'https:', "'unsafe-inline'" ]),
                upgradeInsecureRequests: env.isProduction ? Object.freeze([]) : null
            })
        }),
        crossOriginOpenerPolicy: Object.freeze({ policy: 'same-origin' }),
        crossOriginResourcePolicy: Object.freeze({ policy: 'same-origin' }),
        referrerPolicy: Object.freeze({ policy: 'no-referrer' })
    }),
    csrf: Object.freeze({
        enabled: env.csrfEnabled,
        headerName: env.csrfHeader,
        fieldName: '_csrf',
        tokenBytes: 32,
        safeMethods: Object.freeze([ 'GET', 'HEAD', 'OPTIONS' ])
    })
});