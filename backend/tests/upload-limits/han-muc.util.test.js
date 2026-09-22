'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { taoKyHanMuc } = require('../../src/modules/han-muc/han-muc.util');
const { CHU_KY_HAN_MUC } = require('../../src/constants/han-muc');

const CHINH_SACH_NGAY = Object.freeze({ chuKy: CHU_KY_HAN_MUC.NGAY, muiGio: 'Asia/Ho_Chi_Minh' });

test('chu kỳ NGAY luôn bắt đầu 00:00 và không đổi theo giờ phút giây trong cùng ngày', () => {
    const lan1 = taoKyHanMuc(CHINH_SACH_NGAY, {}, new Date('2026-09-22T01:00:01.100Z'));
    const lan2 = taoKyHanMuc(CHINH_SACH_NGAY, {}, new Date('2026-09-22T11:32:12.900Z'));
    const lan3 = taoKyHanMuc(CHINH_SACH_NGAY, {}, new Date('2026-09-22T16:59:59.999Z'));
    assert.equal(lan1.kyBatDau.toISOString(), '2026-09-21T17:00:00.000Z');
    assert.equal(lan1.kyKetThuc.toISOString(), '2026-09-22T17:00:00.000Z');
    assert.equal(lan2.kyBatDau.getTime(), lan1.kyBatDau.getTime());
    assert.equal(lan2.kyKetThuc.getTime(), lan1.kyKetThuc.getTime());
    assert.equal(lan3.kyBatDau.getTime(), lan1.kyBatDau.getTime());
    assert.equal(lan3.kyKetThuc.getTime(), lan1.kyKetThuc.getTime());
});