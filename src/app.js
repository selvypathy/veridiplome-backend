const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

app.get('/', (req, res) => {
  res.json({ 
    message: '🚀 Bienvenue sur VériDiplôme API',
    version: '1.0.0',
    status: 'OK'
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route non trouvée' });
});

module.exports = app;