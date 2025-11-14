module.exports = (sequelize, DataTypes) => {
  const Document = sequelize.define('Document', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    numero_unique: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    etudiant_ine: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    etudiant_nom_complet: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM('bulletin', 'diplome'),
      allowNull: false
    },
    categorie: DataTypes.STRING(100),
    ecole_emettrice_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    ecole_emettrice_nom: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    ecole_prefixe: {
      type: DataTypes.STRING(10),
      allowNull: false
    },
    niveau: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    specialite: DataTypes.STRING(255),
    annee_scolaire: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    periode: DataTypes.STRING(50),
    resultat: {
      type: DataTypes.ENUM('admis', 'ajourne', 'redouble'),
      allowNull: true
    },
    moyenne_generale: DataTypes.DECIMAL(5, 2),
    mention: DataTypes.STRING(50),
    pdf_url: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    pdf_filename: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    hash_document: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true
    },
    qr_code_url: DataTypes.TEXT,
    qr_code_data: DataTypes.TEXT,
    emis_par_user_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    emis_par_nom: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    date_emission: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    statut: {
      type: DataTypes.ENUM('valide', 'annule', 'remplace'),
      defaultValue: 'valide'
    }
  }, {
    tableName: 'documents',
    timestamps: true,
    underscored: true
  });

  return Document;
};