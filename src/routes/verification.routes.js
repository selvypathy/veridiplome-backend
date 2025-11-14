const express = require('express');
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

module.exports = router;