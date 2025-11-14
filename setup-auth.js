#!/usr/bin/env node

/**
 * Script d'ajout de l'authentification pour VériDiplôme Backend
 * Usage: node setup-auth.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔐 Ajout de l\'authentification à VériDiplôme...\n');

// Fichiers à créer
const files = {
  // MODÈLES
  'src/models/index.js': `const { sequelize } = require('../config/database');
const { DataTypes } = require('sequelize');

// Import des modèles
const User = require('./User')(sequelize, DataTypes);
const Ecole = require('./Ecole')(sequelize, DataTypes);
const Etudiant = require('./Etudiant')(sequelize, DataTypes);

// Associations
User.belongsTo(Ecole, { foreignKey: 'ecole_id', as: 'ecole' });
User.belongsTo(Etudiant, { foreignKey: 'etudiant_ine', as: 'etudiant' });

Etudiant.belongsTo(Ecole, { foreignKey: 'ecole_creation_id', as: 'ecoleCreation' });
Etudiant.belongsTo(Ecole, { foreignKey: 'ecole_actuelle_id', as: 'ecoleActuelle' });

module.exports = {
  sequelize,
  User,
  Ecole,
  Etudiant
};`,

  'src/models/User.js': `module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password_hash: {
      type: DataTypes.STRING,
      allowNull: false
    },
    role: {
      type: DataTypes.ENUM('admin', 'ecole', 'etudiant'),
      allowNull: false
    },
    nom_complet: {
      type: DataTypes.STRING,
      allowNull: false
    },
    telephone: DataTypes.STRING,
    ecole_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    etudiant_ine: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    email_verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'users',
    timestamps: true,
    underscored: true
  });

  return User;
};`,

  'src/models/Ecole.js': `module.exports = (sequelize, DataTypes) => {
  const Ecole = sequelize.define('Ecole', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    nom_complet: {
      type: DataTypes.STRING,
      allowNull: false
    },
    prefixe_unique: {
      type: DataTypes.STRING(10),
      unique: true
    },
    type: {
      type: DataTypes.ENUM('primaire', 'college', 'lycee', 'universite', 'institut'),
      allowNull: false
    },
    ville: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    telephone: DataTypes.STRING,
    email: DataTypes.STRING,
    directeur_nom: DataTypes.STRING,
    compte_valide: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    valide_par_ministere: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    statut: {
      type: DataTypes.ENUM('en_attente', 'actif', 'suspendu'),
      defaultValue: 'en_attente'
    }
  }, {
    tableName: 'ecoles',
    timestamps: true,
    underscored: true
  });

  return Ecole;
};`,

  'src/models/Etudiant.js': `module.exports = (sequelize, DataTypes) => {
  const Etudiant = sequelize.define('Etudiant', {
    ine: {
      type: DataTypes.STRING(50),
      primaryKey: true
    },
    nom: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    prenom: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    nom_complet: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    date_naissance: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    lieu_naissance: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    sexe: {
      type: DataTypes.ENUM('M', 'F'),
      allowNull: false
    },
    photo_url: DataTypes.TEXT,
    ecole_creation_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    ecole_creation_nom: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    prefixe_creation: {
      type: DataTypes.STRING(10),
      allowNull: false
    },
    date_creation_ine: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    annee_creation: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    ecole_actuelle_id: DataTypes.UUID,
    ecole_actuelle_nom: DataTypes.STRING(255),
    statut: {
      type: DataTypes.ENUM('actif', 'diplome', 'decrocheur'),
      defaultValue: 'actif'
    }
  }, {
    tableName: 'etudiants',
    timestamps: true,
    underscored: true
  });

  return Etudiant;
};`,

  // ROUTES
  'src/routes/auth.routes.js': `const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

// Inscription
router.post('/register/ecole', authController.registerEcole);
router.post('/register/etudiant', authController.registerEtudiant);

// Connexion
router.post('/login', authController.login);

// Profil utilisateur
router.get('/me', authMiddleware, authController.getProfile);

// Déconnexion
router.post('/logout', authMiddleware, authController.logout);

module.exports = router;`,

  // CONTRÔLEURS
  'src/controllers/auth.controller.js': `const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Ecole, Etudiant } = require('../models');
const logger = require('../utils/logger');

class AuthController {
  async registerEcole(req, res, next) {
    try {
      const {
        email,
        password,
        nom_complet,
        type,
        ville,
        telephone,
        directeur_nom
      } = req.body;

      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(409).json({ error: 'Cet email est déjà utilisé' });
      }

      const password_hash = await bcrypt.hash(password, 12);

      const ecole = await Ecole.create({
        nom_complet,
        type,
        ville,
        telephone,
        email,
        directeur_nom,
        statut: 'en_attente'
      });

      const user = await User.create({
        email,
        password_hash,
        role: 'ecole',
        nom_complet,
        telephone,
        ecole_id: ecole.id
      });

      logger.info('Nouvelle école enregistrée: ' + nom_complet);

      res.status(201).json({
        success: true,
        message: 'École enregistrée avec succès. En attente de validation.',
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          nom_complet: user.nom_complet
        },
        ecole: {
          id: ecole.id,
          nom_complet: ecole.nom_complet,
          statut: ecole.statut
        }
      });

    } catch (error) {
      logger.error('Erreur inscription école:', error);
      next(error);
    }
  }

  async registerEtudiant(req, res, next) {
    try {
      const { email, password, ine } = req.body;

      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(409).json({ error: 'Cet email est déjà utilisé' });
      }

      const etudiant = await Etudiant.findByPk(ine);
      if (!etudiant) {
        return res.status(404).json({ 
          error: 'INE introuvable. Contactez votre école.' 
        });
      }

      const existingEtudiantUser = await User.findOne({ 
        where: { etudiant_ine: ine } 
      });
      if (existingEtudiantUser) {
        return res.status(409).json({ 
          error: 'Un compte existe déjà pour cet INE' 
        });
      }

      const password_hash = await bcrypt.hash(password, 12);

      const user = await User.create({
        email,
        password_hash,
        role: 'etudiant',
        nom_complet: etudiant.nom_complet,
        etudiant_ine: ine
      });

      logger.info('Nouvel étudiant enregistré: ' + etudiant.nom_complet);

      res.status(201).json({
        success: true,
        message: 'Compte créé avec succès',
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          nom_complet: user.nom_complet,
          ine: ine
        }
      });

    } catch (error) {
      logger.error('Erreur inscription étudiant:', error);
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      const user = await User.findOne({ 
        where: { email },
        include: [
          { model: Ecole, as: 'ecole' },
          { model: Etudiant, as: 'etudiant' }
        ]
      });

      if (!user) {
        return res.status(401).json({ 
          error: 'Email ou mot de passe incorrect' 
        });
      }

      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) {
        return res.status(401).json({ 
          error: 'Email ou mot de passe incorrect' 
        });
      }

      if (!user.is_active) {
        return res.status(403).json({ 
          error: 'Votre compte est désactivé' 
        });
      }

      const token = jwt.sign(
        { 
          userId: user.id,
          email: user.email,
          role: user.role 
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      logger.info('Connexion réussie: ' + user.email);

      res.json({
        success: true,
        message: 'Connexion réussie',
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          nom_complet: user.nom_complet,
          ecole: user.ecole,
          etudiant: user.etudiant
        }
      });

    } catch (error) {
      logger.error('Erreur connexion:', error);
      next(error);
    }
  }

  async getProfile(req, res, next) {
    try {
      const user = await User.findByPk(req.user.id, {
        attributes: { exclude: ['password_hash'] },
        include: [
          { model: Ecole, as: 'ecole' },
          { model: Etudiant, as: 'etudiant' }
        ]
      });

      res.json({
        success: true,
        user
      });

    } catch (error) {
      logger.error('Erreur récupération profil:', error);
      next(error);
    }
  }

  async logout(req, res) {
    res.json({
      success: true,
      message: 'Déconnexion réussie'
    });
  }
}

module.exports = new AuthController();`,

  // MIDDLEWARES
  'src/middlewares/auth.middleware.js': `const jwt = require('jsonwebtoken');
const { User } = require('../models');
const logger = require('../utils/logger');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Token manquant ou invalide' 
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findByPk(decoded.userId, {
      attributes: { exclude: ['password_hash'] }
    });

    if (!user || !user.is_active) {
      return res.status(401).json({ 
        error: 'Utilisateur introuvable ou désactivé' 
      });
    }

    req.user = user;
    req.userId = user.id;
    next();

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expiré',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Token invalide' 
      });
    }

    logger.error('Erreur auth middleware:', error);
    res.status(500).json({ error: 'Erreur authentification' });
  }
};

const roleMiddleware = (rolesAutorises) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentification requise' 
      });
    }

    if (!rolesAutorises.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Accès non autorisé pour votre rôle'
      });
    }

    next();
  };
};

module.exports = { authMiddleware, roleMiddleware };`,

  'src/app.js': `const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const authRoutes = require('./routes/auth.routes');

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

app.use('/api/auth', authRoutes);

app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route non trouvée' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.statusCode || 500).json({
    error: err.message || 'Erreur interne du serveur'
  });
});

module.exports = app;`,

  'src/server.js': `require('dotenv').config();
const app = require('./app');
const logger = require('./utils/logger');
const { sequelize } = require('./models');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await sequelize.authenticate();
    logger.info('✅ Connexion à PostgreSQL réussie !');
    
    await sequelize.sync({ alter: true });
    logger.info('✅ Tables de base de données synchronisées');

    app.listen(PORT, () => {
      logger.info('════════════════════════════════════════');
      logger.info('🚀 Serveur VériDiplôme démarré !');
      logger.info('📍 URL: ' + process.env.APP_URL);
      logger.info('🌍 Environnement: ' + process.env.NODE_ENV);
      logger.info('🔐 Authentification: Activée');
      logger.info('════════════════════════════════════════');
    });
  } catch (error) {
    logger.error('❌ Erreur au démarrage:', error);
    process.exit(1);
  }
}

startServer();`
};

// Créer les fichiers
console.log('📝 Création des fichiers...\n');
Object.entries(files).forEach(([filename, content]) => {
  const dir = path.dirname(filename);
  if (dir !== '.' && !fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filename, content);
  console.log('  ✅ ' + filename);
});

console.log('\n✅ Authentification ajoutée !\n');
console.log('📋 Prochaines étapes:\n');
console.log('  1. Ajouter à votre .env:');
console.log('     JWT_SECRET=votre_secret_securise');
console.log('     JWT_EXPIRES_IN=7d\n');
console.log('  2. Installer les dépendances:');
console.log('     npm install bcryptjs jsonwebtoken\n');
console.log('  3. Relancer le serveur:');
console.log('     npm run dev\n');