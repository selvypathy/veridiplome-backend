#!/usr/bin/env node

/**
 * Script d'ajout du système INE pour VériDiplôme Backend
 * Usage: node setup-ine.js
 */

const fs = require('fs');
const path = require('path');

console.log('🎓 Ajout du système INE à VériDiplôme...\n');

const files = {
  // SERVICE INE
  'src/services/ine.service.js': `const { Etudiant, Ecole } = require('../models');
const logger = require('../utils/logger');

class INEService {
  /**
   * Génère un nouvel INE pour un étudiant
   * Format: INE-[PREFIXE_ECOLE]-CG-[ANNEE]-[VILLE]-[NUMERO]
   */
  async genererINE(etudiantData, ecoleId) {
    try {
      const ecole = await Ecole.findByPk(ecoleId);
      if (!ecole || !ecole.prefixe_unique) {
        throw new Error('École invalide ou sans préfixe attribué');
      }

      const prefixe = ecole.prefixe_unique;
      const annee = new Date().getFullYear();
      const ville = ecole.ville.substring(0, 6).toUpperCase();

      // Générer le numéro séquentiel
      const derniereINE = await Etudiant.findOne({
        where: { 
          prefixe_creation: prefixe,
          annee_creation: annee 
        },
        order: [['created_at', 'DESC']]
      });

      let numero = 1;
      if (derniereINE) {
        const match = derniereINE.ine.match(/-(\\d+)$/);
        if (match) {
          numero = parseInt(match[1]) + 1;
        }
      }

      const numeroFormate = numero.toString().padStart(6, '0');
      const ine = 'INE-' + prefixe + '-CG-' + annee + '-' + ville + '-' + numeroFormate;

      logger.info('INE généré: ' + ine + ' pour ' + etudiantData.nom_complet);
      return ine;

    } catch (error) {
      logger.error('Erreur génération INE:', error);
      throw error;
    }
  }

  /**
   * Vérifie si un étudiant existe déjà (éviter doublons)
   */
  async verifierExistence(nom, prenom, dateNaissance) {
    try {
      const etudiantExistant = await Etudiant.findOne({
        where: {
          nom: nom.toUpperCase(),
          prenom: prenom.toUpperCase(),
          date_naissance: dateNaissance
        }
      });

      return etudiantExistant;
    } catch (error) {
      logger.error('Erreur vérification existence:', error);
      throw error;
    }
  }

  /**
   * Recherche un étudiant par INE
   */
  async rechercherParINE(ine) {
    try {
      const etudiant = await Etudiant.findOne({
        where: { ine },
        include: [
          {
            model: Ecole,
            as: 'ecoleCreation',
            attributes: ['nom_complet', 'prefixe_unique', 'type']
          },
          {
            model: Ecole,
            as: 'ecoleActuelle',
            attributes: ['nom_complet', 'prefixe_unique', 'type']
          }
        ]
      });

      return etudiant;
    } catch (error) {
      logger.error('Erreur recherche INE:', error);
      throw error;
    }
  }

  /**
   * Validation format INE
   */
  validerFormatINE(ine) {
    const regex = /^INE-[A-Z0-9]{2,10}-CG-\\d{4}-[A-Z]{3,10}-\\d{6}$/;
    return regex.test(ine);
  }
}

module.exports = new INEService();`,

  // ROUTES ÉTUDIANTS
  'src/routes/etudiant.routes.js': `const express = require('express');
const router = express.Router();
const etudiantController = require('../controllers/etudiant.controller');
const { authMiddleware, roleMiddleware } = require('../middlewares/auth.middleware');

// Créer un nouvel étudiant avec attribution d'INE (École seulement)
router.post('/creer-ine',
  authMiddleware,
  roleMiddleware(['ecole', 'admin']),
  etudiantController.creerAvecINE
);

// Vérifier si un étudiant existe déjà
router.post('/verifier-existence',
  authMiddleware,
  roleMiddleware(['ecole', 'admin']),
  etudiantController.verifierExistence
);

// Rechercher un étudiant par INE
router.get('/recherche/:ine',
  authMiddleware,
  roleMiddleware(['ecole', 'admin']),
  etudiantController.rechercherParINE
);

// Liste des étudiants d'une école
router.get('/ecole/mes-etudiants',
  authMiddleware,
  roleMiddleware(['ecole']),
  etudiantController.getMesEtudiants
);

module.exports = router;`,

  // CONTRÔLEUR ÉTUDIANTS
  'src/controllers/etudiant.controller.js': `const { Etudiant, Ecole } = require('../models');
const ineService = require('../services/ine.service');
const logger = require('../utils/logger');

class EtudiantController {
  /**
   * Créer un nouvel étudiant avec attribution d'INE
   * POST /api/etudiants/creer-ine
   */
  async creerAvecINE(req, res, next) {
    try {
      const {
        nom,
        prenom,
        date_naissance,
        lieu_naissance,
        sexe
      } = req.body;

      const ecoleId = req.user.ecole_id;
      
      if (!ecoleId) {
        return res.status(403).json({ 
          error: 'Seules les écoles peuvent créer des INE' 
        });
      }

      // Vérifier si l'étudiant existe déjà
      const etudiantExistant = await ineService.verifierExistence(
        nom, 
        prenom, 
        date_naissance
      );

      if (etudiantExistant) {
        return res.status(409).json({
          error: 'Cet étudiant existe déjà dans le système',
          ine: etudiantExistant.ine,
          message: 'Utilisez cet INE pour émettre des documents'
        });
      }

      // Générer l'INE
      const ine = await ineService.genererINE({
        nom_complet: prenom + ' ' + nom
      }, ecoleId);

      // Récupérer les infos de l'école
      const ecole = await Ecole.findByPk(ecoleId);

      // Créer l'étudiant
      const etudiant = await Etudiant.create({
        ine,
        nom: nom.toUpperCase(),
        prenom: prenom.toUpperCase(),
        nom_complet: (prenom + ' ' + nom).toUpperCase(),
        date_naissance,
        lieu_naissance,
        sexe,
        ecole_creation_id: ecoleId,
        ecole_creation_nom: ecole.nom_complet,
        prefixe_creation: ecole.prefixe_unique,
        date_creation_ine: new Date(),
        annee_creation: new Date().getFullYear(),
        ecole_actuelle_id: ecoleId,
        ecole_actuelle_nom: ecole.nom_complet
      });

      logger.info('Nouvel étudiant créé: ' + ine + ' par école ' + ecole.nom_complet);

      res.status(201).json({
        success: true,
        message: 'Étudiant créé avec succès',
        etudiant: {
          ine: etudiant.ine,
          nom_complet: etudiant.nom_complet,
          date_naissance: etudiant.date_naissance,
          ecole_creation: ecole.nom_complet
        }
      });

    } catch (error) {
      logger.error('Erreur création étudiant:', error);
      next(error);
    }
  }

  /**
   * Vérifier si un étudiant existe déjà
   * POST /api/etudiants/verifier-existence
   */
  async verifierExistence(req, res, next) {
    try {
      const { nom, prenom, date_naissance } = req.body;

      const etudiant = await ineService.verifierExistence(nom, prenom, date_naissance);

      if (etudiant) {
        return res.json({
          existe: true,
          ine: etudiant.ine,
          nom_complet: etudiant.nom_complet,
          ecole_creation: etudiant.ecole_creation_nom,
          ecole_actuelle: etudiant.ecole_actuelle_nom
        });
      }

      res.json({ existe: false });

    } catch (error) {
      logger.error('Erreur vérification existence:', error);
      next(error);
    }
  }

  /**
   * Rechercher un étudiant par INE
   * GET /api/etudiants/recherche/:ine
   */
  async rechercherParINE(req, res, next) {
    try {
      const { ine } = req.params;

      if (!ineService.validerFormatINE(ine)) {
        return res.status(400).json({ 
          error: 'Format INE invalide' 
        });
      }

      const etudiant = await ineService.rechercherParINE(ine);

      if (!etudiant) {
        return res.status(404).json({ 
          error: 'Étudiant introuvable avec cet INE' 
        });
      }

      res.json({
        success: true,
        etudiant: {
          ine: etudiant.ine,
          nom_complet: etudiant.nom_complet,
          date_naissance: etudiant.date_naissance,
          lieu_naissance: etudiant.lieu_naissance,
          ecole_creation: etudiant.ecoleCreation,
          ecole_actuelle: etudiant.ecoleActuelle,
          statut: etudiant.statut
        }
      });

    } catch (error) {
      logger.error('Erreur recherche INE:', error);
      next(error);
    }
  }

  /**
   * Liste des étudiants créés par l'école connectée
   * GET /api/etudiants/ecole/mes-etudiants
   */
  async getMesEtudiants(req, res, next) {
    try {
      const ecoleId = req.user.ecole_id;

      const etudiants = await Etudiant.findAll({
        where: { ecole_creation_id: ecoleId },
        order: [['created_at', 'DESC']],
        limit: 100
      });

      res.json({
        success: true,
        total: etudiants.length,
        etudiants
      });

    } catch (error) {
      logger.error('Erreur récupération étudiants:', error);
      next(error);
    }
  }
}

module.exports = new EtudiantController();`,

  // ROUTES ÉCOLES (pour attribuer les préfixes)
  'src/routes/ecole.routes.js': `const express = require('express');
const router = express.Router();
const ecoleController = require('../controllers/ecole.controller');
const { authMiddleware, roleMiddleware } = require('../middlewares/auth.middleware');

// Attribuer un préfixe unique à une école (Admin seulement)
router.post('/:ecoleId/attribuer-prefixe',
  authMiddleware,
  roleMiddleware(['admin']),
  ecoleController.attribuerPrefixe
);

// Valider une école (Admin seulement)
router.put('/:ecoleId/valider',
  authMiddleware,
  roleMiddleware(['admin']),
  ecoleController.validerEcole
);

// Liste de toutes les écoles (Admin seulement)
router.get('/liste',
  authMiddleware,
  roleMiddleware(['admin']),
  ecoleController.getListe
);

// Mon école (École connectée)
router.get('/mon-ecole',
  authMiddleware,
  roleMiddleware(['ecole']),
  ecoleController.getMonEcole
);

module.exports = router;`,

  // CONTRÔLEUR ÉCOLES
  'src/controllers/ecole.controller.js': `const { Ecole } = require('../models');
const logger = require('../utils/logger');

class EcoleController {
  /**
   * Attribuer un préfixe unique à une école
   * POST /api/ecoles/:ecoleId/attribuer-prefixe
   */
  async attribuerPrefixe(req, res, next) {
    try {
      const { ecoleId } = req.params;
      const { prefixe } = req.body;

      // Vérifier que le préfixe n'existe pas déjà
      const prefixeExistant = await Ecole.findOne({
        where: { prefixe_unique: prefixe.toUpperCase() }
      });

      if (prefixeExistant) {
        return res.status(409).json({
          error: 'Ce préfixe est déjà utilisé par une autre école'
        });
      }

      const ecole = await Ecole.findByPk(ecoleId);
      if (!ecole) {
        return res.status(404).json({ error: 'École introuvable' });
      }

      await ecole.update({
        prefixe_unique: prefixe.toUpperCase()
      });

      logger.info('Préfixe ' + prefixe + ' attribué à ' + ecole.nom_complet);

      res.json({
        success: true,
        message: 'Préfixe attribué avec succès',
        ecole: {
          id: ecole.id,
          nom_complet: ecole.nom_complet,
          prefixe_unique: ecole.prefixe_unique
        }
      });

    } catch (error) {
      logger.error('Erreur attribution préfixe:', error);
      next(error);
    }
  }

  /**
   * Valider une école
   * PUT /api/ecoles/:ecoleId/valider
   */
  async validerEcole(req, res, next) {
    try {
      const { ecoleId } = req.params;

      const ecole = await Ecole.findByPk(ecoleId);
      if (!ecole) {
        return res.status(404).json({ error: 'École introuvable' });
      }

      if (!ecole.prefixe_unique) {
        return res.status(400).json({
          error: 'Veuillez d\\'abord attribuer un préfixe à cette école'
        });
      }

      await ecole.update({
        compte_valide: true,
        valide_par_ministere: true,
        statut: 'actif'
      });

      logger.info('École validée: ' + ecole.nom_complet);

      res.json({
        success: true,
        message: 'École validée avec succès',
        ecole
      });

    } catch (error) {
      logger.error('Erreur validation école:', error);
      next(error);
    }
  }

  /**
   * Liste de toutes les écoles
   * GET /api/ecoles/liste
   */
  async getListe(req, res, next) {
    try {
      const ecoles = await Ecole.findAll({
        order: [['created_at', 'DESC']]
      });

      res.json({
        success: true,
        total: ecoles.length,
        ecoles
      });

    } catch (error) {
      logger.error('Erreur récupération liste écoles:', error);
      next(error);
    }
  }

  /**
   * Informations de mon école
   * GET /api/ecoles/mon-ecole
   */
  async getMonEcole(req, res, next) {
    try {
      const ecoleId = req.user.ecole_id;

      const ecole = await Ecole.findByPk(ecoleId);
      if (!ecole) {
        return res.status(404).json({ error: 'École introuvable' });
      }

      // Compter les étudiants créés
      const { Etudiant } = require('../models');
      const nbEtudiants = await Etudiant.count({
        where: { ecole_creation_id: ecoleId }
      });

      res.json({
        success: true,
        ecole,
        statistiques: {
          nb_etudiants: nbEtudiants
        }
      });

    } catch (error) {
      logger.error('Erreur récupération mon école:', error);
      next(error);
    }
  }
}

module.exports = new EcoleController();`,

  // MISE À JOUR DE app.js
  'src/app.js': `const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const authRoutes = require('./routes/auth.routes');
const etudiantRoutes = require('./routes/etudiant.routes');
const ecoleRoutes = require('./routes/ecole.routes');

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

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/etudiants', etudiantRoutes);
app.use('/api/ecoles', ecoleRoutes);

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

console.log('📝 Création des fichiers INE...\n');
Object.entries(files).forEach(([filename, content]) => {
  const dir = path.dirname(filename);
  if (dir !== '.' && !fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filename, content);
  console.log('  ✅ ' + filename);
});

console.log('\n✅ Système INE ajouté !\n');
console.log('📋 Prochaines étapes:\n');
console.log('  1. Relancer le serveur:');
console.log('     npm run dev\n');
console.log('  2. Tester les endpoints:');
console.log('     POST /api/etudiants/creer-ine');
console.log('     GET  /api/etudiants/recherche/:ine\n');
console.log('🎓 Les écoles peuvent maintenant créer des INE !\n');