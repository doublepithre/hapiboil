const Sequelize = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  const Jobindustry = sequelize.define('Jobindustry', {
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
  Jobindustry.associate = function(model) {
    initRelations(model);
  }
  return Jobindustry;
}
const initRelations = (model) =>{
  const Jobindustry = model.Jobindustry;
  const Job = model.Job;


  Jobindustry.hasMany(Job, { as: "jobs", foreignKey: "jobIndustryId"});

}
