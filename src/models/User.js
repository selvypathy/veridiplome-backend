module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password_hash: {
      type: DataTypes.STRING,
      allowNull: false
    },
    role: {
      type: DataTypes.ENUM('admin', 'ecole', 'etudiant'),
      allowNull: false
    },
    nom_complet: {
      type: DataTypes.STRING,
      allowNull: false
    },
    telephone: DataTypes.STRING,
    ecole_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    etudiant_ine: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    email_verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'users',
    timestamps: true,
    underscored: true
  });

  return User;
};