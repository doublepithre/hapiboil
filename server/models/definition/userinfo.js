const Sequelize = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  const Userinfo = sequelize.define('Userinfo', {
    userId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      references: {
        model: {
          tableName: 'user',
          schema: 'hris'
        },
        key: 'user_id'
      },
      field: 'user_id'
    },
    userUuid: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: {
          tableName: 'user',
          schema: 'hris'
        },
        key: 'user_uuid'
      },
      field: 'user_uuid'
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: "userinfo_email_key"
    },
    roleId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: {
          tableName: 'userrole',
          schema: 'hris'
        },
        key: 'role_id'
      },
      field: 'role_id'
    },
    userTypeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: {
          tableName: 'usertype',
          schema: 'hris'
        },
        key: 'user_type_id'
      },
      field: 'user_type_id'
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false
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
    companyUuid: {
      type: DataTypes.UUID,
      allowNull: true,
      defaultValue: DataTypes.UUIDV4,
      references: {
        model: {
          tableName: 'company',
          schema: 'hris'
        },
        key: 'company_uuid'
      },
      field: 'company_uuid'
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'first_name'
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'last_name'
    },
    picture: {
      type: DataTypes.STRING,
      allowNull: true
    },
    isAdmin: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      field: 'is_admin'
    },
    tzid: {
      type: DataTypes.STRING,
      allowNull: true
    },
    primaryMobile: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'primary_mobile'
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
    privacyClause: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
      field: 'privacy_clause'
    },
    tandc: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    },
    inTalentPool: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
      field: 'in_talent_pool'
    },
    allowSendEmail: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
      field: 'allow_send_email'
    }
  }, {
    sequelize,
    tableName: 'userinfo',
    schema: 'hris',
    hasTrigger: true,
    timestamps: false,
    indexes: [
      {
        name: "userinfo_email_key",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "userinfo_pkey",
        unique: true,
        fields: [
          { name: "user_id" },
        ]
      },
    ]
  });
  Userinfo.associate = function(model) {
    initRelations(model);
  }
  return Userinfo;
}
const initRelations = (model) =>{
  const Userinfo = model.Userinfo;
  const Job = model.Job;
  const Questionnaire = model.Questionnaire;
  const Trainingcourse = model.Trainingcourse;
  const Company = model.Company;
  const User = model.User;
  const Applicationauditlog = model.Applicationauditlog;
  const Applicationhiremember = model.Applicationhiremember;
  const Companyauditlog = model.Companyauditlog;
  const Companysuperadminquesresponse = model.Companysuperadminquesresponse;
  const Companyvisit = model.Companyvisit;
  const Cronofy = model.Cronofy;
  const Cronofytoken = model.Cronofytoken;
  const Jobapplication = model.Jobapplication;
  const Jobauditlog = model.Jobauditlog;
  const Jobhiremember = model.Jobhiremember;
  const Jobvisit = model.Jobvisit;
  const Mentorcandidatemapping = model.Mentorcandidatemapping;
  const Mentorquesresponse = model.Mentorquesresponse;
  const Onboarding = model.Onboarding;
  const Onboardingtask = model.Onboardingtask;
  const Profileauditlog = model.Profileauditlog;
  const Recommendation = model.Recommendation;
  const Recommendationfeedback = model.Recommendationfeedback;
  const Usercompatibilitydatum = model.Usercompatibilitydatum;
  const Userdemographic = model.Userdemographic;
  const Userfeedback = model.Userfeedback;
  const Usermeta = model.Usermeta;
  const Userquesresponse = model.Userquesresponse;
  const Userrecommendationlog = model.Userrecommendationlog;
  const Usertrainingcourse = model.Usertrainingcourse;
  const Userrole = model.Userrole;
  const Usertype = model.Usertype;


  Userinfo.belongsToMany(Job, { through: Jobhiremember, foreignKey: "userId", otherKey: "jobId" });
  Userinfo.belongsToMany(Job, { through: Recommendation, foreignKey: "userId", otherKey: "jobId" });
  Userinfo.belongsToMany(Job, { through: Recommendationfeedback, foreignKey: "userId", otherKey: "jobId" });
  Userinfo.belongsToMany(Questionnaire, { through: Companysuperadminquesresponse, foreignKey: "userId", otherKey: "questionId" });
  Userinfo.belongsToMany(Questionnaire, { through: Mentorquesresponse, foreignKey: "userId", otherKey: "questionId" });
  Userinfo.belongsToMany(Questionnaire, { through: Userquesresponse, foreignKey: "userId", otherKey: "questionId" });
  Userinfo.belongsToMany(Trainingcourse, { through: Usertrainingcourse, foreignKey: "userId", otherKey: "courseId" });
  Userinfo.belongsTo(Company, { as: "company", foreignKey: "companyId"});
  Userinfo.belongsTo(Company, { as: "companyUu", foreignKey: "companyUuid"});
  Userinfo.belongsTo(User, { as: "user", foreignKey: "userId"});
  Userinfo.belongsTo(User, { as: "userUu", foreignKey: "userUuid"});
  Userinfo.hasMany(Applicationauditlog, { as: "applicationauditlogs", foreignKey: "performerUserId"});
  Userinfo.hasMany(Applicationhiremember, { as: "applicationhiremembers", foreignKey: "userId"});
  Userinfo.hasMany(Companyauditlog, { as: "companyauditlogs", foreignKey: "performerUserId"});
  Userinfo.hasMany(Companysuperadminquesresponse, { as: "companysuperadminquesresponses", foreignKey: "userId"});
  Userinfo.hasMany(Companyvisit, { as: "companyvisits", foreignKey: "visitorId"});
  Userinfo.hasOne(Cronofy, { as: "cronofy", foreignKey: "userId"});
  Userinfo.hasMany(Cronofytoken, { as: "cronofytokens", foreignKey: "userId"});
  Userinfo.hasMany(Jobapplication, { as: "jobapplications", foreignKey: "userId"});
  Userinfo.hasMany(Jobauditlog, { as: "jobauditlogs", foreignKey: "performerUserId"});
  Userinfo.hasMany(Jobhiremember, { as: "jobhiremembers", foreignKey: "userId"});
  Userinfo.hasMany(Jobvisit, { as: "jobvisits", foreignKey: "visitorId"});
  Userinfo.hasMany(Mentorcandidatemapping, { as: "mentorcandidatemappings", foreignKey: "candidateId"});
  Userinfo.hasMany(Mentorcandidatemapping, { as: "mentorMentorcandidatemappings", foreignKey: "mentorId"});
  Userinfo.hasMany(Mentorquesresponse, { as: "mentorquesresponses", foreignKey: "userId"});
  Userinfo.hasMany(Onboarding, { as: "onboardings", foreignKey: "onboardee"});
  Userinfo.hasMany(Onboarding, { as: "onboarderOnboardings", foreignKey: "onboarder"});
  Userinfo.hasMany(Onboardingtask, { as: "onboardingtasks", foreignKey: "asignee"});
  Userinfo.hasMany(Profileauditlog, { as: "profileauditlogs", foreignKey: "affectedUserId"});
  Userinfo.hasMany(Profileauditlog, { as: "performerUserProfileauditlogs", foreignKey: "performerUserId"});
  Userinfo.hasMany(Questionnaire, { as: "questionnaires", foreignKey: "createdBy"});
  Userinfo.hasMany(Recommendation, { as: "recommendations", foreignKey: "userId"});
  Userinfo.hasMany(Recommendationfeedback, { as: "recommendationfeedbacks", foreignKey: "userId"});
  Userinfo.hasOne(Usercompatibilitydatum, { as: "usercompatibilitydatum", foreignKey: "userId"});
  Userinfo.hasOne(Userdemographic, { as: "userdemographic", foreignKey: "userId"});
  Userinfo.hasMany(Userfeedback, { as: "userfeedbacks", foreignKey: "userId"});
  Userinfo.hasMany(Usermeta, { as: "usermeta", foreignKey: "userId"});
  Userinfo.hasMany(Userquesresponse, { as: "userquesresponses", foreignKey: "userId"});
  Userinfo.hasOne(Userrecommendationlog, { as: "userrecommendationlog", foreignKey: "userId"});
  Userinfo.hasMany(Usertrainingcourse, { as: "usertrainingcourses", foreignKey: "userId"});
  Userinfo.belongsTo(Userrole, { as: "role", foreignKey: "roleId"});
  Userinfo.belongsTo(Usertype, { as: "userType", foreignKey: "userTypeId"});

}
