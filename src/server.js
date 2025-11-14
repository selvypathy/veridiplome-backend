require('dotenv').config();
const app = require('./app');
const logger = require('./utils/logger');
const { sequelize } = require('./models');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await sequelize.authenticate();
    logger.info('✅ Connexion à PostgreSQL réussie !');
    
    await sequelize.sync({ alter: true });
    logger.info('✅ Tables de base de données synchronisées');

    app.listen(PORT, () => {
      logger.info('════════════════════════════════════════');
      logger.info('🚀 Serveur VériDiplôme démarré !');
      logger.info('📍 URL: ' + process.env.APP_URL);
      logger.info('🌍 Environnement: ' + process.env.NODE_ENV);
      logger.info('🔐 Authentification: Activée');
      logger.info('════════════════════════════════════════');
    });
  } catch (error) {
    logger.error('❌ Erreur au démarrage:', error);
    process.exit(1);
  }
}

startServer();