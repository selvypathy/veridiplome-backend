const { Etudiant, Ecole } = require('../models');
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
        const match = derniereINE.ine.match(/-(\d+)$/);
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
    const regex = /^INE-[A-Z0-9]{2,10}-CG-\d{4}-[A-Z]{3,10}-\d{6}$/;
    return regex.test(ine);
  }
}

module.exports = new INEService();