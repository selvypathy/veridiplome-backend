const bcrypt = require('bcryptjs');
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

module.exports = new AuthController();