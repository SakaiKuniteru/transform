'use strict';
const path = require('node:path');
const env = require('./env');
const viewsDir = path.join(env.root, 'src', 'views');
module.exports = Object.freeze({
    engineName: 'hbs',
    extname: '.hbs',
    defaultLayout: 'app',
    viewsDir,
    layoutsDir: path.join(viewsDir, 'layouts'),
    partialsDir: path.join(viewsDir, 'partials')
});