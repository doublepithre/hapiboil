const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Companyinfo', {
    companyId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      references: {
        model: {
          tableName: 'company',
          schema: 'hris'
        },
        key: 'company_id'
      },
      field: 'company_id'
    },
    logo: {
      type: DataTypes.STRING,
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
    emailBg: {
      type: DataTypes.STRING(10),
      allowNull: true,
      field: 'email_bg'
    },
    banner: {
      type: DataTypes.STRING,
      allowNull: true
    },
    config: {
      type: DataTypes.JSON,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'companyinfo',
    schema: 'hris',
    timestamps: false,
    indexes: [
      {
        name: "companyinfo_pkey",
        unique: true,
        fields: [
          { name: "company_id" },
        ]
      },
    ]
  });
};
