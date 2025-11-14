const express = require('express');
const router = express.Router();
const documentController = require('../controllers/document.controller');
const { authMiddleware, roleMiddleware } = require('../middlewares/auth.middleware');
const upload = require('../middlewares/upload.middleware');

// Émettre un nouveau document
router.post('/emettre',
  authMiddleware,
  roleMiddleware(['ecole', 'admin']),
  upload.single('pdf'),
  documentController.emettreDocument
);

// Liste des documents d'un étudiant
router.get('/etudiant/:ine',
  authMiddleware,
  documentController.getDocumentsEtudiant
);

// Liste des documents émis par mon école
router.get('/mes-documents',
  authMiddleware,
  roleMiddleware(['ecole']),
  documentController.getMesDocuments
);

// Détails d'un document
router.get('/:documentId',
  authMiddleware,
  documentController.getDocumentDetails
);

// Télécharger le PDF
router.get('/:documentId/download',
  authMiddleware,
  documentController.downloadPDF
);

// Révoquer un document
router.put('/:documentId/revoquer',
  authMiddleware,
  roleMiddleware(['ecole', 'admin']),
  documentController.revoquerDocument
);

module.exports = router;