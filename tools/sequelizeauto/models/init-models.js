var DataTypes = require("sequelize").DataTypes;
var _Accesstoken = require("./accesstoken");
var _Attributeset = require("./attributeset");
var _Company = require("./company");
var _Companyinfo = require("./companyinfo");
var _Emaillog = require("./emaillog");
var _Emailtemplate = require("./emailtemplate");
var _Jobapplication = require("./jobapplication");
var _Job = require("./job");
var _Jobsquesresponse = require("./jobsquesresponse");
var _Qaattribute = require("./qaattribute");
var _Questioncategory = require("./questioncategory");
var _Questionmapping = require("./questionmapping");
var _Questionnaire = require("./questionnaire");
var _Questionnaireanswer = require("./questionnaireanswer");
var _Questiontarget = require("./questiontarget");
var _Questiontype = require("./questiontype");
var _Requesttoken = require("./requesttoken");
var _User = require("./user");
var _Userinfo = require("./userinfo");
var _Usermetum = require("./usermetum");
var _Userquesresponse = require("./userquesresponse");
var _Userrole = require("./userrole");
var _Usertype = require("./usertype");

function initModels(sequelize) {
  var Accesstoken = _Accesstoken(sequelize, DataTypes);
  var Attributeset = _Attributeset(sequelize, DataTypes);
  var Company = _Company(sequelize, DataTypes);
  var Companyinfo = _Companyinfo(sequelize, DataTypes);
  var Emaillog = _Emaillog(sequelize, DataTypes);
  var Emailtemplate = _Emailtemplate(sequelize, DataTypes);
  var Jobapplication = _Jobapplication(sequelize, DataTypes);
  var Job = _Job(sequelize, DataTypes);
  var Jobsquesresponse = _Jobsquesresponse(sequelize, DataTypes);
  var Qaattribute = _Qaattribute(sequelize, DataTypes);
  var Questioncategory = _Questioncategory(sequelize, DataTypes);
  var Questionmapping = _Questionmapping(sequelize, DataTypes);
  var Questionnaire = _Questionnaire(sequelize, DataTypes);
  var Questionnaireanswer = _Questionnaireanswer(sequelize, DataTypes);
  var Questiontarget = _Questiontarget(sequelize, DataTypes);
  var Questiontype = _Questiontype(sequelize, DataTypes);
  var Requesttoken = _Requesttoken(sequelize, DataTypes);
  var User = _User(sequelize, DataTypes);
  var Userinfo = _Userinfo(sequelize, DataTypes);
  var Usermetum = _Usermetum(sequelize, DataTypes);
  var Userquesresponse = _Userquesresponse(sequelize, DataTypes);
  var Userrole = _Userrole(sequelize, DataTypes);
  var Usertype = _Usertype(sequelize, DataTypes);

  Questionnaire.belongsToMany(Questionnaire, { through: Questionmapping, foreignKey: "empauwerAllQid", otherKey: "empauwerMeQid" });
  Questionnaire.belongsToMany(Questionnaire, { through: Questionmapping, foreignKey: "empauwerMeQid", otherKey: "empauwerAllQid" });
  Questionnaire.belongsToMany(Userinfo, { through: Userquesresponse, foreignKey: "questionId", otherKey: "userId" });
  Userinfo.belongsToMany(Questionnaire, { through: Userquesresponse, foreignKey: "userId", otherKey: "questionId" });
  Qaattribute.belongsTo(Attributeset, { as: "attribute", foreignKey: "attributeId"});
  Attributeset.hasMany(Qaattribute, { as: "qaattributes", foreignKey: "attributeId"});
  Companyinfo.belongsTo(Company, { as: "company", foreignKey: "companyId"});
  Company.hasOne(Companyinfo, { as: "companyinfo", foreignKey: "companyId"});
  Userinfo.belongsTo(Company, { as: "company", foreignKey: "companyId"});
  Company.hasMany(Userinfo, { as: "userinfos", foreignKey: "companyId"});
  Userinfo.belongsTo(Company, { as: "companyUu", foreignKey: "companyUuid"});
  Company.hasMany(Userinfo, { as: "companyUuUserinfos", foreignKey: "companyUuid"});
  Jobapplication.belongsTo(Job, { as: "job", foreignKey: "jobId"});
  Job.hasMany(Jobapplication, { as: "jobapplications", foreignKey: "jobId"});
  Jobsquesresponse.belongsTo(Job, { as: "job", foreignKey: "jobId"});
  Job.hasMany(Jobsquesresponse, { as: "jobsquesresponses", foreignKey: "jobId"});
  Questionnaire.belongsTo(Questioncategory, { as: "questionCategory", foreignKey: "questionCategoryId"});
  Questioncategory.hasMany(Questionnaire, { as: "questionnaires", foreignKey: "questionCategoryId"});
  Questionmapping.belongsTo(Questionnaire, { as: "empauwerAllQ", foreignKey: "empauwerAllQid"});
  Questionnaire.hasMany(Questionmapping, { as: "questionmappings", foreignKey: "empauwerAllQid"});
  Questionmapping.belongsTo(Questionnaire, { as: "empauwerMeQ", foreignKey: "empauwerMeQid"});
  Questionnaire.hasMany(Questionmapping, { as: "empauwerMeQQuestionmappings", foreignKey: "empauwerMeQid"});
  Questionnaireanswer.belongsTo(Questionnaire, { as: "question", foreignKey: "questionId"});
  Questionnaire.hasMany(Questionnaireanswer, { as: "questionnaireanswers", foreignKey: "questionId"});
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
  Questionnaire.belongsTo(Userinfo, { as: "createdByUserinfo", foreignKey: "createdBy"});
  Userinfo.hasMany(Questionnaire, { as: "questionnaires", foreignKey: "createdBy"});
  Usermetum.belongsTo(Userinfo, { as: "user", foreignKey: "userId"});
  Userinfo.hasMany(Usermetum, { as: "usermeta", foreignKey: "userId"});
  Userquesresponse.belongsTo(Userinfo, { as: "user", foreignKey: "userId"});
  Userinfo.hasMany(Userquesresponse, { as: "userquesresponses", foreignKey: "userId"});
  Userinfo.belongsTo(Usertype, { as: "userType", foreignKey: "userTypeId"});
  Usertype.hasMany(Userinfo, { as: "userinfos", foreignKey: "userTypeId"});

  return {
    Accesstoken,
    Attributeset,
    Company,
    Companyinfo,
    Emaillog,
    Emailtemplate,
    Jobapplication,
    Job,
    Jobsquesresponse,
    Qaattribute,
    Questioncategory,
    Questionmapping,
    Questionnaire,
    Questionnaireanswer,
    Questiontarget,
    Questiontype,
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
