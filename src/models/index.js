const { sequelize } = require('../config/database');
const { DataTypes } = require('sequelize');

const User = require('./User')(sequelize, DataTypes);
const Ecole = require('./Ecole')(sequelize, DataTypes);
const Etudiant = require('./Etudiant')(sequelize, DataTypes);
const Document = require('./Document')(sequelize, DataTypes);
const Verification = require('./Verification')(sequelize, DataTypes);

// Associations
User.belongsTo(Ecole, { foreignKey: 'ecole_id', as: 'ecole' });
User.belongsTo(Etudiant, { foreignKey: 'etudiant_ine', as: 'etudiant' });

Etudiant.belongsTo(Ecole, { foreignKey: 'ecole_creation_id', as: 'ecoleCreation' });
Etudiant.belongsTo(Ecole, { foreignKey: 'ecole_actuelle_id', as: 'ecoleActuelle' });
Etudiant.hasMany(Document, { foreignKey: 'etudiant_ine', as: 'documents' });

Document.belongsTo(Etudiant, { foreignKey: 'etudiant_ine', as: 'etudiant' });
Document.belongsTo(Ecole, { foreignKey: 'ecole_emettrice_id', as: 'ecoleEmettrice' });
Document.belongsTo(User, { foreignKey: 'emis_par_user_id', as: 'emetteur' });

Verification.belongsTo(Etudiant, { foreignKey: 'etudiant_ine', as: 'etudiant' });
Verification.belongsTo(Document, { foreignKey: 'document_id', as: 'document' });

module.exports = {
  sequelize,
  User,
  Ecole,
  Etudiant,
  Document,
  Verification
};