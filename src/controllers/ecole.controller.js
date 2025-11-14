const { Ecole } = require('../models');
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
          error: 'Veuillez d\'abord attribuer un préfixe à cette école'
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

module.exports = new EcoleController();