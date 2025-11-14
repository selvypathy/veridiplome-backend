module.exports = (sequelize, DataTypes) => {
  const Verification = sequelize.define('Verification', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    numero_verification: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    etudiant_ine: DataTypes.STRING(50),
    document_id: DataTypes.UUID,
    qr_code_scanne: DataTypes.TEXT,
    verificateur_type: {
      type: DataTypes.ENUM('public', 'employeur', 'institution'),
      allowNull: false
    },
    verificateur_nom: DataTypes.STRING(255),
    verificateur_email: DataTypes.STRING(255),
    resultat: {
      type: DataTypes.ENUM('valide', 'invalide', 'introuvable'),
      allowNull: false
    },
    details_affichees: DataTypes.JSON,
    methode: {
      type: DataTypes.ENUM('qr_code', 'recherche_ine'),
      allowNull: false
    },
    ip_address: DataTypes.STRING(45),
    user_agent: DataTypes.TEXT,
    date_verification: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'verifications',
    timestamps: false
  });

  return Verification;
};