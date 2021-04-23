const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Companyindustry', {
    companyIndustryId: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      field: 'company_industry_id'
    },
    companyIndustryName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'company_industry_name'
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
    tableName: 'companyindustry',
    schema: 'hris',
    timestamps: false,
    indexes: [
      {
        name: "companyindustry_pkey",
        unique: true,
        fields: [
          { name: "company_industry_id" },
        ]
      },
    ]
  });
};
