'use strict';

const MA_LOI = require('../../../constants/ma-loi');
const { taoLoiTheoStatus: taoLoi } = require('../../../utils/loi');
const providerService = require('./dich-provider');

const MA_NGON_NGU = Object.freeze({
    TU_DONG: 'auto',
    KHONG_XAC_DINH: 'und',
    VI: 'vi',
    EN: 'en',
    ZH: 'zh',
    JA: 'ja',
    KO: 'ko',
    RU: 'ru',
    AR: 'ar',
    TH: 'th',
    HI: 'hi'
});

const TU_TIENG_ANH = new Set(['the', 'and', 'is', 'are', 'to', 'of', 'in', 'for', 'with', 'this', 'that', 'you', 'your', 'from', 'on', 'as', 'be', 'or']);
const TU_TIENG_VIET = new Set(['và', 'là', 'của', 'trong', 'cho', 'với', 'này', 'được', 'không', 'một', 'những', 'các', 'từ', 'đến', 'người', 'khi']);

function chuanHoaMaNgonNgu(value, options = {}) { const text = String(value || '').trim().toLowerCase().replaceAll('_', '-'); if (!text) { return options.macDinh || null; } if (options.choPhepAuto !== false && text === 'auto') { return MA_NGON_NGU.TU_DONG; } if (options.choPhepUnd !== false && text === 'und') { return MA_NGON_NGU.KHONG_XAC_DINH; } if (!/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/.test(text)) { throw taoLoi(400, `Mã ngôn ngữ "${value}" không hợp lệ.`, MA_LOI.NGON_NGU_KHONG_HO_TRO); } return text; }

function demRegex(text, regex) { return (text.match(regex) || []).length; }

function tachTu(text) { return String(text || '').toLowerCase().normalize('NFC').match(/\p{L}+/gu) || []; }

function nhanDienCucBo(vanBan) {
    const text = String(vanBan || '').trim();
    if (!text) { return { ngonNgu: MA_NGON_NGU.KHONG_XAC_DINH, doTinCay: 0, nguon: 'LOCAL' }; }
    const tongChu = Math.max(1, demRegex(text, /\p{L}/gu));
    const scripts = [
        { ngonNgu: MA_NGON_NGU.JA, score: demRegex(text, /[\u3040-\u30ff]/g) },
        { ngonNgu: MA_NGON_NGU.KO, score: demRegex(text, /[\uac00-\ud7af]/g) },
        { ngonNgu: MA_NGON_NGU.ZH, score: demRegex(text, /[\u3400-\u4dbf\u4e00-\u9fff]/g) },
        { ngonNgu: MA_NGON_NGU.RU, score: demRegex(text, /[\u0400-\u04ff]/g) },
        { ngonNgu: MA_NGON_NGU.AR, score: demRegex(text, /[\u0600-\u06ff]/g) },
        { ngonNgu: MA_NGON_NGU.TH, score: demRegex(text, /[\u0e00-\u0e7f]/g) },
        { ngonNgu: MA_NGON_NGU.HI, score: demRegex(text, /[\u0900-\u097f]/g) }
    ].sort((a, b) => b.score - a.score);
    if (scripts[0].score > 0 && scripts[0].score / tongChu >= 0.2) { return { ngonNgu: scripts[0].ngonNgu, doTinCay: Math.min(0.99, 0.6 + scripts[0].score / tongChu * 0.39), nguon: 'LOCAL' }; }
    const words = tachTu(text);
    const vietDau = demRegex(text.normalize('NFC'), /[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/gi);
    const viHits = words.filter((word) => TU_TIENG_VIET.has(word)).length + Math.min(vietDau, 10);
    const enHits = words.filter((word) => TU_TIENG_ANH.has(word)).length;
    if (viHits >= 2 && viHits >= enHits) { return { ngonNgu: MA_NGON_NGU.VI, doTinCay: Math.min(0.95, 0.55 + viHits / Math.max(4, words.length) * 0.8), nguon: 'LOCAL' }; }
    if (enHits >= 2) { return { ngonNgu: MA_NGON_NGU.EN, doTinCay: Math.min(0.9, 0.5 + enHits / Math.max(4, words.length) * 0.8), nguon: 'LOCAL' }; }
    return { ngonNgu: MA_NGON_NGU.KHONG_XAC_DINH, doTinCay: 0.2, nguon: 'LOCAL' };
}

async function nhanDien(vanBan, options = {}) {
    const text = String(vanBan || '');
    if (!text.trim()) { return { ngonNgu: MA_NGON_NGU.KHONG_XAC_DINH, doTinCay: 0, nguon: 'LOCAL' }; }
    if (options.provider !== false) {
        try {
            const provider = await providerService.chonProvider(options.provider || null);
            if (provider.nhanDienNgonNgu) {
                const result = await provider.nhanDienNgonNgu({
                    vanBan: text,
                    tuyChon: options.tuyChon || {},
                    signal: options.signal
                });
                return {
                    ngonNgu: chuanHoaMaNgonNgu(result.ngonNgu, { choPhepAuto: false }),
                    doTinCay: Number.isFinite(Number(result.doTinCay)) ? Number(result.doTinCay) : null,
                    nguon: 'PROVIDER',
                    provider: provider.ma
                };
            }
        } catch (error) {
            if (options.batBuocProvider === true) { throw error; }
        }
    }
    return nhanDienCucBo(text);
}

module.exports = {
    MA_NGON_NGU,
    chuanHoaMaNgonNgu,
    nhanDienCucBo,
    nhanDien
};