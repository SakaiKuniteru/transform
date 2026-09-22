'use strict';

const express = require('express');
const path = require('node:path');
const { engine } = require('express-handlebars');

const app = express();

app.engine(
    'hbs',
    engine({
        extname: '.hbs',
        defaultLayout: 'app',
        layoutsDir: path.join(__dirname, 'views', 'layouts'),
        partialsDir: path.join(__dirname, 'views', 'partials')
    })
);

app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());

app.use(
    express.urlencoded({
        extended: true
    })
);

app.use('/assets', express.static(path.join(__dirname, 'public', 'assets')));

app.get('/', (req, res) => {
    return res.render(
        'pages/trang-chu',
        {
            title: 'Transform Platform'
        }
    );
});

module.exports = app;