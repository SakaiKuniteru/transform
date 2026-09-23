'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

const { DIST_ROOT, PROJECT_ROOT } = require('./clean');

const CLIENT_ROOT = path.join(PROJECT_ROOT, 'src', 'client');
const ALLOWED_DIST_ROOT = new Set([ 'css', 'js', 'images', 'fonts', 'manifest.json' ]);

const ALLOWED_EXTENSIONS = Object.freeze({
    css: new Set([ '.css' ]),
    js: new Set([ '.js' ]),
    images: new Set([ '.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.ico', '.avif' ]),
    fonts: new Set([ '.woff', '.woff2', '.ttf', '.otf' ])
});

const FORBIDDEN_CLIENT_PATTERNS = Object.freeze([
    Object.freeze({ pattern: /process\.env\b/, message: 'Client không được đọc process.env.' }),
    Object.freeze({ pattern: /\b(?:API_BASE_URL|BACKEND_BASE_URL|BACKEND_URL)\b/i, message: 'Client không được chứa địa chỉ Backend nội bộ.' }),
    Object.freeze({ pattern: /\b(?:accessToken|refreshToken)\b/, message: 'Client không được chứa access token hoặc refresh token.' }),
    Object.freeze({ pattern: /\bAuthorization\b|\bBearer\b/, message: 'Client không được tự tạo credential Authorization.' }),
    Object.freeze({ pattern: /\b(?:DB_PASSWORD|REDIS_PASSWORD|MINIO_SECRET_KEY|SMTP_PASSWORD|SMTP_PASS|JWT_SECRET|SESSION_SECRET)\b/i, message: 'Client không được chứa tên secret nhạy cảm.' })
]);

const FORBIDDEN_DIST_PATTERNS = Object.freeze([
    Object.freeze({ pattern: /sourceMappingURL\s*=/i, message: 'Production không được chứa sourceMappingURL.' }),
    Object.freeze({ pattern: /sourcesContent/i, message: 'Production không được chứa sourcesContent.' }),
    Object.freeze({ pattern: /webpack:\/\//i, message: 'Production không được chứa đường dẫn source webpack.' })
]);

async function tonTai(target) {
    try { await fs.access(target); return true; } catch (error) { return false; }
}

async function layDanhSachFile(root) {
    if (!await tonTai(root)) { return []; }
    const ketQua = [];
    async function walk(current) {
        const entries = await fs.readdir(current, { withFileTypes: true });
        for (const entry of entries) {
            const target = path.join(current, entry.name);
            if (entry.isDirectory()) { await walk(target); } else if (entry.isFile()) { ketQua.push(target); }
        }
    }
    await walk(root);
    return ketQua;
}

async function checkClientSource() {
    const files = (await layDanhSachFile(CLIENT_ROOT)).filter((file) => path.extname(file).toLowerCase() === '.js');
    const errors = [];
    for (const file of files) {
        const content = await fs.readFile(file, 'utf8');
        for (const rule of FORBIDDEN_CLIENT_PATTERNS) { if (rule.pattern.test(content)) { errors.push(`${path.relative(PROJECT_ROOT, file)}: ${rule.message}`); } }
    }
    if (errors.length) { throw new Error(`Client source không đạt yêu cầu:\n${errors.join('\n')}`); }
    return files.length;
}

async function checkDistStructure() {
    const entries = await fs.readdir(DIST_ROOT, { withFileTypes: true });
    const errors = [];
    for (const entry of entries) { if (!ALLOWED_DIST_ROOT.has(entry.name)) { errors.push(`public/dist/${entry.name} không được phép public.`); } }
    for (const dirName of [ 'css', 'js', 'images', 'fonts' ]) {
        const root = path.join(DIST_ROOT, dirName);
        const files = await layDanhSachFile(root);
        for (const file of files) {
            const ext = path.extname(file).toLowerCase();
            if (ext === '.map') { errors.push(`${path.relative(PROJECT_ROOT, file)}: source map bị cấm.`); continue; }
            if (!ALLOWED_EXTENSIONS[dirName].has(ext)) { errors.push(`${path.relative(PROJECT_ROOT, file)}: định dạng file không được phép trong ${dirName}.`); }
        }
    }
    if (errors.length) { throw new Error(`Cấu trúc public/dist không hợp lệ:\n${errors.join('\n')}`); }
}

async function checkDistContent() {
    const files = await layDanhSachFile(DIST_ROOT);
    const errors = [];
    for (const file of files) {
        const ext = path.extname(file).toLowerCase();
        if (![ '.js', '.css', '.json' ].includes(ext)) { continue; }
        const content = await fs.readFile(file, 'utf8');
        for (const rule of FORBIDDEN_DIST_PATTERNS) { if (rule.pattern.test(content)) { errors.push(`${path.relative(PROJECT_ROOT, file)}: ${rule.message}`); } }
    }
    if (errors.length) { throw new Error(`Production output không đạt yêu cầu:\n${errors.join('\n')}`); }
}

async function checkManifest() {
    const manifestPath = path.join(DIST_ROOT, 'manifest.json');
    if (!await tonTai(manifestPath)) { throw new Error('Thiếu public/dist/manifest.json.'); }
    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
    const css = manifest.assets?.['css/app.css'];
    const js = manifest.assets?.['js/app.js'];
    if (!/^css\/app\.[a-f0-9]{12}\.css$/.test(String(css || ''))) { throw new Error('Manifest CSS không hợp lệ.'); }
    if (!/^js\/app\.[a-f0-9]{12}\.js$/.test(String(js || ''))) { throw new Error('Manifest JS không hợp lệ.'); }
    if (!await tonTai(path.join(DIST_ROOT, css))) { throw new Error(`Không tìm thấy asset ${css}.`); }
    if (!await tonTai(path.join(DIST_ROOT, js))) { throw new Error(`Không tìm thấy asset ${js}.`); }
    return manifest;
}

async function checkDist() {
    await checkDistStructure();
    await checkDistContent();
    await checkManifest();
    return true;
}

async function checkSource() {
    await checkClientSource();
    await checkDist();
    return true;
}

if (require.main === module) { checkSource().then(() => console.log('[FE] SOURCE CHECK PASS')).catch((error) => { console.error(error); process.exitCode = 1; }); }

module.exports = {
    checkClientSource,
    checkDistStructure,
    checkDistContent,
    checkManifest,
    checkDist,
    checkSource
};