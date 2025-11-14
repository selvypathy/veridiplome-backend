module.exports = (sequelize, DataTypes) => {
  const Etudiant = sequelize.define('Etudiant', {
    ine: {
      type: DataTypes.STRING(50),
      primaryKey: true
    },
    nom: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    prenom: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    nom_complet: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    date_naissance: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    lieu_naissance: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    sexe: {
      type: DataTypes.ENUM('M', 'F'),
      allowNull: false
    },
    photo_url: DataTypes.TEXT,
    ecole_creation_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    ecole_creation_nom: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    prefixe_creation: {
      type: DataTypes.STRING(10),
      allowNull: false
    },
    date_creation_ine: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    annee_creation: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    ecole_actuelle_id: DataTypes.UUID,
    ecole_actuelle_nom: DataTypes.STRING(255),
    statut: {
      type: DataTypes.ENUM('actif', 'diplome', 'decrocheur'),
      defaultValue: 'actif'
    }
  }, {
    tableName: 'etudiants',
    timestamps: true,
    underscored: true
  });

  return Etudiant;
};