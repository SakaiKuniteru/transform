'use strict';

function notFoundMiddleware(req, res, next) {
    const error = new Error('Không tìm thấy tài nguyên yêu cầu.');
    error.statusCode = 404;
    error.code = 'KHONG_TIM_THAY';
    error.expose = true;
    return next(error);
}

module.exports = {
    notFoundMiddleware
};