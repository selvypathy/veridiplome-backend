const QRCode = require('qrcode');
const logger = require('../utils/logger');

class QRCodeService {
  /**
   * Génère un QR code pour un INE
   */
  async genererQRCode(ine, documentId) {
    try {
      const verificationUrl = process.env.APP_URL + '/verification/' + ine;
      
      const options = {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        quality: 0.95,
        margin: 2,
        width: 400,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      };

      const qrCodeDataURL = await QRCode.toDataURL(verificationUrl, options);

      logger.info('QR Code généré pour INE: ' + ine);

      return {
        qrCodeDataURL,
        qrCodeData: verificationUrl
      };

    } catch (error) {
      logger.error('Erreur génération QR code:', error);
      throw error;
    }
  }
}

module.exports = new QRCodeService();