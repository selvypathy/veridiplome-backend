const { Etudiant, Ecole } = require('../models');
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

module.exports = new EtudiantController();