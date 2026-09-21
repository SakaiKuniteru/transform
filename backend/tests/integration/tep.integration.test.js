'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
    sharp,
    taoAgent,
    khoiDongRuntimeTest,
    dongRuntimeTest,
    taoAnhBuffer,
    uploadBuffer,
    layThongTinUpload,
    taiXuongBuffer
} = require('../helpers/runtime-test.helper');

let agent;
let tepId;
let phienBanId;

test.before(async () => {
    await khoiDongRuntimeTest();
    agent = taoAgent();
});

test.after(async () => { await dongRuntimeTest(); });

test('guest upload PNG tạo tep, phien_ban_tep và lịch sử', async () => {
    const buffer = await taoAnhBuffer('png', 320, 180);
    const response = await uploadBuffer(agent, buffer, 'integration.png', 'image/png');
    assert.equal(response.statusCode, 201);
    assert.equal(response.body.success, true);
    const upload = layThongTinUpload(response);
    assert.ok(upload.tepId);
    assert.ok(upload.phienBanId);
    tepId = upload.tepId;
    phienBanId = upload.phienBanId;
    const history = await agent.get(`/api/v1/lich-su/cua-toi?tepId=${tepId}`);
    assert.equal(history.statusCode, 200);
    assert.equal(history.body.success, true);
    assert.ok(history.body.data.danhSach.some((item) => item.loaiSuKien === 'TEP_DA_TAI_LEN'));
});

test('guest lấy chi tiết đúng tệp của mình', async () => {
    const response = await agent.get(`/api/v1/tep/${tepId}`);
    assert.equal(response.statusCode, 200);
    assert.equal(response.body.data?.id, tepId);
    assert.equal(response.body.data?.phienBanHienTai?.id, phienBanId);
});

test('guest tải xuống đúng dữ liệu PNG đã upload', async () => {
    const response = await taiXuongBuffer(agent, tepId);
    assert.equal(response.statusCode, 200);
    assert.ok(Buffer.isBuffer(response.body));
    const metadata = await sharp(response.body).metadata();
    assert.equal(metadata.format, 'png');
    assert.equal(metadata.width, 320);
    assert.equal(metadata.height, 180);
});

test('guest khác không đọc được tệp của guest hiện tại', async () => {
    const agentKhac = taoAgent();
    const response = await agentKhac.get(`/api/v1/tep/${tepId}`);
    assert.equal(response.statusCode, 404);
});