const { Verification, Document, Etudiant, Ecole } = require('../models');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

class VerificationController {
  /**
   * Vérifier un diplôme par INE (PUBLIC)
   * POST /api/verification/public/ine
   */
  async verifierParINE(req, res, next) {
    try {
      const { ine } = req.body;
      const ipAddress = req.ip;
      const userAgent = req.get('User-Agent');

      // Chercher l'étudiant
      const etudiant = await Etudiant.findByPk(ine, {
        include: [{
          model: Ecole,
          as: 'ecoleCreation',
          attributes: ['nom_complet', 'type', 'ville']
        }]
      });

      if (!etudiant) {
        // Enregistrer la tentative échouée
        await this.enregistrerVerification({
          etudiant_ine: ine,
          resultat: 'introuvable',
          verificateur_type: 'public',
          methode: 'recherche_ine',
          ip_address: ipAddress,
          user_agent: userAgent
        });

        return res.status(404).json({
          valide: false,
          resultat: 'introuvable',
          message: 'Aucun étudiant trouvé avec cet INE'
        });
      }

      // Récupérer tous les diplômes valides
      const diplomes = await Document.findAll({
        where: {
          etudiant_ine: ine,
          type: 'diplome',
          statut: 'valide'
        },
        order: [['annee_scolaire', 'DESC']],
        attributes: [
          'id', 'numero_unique', 'categorie', 'niveau',
          'annee_scolaire', 'mention', 'ecole_emettrice_nom',
          'date_emission', 'qr_code_data'
        ]
      });

      // Tous les documents (bulletins + diplômes)
      const nbDocuments = await Document.count({ 
        where: { 
          etudiant_ine: ine,
          statut: 'valide'
        } 
      });

      // Enregistrer la vérification réussie
      const verificationId = await this.enregistrerVerification({
        etudiant_ine: ine,
        resultat: 'valide',
        verificateur_type: 'public',
        methode: 'recherche_ine',
        ip_address: ipAddress,
        user_agent: userAgent,
        details_affichees: {
          nom_complet: etudiant.nom_complet,
          nb_diplomes: diplomes.length
        }
      });

      res.json({
        valide: true,
        resultat: 'valide',
        verification_id: verificationId,
        etudiant: {
          ine: etudiant.ine,
          nom_complet: etudiant.nom_complet,
          date_naissance: etudiant.date_naissance,
          ecole_creation: etudiant.ecoleCreation.nom_complet
        },
        diplomes: diplomes,
        nb_documents_total: nbDocuments,
        message: 'Étudiant vérifié avec succès. Tous les diplômes sont authentiques.'
      });

    } catch (error) {
      logger.error('Erreur vérification par INE:', error);
      next(error);
    }
  }

  /**
   * Vérifier par scan QR code (PUBLIC)
   * POST /api/verification/public/qrcode
   */
  async verifierParQRCode(req, res, next) {
    try {
      const { qr_data } = req.body;
      
      // Extraire l'INE du QR code
      // Format: http://localhost:5000/verification/INE-XXX-...
      const ineMatch = qr_data.match(/INE-[A-Z0-9]+-CG-\d{4}-[A-Z]+-\d{6}/);
      
      if (!ineMatch) {
        return res.status(400).json({
          valide: false,
          error: 'QR code invalide ou format non reconnu'
        });
      }

      const ine = ineMatch[0];
      
      // Réutiliser la logique de vérification par INE
      req.body.ine = ine;
      return this.verifierParINE(req, res, next);

    } catch (error) {
      logger.error('Erreur vérification QR code:', error);
      next(error);
    }
  }

  /**
   * Enregistrer une vérification dans la base
   */
  async enregistrerVerification(data) {
    try {
      const verification = await Verification.create({
        numero_verification: 'VERIF-' + Date.now() + '-' + uuidv4().split('-')[0],
        ...data,
        date_verification: new Date()
      });

      return verification.id;
    } catch (error) {
      logger.error('Erreur enregistrement vérification:', error);
      return null;
    }
  }

  /**
   * Historique des vérifications (ADMIN)
   * GET /api/verification/historique
   */
  async getHistorique(req, res, next) {
    try {
      const verifications = await Verification.findAll({
        order: [['date_verification', 'DESC']],
        limit: 100,
        include: [
          {
            model: Etudiant,
            as: 'etudiant',
            attributes: ['nom_complet', 'ine']
          }
        ]
      });

      // Statistiques
      const stats = {
        total: await Verification.count(),
        reussies: await Verification.count({ where: { resultat: 'valide' } }),
        echouees: await Verification.count({ where: { resultat: 'introuvable' } })
      };

      res.json({
        success: true,
        stats,
        verifications
      });

    } catch (error) {
      logger.error('Erreur récupération historique:', error);
      next(error);
    }
  }
}

module.exports = new VerificationController();