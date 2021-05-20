var DataTypes = require("sequelize").DataTypes;
var _Accesstoken = require("./accesstoken");
var _Applicationauditlog = require("./applicationauditlog");
var _Applicationhiremember = require("./applicationhiremember");
var _Attributeset = require("./attributeset");
var _Company = require("./company");
var _Companyauditlog = require("./companyauditlog");
var _Companyindustry = require("./companyindustry");
var _Companyinfo = require("./companyinfo");
var _Cronofy = require("./cronofy");
var _Cronofytoken = require("./cronofytoken");
var _Emaillog = require("./emaillog");
var _Emailtemplate = require("./emailtemplate");
var _Jobapplication = require("./jobapplication");
var _Jobauditlog = require("./jobauditlog");
var _Jobfunction = require("./jobfunction");
var _Jobhiremember = require("./jobhiremember");
var _Jobindustry = require("./jobindustry");
var _Joblocation = require("./joblocation");
var _Jobname = require("./jobname");
var _Job = require("./job");
var _Jobsquesresponse = require("./jobsquesresponse");
var _Jobtype = require("./jobtype");
var _Mentorcandidatemapping = require("./mentorcandidatemapping");
var _Mentorquesresponse = require("./mentorquesresponse");
var _Profileauditlog = require("./profileauditlog");
var _Qaattribute = require("./qaattribute");
var _Questioncategory = require("./questioncategory");
var _Questionmapping = require("./questionmapping");
var _Questionnaire = require("./questionnaire");
var _Questionnaireanswer = require("./questionnaireanswer");
var _Questiontarget = require("./questiontarget");
var _Questiontype = require("./questiontype");
var _Report = require("./report");
var _Requesttoken = require("./requesttoken");
var _User = require("./user");
var _Userinfo = require("./userinfo");
var _Usermetum = require("./usermetum");
var _Userquesresponse = require("./userquesresponse");
var _Userrole = require("./userrole");
var _Usertype = require("./usertype");

function initModels(sequelize) {
  var Accesstoken = _Accesstoken(sequelize, DataTypes);
  var Applicationauditlog = _Applicationauditlog(sequelize, DataTypes);
  var Applicationhiremember = _Applicationhiremember(sequelize, DataTypes);
  var Attributeset = _Attributeset(sequelize, DataTypes);
  var Company = _Company(sequelize, DataTypes);
  var Companyauditlog = _Companyauditlog(sequelize, DataTypes);
  var Companyindustry = _Companyindustry(sequelize, DataTypes);
  var Companyinfo = _Companyinfo(sequelize, DataTypes);
  var Cronofy = _Cronofy(sequelize, DataTypes);
  var Cronofytoken = _Cronofytoken(sequelize, DataTypes);
  var Emaillog = _Emaillog(sequelize, DataTypes);
  var Emailtemplate = _Emailtemplate(sequelize, DataTypes);
  var Jobapplication = _Jobapplication(sequelize, DataTypes);
  var Jobauditlog = _Jobauditlog(sequelize, DataTypes);
  var Jobfunction = _Jobfunction(sequelize, DataTypes);
  var Jobhiremember = _Jobhiremember(sequelize, DataTypes);
  var Jobindustry = _Jobindustry(sequelize, DataTypes);
  var Joblocation = _Joblocation(sequelize, DataTypes);
  var Jobname = _Jobname(sequelize, DataTypes);
  var Job = _Job(sequelize, DataTypes);
  var Jobsquesresponse = _Jobsquesresponse(sequelize, DataTypes);
  var Jobtype = _Jobtype(sequelize, DataTypes);
  var Mentorcandidatemapping = _Mentorcandidatemapping(sequelize, DataTypes);
  var Mentorquesresponse = _Mentorquesresponse(sequelize, DataTypes);
  var Profileauditlog = _Profileauditlog(sequelize, DataTypes);
  var Qaattribute = _Qaattribute(sequelize, DataTypes);
  var Questioncategory = _Questioncategory(sequelize, DataTypes);
  var Questionmapping = _Questionmapping(sequelize, DataTypes);
  var Questionnaire = _Questionnaire(sequelize, DataTypes);
  var Questionnaireanswer = _Questionnaireanswer(sequelize, DataTypes);
  var Questiontarget = _Questiontarget(sequelize, DataTypes);
  var Questiontype = _Questiontype(sequelize, DataTypes);
  var Report = _Report(sequelize, DataTypes);
  var Requesttoken = _Requesttoken(sequelize, DataTypes);
  var User = _User(sequelize, DataTypes);
  var Userinfo = _Userinfo(sequelize, DataTypes);
  var Usermetum = _Usermetum(sequelize, DataTypes);
  var Userquesresponse = _Userquesresponse(sequelize, DataTypes);
  var Userrole = _Userrole(sequelize, DataTypes);
  var Usertype = _Usertype(sequelize, DataTypes);

  Job.belongsToMany(Userinfo, { through: Jobhiremember, foreignKey: "jobId", otherKey: "userId" });
  Questionnaire.belongsToMany(Questionnaire, { through: Questionmapping, foreignKey: "empauwerAllQid", otherKey: "empauwerMeQid" });
  Questionnaire.belongsToMany(Questionnaire, { through: Questionmapping, foreignKey: "empauwerMeQid", otherKey: "empauwerAllQid" });
  Questionnaire.belongsToMany(Userinfo, { through: Mentorquesresponse, foreignKey: "questionId", otherKey: "userId" });
  Questionnaire.belongsToMany(Userinfo, { through: Userquesresponse, foreignKey: "questionId", otherKey: "userId" });
  Userinfo.belongsToMany(Job, { through: Jobhiremember, foreignKey: "userId", otherKey: "jobId" });
  Userinfo.belongsToMany(Questionnaire, { through: Mentorquesresponse, foreignKey: "userId", otherKey: "questionId" });
  Userinfo.belongsToMany(Questionnaire, { through: Userquesresponse, foreignKey: "userId", otherKey: "questionId" });
  Qaattribute.belongsTo(Attributeset, { as: "attribute", foreignKey: "attributeId"});
  Attributeset.hasMany(Qaattribute, { as: "qaattributes", foreignKey: "attributeId"});
  Companyauditlog.belongsTo(Company, { as: "affectedCompany", foreignKey: "affectedCompanyId"});
  Company.hasMany(Companyauditlog, { as: "companyauditlogs", foreignKey: "affectedCompanyId"});
  Companyinfo.belongsTo(Company, { as: "company", foreignKey: "companyId"});
  Company.hasOne(Companyinfo, { as: "companyinfo", foreignKey: "companyId"});
  Userinfo.belongsTo(Company, { as: "company", foreignKey: "companyId"});
  Company.hasMany(Userinfo, { as: "userinfos", foreignKey: "companyId"});
  Userinfo.belongsTo(Company, { as: "companyUu", foreignKey: "companyUuid"});
  Company.hasMany(Userinfo, { as: "companyUuUserinfos", foreignKey: "companyUuid"});
  Company.belongsTo(Companyindustry, { as: "companyIndustry", foreignKey: "companyIndustryId"});
  Companyindustry.hasMany(Company, { as: "companies", foreignKey: "companyIndustryId"});
  Applicationauditlog.belongsTo(Jobapplication, { as: "affectedApplication", foreignKey: "affectedApplicationId"});
  Jobapplication.hasMany(Applicationauditlog, { as: "applicationauditlogs", foreignKey: "affectedApplicationId"});
  Job.belongsTo(Jobfunction, { as: "jobFunction", foreignKey: "jobFunctionId"});
  Jobfunction.hasMany(Job, { as: "jobs", foreignKey: "jobFunctionId"});
  Job.belongsTo(Jobindustry, { as: "jobIndustry", foreignKey: "jobIndustryId"});
  Jobindustry.hasMany(Job, { as: "jobs", foreignKey: "jobIndustryId"});
  Job.belongsTo(Joblocation, { as: "jobLocation", foreignKey: "jobLocationId"});
  Joblocation.hasMany(Job, { as: "jobs", foreignKey: "jobLocationId"});
  Job.belongsTo(Jobname, { as: "jobName", foreignKey: "jobNameId"});
  Jobname.hasMany(Job, { as: "jobs", foreignKey: "jobNameId"});
  Jobapplication.belongsTo(Job, { as: "job", foreignKey: "jobId"});
  Job.hasMany(Jobapplication, { as: "jobapplications", foreignKey: "jobId"});
  Jobauditlog.belongsTo(Job, { as: "affectedJob", foreignKey: "affectedJobId"});
  Job.hasMany(Jobauditlog, { as: "jobauditlogs", foreignKey: "affectedJobId"});
  Jobhiremember.belongsTo(Job, { as: "job", foreignKey: "jobId"});
  Job.hasMany(Jobhiremember, { as: "jobhiremembers", foreignKey: "jobId"});
  Job.belongsTo(Jobtype, { as: "jobType", foreignKey: "jobTypeId"});
  Jobtype.hasMany(Job, { as: "jobs", foreignKey: "jobTypeId"});
  Questionnaire.belongsTo(Questioncategory, { as: "questionCategory", foreignKey: "questionCategoryId"});
  Questioncategory.hasMany(Questionnaire, { as: "questionnaires", foreignKey: "questionCategoryId"});
  Jobsquesresponse.belongsTo(Questionnaire, { as: "question", foreignKey: "questionId"});
  Questionnaire.hasMany(Jobsquesresponse, { as: "jobsquesresponses", foreignKey: "questionId"});
  Mentorquesresponse.belongsTo(Questionnaire, { as: "question", foreignKey: "questionId"});
  Questionnaire.hasMany(Mentorquesresponse, { as: "mentorquesresponses", foreignKey: "questionId"});
  Questionmapping.belongsTo(Questionnaire, { as: "empauwerAllQ", foreignKey: "empauwerAllQid"});
  Questionnaire.hasMany(Questionmapping, { as: "questionmappings", foreignKey: "empauwerAllQid"});
  Questionmapping.belongsTo(Questionnaire, { as: "empauwerMeQ", foreignKey: "empauwerMeQid"});
  Questionnaire.hasMany(Questionmapping, { as: "empauwerMeQQuestionmappings", foreignKey: "empauwerMeQid"});
  Questionnaireanswer.belongsTo(Questionnaire, { as: "question", foreignKey: "questionId"});
  Questionnaire.hasMany(Questionnaireanswer, { as: "questionnaireanswers", foreignKey: "questionId"});
  Report.belongsTo(Questionnaire, { as: "question", foreignKey: "questionId"});
  Questionnaire.hasMany(Report, { as: "reports", foreignKey: "questionId"});
  Userquesresponse.belongsTo(Questionnaire, { as: "question", foreignKey: "questionId"});
  Questionnaire.hasMany(Userquesresponse, { as: "userquesresponses", foreignKey: "questionId"});
  Qaattribute.belongsTo(Questionnaireanswer, { as: "answer", foreignKey: "answerId"});
  Questionnaireanswer.hasMany(Qaattribute, { as: "qaattributes", foreignKey: "answerId"});
  Questionnaire.belongsTo(Questiontarget, { as: "questionTarget", foreignKey: "questionTargetId"});
  Questiontarget.hasMany(Questionnaire, { as: "questionnaires", foreignKey: "questionTargetId"});
  Questionnaire.belongsTo(Questiontype, { as: "questionType", foreignKey: "questionTypeId"});
  Questiontype.hasMany(Questionnaire, { as: "questionnaires", foreignKey: "questionTypeId"});
  Job.belongsTo(User, { as: "user", foreignKey: "userId"});
  User.hasMany(Job, { as: "jobs", foreignKey: "userId"});
  Userinfo.belongsTo(User, { as: "user", foreignKey: "userId"});
  User.hasOne(Userinfo, { as: "userinfo", foreignKey: "userId"});
  Userinfo.belongsTo(User, { as: "userUu", foreignKey: "userUuid"});
  User.hasMany(Userinfo, { as: "userUuUserinfos", foreignKey: "userUuid"});
  Applicationauditlog.belongsTo(Userinfo, { as: "performerUser", foreignKey: "performerUserId"});
  Userinfo.hasMany(Applicationauditlog, { as: "applicationauditlogs", foreignKey: "performerUserId"});
  Applicationhiremember.belongsTo(Userinfo, { as: "user", foreignKey: "userId"});
  Userinfo.hasMany(Applicationhiremember, { as: "applicationhiremembers", foreignKey: "userId"});
  Companyauditlog.belongsTo(Userinfo, { as: "performerUser", foreignKey: "performerUserId"});
  Userinfo.hasMany(Companyauditlog, { as: "companyauditlogs", foreignKey: "performerUserId"});
  Cronofy.belongsTo(Userinfo, { as: "user", foreignKey: "userId"});
  Userinfo.hasOne(Cronofy, { as: "cronofy", foreignKey: "userId"});
  Cronofytoken.belongsTo(Userinfo, { as: "user", foreignKey: "userId"});
  Userinfo.hasMany(Cronofytoken, { as: "cronofytokens", foreignKey: "userId"});
  Jobapplication.belongsTo(Userinfo, { as: "user", foreignKey: "userId"});
  Userinfo.hasMany(Jobapplication, { as: "jobapplications", foreignKey: "userId"});
  Jobauditlog.belongsTo(Userinfo, { as: "performerUser", foreignKey: "performerUserId"});
  Userinfo.hasMany(Jobauditlog, { as: "jobauditlogs", foreignKey: "performerUserId"});
  Jobhiremember.belongsTo(Userinfo, { as: "user", foreignKey: "userId"});
  Userinfo.hasMany(Jobhiremember, { as: "jobhiremembers", foreignKey: "userId"});
  Mentorcandidatemapping.belongsTo(Userinfo, { as: "candidate", foreignKey: "candidateId"});
  Userinfo.hasMany(Mentorcandidatemapping, { as: "mentorcandidatemappings", foreignKey: "candidateId"});
  Mentorcandidatemapping.belongsTo(Userinfo, { as: "mentor", foreignKey: "mentorId"});
  Userinfo.hasMany(Mentorcandidatemapping, { as: "mentorMentorcandidatemappings", foreignKey: "mentorId"});
  Mentorquesresponse.belongsTo(Userinfo, { as: "user", foreignKey: "userId"});
  Userinfo.hasMany(Mentorquesresponse, { as: "mentorquesresponses", foreignKey: "userId"});
  Profileauditlog.belongsTo(Userinfo, { as: "affectedUser", foreignKey: "affectedUserId"});
  Userinfo.hasMany(Profileauditlog, { as: "profileauditlogs", foreignKey: "affectedUserId"});
  Profileauditlog.belongsTo(Userinfo, { as: "performerUser", foreignKey: "performerUserId"});
  Userinfo.hasMany(Profileauditlog, { as: "performerUserProfileauditlogs", foreignKey: "performerUserId"});
  Questionnaire.belongsTo(Userinfo, { as: "createdByUserinfo", foreignKey: "createdBy"});
  Userinfo.hasMany(Questionnaire, { as: "questionnaires", foreignKey: "createdBy"});
  Usermetum.belongsTo(Userinfo, { as: "user", foreignKey: "userId"});
  Userinfo.hasMany(Usermetum, { as: "usermeta", foreignKey: "userId"});
  Userquesresponse.belongsTo(Userinfo, { as: "user", foreignKey: "userId"});
  Userinfo.hasMany(Userquesresponse, { as: "userquesresponses", foreignKey: "userId"});
  Userinfo.belongsTo(Userrole, { as: "role", foreignKey: "roleId"});
  Userrole.hasMany(Userinfo, { as: "userinfos", foreignKey: "roleId"});
  Userinfo.belongsTo(Usertype, { as: "userType", foreignKey: "userTypeId"});
  Usertype.hasMany(Userinfo, { as: "userinfos", foreignKey: "userTypeId"});

  return {
    Accesstoken,
    Applicationauditlog,
    Applicationhiremember,
    Attributeset,
    Company,
    Companyauditlog,
    Companyindustry,
    Companyinfo,
    Cronofy,
    Cronofytoken,
    Emaillog,
    Emailtemplate,
    Jobapplication,
    Jobauditlog,
    Jobfunction,
    Jobhiremember,
    Jobindustry,
    Joblocation,
    Jobname,
    Job,
    Jobsquesresponse,
    Jobtype,
    Mentorcandidatemapping,
    Mentorquesresponse,
    Profileauditlog,
    Qaattribute,
    Questioncategory,
    Questionmapping,
    Questionnaire,
    Questionnaireanswer,
    Questiontarget,
    Questiontype,
    Report,
    Requesttoken,
    User,
    Userinfo,
    Usermetum,
    Userquesresponse,
    Userrole,
    Usertype,
  };
}
module.exports = initModels;
module.exports.initModels = initModels;
module.exports.default = initModels;
