const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Cronofy', {
    id: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true
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
      unique: "cronofy_user_id_key",
      field: 'user_id'
    },
    accountId: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'account_id'
    },
    sub: {
      type: DataTypes.STRING,
      allowNull: true
    },
    linkingProfile: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'linking_profile'
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
    calendar: {
      type: DataTypes.JSON,
      allowNull: true
    },
    accountName: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'account_name'
    },
    accountEmail: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: "cronofy_account_email_key",
      field: 'account_email'
    },
    defaultTzid: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'default_tzid'
    }
  }, {
    sequelize,
    tableName: 'cronofy',
    schema: 'hris',
    timestamps: false,
    indexes: [
      {
        name: "cronofy_account_email_key",
        unique: true,
        fields: [
          { name: "account_email" },
        ]
      },
      {
        name: "cronofy_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "cronofy_user_id_key",
        unique: true,
        fields: [
          { name: "user_id" },
        ]
      },
    ]
  });
};
