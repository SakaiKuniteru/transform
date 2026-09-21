'use strict';

const { TEN_QUEUE, coQueue } = require('../../config/queue');
const queues = require('./queues');
const congViecService = require('../../modules/cong-viec/cong-viec.service');
const MA_LOI = require('../../constants/ma-loi');
const { laLoiUngDung, loiDichVuKhongKhaDung, loiKhongTimThay } = require('../../utils/loi');

const TEN_JOB = Object.freeze({
    CONG_VIEC: 'xu-ly-cong-viec',
    BUOC_CONG_VIEC: 'xu-ly-buoc-cong-viec'
});

function parseId(value, ten) {
    const id = Number(value);
    if (!Number.isSafeInteger(id) || id <= 0) { throw new TypeError(`${ten} không hợp lệ.`); }
    return id;
}

function batBuocTenQueue(value) {
    const tenQueue = String(value || '').trim();
    if (!coQueue(tenQueue)) { throw new TypeError(`Queue "${tenQueue}" không hợp lệ.`); }
    return tenQueue;
}

function chuanHoaMucDoUuTien(value = 5) {
    const mucDo = Number(value);
    if (!Number.isSafeInteger(mucDo) || mucDo < 1 || mucDo > 10) { throw new TypeError('Mức độ ưu tiên phải từ 1 đến 10.'); }
    return 11 - mucDo;
}

function chuanHoaSoLanThu(value) {
    if (value === undefined || value === null) { return undefined; }
    const soLan = Number(value);
    if (!Number.isSafeInteger(soLan) || soLan < 0) { throw new TypeError('Số lần thử queue phải là số nguyên không âm.'); }
    return Math.max(1, soLan);
}

function chuanHoaDelay(value = 0) {
    const delay = Number(value);
    if (!Number.isSafeInteger(delay) || delay < 0) { throw new TypeError('Delay queue phải là số nguyên không âm.'); }
    return delay;
}

function taoJobIdCongViec(congViecId) { return `cong-viec-${parseId(congViecId, 'ID công việc')}`; }

function taoJobIdBuoc(buocId) { return `buoc-cong-viec-${parseId(buocId, 'ID bước công việc')}`; }

function chuanHoaJob(job) {
    if (!job) { return null; }
    return {
        id: String(job.id),
        name: job.name,
        queueName: job.queueName || job.queue?.name || null,
        data: job.data,
        attemptsMade: job.attemptsMade,
        progress: job.progress,
        timestamp: job.timestamp,
        processedOn: job.processedOn || null,
        finishedOn: job.finishedOn || null,
        failedReason: job.failedReason || null
    };
}

async function thucThiQueue(callback, thongBao, maLoi = MA_LOI.QUEUE_KHONG_KHA_DUNG, metadata = null) {
    try {
        return await callback();
    } catch (error) {
        if (laLoiUngDung(error)) { throw error; }
        throw loiDichVuKhongKhaDung(thongBao, maLoi, error, metadata);
    }
}

async function themJob({ tenQueue, tenJob, jobId, data = {}, options = {} }) {
    const queueName = batBuocTenQueue(tenQueue);
    if (typeof tenJob !== 'string' || !tenJob.trim()) { throw new TypeError('Tên job không hợp lệ.'); }
    if (typeof jobId !== 'string' || !jobId.trim()) { throw new TypeError('Job ID không hợp lệ.'); }
    const queue = queues.layQueue(queueName);
    return thucThiQueue(() => queue.add(tenJob.trim(), data, { ...options, jobId: jobId.trim() }), 'Không thể thêm công việc vào queue.', MA_LOI.QUEUE_THEM_CONG_VIEC_THAT_BAI, { tenQueue: queueName, jobId });
}

async function xepHangCongViec({ congViecId, tenQueue = TEN_QUEUE.CHUYEN_DOI, data = {}, mucDoUuTien = 5, soLanThuToiDa, delayMs = 0 } = {}) {
    const id = parseId(congViecId, 'ID công việc');
    const queueName = batBuocTenQueue(tenQueue);
    const jobId = taoJobIdCongViec(id);
    const queue = queues.layQueue(queueName);
    const jobDaTonTai = await thucThiQueue(() => queue.getJob(jobId), 'Không thể kiểm tra công việc trong queue.', MA_LOI.QUEUE_KHONG_KHA_DUNG, { tenQueue: queueName, jobId });
    const job = jobDaTonTai || await themJob({
        tenQueue: queueName,
        tenJob: TEN_JOB.CONG_VIEC,
        jobId,
        data: {
            ...data,
            phienBan: 1,
            congViecId: id
        },
        options: {
            priority: chuanHoaMucDoUuTien(mucDoUuTien),
            attempts: chuanHoaSoLanThu(soLanThuToiDa),
            delay: chuanHoaDelay(delayMs)
        }
    });
    try {
        await congViecService.ganQueue(id, queueName, String(job.id));
    } catch (error) {
        if (!jobDaTonTai) {
            try {
                await job.remove();
            } catch {}
        }
        throw error;
    }
    return {
        ...chuanHoaJob(job),
        daTonTai: Boolean(jobDaTonTai)
    };
}

async function xepHangBuocCongViec({ buocId, congViecId, tenQueue, data = {}, mucDoUuTien = 5, soLanThuToiDa, delayMs = 0 } = {}) {
    const id = parseId(buocId, 'ID bước công việc');
    const congViec = parseId(congViecId, 'ID công việc');
    const queueName = batBuocTenQueue(tenQueue);
    const jobId = taoJobIdBuoc(id);
    const queue = queues.layQueue(queueName);
    const jobDaTonTai = await thucThiQueue(() => queue.getJob(jobId), 'Không thể kiểm tra bước công việc trong queue.', MA_LOI.QUEUE_KHONG_KHA_DUNG, { tenQueue: queueName, jobId });
    const job = jobDaTonTai || await themJob({
        tenQueue: queueName,
        tenJob: TEN_JOB.BUOC_CONG_VIEC,
        jobId,
        data: {
            ...data,
            phienBan: 1,
            buocId: id,
            congViecId: congViec
        },
        options: {
            priority: chuanHoaMucDoUuTien(mucDoUuTien),
            attempts: chuanHoaSoLanThu(soLanThuToiDa),
            delay: chuanHoaDelay(delayMs)
        }
    });
    try {
        await congViecService.capNhatBuoc(id, {
            queueName,
            queueJobId: String(job.id)
        });
    } catch (error) {
        if (!jobDaTonTai) {
            try {
                await job.remove();
            } catch {}
        }
        throw error;
    }
    return {
        ...chuanHoaJob(job),
        daTonTai: Boolean(jobDaTonTai)
    };
}

async function layJob(tenQueue, jobId) {
    const queueName = batBuocTenQueue(tenQueue);
    const id = String(jobId || '').trim();
    if (!id) { throw new TypeError('Job ID không hợp lệ.'); }
    const job = await thucThiQueue(() => queues.layQueue(queueName).getJob(id), 'Không thể đọc công việc từ queue.', MA_LOI.QUEUE_KHONG_KHA_DUNG, { tenQueue: queueName, jobId: id });
    if (!job) { throw loiKhongTimThay('Queue job không tồn tại.', MA_LOI.QUEUE_CONG_VIEC_KHONG_TIM_THAY); }
    return job;
}

async function layTrangThaiJob(tenQueue, jobId) {
    const job = await layJob(tenQueue, jobId);
    const state = await thucThiQueue(() => job.getState(), 'Không thể đọc trạng thái queue job.', MA_LOI.QUEUE_KHONG_KHA_DUNG, { tenQueue, jobId });
    return {
        ...chuanHoaJob(job),
        state
    };
}

async function xoaJob(tenQueue, jobId) {
    const job = await layJob(tenQueue, jobId);
    const state = await thucThiQueue(() => job.getState(), 'Không thể đọc trạng thái queue job.', MA_LOI.QUEUE_KHONG_KHA_DUNG, { tenQueue, jobId });
    if (state === 'active') {
        return {
            daXoa: false,
            state,
            job: chuanHoaJob(job)
        };
    }
    await thucThiQueue(() => job.remove(), 'Không thể xóa queue job.', MA_LOI.QUEUE_KHONG_KHA_DUNG, { tenQueue, jobId });
    return {
        daXoa: true,
        state,
        job: chuanHoaJob(job)
    };
}

module.exports = {
    TEN_JOB,
    taoJobIdCongViec,
    taoJobIdBuoc,
    themJob,
    xepHangCongViec,
    xepHangBuocCongViec,
    layJob,
    layTrangThaiJob,
    xoaJob
};