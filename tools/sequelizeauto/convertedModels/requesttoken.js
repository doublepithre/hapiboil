const Sequelize = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  const Requesttoken = sequelize.define('Requesttoken', {
    requestId: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      field: 'request_id'
    },
    requestKey: {
      type: DataTypes.STRING(500),
      allowNull: false,
      field: 'request_key'
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'expires_at'
    },
    userId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: 'user_id'
    },
    resourceType: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'resource_type'
    },
    actionType: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'action_type'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.fn('now'),
      field: 'created_at'
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.fn('now'),
      field: 'updated_at'
    }
  }, {
    sequelize,
    tableName: 'requesttoken',
    schema: 'hris',
    timestamps: false,
    indexes: [
      {
        name: "requesttoken_pkey",
        unique: true,
        fields: [
          { name: "request_id" },
        ]
      },
    ]
  });
  Requesttoken.associate = function(model) {
    initRelations(model);
  }
  return Requesttoken;
}
const initRelations = (model) =>{
  const Requesttoken = model.Requesttoken;



}
