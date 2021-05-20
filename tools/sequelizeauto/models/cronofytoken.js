const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Cronofytoken', {
    accessToken: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true,
      field: 'access_token'
    },
    userId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: {
          tableName: 'userinfo',
          schema: 'hris'
        },
        key: 'user_id'
      },
      field: 'user_id'
    },
    refreshToken: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'refresh_token'
    },
    tokenType: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'token_type'
    },
    expires: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    scope: {
      type: DataTypes.TEXT,
      allowNull: true
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
    },
    accountId: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'account_id'
    }
  }, {
    sequelize,
    tableName: 'cronofytokens',
    schema: 'hris',
    timestamps: false,
    indexes: [
      {
        name: "cronofytokens_pkey",
        unique: true,
        fields: [
          { name: "access_token" },
        ]
      },
    ]
  });
};
