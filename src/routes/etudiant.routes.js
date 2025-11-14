const express = require('express');
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

module.exports = router;