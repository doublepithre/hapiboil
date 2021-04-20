const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Jobindustry', {
    jobIndustryId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      field: 'job_industry_id'
    },
    jobIndustryName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'job_industry_name'
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
    tableName: 'jobindustry',
    schema: 'hris',
    timestamps: false,
    indexes: [
      {
        name: "jobindustry_pkey",
        unique: true,
        fields: [
          { name: "job_industry_id" },
        ]
      },
    ]
  });
};
