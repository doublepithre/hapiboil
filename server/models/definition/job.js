const Sequelize = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  const Job = sequelize.define('Job', {
    jobId: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      field: 'job_id'
    },
    jobUuid: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      unique: "job_uuid_key",
      field: 'job_uuid'
    },
    jobName: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'job_name'
    },
    jobDescription: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'job_description'
    },
    jobWebsite: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'job_website'
    },
    companyId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: {
        model: {
          tableName: 'company',
          schema: 'hris'
        },
        key: 'company_id'
      },
      field: 'company_id'
    },
    userId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: {
        model: {
          tableName: 'user',
          schema: 'hris'
        },
        key: 'user_id'
      },
      field: 'user_id'
    },
    active: {
      type: DataTypes.BOOLEAN,
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
    }
  }, {
    sequelize,
    tableName: 'jobs',
    schema: 'hris',
    timestamps: false,
    indexes: [
      {
        name: "job_pkey",
        unique: true,
        fields: [
          { name: "job_id" },
        ]
      },
      {
        name: "job_uuid_key",
        unique: true,
        fields: [
          { name: "job_uuid" },
        ]
      },
    ]
  });
  Job.associate = function(model) {
    initRelations(model);
  }
  return Job;
}
const initRelations = (model) =>{
  const Job = model.Job;
  const Jobapplication = model.Jobapplication;
  const Jobsquesresponse = model.Jobsquesresponse;
  const Userinfo = model.Userinfo;


  Job.hasMany(Jobapplication, { as: "jobapplications", foreignKey: "jobId"});
  Job.hasMany(Jobsquesresponse, { as: "jobsquesresponses", foreignKey: "jobId"});
  Job.belongsTo(Userinfo, { as: "user", foreignKey: "userId"});

}
