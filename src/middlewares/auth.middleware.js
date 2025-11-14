const jwt = require('jsonwebtoken');
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

module.exports = { authMiddleware, roleMiddleware };