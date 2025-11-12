#!/usr/bin/env node

/**
 * Script d'installation automatique pour VériDiplôme Backend
 * Usage: node setup.js
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Installation de VériDiplôme Backend...\n');

// Structure des dossiers
const dirs = [
  'src',
  'src/config',
  'src/utils',
  'src/models',
  'src/routes',
  'src/controllers',
  'src/middlewares',
  'src/services',
  'uploads/photos',
  'uploads/documents',
  'uploads/qrcodes',
  'logs'
];

// Créer les dossiers
console.log('📁 Création des dossiers...');
dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`  ✅ ${dir}/`);
  }
});

// Fichiers à créer
const files = {
  'package.json': `{
  "name": "veridiplome-backend",
  "version": "1.0.0",
  "description": "Backend VériDiplôme - Plateforme de vérification de diplômes",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js"
  },
  "keywords": ["education", "diplome", "verification", "blockchain"],
  "author": "Votre Nom",
  "license": "MIT",
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.11.3",
    "pg-hstore": "^2.3.4",
    "sequelize": "^6.35.2",
    "dotenv": "^16.3.1",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "morgan": "^1.10.0",
    "winston": "^3.11.0",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "joi": "^17.11.0",
    "multer": "^1.4.5-lts.1",
    "qrcode": "^1.5.3",
    "uuid": "^9.0.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}`,

  '.env': `NODE_ENV=development
PORT=5000
APP_NAME=VeriDiplome
APP_URL=http://localhost:5000

DB_HOST=localhost
DB_PORT=5432
DB_NAME=veridiplome
DB_USER=postgres
DB_PASSWORD=""

FRONTEND_URL=http://localhost:3000

JWT_SECRET=changez_cette_cle_en_production
JWT_EXPIRES_IN=7d

BLOCKCHAIN_ENABLED=false`,

  '.gitignore': `node_modules/
.env
.env.local
logs/
*.log
.DS_Store
Thumbs.db
.vscode/
.idea/
uploads/
*.swp
*.swo`,

  'README.md': `# VériDiplôme Backend

Plateforme de vérification et authentification des diplômes pour l'Afrique francophone.

## Installation

\`\`\`bash
npm install
\`\`\`

## Configuration

1. Créer la base de données PostgreSQL:
\`\`\`sql
CREATE DATABASE veridiplome;
\`\`\`

2. Configurer le fichier \`.env\` avec vos paramètres

## Démarrage

\`\`\`bash
npm run dev
\`\`\`

Le serveur démarre sur http://localhost:5000

## Documentation

- API: \`/docs/API.md\`
- Architecture: \`/docs/ARCHITECTURE.md\`
`,

  'src/utils/logger.js': `const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp }) => {
          return \`\${timestamp} [\${level}]: \${message}\`;
        })
      )
    })
  ]
});

module.exports = logger;`,

  'src/config/database.js': `const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

module.exports = { sequelize };`,

  'src/app.js': `const express = require('express');
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

module.exports = app;`,

  'src/server.js': `require('dotenv').config();
const app = require('./app');
const logger = require('./utils/logger');
const { sequelize } = require('./config/database');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await sequelize.authenticate();
    logger.info('✅ Connexion à PostgreSQL réussie !');
    logger.info(\`📊 Base de données: \${process.env.DB_NAME}\`);

    app.listen(PORT, () => {
      logger.info('════════════════════════════════════════');
      logger.info(\`🚀 Serveur VériDiplôme démarré !\`);
      logger.info(\`📍 URL: \${process.env.APP_URL}\`);
      logger.info(\`🌍 Environnement: \${process.env.NODE_ENV}\`);
      logger.info('════════════════════════════════════════');
    });
  } catch (error) {
    logger.error('❌ Erreur au démarrage:');
    logger.error(error.message);
    process.exit(1);
  }
}

startServer();`
};

// Créer les fichiers
console.log('\n📝 Création des fichiers...');
Object.entries(files).forEach(([filename, content]) => {
  fs.writeFileSync(filename, content);
  console.log(`  ✅ ${filename}`);
});

console.log('\n✅ Installation terminée !\n');
console.log('📋 Prochaines étapes:\n');
console.log('  1. Créer la base de données PostgreSQL:');
console.log('     CREATE DATABASE veridiplome;\n');
console.log('  2. Configurer le fichier .env\n');
console.log('  3. Installer les dépendances:');
console.log('     npm install\n');
console.log('  4. Démarrer le serveur:');
console.log('     npm run dev\n');
console.log('🚀 Bon développement !\n');