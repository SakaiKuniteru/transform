'use strict';

const express = require('express');
const controller = require('./chuyen-doi.controller');
const { paramsIdSchema, taoSchema, hoTroQuerySchema } = require('./chuyen-doi.validation');
const { validateBody, validateParams, validateQuery } = require('../../middlewares/validate');
const { xacThucTuyChon } = require('../../middlewares/xac-thuc');
const { damBaoPhienKhach } = require('../../middlewares/phien-khach');

const router = express.Router();

router.get('/ho-tro', validateQuery(hoTroQuerySchema), controller.getHoTro);
router.use(xacThucTuyChon, damBaoPhienKhach);
router.post('/', validateBody(taoSchema), controller.tao);
router.get('/:id', validateParams(paramsIdSchema), controller.getChiTiet);

module.exports = router;