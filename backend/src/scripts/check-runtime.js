'use strict';

const fs = require('node:fs');
const { CONG_CU, kiemTraCongCu } = require('../infrastructure/process/process-runner');

const KIEM_TRA = Object.freeze([
    [CONG_CU.LIBREOFFICE, ['--version']],
    [CONG_CU.PANDOC, ['--version']],
    [CONG_CU.TESSERACT, ['--version']],
    [CONG_CU.PDFTOTEXT, ['-v']],
    [CONG_CU.PDFTOPPM, ['-v']],
    [CONG_CU.QPDF, ['--version']],
    [CONG_CU.GHOSTSCRIPT, ['--version']],
    [CONG_CU.SEVENZIP, ['i']]
]);

async function chay() {
    await fs.promises.access(process.execPath, fs.constants.X_OK);
    console.log(`[Runtime] node ${process.version} ${process.execPath}`);
    for (const [congCu, args] of KIEM_TRA) { const ketQua = await kiemTraCongCu(congCu, args); console.log(`[Runtime] ${congCu}: ${ketQua.version || 'OK'}`); }
    console.log('[Runtime] Tất cả binary bắt buộc đã sẵn sàng.');
}

if (require.main === module) { void chay().catch((error) => { console.error('[Runtime] FAIL:', error); process.exitCode = 1; }); }

module.exports = { KIEM_TRA, chay };