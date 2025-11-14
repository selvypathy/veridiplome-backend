const express = require('express');
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

module.exports = router;