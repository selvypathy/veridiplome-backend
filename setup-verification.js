#!/usr/bin/env node

/**
 * Script d'ajout de la vérification publique pour VériDiplôme Backend
 * Usage: node setup-verification.js
 */

const fs = require('fs');
const path = require('path');

console.log('✅ Ajout de la vérification publique à VériDiplôme...\n');

const files = {
  // MODÈLE VÉRIFICATION
  'src/models/Verification.js': `module.exports = (sequelize, DataTypes) => {
  const Verification = sequelize.define('Verification', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    numero_verification: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    etudiant_ine: DataTypes.STRING(50),
    document_id: DataTypes.UUID,
    qr_code_scanne: DataTypes.TEXT,
    verificateur_type: {
      type: DataTypes.ENUM('public', 'employeur', 'institution'),
      allowNull: false
    },
    verificateur_nom: DataTypes.STRING(255),
    verificateur_email: DataTypes.STRING(255),
    resultat: {
      type: DataTypes.ENUM('valide', 'invalide', 'introuvable'),
      allowNull: false
    },
    details_affichees: DataTypes.JSON,
    methode: {
      type: DataTypes.ENUM('qr_code', 'recherche_ine'),
      allowNull: false
    },
    ip_address: DataTypes.STRING(45),
    user_agent: DataTypes.TEXT,
    date_verification: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'verifications',
    timestamps: false
  });

  return Verification;
};`,

  // MISE À JOUR models/index.js
  'src/models/index.js': `const { sequelize } = require('../config/database');
const { DataTypes } = require('sequelize');

const User = require('./User')(sequelize, DataTypes);
const Ecole = require('./Ecole')(sequelize, DataTypes);
const Etudiant = require('./Etudiant')(sequelize, DataTypes);
const Document = require('./Document')(sequelize, DataTypes);
const Verification = require('./Verification')(sequelize, DataTypes);

// Associations
User.belongsTo(Ecole, { foreignKey: 'ecole_id', as: 'ecole' });
User.belongsTo(Etudiant, { foreignKey: 'etudiant_ine', as: 'etudiant' });

Etudiant.belongsTo(Ecole, { foreignKey: 'ecole_creation_id', as: 'ecoleCreation' });
Etudiant.belongsTo(Ecole, { foreignKey: 'ecole_actuelle_id', as: 'ecoleActuelle' });
Etudiant.hasMany(Document, { foreignKey: 'etudiant_ine', as: 'documents' });

Document.belongsTo(Etudiant, { foreignKey: 'etudiant_ine', as: 'etudiant' });
Document.belongsTo(Ecole, { foreignKey: 'ecole_emettrice_id', as: 'ecoleEmettrice' });
Document.belongsTo(User, { foreignKey: 'emis_par_user_id', as: 'emetteur' });

Verification.belongsTo(Etudiant, { foreignKey: 'etudiant_ine', as: 'etudiant' });
Verification.belongsTo(Document, { foreignKey: 'document_id', as: 'document' });

module.exports = {
  sequelize,
  User,
  Ecole,
  Etudiant,
  Document,
  Verification
};`,

  // ROUTES VÉRIFICATION
  'src/routes/verification.routes.js': `const express = require('express');
const router = express.Router();
const verificationController = require('../controllers/verification.controller');

// ROUTES PUBLIQUES (pas d'authentification requise)

// Vérifier par INE
router.post('/public/ine', verificationController.verifierParINE);

// Vérifier par QR code
router.post('/public/qrcode', verificationController.verifierParQRCode);

// Historique des vérifications (pour stats admin)
const { authMiddleware, roleMiddleware } = require('../middlewares/auth.middleware');
router.get('/historique',
  authMiddleware,
  roleMiddleware(['admin']),
  verificationController.getHistorique
);

module.exports = router;`,

  // CONTRÔLEUR VÉRIFICATION
  'src/controllers/verification.controller.js': `const { Verification, Document, Etudiant, Ecole } = require('../models');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

class VerificationController {
  /**
   * Vérifier un diplôme par INE (PUBLIC)
   * POST /api/verification/public/ine
   */
  async verifierParINE(req, res, next) {
    try {
      const { ine } = req.body;
      const ipAddress = req.ip;
      const userAgent = req.get('User-Agent');

      // Chercher l'étudiant
      const etudiant = await Etudiant.findByPk(ine, {
        include: [{
          model: Ecole,
          as: 'ecoleCreation',
          attributes: ['nom_complet', 'type', 'ville']
        }]
      });

      if (!etudiant) {
        // Enregistrer la tentative échouée
        await this.enregistrerVerification({
          etudiant_ine: ine,
          resultat: 'introuvable',
          verificateur_type: 'public',
          methode: 'recherche_ine',
          ip_address: ipAddress,
          user_agent: userAgent
        });

        return res.status(404).json({
          valide: false,
          resultat: 'introuvable',
          message: 'Aucun étudiant trouvé avec cet INE'
        });
      }

      // Récupérer tous les diplômes valides
      const diplomes = await Document.findAll({
        where: {
          etudiant_ine: ine,
          type: 'diplome',
          statut: 'valide'
        },
        order: [['annee_scolaire', 'DESC']],
        attributes: [
          'id', 'numero_unique', 'categorie', 'niveau',
          'annee_scolaire', 'mention', 'ecole_emettrice_nom',
          'date_emission', 'qr_code_data'
        ]
      });

      // Tous les documents (bulletins + diplômes)
      const nbDocuments = await Document.count({ 
        where: { 
          etudiant_ine: ine,
          statut: 'valide'
        } 
      });

      // Enregistrer la vérification réussie
      const verificationId = await this.enregistrerVerification({
        etudiant_ine: ine,
        resultat: 'valide',
        verificateur_type: 'public',
        methode: 'recherche_ine',
        ip_address: ipAddress,
        user_agent: userAgent,
        details_affichees: {
          nom_complet: etudiant.nom_complet,
          nb_diplomes: diplomes.length
        }
      });

      res.json({
        valide: true,
        resultat: 'valide',
        verification_id: verificationId,
        etudiant: {
          ine: etudiant.ine,
          nom_complet: etudiant.nom_complet,
          date_naissance: etudiant.date_naissance,
          ecole_creation: etudiant.ecoleCreation.nom_complet
        },
        diplomes: diplomes,
        nb_documents_total: nbDocuments,
        message: 'Étudiant vérifié avec succès. Tous les diplômes sont authentiques.'
      });

    } catch (error) {
      logger.error('Erreur vérification par INE:', error);
      next(error);
    }
  }

  /**
   * Vérifier par scan QR code (PUBLIC)
   * POST /api/verification/public/qrcode
   */
  async verifierParQRCode(req, res, next) {
    try {
      const { qr_data } = req.body;
      
      // Extraire l'INE du QR code
      // Format: http://localhost:5000/verification/INE-XXX-...
      const ineMatch = qr_data.match(/INE-[A-Z0-9]+-CG-\\d{4}-[A-Z]+-\\d{6}/);
      
      if (!ineMatch) {
        return res.status(400).json({
          valide: false,
          error: 'QR code invalide ou format non reconnu'
        });
      }

      const ine = ineMatch[0];
      
      // Réutiliser la logique de vérification par INE
      req.body.ine = ine;
      return this.verifierParINE(req, res, next);

    } catch (error) {
      logger.error('Erreur vérification QR code:', error);
      next(error);
    }
  }

  /**
   * Enregistrer une vérification dans la base
   */
  async enregistrerVerification(data) {
    try {
      const verification = await Verification.create({
        numero_verification: 'VERIF-' + Date.now() + '-' + uuidv4().split('-')[0],
        ...data,
        date_verification: new Date()
      });

      return verification.id;
    } catch (error) {
      logger.error('Erreur enregistrement vérification:', error);
      return null;
    }
  }

  /**
   * Historique des vérifications (ADMIN)
   * GET /api/verification/historique
   */
  async getHistorique(req, res, next) {
    try {
      const verifications = await Verification.findAll({
        order: [['date_verification', 'DESC']],
        limit: 100,
        include: [
          {
            model: Etudiant,
            as: 'etudiant',
            attributes: ['nom_complet', 'ine']
          }
        ]
      });

      // Statistiques
      const stats = {
        total: await Verification.count(),
        reussies: await Verification.count({ where: { resultat: 'valide' } }),
        echouees: await Verification.count({ where: { resultat: 'introuvable' } })
      };

      res.json({
        success: true,
        stats,
        verifications
      });

    } catch (error) {
      logger.error('Erreur récupération historique:', error);
      next(error);
    }
  }
}

module.exports = new VerificationController();`,

  // MISE À JOUR app.js
  'src/app.js': `const express = require('express');
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

module.exports = app;`,

  // README avec tous les endpoints
  'API_ENDPOINTS.md': `# VériDiplôme - Endpoints API

## 🔐 Authentification

### Inscription École
\`\`\`
POST /api/auth/register/ecole
Body: { email, password, nom_complet, type, ville, telephone, directeur_nom }
\`\`\`

### Inscription Étudiant
\`\`\`
POST /api/auth/register/etudiant
Body: { email, password, ine }
\`\`\`

### Connexion
\`\`\`
POST /api/auth/login
Body: { email, password }
Response: { token, user }
\`\`\`

### Mon Profil
\`\`\`
GET /api/auth/me
Headers: Authorization: Bearer {token}
\`\`\`

---

## 🎓 Étudiants (INE)

### Créer un étudiant avec INE
\`\`\`
POST /api/etudiants/creer-ine
Headers: Authorization: Bearer {token} (École)
Body: { nom, prenom, date_naissance, lieu_naissance, sexe }
Response: { ine: "INE-XXX-CG-2025-BRAZZA-000001" }
\`\`\`

### Rechercher par INE
\`\`\`
GET /api/etudiants/recherche/:ine
Headers: Authorization: Bearer {token}
\`\`\`

### Vérifier si existe
\`\`\`
POST /api/etudiants/verifier-existence
Body: { nom, prenom, date_naissance }
\`\`\`

---

## 🏫 Écoles

### Attribuer un préfixe (Admin)
\`\`\`
POST /api/ecoles/:ecoleId/attribuer-prefixe
Body: { prefixe: "UMARIEN" }
\`\`\`

### Valider une école (Admin)
\`\`\`
PUT /api/ecoles/:ecoleId/valider
\`\`\`

### Mon école
\`\`\`
GET /api/ecoles/mon-ecole
Headers: Authorization: Bearer {token} (École)
\`\`\`

---

## 📄 Documents

### Émettre un diplôme/bulletin
\`\`\`
POST /api/documents/emettre
Headers: Authorization: Bearer {token} (École)
Content-Type: multipart/form-data
Body: {
  etudiant_ine,
  type: "diplome" ou "bulletin",
  categorie: "CEPE", "BAC", etc.
  niveau,
  annee_scolaire,
  resultat,
  moyenne_generale,
  mention,
  pdf: <fichier>
}
\`\`\`

### Documents d'un étudiant
\`\`\`
GET /api/documents/etudiant/:ine
\`\`\`

### Mes documents (École)
\`\`\`
GET /api/documents/mes-documents
\`\`\`

### Télécharger PDF
\`\`\`
GET /api/documents/:documentId/download
\`\`\`

### Révoquer un document
\`\`\`
PUT /api/documents/:documentId/revoquer
Body: { raison }
\`\`\`

---

## ✅ Vérification Publique (PAS d'authentification)

### Vérifier par INE
\`\`\`
POST /api/verification/public/ine
Body: { ine: "INE-XXX-CG-2025-BRAZZA-000001" }
Response: {
  valide: true,
  etudiant: { ... },
  diplomes: [ ... ],
  message: "Étudiant vérifié avec succès"
}
\`\`\`

### Vérifier par QR Code
\`\`\`
POST /api/verification/public/qrcode
Body: { qr_data: "http://..." }
\`\`\`

---

## 📊 Statistiques

### Historique vérifications (Admin)
\`\`\`
GET /api/verification/historique
\`\`\`

---

## 🧪 Tester avec cURL

\`\`\`bash
# Inscription école
curl -X POST http://localhost:5000/api/auth/register/ecole \\
  -H "Content-Type: application/json" \\
  -d '{"email":"ecole@test.cg","password":"Test123!","nom_complet":"École Test","type":"primaire","ville":"Brazzaville"}'

# Vérification publique
curl -X POST http://localhost:5000/api/verification/public/ine \\
  -H "Content-Type: application/json" \\
  -d '{"ine":"INE-TEST-CG-2025-BRAZZA-000001"}'
\`\`\`
`
};

console.log('📝 Création des fichiers de vérification...\n');
Object.entries(files).forEach(([filename, content]) => {
  const dir = path.dirname(filename);
  if (dir !== '.' && !fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filename, content);
  console.log('  ✅ ' + filename);
});

console.log('\n✅ Vérification publique ajoutée !\n');
console.log('📋 Prochaines étapes:\n');
console.log('  1. Relancer le serveur:');
console.log('     npm run dev\n');
console.log('  2. Tester la vérification:');
console.log('     POST /api/verification/public/ine\n');
console.log('🎉 BACKEND COMPLET ! Vous pouvez maintenant:');
console.log('   - Créer des écoles');
console.log('   - Créer des étudiants (INE)');
console.log('   - Émettre des diplômes');
console.log('   - Vérifier publiquement\n');
console.log('📄 Voir API_ENDPOINTS.md pour tous les endpoints\n');