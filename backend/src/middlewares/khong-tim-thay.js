'use strict';

const MA_LOI = require('../constants/ma-loi');
const { loiKhongTimThay } = require('../utils/loi');

function khongTimThay(req, res, next) {
    const duongDan = req.originalUrl || req.url || '/';
    return next(
        loiKhongTimThay(
            'Không tìm thấy API yêu cầu.',
            MA_LOI.KHONG_TIM_THAY,
            {
                phuongThuc: req.method,
                duongDan
            }
        )
    );
}

module.exports = khongTimThay;