var DataTypes = require("sequelize").DataTypes;
var _Accesstoken = require("./accesstoken");
var _Applicationauditlog = require("./applicationauditlog");
var _Applicationhiremember = require("./applicationhiremember");
var _Attributeset = require("./attributeset");
var _AutismCategory = require("./autism_category");
var _Company = require("./company");
var _Companyauditlog = require("./companyauditlog");
var _Companyindustry = require("./companyindustry");
var _Companyinfo = require("./companyinfo");
var _Companysuperadminquesresponse = require("./companysuperadminquesresponse");
var _Companyvisit = require("./companyvisit");
var _Companyworkaccommodation = require("./companyworkaccommodation");
var _Country = require("./country");
var _Cronofy = require("./cronofy");
var _Cronofytoken = require("./cronofytoken");
var _Education = require("./education");
var _Emaillog = require("./emaillog");
var _Emailtemplate = require("./emailtemplate");
var _GenderCategory = require("./gender_category");
var _Jobapplication = require("./jobapplication");
var _Jobauditlog = require("./jobauditlog");
var _Jobfunction = require("./jobfunction");
var _Jobhiremember = require("./jobhiremember");
var _Jobindustry = require("./jobindustry");
var _Joblocation = require("./joblocation");
var _Jobname = require("./jobname");
var _Job = require("./job");
var _Jobskill = require("./jobskill");
var _Jobsquesresponse = require("./jobsquesresponse");
var _Jobsrecommendationlog = require("./jobsrecommendationlog");
var _Jobtype = require("./jobtype");
var _Jobvisit = require("./jobvisit");
var _Mentorcandidatemapping = require("./mentorcandidatemapping");
var _Mentorquesresponse = require("./mentorquesresponse");
var _Onboardingfixedtask = require("./onboardingfixedtask");
var _Onboarding = require("./onboarding");
var _Onboardingtask = require("./onboardingtask");
var _Profileauditlog = require("./profileauditlog");
var _Qaattribute = require("./qaattribute");
var _Questioncategory = require("./questioncategory");
var _Questionmapping = require("./questionmapping");
var _Questionnaire = require("./questionnaire");
var _Questionnaireanswer = require("./questionnaireanswer");
var _Questiontarget = require("./questiontarget");
var _Questiontype = require("./questiontype");
var _Recommendation = require("./recommendation");
var _Recommendationfeedback = require("./recommendationfeedback");
var _Recommendationmetric = require("./recommendationmetric");
var _Report = require("./report");
var _Reportfilter = require("./reportfilter");
var _Requesttoken = require("./requesttoken");
var _Resource = require("./resource");
var _Trainingcourse = require("./trainingcourse");
var _Trainingcourseaudience = require("./trainingcourseaudience");
var _Trainingcoursetopic = require("./trainingcoursetopic");
var _Trainingmode = require("./trainingmode");
var _Trainingtopic = require("./trainingtopic");
var _User = require("./user");
var _Usercompatibilitydatum = require("./usercompatibilitydatum");
var _Userdemographic = require("./userdemographic");
var _Userfeedback = require("./userfeedback");
var _Userinfo = require("./userinfo");
var _Usermetum = require("./usermetum");
var _Userquesresponse = require("./userquesresponse");
var _Userrecommendationlog = require("./userrecommendationlog");
var _Userrole = require("./userrole");
var _Usertrainingcourse = require("./usertrainingcourse");
var _Usertype = require("./usertype");
var _Workaccommodation = require("./workaccommodation");

function initModels(sequelize) {
  var Accesstoken = _Accesstoken(sequelize, DataTypes);
  var Applicationauditlog = _Applicationauditlog(sequelize, DataTypes);
  var Applicationhiremember = _Applicationhiremember(sequelize, DataTypes);
  var Attributeset = _Attributeset(sequelize, DataTypes);
  var AutismCategory = _AutismCategory(sequelize, DataTypes);
  var Company = _Company(sequelize, DataTypes);
  var Companyauditlog = _Companyauditlog(sequelize, DataTypes);
  var Companyindustry = _Companyindustry(sequelize, DataTypes);
  var Companyinfo = _Companyinfo(sequelize, DataTypes);
  var Companysuperadminquesresponse = _Companysuperadminquesresponse(sequelize, DataTypes);
  var Companyvisit = _Companyvisit(sequelize, DataTypes);
  var Companyworkaccommodation = _Companyworkaccommodation(sequelize, DataTypes);
  var Country = _Country(sequelize, DataTypes);
  var Cronofy = _Cronofy(sequelize, DataTypes);
  var Cronofytoken = _Cronofytoken(sequelize, DataTypes);
  var Education = _Education(sequelize, DataTypes);
  var Emaillog = _Emaillog(sequelize, DataTypes);
  var Emailtemplate = _Emailtemplate(sequelize, DataTypes);
  var GenderCategory = _GenderCategory(sequelize, DataTypes);
  var Jobapplication = _Jobapplication(sequelize, DataTypes);
  var Jobauditlog = _Jobauditlog(sequelize, DataTypes);
  var Jobfunction = _Jobfunction(sequelize, DataTypes);
  var Jobhiremember = _Jobhiremember(sequelize, DataTypes);
  var Jobindustry = _Jobindustry(sequelize, DataTypes);
  var Joblocation = _Joblocation(sequelize, DataTypes);
  var Jobname = _Jobname(sequelize, DataTypes);
  var Job = _Job(sequelize, DataTypes);
  var Jobskill = _Jobskill(sequelize, DataTypes);
  var Jobsquesresponse = _Jobsquesresponse(sequelize, DataTypes);
  var Jobsrecommendationlog = _Jobsrecommendationlog(sequelize, DataTypes);
  var Jobtype = _Jobtype(sequelize, DataTypes);
  var Jobvisit = _Jobvisit(sequelize, DataTypes);
  var Mentorcandidatemapping = _Mentorcandidatemapping(sequelize, DataTypes);
  var Mentorquesresponse = _Mentorquesresponse(sequelize, DataTypes);
  var Onboardingfixedtask = _Onboardingfixedtask(sequelize, DataTypes);
  var Onboarding = _Onboarding(sequelize, DataTypes);
  var Onboardingtask = _Onboardingtask(sequelize, DataTypes);
  var Profileauditlog = _Profileauditlog(sequelize, DataTypes);
  var Qaattribute = _Qaattribute(sequelize, DataTypes);
  var Questioncategory = _Questioncategory(sequelize, DataTypes);
  var Questionmapping = _Questionmapping(sequelize, DataTypes);
  var Questionnaire = _Questionnaire(sequelize, DataTypes);
  var Questionnaireanswer = _Questionnaireanswer(sequelize, DataTypes);
  var Questiontarget = _Questiontarget(sequelize, DataTypes);
  var Questiontype = _Questiontype(sequelize, DataTypes);
  var Recommendation = _Recommendation(sequelize, DataTypes);
  var Recommendationfeedback = _Recommendationfeedback(sequelize, DataTypes);
  var Recommendationmetric = _Recommendationmetric(sequelize, DataTypes);
  var Report = _Report(sequelize, DataTypes);
  var Reportfilter = _Reportfilter(sequelize, DataTypes);
  var Requesttoken = _Requesttoken(sequelize, DataTypes);
  var Resource = _Resource(sequelize, DataTypes);
  var Trainingcourse = _Trainingcourse(sequelize, DataTypes);
  var Trainingcourseaudience = _Trainingcourseaudience(sequelize, DataTypes);
  var Trainingcoursetopic = _Trainingcoursetopic(sequelize, DataTypes);
  var Trainingmode = _Trainingmode(sequelize, DataTypes);
  var Trainingtopic = _Trainingtopic(sequelize, DataTypes);
  var User = _User(sequelize, DataTypes);
  var Usercompatibilitydatum = _Usercompatibilitydatum(sequelize, DataTypes);
  var Userdemographic = _Userdemographic(sequelize, DataTypes);
  var Userfeedback = _Userfeedback(sequelize, DataTypes);
  var Userinfo = _Userinfo(sequelize, DataTypes);
  var Usermetum = _Usermetum(sequelize, DataTypes);
  var Userquesresponse = _Userquesresponse(sequelize, DataTypes);
  var Userrecommendationlog = _Userrecommendationlog(sequelize, DataTypes);
  var Userrole = _Userrole(sequelize, DataTypes);
  var Usertrainingcourse = _Usertrainingcourse(sequelize, DataTypes);
  var Usertype = _Usertype(sequelize, DataTypes);
  var Workaccommodation = _Workaccommodation(sequelize, DataTypes);

  Job.belongsToMany(Questionnaire, { through: Jobsquesresponse, foreignKey: "jobId", otherKey: "questionId" });
  Job.belongsToMany(Userinfo, { through: Jobhiremember, foreignKey: "jobId", otherKey: "userId" });
  Job.belongsToMany(Userinfo, { through: Recommendation, foreignKey: "jobId", otherKey: "userId" });
  Job.belongsToMany(Userinfo, { through: Recommendationfeedback, foreignKey: "jobId", otherKey: "userId" });
  Questionnaire.belongsToMany(Job, { through: Jobsquesresponse, foreignKey: "questionId", otherKey: "jobId" });
  Questionnaire.belongsToMany(Questionnaire, { through: Questionmapping, foreignKey: "empauwerAllQid", otherKey: "empauwerMeQid" });
  Questionnaire.belongsToMany(Questionnaire, { through: Questionmapping, foreignKey: "empauwerMeQid", otherKey: "empauwerAllQid" });
  Questionnaire.belongsToMany(Userinfo, { through: Companysuperadminquesresponse, foreignKey: "questionId", otherKey: "userId" });
  Questionnaire.belongsToMany(Userinfo, { through: Mentorquesresponse, foreignKey: "questionId", otherKey: "userId" });
  Questionnaire.belongsToMany(Userinfo, { through: Userquesresponse, foreignKey: "questionId", otherKey: "userId" });
  Trainingcourse.belongsToMany(Trainingtopic, { through: Trainingcoursetopic, foreignKey: "courseId", otherKey: "topicId" });
  Trainingcourse.belongsToMany(Userinfo, { through: Usertrainingcourse, foreignKey: "courseId", otherKey: "userId" });
  Trainingcourse.belongsToMany(Usertype, { through: Trainingcourseaudience, foreignKey: "courseId", otherKey: "audience" });
  Trainingtopic.belongsToMany(Trainingcourse, { through: Trainingcoursetopic, foreignKey: "topicId", otherKey: "courseId" });
  Userinfo.belongsToMany(Job, { through: Jobhiremember, foreignKey: "userId", otherKey: "jobId" });
  Userinfo.belongsToMany(Job, { through: Recommendation, foreignKey: "userId", otherKey: "jobId" });
  Userinfo.belongsToMany(Job, { through: Recommendationfeedback, foreignKey: "userId", otherKey: "jobId" });
  Userinfo.belongsToMany(Questionnaire, { through: Companysuperadminquesresponse, foreignKey: "userId", otherKey: "questionId" });
  Userinfo.belongsToMany(Questionnaire, { through: Mentorquesresponse, foreignKey: "userId", otherKey: "questionId" });
  Userinfo.belongsToMany(Questionnaire, { through: Userquesresponse, foreignKey: "userId", otherKey: "questionId" });
  Userinfo.belongsToMany(Trainingcourse, { through: Usertrainingcourse, foreignKey: "userId", otherKey: "courseId" });
  Usertype.belongsToMany(Trainingcourse, { through: Trainingcourseaudience, foreignKey: "audience", otherKey: "courseId" });
  Qaattribute.belongsTo(Attributeset, { as: "attribute", foreignKey: "attributeId"});
  Attributeset.hasMany(Qaattribute, { as: "qaattributes", foreignKey: "attributeId"});
  Reportfilter.belongsTo(Attributeset, { as: "attribute", foreignKey: "attributeId"});
  Attributeset.hasMany(Reportfilter, { as: "reportfilters", foreignKey: "attributeId"});
  Trainingtopic.belongsTo(Attributeset, { as: "attribute", foreignKey: "attributeId"});
  Attributeset.hasMany(Trainingtopic, { as: "trainingtopics", foreignKey: "attributeId"});
  Companyauditlog.belongsTo(Company, { as: "affectedCompany", foreignKey: "affectedCompanyId"});
  Company.hasMany(Companyauditlog, { as: "companyauditlogs", foreignKey: "affectedCompanyId"});
  Companyinfo.belongsTo(Company, { as: "company", foreignKey: "companyId"});
  Company.hasOne(Companyinfo, { as: "companyinfo", foreignKey: "companyId"});
  Companyvisit.belongsTo(Company, { as: "company", foreignKey: "companyId"});
  Company.hasMany(Companyvisit, { as: "companyvisits", foreignKey: "companyId"});
  Companyworkaccommodation.belongsTo(Company, { as: "company", foreignKey: "companyId"});
  Company.hasMany(Companyworkaccommodation, { as: "companyworkaccommodations", foreignKey: "companyId"});
  Onboarding.belongsTo(Company, { as: "company", foreignKey: "companyId"});
  Company.hasMany(Onboarding, { as: "onboardings", foreignKey: "companyId"});
  Userfeedback.belongsTo(Company, { as: "company", foreignKey: "companyId"});
  Company.hasMany(Userfeedback, { as: "userfeedbacks", foreignKey: "companyId"});
  Userinfo.belongsTo(Company, { as: "company", foreignKey: "companyId"});
  Company.hasMany(Userinfo, { as: "userinfos", foreignKey: "companyId"});
  Userinfo.belongsTo(Company, { as: "companyUu", foreignKey: "companyUuid"});
  Company.hasMany(Userinfo, { as: "companyUuUserinfos", foreignKey: "companyUuid"});
  Company.belongsTo(Companyindustry, { as: "companyIndustry", foreignKey: "companyIndustryId"});
  Companyindustry.hasMany(Company, { as: "companies", foreignKey: "companyIndustryId"});
  Company.belongsTo(Country, { as: "country", foreignKey: "countryId"});
  Country.hasMany(Company, { as: "companies", foreignKey: "countryId"});
  Resource.belongsTo(Country, { as: "country", foreignKey: "countryId"});
  Country.hasMany(Resource, { as: "resources", foreignKey: "countryId"});
  Applicationauditlog.belongsTo(Jobapplication, { as: "affectedApplication", foreignKey: "affectedApplicationId"});
  Jobapplication.hasMany(Applicationauditlog, { as: "applicationauditlogs", foreignKey: "affectedApplicationId"});
  Job.belongsTo(Jobfunction, { as: "jobFunction", foreignKey: "jobFunctionId"});
  Jobfunction.hasMany(Job, { as: "jobs", foreignKey: "jobFunctionId"});
  Userdemographic.belongsTo(Jobfunction, { as: "preferredJobFunctionJobfunction", foreignKey: "preferredJobFunction"});
  Jobfunction.hasMany(Userdemographic, { as: "userdemographics", foreignKey: "preferredJobFunction"});
  Job.belongsTo(Jobindustry, { as: "jobIndustry", foreignKey: "jobIndustryId"});
  Jobindustry.hasMany(Job, { as: "jobs", foreignKey: "jobIndustryId"});
  Userdemographic.belongsTo(Jobindustry, { as: "preferredJobIndustryJobindustry", foreignKey: "preferredJobIndustry"});
  Jobindustry.hasMany(Userdemographic, { as: "userdemographics", foreignKey: "preferredJobIndustry"});
  Job.belongsTo(Joblocation, { as: "jobLocation", foreignKey: "jobLocationId"});
  Joblocation.hasMany(Job, { as: "jobs", foreignKey: "jobLocationId"});
  Userdemographic.belongsTo(Joblocation, { as: "personLocationJoblocation", foreignKey: "personLocation"});
  Joblocation.hasMany(Userdemographic, { as: "userdemographics", foreignKey: "personLocation"});
  Userdemographic.belongsTo(Joblocation, { as: "preferredJobLocationJoblocation", foreignKey: "preferredJobLocation"});
  Joblocation.hasMany(Userdemographic, { as: "preferredJobLocationUserdemographics", foreignKey: "preferredJobLocation"});
  Job.belongsTo(Jobname, { as: "jobName", foreignKey: "jobNameId"});
  Jobname.hasMany(Job, { as: "jobs", foreignKey: "jobNameId"});
  Jobapplication.belongsTo(Job, { as: "job", foreignKey: "jobId"});
  Job.hasMany(Jobapplication, { as: "jobapplications", foreignKey: "jobId"});
  Jobauditlog.belongsTo(Job, { as: "affectedJob", foreignKey: "affectedJobId"});
  Job.hasMany(Jobauditlog, { as: "jobauditlogs", foreignKey: "affectedJobId"});
  Jobhiremember.belongsTo(Job, { as: "job", foreignKey: "jobId"});
  Job.hasMany(Jobhiremember, { as: "jobhiremembers", foreignKey: "jobId"});
  Jobsquesresponse.belongsTo(Job, { as: "job", foreignKey: "jobId"});
  Job.hasMany(Jobsquesresponse, { as: "jobsquesresponses", foreignKey: "jobId"});
  Jobsrecommendationlog.belongsTo(Job, { as: "job", foreignKey: "jobId"});
  Job.hasOne(Jobsrecommendationlog, { as: "jobsrecommendationlog", foreignKey: "jobId"});
  Jobvisit.belongsTo(Job, { as: "job", foreignKey: "jobId"});
  Job.hasMany(Jobvisit, { as: "jobvisits", foreignKey: "jobId"});
  Onboarding.belongsTo(Job, { as: "job", foreignKey: "jobId"});
  Job.hasMany(Onboarding, { as: "onboardings", foreignKey: "jobId"});
  Recommendation.belongsTo(Job, { as: "job", foreignKey: "jobId"});
  Job.hasMany(Recommendation, { as: "recommendations", foreignKey: "jobId"});
  Recommendationfeedback.belongsTo(Job, { as: "job", foreignKey: "jobId"});
  Job.hasMany(Recommendationfeedback, { as: "recommendationfeedbacks", foreignKey: "jobId"});
  Job.belongsTo(Jobtype, { as: "jobType", foreignKey: "jobTypeId"});
  Jobtype.hasMany(Job, { as: "jobs", foreignKey: "jobTypeId"});
  Userdemographic.belongsTo(Jobtype, { as: "preferredJobTypeJobtype", foreignKey: "preferredJobType"});
  Jobtype.hasMany(Userdemographic, { as: "userdemographics", foreignKey: "preferredJobType"});
  Onboardingtask.belongsTo(Onboardingfixedtask, { as: "task", foreignKey: "taskId"});
  Onboardingfixedtask.hasMany(Onboardingtask, { as: "onboardingtasks", foreignKey: "taskId"});
  Onboardingtask.belongsTo(Onboarding, { as: "onboarding", foreignKey: "onboardingId"});
  Onboarding.hasMany(Onboardingtask, { as: "onboardingtasks", foreignKey: "onboardingId"});
  Questionnaire.belongsTo(Questioncategory, { as: "questionCategory", foreignKey: "questionCategoryId"});
  Questioncategory.hasMany(Questionnaire, { as: "questionnaires", foreignKey: "questionCategoryId"});
  Companysuperadminquesresponse.belongsTo(Questionnaire, { as: "question", foreignKey: "questionId"});
  Questionnaire.hasMany(Companysuperadminquesresponse, { as: "companysuperadminquesresponses", foreignKey: "questionId"});
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
  Trainingcourseaudience.belongsTo(Trainingcourse, { as: "course", foreignKey: "courseId"});
  Trainingcourse.hasMany(Trainingcourseaudience, { as: "trainingcourseaudiences", foreignKey: "courseId"});
  Trainingcoursetopic.belongsTo(Trainingcourse, { as: "course", foreignKey: "courseId"});
  Trainingcourse.hasMany(Trainingcoursetopic, { as: "trainingcoursetopics", foreignKey: "courseId"});
  Usertrainingcourse.belongsTo(Trainingcourse, { as: "course", foreignKey: "courseId"});
  Trainingcourse.hasMany(Usertrainingcourse, { as: "usertrainingcourses", foreignKey: "courseId"});
  Trainingcourse.belongsTo(Trainingmode, { as: "mode", foreignKey: "modeId"});
  Trainingmode.hasMany(Trainingcourse, { as: "trainingcourses", foreignKey: "modeId"});
  Trainingcoursetopic.belongsTo(Trainingtopic, { as: "topic", foreignKey: "topicId"});
  Trainingtopic.hasMany(Trainingcoursetopic, { as: "trainingcoursetopics", foreignKey: "topicId"});
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
  Companysuperadminquesresponse.belongsTo(Userinfo, { as: "user", foreignKey: "userId"});
  Userinfo.hasMany(Companysuperadminquesresponse, { as: "companysuperadminquesresponses", foreignKey: "userId"});
  Companyvisit.belongsTo(Userinfo, { as: "visitor", foreignKey: "visitorId"});
  Userinfo.hasMany(Companyvisit, { as: "companyvisits", foreignKey: "visitorId"});
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
  Jobvisit.belongsTo(Userinfo, { as: "visitor", foreignKey: "visitorId"});
  Userinfo.hasMany(Jobvisit, { as: "jobvisits", foreignKey: "visitorId"});
  Mentorcandidatemapping.belongsTo(Userinfo, { as: "candidate", foreignKey: "candidateId"});
  Userinfo.hasMany(Mentorcandidatemapping, { as: "mentorcandidatemappings", foreignKey: "candidateId"});
  Mentorcandidatemapping.belongsTo(Userinfo, { as: "mentor", foreignKey: "mentorId"});
  Userinfo.hasMany(Mentorcandidatemapping, { as: "mentorMentorcandidatemappings", foreignKey: "mentorId"});
  Mentorquesresponse.belongsTo(Userinfo, { as: "user", foreignKey: "userId"});
  Userinfo.hasMany(Mentorquesresponse, { as: "mentorquesresponses", foreignKey: "userId"});
  Onboarding.belongsTo(Userinfo, { as: "onboardeeUserinfo", foreignKey: "onboardee"});
  Userinfo.hasMany(Onboarding, { as: "onboardings", foreignKey: "onboardee"});
  Onboarding.belongsTo(Userinfo, { as: "onboarderUserinfo", foreignKey: "onboarder"});
  Userinfo.hasMany(Onboarding, { as: "onboarderOnboardings", foreignKey: "onboarder"});
  Onboardingtask.belongsTo(Userinfo, { as: "asigneeUserinfo", foreignKey: "asignee"});
  Userinfo.hasMany(Onboardingtask, { as: "onboardingtasks", foreignKey: "asignee"});
  Profileauditlog.belongsTo(Userinfo, { as: "affectedUser", foreignKey: "affectedUserId"});
  Userinfo.hasMany(Profileauditlog, { as: "profileauditlogs", foreignKey: "affectedUserId"});
  Profileauditlog.belongsTo(Userinfo, { as: "performerUser", foreignKey: "performerUserId"});
  Userinfo.hasMany(Profileauditlog, { as: "performerUserProfileauditlogs", foreignKey: "performerUserId"});
  Questionnaire.belongsTo(Userinfo, { as: "createdByUserinfo", foreignKey: "createdBy"});
  Userinfo.hasMany(Questionnaire, { as: "questionnaires", foreignKey: "createdBy"});
  Recommendation.belongsTo(Userinfo, { as: "user", foreignKey: "userId"});
  Userinfo.hasMany(Recommendation, { as: "recommendations", foreignKey: "userId"});
  Recommendationfeedback.belongsTo(Userinfo, { as: "user", foreignKey: "userId"});
  Userinfo.hasMany(Recommendationfeedback, { as: "recommendationfeedbacks", foreignKey: "userId"});
  Usercompatibilitydatum.belongsTo(Userinfo, { as: "user", foreignKey: "userId"});
  Userinfo.hasOne(Usercompatibilitydatum, { as: "usercompatibilitydatum", foreignKey: "userId"});
  Userdemographic.belongsTo(Userinfo, { as: "user", foreignKey: "userId"});
  Userinfo.hasOne(Userdemographic, { as: "userdemographic", foreignKey: "userId"});
  Userfeedback.belongsTo(Userinfo, { as: "user", foreignKey: "userId"});
  Userinfo.hasMany(Userfeedback, { as: "userfeedbacks", foreignKey: "userId"});
  Usermetum.belongsTo(Userinfo, { as: "user", foreignKey: "userId"});
  Userinfo.hasMany(Usermetum, { as: "usermeta", foreignKey: "userId"});
  Userquesresponse.belongsTo(Userinfo, { as: "user", foreignKey: "userId"});
  Userinfo.hasMany(Userquesresponse, { as: "userquesresponses", foreignKey: "userId"});
  Userrecommendationlog.belongsTo(Userinfo, { as: "user", foreignKey: "userId"});
  Userinfo.hasOne(Userrecommendationlog, { as: "userrecommendationlog", foreignKey: "userId"});
  Usertrainingcourse.belongsTo(Userinfo, { as: "user", foreignKey: "userId"});
  Userinfo.hasMany(Usertrainingcourse, { as: "usertrainingcourses", foreignKey: "userId"});
  Userinfo.belongsTo(Userrole, { as: "role", foreignKey: "roleId"});
  Userrole.hasMany(Userinfo, { as: "userinfos", foreignKey: "roleId"});
  Trainingcourseaudience.belongsTo(Usertype, { as: "audienceUsertype", foreignKey: "audience"});
  Usertype.hasMany(Trainingcourseaudience, { as: "trainingcourseaudiences", foreignKey: "audience"});
  Userinfo.belongsTo(Usertype, { as: "userType", foreignKey: "userTypeId"});
  Usertype.hasMany(Userinfo, { as: "userinfos", foreignKey: "userTypeId"});
  Companyworkaccommodation.belongsTo(Workaccommodation, { as: "workaccommodation", foreignKey: "workaccommodationId"});
  Workaccommodation.hasMany(Companyworkaccommodation, { as: "companyworkaccommodations", foreignKey: "workaccommodationId"});

  return {
    Accesstoken,
    Applicationauditlog,
    Applicationhiremember,
    Attributeset,
    AutismCategory,
    Company,
    Companyauditlog,
    Companyindustry,
    Companyinfo,
    Companysuperadminquesresponse,
    Companyvisit,
    Companyworkaccommodation,
    Country,
    Cronofy,
    Cronofytoken,
    Education,
    Emaillog,
    Emailtemplate,
    GenderCategory,
    Jobapplication,
    Jobauditlog,
    Jobfunction,
    Jobhiremember,
    Jobindustry,
    Joblocation,
    Jobname,
    Job,
    Jobskill,
    Jobsquesresponse,
    Jobsrecommendationlog,
    Jobtype,
    Jobvisit,
    Mentorcandidatemapping,
    Mentorquesresponse,
    Onboardingfixedtask,
    Onboarding,
    Onboardingtask,
    Profileauditlog,
    Qaattribute,
    Questioncategory,
    Questionmapping,
    Questionnaire,
    Questionnaireanswer,
    Questiontarget,
    Questiontype,
    Recommendation,
    Recommendationfeedback,
    Recommendationmetric,
    Report,
    Reportfilter,
    Requesttoken,
    Resource,
    Trainingcourse,
    Trainingcourseaudience,
    Trainingcoursetopic,
    Trainingmode,
    Trainingtopic,
    User,
    Usercompatibilitydatum,
    Userdemographic,
    Userfeedback,
    Userinfo,
    Usermetum,
    Userquesresponse,
    Userrecommendationlog,
    Userrole,
    Usertrainingcourse,
    Usertype,
    Workaccommodation,
  };
}
module.exports = initModels;
module.exports.initModels = initModels;
module.exports.default = initModels;
