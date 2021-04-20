const Sequelize = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  const Jobname = sequelize.define('Jobname', {
    jobNameId: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      field: 'job_name_id'
    },
    jobName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'job_name'
    },
    jobNameLower: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: "jobname_job_name_lower_key",
      field: 'job_name_lower'
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
    tableName: 'jobname',
    schema: 'hris',
    timestamps: false,
    indexes: [
      {
        name: "jobname_job_name_lower_key",
        unique: true,
        fields: [
          { name: "job_name_lower" },
        ]
      },
      {
        name: "jobname_pkey",
        unique: true,
        fields: [
          { name: "job_name_id" },
        ]
      },
    ]
  });
  Jobname.associate = function(model) {
    initRelations(model);
  }
  return Jobname;
}
const initRelations = (model) =>{
  const Jobname = model.Jobname;
  const Job = model.Job;


  Jobname.hasMany(Job, { as: "jobs", foreignKey: "jobNameId"});

}
