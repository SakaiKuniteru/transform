'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const esbuild = require('esbuild');

const { DIST_ROOT, PROJECT_ROOT } = require('./clean');

const STYLES_ROOT = path.join(PROJECT_ROOT, 'src', 'styles');

const CSS_ENTRY = [
    '@import "./tokens/variables.css";',
    '@import "./base/reset.css";',
    '@import "./base/base.css";',
    '@import "./components/brand.css";',
    '@import "./components/icon.css";',
    '@import "./components/card.css";',
    '@import "./components/button.css";',
    '@import "./components/table.css";',
    '@import "./components/modal.css";',
    '@import "./components/toast.css";',
    '@import "./forms/form.css";',
    '@import "./layouts/public.css";',
    '@import "./layouts/auth.css";',
    '@import "./layouts/user.css";',
    '@import "./layouts/admin.css";',
    '@import "./user/user.css";',
    '@import "./admin/admin.css";',
    '@import "./components/workspace.css";'
].join('\n');

function taoHash(content) { return crypto.createHash('sha256').update(content).digest('hex').slice(0, 12); }

async function buildCss() {
    const result = await esbuild.build({ stdin: { contents: CSS_ENTRY, resolveDir: STYLES_ROOT, sourcefile: 'app.css', loader: 'css' }, bundle: true, minify: true, target: [ 'es2020' ], write: false, sourcemap: false, legalComments: 'none', logLevel: 'silent' });
    const output = result.outputFiles.find((file) => file.path.endsWith('.css')) || result.outputFiles[0];
    if (!output) { throw new Error('Không tạo được bundle CSS.'); }
    const css = output.text;
    const hash = taoHash(css);
    const fileName = `app.${hash}.css`;
    const relativePath = `css/${fileName}`;
    await fs.mkdir(path.join(DIST_ROOT, 'css'), { recursive: true });
    await fs.writeFile(path.join(DIST_ROOT, relativePath), `${css}\n`, 'utf8');
    return { logicalName: 'css/app.css', relativePath, fileName, hash };
}

if (require.main === module) { buildCss().then((result) => console.log(`[FE] CSS ${result.relativePath}`)).catch((error) => { console.error(error); process.exitCode = 1; }); }

module.exports = {
    STYLES_ROOT,
    CSS_ENTRY,
    buildCss
};