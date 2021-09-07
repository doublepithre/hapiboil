const Sequelize = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  const Accesstoken = sequelize.define('Accesstoken', {
    token: {
      type: DataTypes.TEXT,
      allowNull: false,
      primaryKey: true
    },
    userId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: 'user_id'
    },
    isValid: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      field: 'is_valid'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.fn('now'),
      field: 'created_at'
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'expires_at'
    }
  }, {
    sequelize,
    tableName: 'accesstoken',
    schema: 'hris',
    timestamps: false,
    indexes: [
      {
        name: "accesstoken_pkey",
        unique: true,
        fields: [
          { name: "token" },
        ]
      },
    ]
  });
  Accesstoken.associate = function(model) {
    initRelations(model);
  }
  return Accesstoken;
}
const initRelations = (model) =>{
  const Accesstoken = model.Accesstoken;



}
