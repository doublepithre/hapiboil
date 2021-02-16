const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Accesstoken', {
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
};
