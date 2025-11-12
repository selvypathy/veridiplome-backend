require('dotenv').config();
const app = require('./app');
const logger = require('./utils/logger');
const { sequelize } = require('./config/database');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await sequelize.authenticate();
    logger.info('✅ Connexion à PostgreSQL réussie !');
    logger.info(`📊 Base de données: ${process.env.DB_NAME}`);

    app.listen(PORT, () => {
      logger.info('════════════════════════════════════════');
      logger.info(`🚀 Serveur VériDiplôme démarré !`);
      logger.info(`📍 URL: ${process.env.APP_URL}`);
      logger.info(`🌍 Environnement: ${process.env.NODE_ENV}`);
      logger.info('════════════════════════════════════════');
    });
  } catch (error) {
    logger.error('❌ Erreur au démarrage:');
    logger.error(error.message);
    process.exit(1);
  }
}

startServer();