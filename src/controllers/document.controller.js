const { Document, Etudiant, Ecole } = require('../models');
const qrcodeService = require('../services/qrcode.service');
const logger = require('../utils/logger');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

class DocumentController {
  /**
   * Émettre un nouveau document
   * POST /api/documents/emettre
   */
  async emettreDocument(req, res, next) {
    try {
      const {
        etudiant_ine,
        type,
        categorie,
        niveau,
        specialite,
        annee_scolaire,
        periode,
        resultat,
        moyenne_generale,
        mention
      } = req.body;

      if (!req.file) {
        return res.status(400).json({ 
          error: 'Le fichier PDF du document est requis' 
        });
      }

      const etudiant = await Etudiant.findByPk(etudiant_ine);
      if (!etudiant) {
        return res.status(404).json({ 
          error: 'Étudiant introuvable avec cet INE' 
        });
      }

      const ecoleId = req.user.ecole_id;
      const ecole = await Ecole.findByPk(ecoleId);

      // Générer hash du document
      const fileBuffer = await fs.readFile(req.file.path);
      const hashDocument = crypto.createHash('sha256').update(fileBuffer).digest('hex');

      // Générer numéro unique
      const numeroUnique = 'DOC-' + annee_scolaire.replace('/', '') + '-' + 
                          ecole.prefixe_unique + '-' + type.toUpperCase() + '-' + 
                          Date.now();

      // Créer le document
      const document = await Document.create({
        numero_unique: numeroUnique,
        etudiant_ine,
        etudiant_nom_complet: etudiant.nom_complet,
        type,
        categorie,
        ecole_emettrice_id: ecoleId,
        ecole_emettrice_nom: ecole.nom_complet,
        ecole_prefixe: ecole.prefixe_unique,
        niveau,
        specialite,
        annee_scolaire,
        periode,
        resultat,
        moyenne_generale,
        mention,
        pdf_url: '/uploads/documents/' + req.file.filename,
        pdf_filename: req.file.originalname,
        hash_document: hashDocument,
        emis_par_user_id: req.user.id,
        emis_par_nom: req.user.nom_complet,
        statut: 'valide'
      });

      // Générer QR code
      const qrCodeData = await qrcodeService.genererQRCode(etudiant_ine, document.id);
      
      await document.update({
        qr_code_data: qrCodeData.qrCodeData
      });

      logger.info('Document émis: ' + numeroUnique + ' pour ' + etudiant.nom_complet);

      res.status(201).json({
        success: true,
        message: 'Document émis avec succès',
        document: {
          id: document.id,
          numero_unique: document.numero_unique,
          type: document.type,
          qr_code_data: document.qr_code_data,
          pdf_url: document.pdf_url,
          hash: document.hash_document
        }
      });

    } catch (error) {
      logger.error('Erreur émission document:', error);
      next(error);
    }
  }

  /**
   * Liste des documents d'un étudiant
   * GET /api/documents/etudiant/:ine
   */
  async getDocumentsEtudiant(req, res, next) {
    try {
      const { ine } = req.params;

      if (req.user.role === 'etudiant' && req.user.etudiant_ine !== ine) {
        return res.status(403).json({ 
          error: 'Accès non autorisé' 
        });
      }

      const documents = await Document.findAll({
        where: { 
          etudiant_ine: ine,
          statut: 'valide'
        },
        order: [['annee_scolaire', 'DESC'], ['date_emission', 'DESC']],
        include: [{
          model: Ecole,
          as: 'ecoleEmettrice',
          attributes: ['nom_complet', 'type', 'ville']
        }]
      });

      res.json({
        success: true,
        total: documents.length,
        documents
      });

    } catch (error) {
      logger.error('Erreur récupération documents étudiant:', error);
      next(error);
    }
  }

  /**
   * Liste des documents émis par mon école
   * GET /api/documents/mes-documents
   */
  async getMesDocuments(req, res, next) {
    try {
      const ecoleId = req.user.ecole_id;

      const documents = await Document.findAll({
        where: { ecole_emettrice_id: ecoleId },
        order: [['date_emission', 'DESC']],
        limit: 100,
        include: [{
          model: Etudiant,
          as: 'etudiant',
          attributes: ['ine', 'nom_complet']
        }]
      });

      res.json({
        success: true,
        total: documents.length,
        documents
      });

    } catch (error) {
      logger.error('Erreur récupération mes documents:', error);
      next(error);
    }
  }

  /**
   * Détails d'un document
   * GET /api/documents/:documentId
   */
  async getDocumentDetails(req, res, next) {
    try {
      const { documentId } = req.params;

      const document = await Document.findByPk(documentId, {
        include: [
          { model: Etudiant, as: 'etudiant' },
          { model: Ecole, as: 'ecoleEmettrice' }
        ]
      });

      if (!document) {
        return res.status(404).json({ error: 'Document introuvable' });
      }

      res.json({
        success: true,
        document
      });

    } catch (error) {
      logger.error('Erreur récupération détails document:', error);
      next(error);
    }
  }

  /**
   * Télécharger le PDF d'un document
   * GET /api/documents/:documentId/download
   */
  async downloadPDF(req, res, next) {
    try {
      const { documentId } = req.params;

      const document = await Document.findByPk(documentId);
      if (!document) {
        return res.status(404).json({ error: 'Document introuvable' });
      }

      const filePath = path.join(__dirname, '../../', document.pdf_url);
      
      res.download(filePath, document.pdf_filename);

    } catch (error) {
      logger.error('Erreur téléchargement PDF:', error);
      next(error);
    }
  }

  /**
   * Révoquer un document
   * PUT /api/documents/:documentId/revoquer
   */
  async revoquerDocument(req, res, next) {
    try {
      const { documentId } = req.params;
      const { raison } = req.body;

      const document = await Document.findByPk(documentId);
      if (!document) {
        return res.status(404).json({ error: 'Document introuvable' });
      }

      // Vérifier que c'est bien l'école qui a émis le document
      if (req.user.role === 'ecole' && document.ecole_emettrice_id !== req.user.ecole_id) {
        return res.status(403).json({ 
          error: 'Vous ne pouvez révoquer que vos propres documents' 
        });
      }

      await document.update({
        statut: 'annule'
      });

      logger.info('Document révoqué: ' + document.numero_unique);

      res.json({
        success: true,
        message: 'Document révoqué avec succès'
      });

    } catch (error) {
      logger.error('Erreur révocation document:', error);
      next(error);
    }
  }
}

module.exports = new DocumentController();