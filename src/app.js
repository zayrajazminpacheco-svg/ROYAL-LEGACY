const express = require('express');
const cors = require('cors');
const path = require('path');

const routes = require('./routes');
const { notFoundHandler, errorHandler } = require('./middlewares');

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.use('/api', routes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;