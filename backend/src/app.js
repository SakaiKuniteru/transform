'use strict';


const express =
    require(
        'express'
    );

const cors =
    require(
        'cors'
    );

const helmet =
    require(
        'helmet'
    );

const compression =
    require(
        'compression'
    );


const app =
    express();


app.use(
    helmet()
);


app.use(
    cors()
);


app.use(
    compression()
);


app.use(
    express.json({
        limit: '10mb'
    })
);


app.use(
    express.urlencoded({
        extended: true
    })
);


app.get(
    '/api/v1/health',
    (
        req,
        res
    ) => {

        return res.json({
            success: true,

            data: {
                service:
                    'transform-backend',

                status:
                    'OK'
            }
        });

    }
);


module.exports =
    app;