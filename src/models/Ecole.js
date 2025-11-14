module.exports = (sequelize, DataTypes) => {
  const Ecole = sequelize.define('Ecole', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    nom_complet: {
      type: DataTypes.STRING,
      allowNull: false
    },
    prefixe_unique: {
      type: DataTypes.STRING(10),
      unique: true
    },
    type: {
      type: DataTypes.ENUM('primaire', 'college', 'lycee', 'universite', 'institut'),
      allowNull: false
    },
    ville: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    telephone: DataTypes.STRING,
    email: DataTypes.STRING,
    directeur_nom: DataTypes.STRING,
    compte_valide: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    valide_par_ministere: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    statut: {
      type: DataTypes.ENUM('en_attente', 'actif', 'suspendu'),
      defaultValue: 'en_attente'
    }
  }, {
    tableName: 'ecoles',
    timestamps: true,
    underscored: true
  });

  return Ecole;
};