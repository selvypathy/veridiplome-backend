const express = require('express');
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

module.exports = router;