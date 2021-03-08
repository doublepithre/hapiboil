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
    userId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: {
        model: {
          tableName: 'userinfo',
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
    },
    companyId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: 'company_id'
    },
    isPrivate: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
      field: 'is_private'
    },
    jobIndustryId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: {
          tableName: 'jobindustry',
          schema: 'hris'
        },
        key: 'job_industry_id'
      },
      field: 'job_industry_id'
    },
    jobFunctionId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: {
          tableName: 'jobfunction',
          schema: 'hris'
        },
        key: 'job_function_id'
      },
      field: 'job_function_id'
    },
    jobTypeId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: {
          tableName: 'jobtype',
          schema: 'hris'
        },
        key: 'job_type_id'
      },
      field: 'job_type_id'
    },
    minExp: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'min_exp'
    },
    jobLocationId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: {
          tableName: 'joblocation',
          schema: 'hris'
        },
        key: 'job_location_id'
      },
      field: 'job_location_id'
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
  const Questionnaire = model.Questionnaire;
  const Userinfo = model.Userinfo;
  const Jobfunction = model.Jobfunction;
  const Jobindustry = model.Jobindustry;
  const Joblocation = model.Joblocation;
  const Jobapplication = model.Jobapplication;
  const Jobhiremember = model.Jobhiremember;
  const Jobsquesresponse = model.Jobsquesresponse;
  const Jobtype = model.Jobtype;


  Job.belongsToMany(Questionnaire, { through: Jobsquesresponse, foreignKey: "jobId", otherKey: "questionId" });
  Job.belongsToMany(Userinfo, { through: Jobhiremember, foreignKey: "jobId", otherKey: "userId" });
  Job.belongsTo(Jobfunction, { as: "jobFunction", foreignKey: "jobFunctionId"});
  Job.belongsTo(Jobindustry, { as: "jobIndustry", foreignKey: "jobIndustryId"});
  Job.belongsTo(Joblocation, { as: "jobLocation", foreignKey: "jobLocationId"});
  Job.hasMany(Jobapplication, { as: "jobapplications", foreignKey: "jobId"});
  Job.hasMany(Jobhiremember, { as: "jobhiremembers", foreignKey: "jobId"});
  Job.hasMany(Jobsquesresponse, { as: "jobsquesresponses", foreignKey: "jobId"});
  Job.belongsTo(Jobtype, { as: "jobType", foreignKey: "jobTypeId"});
  Job.belongsTo(Userinfo, { as: "user", foreignKey: "userId"});

}
