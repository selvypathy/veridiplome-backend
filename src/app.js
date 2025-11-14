const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const authRoutes = require('./routes/auth.routes');
const etudiantRoutes = require('./routes/etudiant.routes');
const ecoleRoutes = require('./routes/ecole.routes');
const documentRoutes = require('./routes/document.routes');
const verificationRoutes = require('./routes/verification.routes');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Servir les fichiers statiques
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/', (req, res) => {
  res.json({ 
    message: '🚀 Bienvenue sur VériDiplôme API',
    version: '1.0.0',
    status: 'OK',
    endpoints: {
      auth: '/api/auth/*',
      etudiants: '/api/etudiants/*',
      ecoles: '/api/ecoles/*',
      documents: '/api/documents/*',
      verification: '/api/verification/public/*'
    }
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/etudiants', etudiantRoutes);
app.use('/api/ecoles', ecoleRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/verification', verificationRoutes);

app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route non trouvée' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.statusCode || 500).json({
    error: err.message || 'Erreur interne du serveur'
  });
});

module.exports = app;