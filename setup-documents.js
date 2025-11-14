#!/usr/bin/env node

/**
 * Script d'ajout du système de documents pour VériDiplôme Backend
 * Usage: node setup-documents.js
 */

const fs = require('fs');
const path = require('path');

console.log('📄 Ajout du système de documents à VériDiplôme...\n');

const files = {
  // MODÈLE DOCUMENT
  'src/models/Document.js': `module.exports = (sequelize, DataTypes) => {
  const Document = sequelize.define('Document', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    numero_unique: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    etudiant_ine: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    etudiant_nom_complet: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM('bulletin', 'diplome'),
      allowNull: false
    },
    categorie: DataTypes.STRING(100),
    ecole_emettrice_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    ecole_emettrice_nom: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    ecole_prefixe: {
      type: DataTypes.STRING(10),
      allowNull: false
    },
    niveau: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    specialite: DataTypes.STRING(255),
    annee_scolaire: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    periode: DataTypes.STRING(50),
    resultat: {
      type: DataTypes.ENUM('admis', 'ajourne', 'redouble'),
      allowNull: true
    },
    moyenne_generale: DataTypes.DECIMAL(5, 2),
    mention: DataTypes.STRING(50),
    pdf_url: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    pdf_filename: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    hash_document: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true
    },
    qr_code_url: DataTypes.TEXT,
    qr_code_data: DataTypes.TEXT,
    emis_par_user_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    emis_par_nom: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    date_emission: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    statut: {
      type: DataTypes.ENUM('valide', 'annule', 'remplace'),
      defaultValue: 'valide'
    }
  }, {
    tableName: 'documents',
    timestamps: true,
    underscored: true
  });

  return Document;
};`,

  // MISE À JOUR models/index.js
  'src/models/index.js': `const { sequelize } = require('../config/database');
const { DataTypes } = require('sequelize');

const User = require('./User')(sequelize, DataTypes);
const Ecole = require('./Ecole')(sequelize, DataTypes);
const Etudiant = require('./Etudiant')(sequelize, DataTypes);
const Document = require('./Document')(sequelize, DataTypes);

// Associations
User.belongsTo(Ecole, { foreignKey: 'ecole_id', as: 'ecole' });
User.belongsTo(Etudiant, { foreignKey: 'etudiant_ine', as: 'etudiant' });

Etudiant.belongsTo(Ecole, { foreignKey: 'ecole_creation_id', as: 'ecoleCreation' });
Etudiant.belongsTo(Ecole, { foreignKey: 'ecole_actuelle_id', as: 'ecoleActuelle' });
Etudiant.hasMany(Document, { foreignKey: 'etudiant_ine', as: 'documents' });

Document.belongsTo(Etudiant, { foreignKey: 'etudiant_ine', as: 'etudiant' });
Document.belongsTo(Ecole, { foreignKey: 'ecole_emettrice_id', as: 'ecoleEmettrice' });
Document.belongsTo(User, { foreignKey: 'emis_par_user_id', as: 'emetteur' });

module.exports = {
  sequelize,
  User,
  Ecole,
  Etudiant,
  Document
};`,

  // SERVICE QR CODE
  'src/services/qrcode.service.js': `const QRCode = require('qrcode');
const logger = require('../utils/logger');

class QRCodeService {
  /**
   * Génère un QR code pour un INE
   */
  async genererQRCode(ine, documentId) {
    try {
      const verificationUrl = process.env.APP_URL + '/verification/' + ine;
      
      const options = {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        quality: 0.95,
        margin: 2,
        width: 400,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      };

      const qrCodeDataURL = await QRCode.toDataURL(verificationUrl, options);

      logger.info('QR Code généré pour INE: ' + ine);

      return {
        qrCodeDataURL,
        qrCodeData: verificationUrl
      };

    } catch (error) {
      logger.error('Erreur génération QR code:', error);
      throw error;
    }
  }
}

module.exports = new QRCodeService();`,

  // MIDDLEWARE UPLOAD
  'src/middlewares/upload.middleware.js': `const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../../uploads/documents');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'doc-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Seuls les fichiers PDF sont autorisés'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: fileFilter
});

module.exports = upload;`,

  // ROUTES DOCUMENTS
  'src/routes/document.routes.js': `const express = require('express');
const router = express.Router();
const documentController = require('../controllers/document.controller');
const { authMiddleware, roleMiddleware } = require('../middlewares/auth.middleware');
const upload = require('../middlewares/upload.middleware');

// Émettre un nouveau document
router.post('/emettre',
  authMiddleware,
  roleMiddleware(['ecole', 'admin']),
  upload.single('pdf'),
  documentController.emettreDocument
);

// Liste des documents d'un étudiant
router.get('/etudiant/:ine',
  authMiddleware,
  documentController.getDocumentsEtudiant
);

// Liste des documents émis par mon école
router.get('/mes-documents',
  authMiddleware,
  roleMiddleware(['ecole']),
  documentController.getMesDocuments
);

// Détails d'un document
router.get('/:documentId',
  authMiddleware,
  documentController.getDocumentDetails
);

// Télécharger le PDF
router.get('/:documentId/download',
  authMiddleware,
  documentController.downloadPDF
);

// Révoquer un document
router.put('/:documentId/revoquer',
  authMiddleware,
  roleMiddleware(['ecole', 'admin']),
  documentController.revoquerDocument
);

module.exports = router;`,

  // CONTRÔLEUR DOCUMENTS
  'src/controllers/document.controller.js': `const { Document, Etudiant, Ecole } = require('../models');
const qrcodeService = require('../services/qrcode.service');
const logger = require('../utils/logger');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

class DocumentController {
  /**
   * Émettre un nouveau document
   * POST /api/documents/emettre
   */
  async emettreDocument(req, res, next) {
    try {
      const {
        etudiant_ine,
        type,
        categorie,
        niveau,
        specialite,
        annee_scolaire,
        periode,
        resultat,
        moyenne_generale,
        mention
      } = req.body;

      if (!req.file) {
        return res.status(400).json({ 
          error: 'Le fichier PDF du document est requis' 
        });
      }

      const etudiant = await Etudiant.findByPk(etudiant_ine);
      if (!etudiant) {
        return res.status(404).json({ 
          error: 'Étudiant introuvable avec cet INE' 
        });
      }

      const ecoleId = req.user.ecole_id;
      const ecole = await Ecole.findByPk(ecoleId);

      // Générer hash du document
      const fileBuffer = await fs.readFile(req.file.path);
      const hashDocument = crypto.createHash('sha256').update(fileBuffer).digest('hex');

      // Générer numéro unique
      const numeroUnique = 'DOC-' + annee_scolaire.replace('/', '') + '-' + 
                          ecole.prefixe_unique + '-' + type.toUpperCase() + '-' + 
                          Date.now();

      // Créer le document
      const document = await Document.create({
        numero_unique: numeroUnique,
        etudiant_ine,
        etudiant_nom_complet: etudiant.nom_complet,
        type,
        categorie,
        ecole_emettrice_id: ecoleId,
        ecole_emettrice_nom: ecole.nom_complet,
        ecole_prefixe: ecole.prefixe_unique,
        niveau,
        specialite,
        annee_scolaire,
        periode,
        resultat,
        moyenne_generale,
        mention,
        pdf_url: '/uploads/documents/' + req.file.filename,
        pdf_filename: req.file.originalname,
        hash_document: hashDocument,
        emis_par_user_id: req.user.id,
        emis_par_nom: req.user.nom_complet,
        statut: 'valide'
      });

      // Générer QR code
      const qrCodeData = await qrcodeService.genererQRCode(etudiant_ine, document.id);
      
      await document.update({
        qr_code_data: qrCodeData.qrCodeData
      });

      logger.info('Document émis: ' + numeroUnique + ' pour ' + etudiant.nom_complet);

      res.status(201).json({
        success: true,
        message: 'Document émis avec succès',
        document: {
          id: document.id,
          numero_unique: document.numero_unique,
          type: document.type,
          qr_code_data: document.qr_code_data,
          pdf_url: document.pdf_url,
          hash: document.hash_document
        }
      });

    } catch (error) {
      logger.error('Erreur émission document:', error);
      next(error);
    }
  }

  /**
   * Liste des documents d'un étudiant
   * GET /api/documents/etudiant/:ine
   */
  async getDocumentsEtudiant(req, res, next) {
    try {
      const { ine } = req.params;

      if (req.user.role === 'etudiant' && req.user.etudiant_ine !== ine) {
        return res.status(403).json({ 
          error: 'Accès non autorisé' 
        });
      }

      const documents = await Document.findAll({
        where: { 
          etudiant_ine: ine,
          statut: 'valide'
        },
        order: [['annee_scolaire', 'DESC'], ['date_emission', 'DESC']],
        include: [{
          model: Ecole,
          as: 'ecoleEmettrice',
          attributes: ['nom_complet', 'type', 'ville']
        }]
      });

      res.json({
        success: true,
        total: documents.length,
        documents
      });

    } catch (error) {
      logger.error('Erreur récupération documents étudiant:', error);
      next(error);
    }
  }

  /**
   * Liste des documents émis par mon école
   * GET /api/documents/mes-documents
   */
  async getMesDocuments(req, res, next) {
    try {
      const ecoleId = req.user.ecole_id;

      const documents = await Document.findAll({
        where: { ecole_emettrice_id: ecoleId },
        order: [['date_emission', 'DESC']],
        limit: 100,
        include: [{
          model: Etudiant,
          as: 'etudiant',
          attributes: ['ine', 'nom_complet']
        }]
      });

      res.json({
        success: true,
        total: documents.length,
        documents
      });

    } catch (error) {
      logger.error('Erreur récupération mes documents:', error);
      next(error);
    }
  }

  /**
   * Détails d'un document
   * GET /api/documents/:documentId
   */
  async getDocumentDetails(req, res, next) {
    try {
      const { documentId } = req.params;

      const document = await Document.findByPk(documentId, {
        include: [
          { model: Etudiant, as: 'etudiant' },
          { model: Ecole, as: 'ecoleEmettrice' }
        ]
      });

      if (!document) {
        return res.status(404).json({ error: 'Document introuvable' });
      }

      res.json({
        success: true,
        document
      });

    } catch (error) {
      logger.error('Erreur récupération détails document:', error);
      next(error);
    }
  }

  /**
   * Télécharger le PDF d'un document
   * GET /api/documents/:documentId/download
   */
  async downloadPDF(req, res, next) {
    try {
      const { documentId } = req.params;

      const document = await Document.findByPk(documentId);
      if (!document) {
        return res.status(404).json({ error: 'Document introuvable' });
      }

      const filePath = path.join(__dirname, '../../', document.pdf_url);
      
      res.download(filePath, document.pdf_filename);

    } catch (error) {
      logger.error('Erreur téléchargement PDF:', error);
      next(error);
    }
  }

  /**
   * Révoquer un document
   * PUT /api/documents/:documentId/revoquer
   */
  async revoquerDocument(req, res, next) {
    try {
      const { documentId } = req.params;
      const { raison } = req.body;

      const document = await Document.findByPk(documentId);
      if (!document) {
        return res.status(404).json({ error: 'Document introuvable' });
      }

      // Vérifier que c'est bien l'école qui a émis le document
      if (req.user.role === 'ecole' && document.ecole_emettrice_id !== req.user.ecole_id) {
        return res.status(403).json({ 
          error: 'Vous ne pouvez révoquer que vos propres documents' 
        });
      }

      await document.update({
        statut: 'annule'
      });

      logger.info('Document révoqué: ' + document.numero_unique);

      res.json({
        success: true,
        message: 'Document révoqué avec succès'
      });

    } catch (error) {
      logger.error('Erreur révocation document:', error);
      next(error);
    }
  }
}

module.exports = new DocumentController();`,

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

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Servir les fichiers statiques (uploads)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

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

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/etudiants', etudiantRoutes);
app.use('/api/ecoles', ecoleRoutes);
app.use('/api/documents', documentRoutes);

app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route non trouvée' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.statusCode || 500).json({
    error: err.message || 'Erreur interne du serveur'
  });
});

module.exports = app;`
};

console.log('📝 Création des fichiers de documents...\n');
Object.entries(files).forEach(([filename, content]) => {
  const dir = path.dirname(filename);
  if (dir !== '.' && !fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filename, content);
  console.log('  ✅ ' + filename);
});

console.log('\n✅ Système de documents ajouté !\n');
console.log('📋 Prochaines étapes:\n');
console.log('  1. Installer les dépendances:');
console.log('     npm install qrcode multer\n');
console.log('  2. Relancer le serveur:');
console.log('     npm run dev\n');
console.log('  3. Tester:');
console.log('     POST /api/documents/emettre (avec PDF)\n');
console.log('📄 Les écoles peuvent maintenant émettre des diplômes !\n');