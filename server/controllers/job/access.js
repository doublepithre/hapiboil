const { Op, Sequelize, QueryTypes, cast, literal } = require('sequelize');
const validator = require('validator');
import { camelizeKeys } from '../../utils/camelizeKeys'
import { sendEmailAsync } from '../../utils/email'
import formatQueryRes from '../../utils/index'
import { isArray } from 'lodash';
const axios = require('axios')
const moment = require('moment');
const config = require('config');
import { validateIsLoggedIn, validateIsNotLoggedIn } from '../../utils/authValidations';

const getJobAccessRecords = async (request, h) => {
  try {
    const authRes = validateIsLoggedIn(request, h);
     if(authRes.error) return h.response(authRes.response).code(authRes.code);
    

    const { credentials } = request.auth || {};
    const { id: userId } = credentials || {};
    // Checking user type from jwt
    let luserTypeName = request.auth.artifacts.decoded.userTypeName;
    if (luserTypeName !== 'employer') {
      return h.response({ error: true, message: 'You are not authorized!' }).code(403);
    }
    const { jobId } = request.params || {};
    const { Userinfo, Job, Jobhiremember } = request.getModels('xpaxr');

    // get the company of the luser recruiter
    const luserRecord = await Userinfo.findOne({ where: { userId }, attributes: { exclude: ['createdAt', 'updatedAt'] } });
    const luserProfileInfo = luserRecord && luserRecord.toJSON();
    const { companyId: recruiterCompanyId } = luserProfileInfo || {};

    const jobRecord = await Job.findOne({ where: { jobId } });
    const jobRecordInfo = jobRecord && jobRecord.toJSON();
    const { jobId: existingJobId, companyId: creatorCompanyId } = jobRecordInfo || {};
    if (!existingJobId) return h.response({ error: true, message: 'No job found' }).code(400);
    if (recruiterCompanyId !== creatorCompanyId) return h.response({ error: true, message: 'You are not authorized!' }).code(403);

    const luserAccessRecord = await Jobhiremember.findOne({ where: { jobId, userId } });
    const luserAccessInfo = luserAccessRecord && luserAccessRecord.toJSON();
    const { accessLevel } = luserAccessInfo || {};
    if (accessLevel !== 'creator' && accessLevel !== 'administrator') return h.response({ error: true, message: 'You are not authorized!' }).code(403);

    // find all access records (using SQL to avoid nested ugliness in the response)
    const db1 = request.getDb('xpaxr');
    const sqlStmt = `select ui.first_name, ui.email, jhm.*
              from hris.jobhiremember jhm
                inner join hris.userinfo ui on ui.user_id=jhm.user_id
                inner join hris.jobs j on j.job_id=jhm.job_id         
              where jhm.job_id=:jobId and j.is_deleted=false and ui.company_id=:recruiterCompanyId`;

    const sequelize = db1.sequelize;
    const allSQLAccessRecords = await sequelize.query(sqlStmt, {
      type: QueryTypes.SELECT,
      replacements: {
        jobId, recruiterCompanyId
      },
    });
    const accessRecords = camelizeKeys(allSQLAccessRecords);

    return h.response({ accessRecords: accessRecords }).code(200);
  }
  catch (error) {
    console.error(error.stack);
    return h.response({ error: true, message: 'Bad Request' }).code(400);
  }
}

const shareJob = async (request, h) => {
  try {
    const authRes = validateIsLoggedIn(request, h);
     if(authRes.error) return h.response(authRes.response).code(authRes.code);
    

    const { credentials } = request.auth || {};
    const { id: userId } = credentials || {};
    // Checking user type from jwt
    let luserTypeName = request.auth.artifacts.decoded.userTypeName;
    if (luserTypeName !== 'employer') {
      return h.response({ error: true, message: 'You are not authorized!' }).code(403);
    }

    const { jobId: rParamsJobId } = request.params || {};
    const { Job, Jobhiremember, Jobauditlog, Userinfo, Usertype } = request.getModels('xpaxr');

    // get the company of the recruiter
    const userRecord = await Userinfo.findOne({ where: { userId }, attributes: { exclude: ['createdAt', 'updatedAt'] } });
    const userProfileInfo = userRecord && userRecord.toJSON();
    const { companyId: recruiterCompanyId } = userProfileInfo || {};

    const jobRecord = await Job.findOne({ where: { jobId: rParamsJobId, isDeleted: false } });
    const jobRecordInfo = jobRecord && jobRecord.toJSON();
    const { jobId, companyId: creatorCompanyId } = jobRecordInfo || {};
    if (!jobId) return h.response({ error: true, message: 'No job found' }).code(400);

    if (recruiterCompanyId !== creatorCompanyId) {
      return h.response({ error: true, message: `You are not authorized` }).code(403);
    }

    // can (s)he share this job?
    const doIhaveAccessRecord = await Jobhiremember.findOne({ where: { jobId, userId } });
    const doIhaveAccessInfo = doIhaveAccessRecord && doIhaveAccessRecord.toJSON();
    const { accessLevel: luserAccessLevel } = doIhaveAccessInfo || {};

    if (luserAccessLevel !== 'creator' && luserAccessLevel !== 'administrator') return h.response({ error: true, message: 'You are not authorized!' }).code(403);

    // sharing job with fellow recruiter
    const { accessLevel, userId: fellowRecruiterId } = request.payload || {};
    if (!(accessLevel && fellowRecruiterId)) return h.response({ error: true, message: 'Please provide necessary details' }).code(400);

    const validAccessLevel = ['viewer', 'administrator'];
    const isValidAccessLevel = validAccessLevel.includes(accessLevel.toLowerCase());

    if (!isValidAccessLevel) return h.response({ error: true, message: 'Not a valid access level!' }).code(400);
    if (userId === fellowRecruiterId) return h.response({ error: true, message: 'Can not share with oneself!' }).code(400);

    // is he really a fellow recruiter
    const fellowUserRecord = await Userinfo.findOne({
      where: { userId: fellowRecruiterId },
      include: [{
        model: Usertype,
        as: "userType",
        required: true,
      }]
    });
    const fellowUserProfileInfo = fellowUserRecord && fellowUserRecord.toJSON();
    const { userType: fuserType, companyId: fuserCompanyId } = fellowUserProfileInfo || {};
    const { userTypeName: fuserTypeName } = fuserType || {};

    if (fuserTypeName !== 'employer') return h.response({ error: true, message: 'The fellow user is not an employer.' }).code(400);
    if (recruiterCompanyId !== fuserCompanyId) return h.response({ error: true, message: 'The fellow employer is not from the same company.' }).code(400);

    // is already shared with this fellow recruiter
    const alreadySharedRecord = await Jobhiremember.findOne({ where: { jobId, userId: fellowRecruiterId } });
    const alreadySharedInfo = alreadySharedRecord && alreadySharedRecord.toJSON();
    const { jobHireMemberId } = alreadySharedInfo || {};

    if (jobHireMemberId) return h.response({ error: true, message: 'Already shared with this user!' }).code(400);

    const accessRecord = await Jobhiremember.create({ accessLevel, userId: fellowRecruiterId, jobId });
    await Jobauditlog.create({
      affectedJobId: jobId,
      performerUserId: userId,
      actionName: 'Share a Job',
      actionType: 'CREATE',
      actionDescription: `The user of userId ${userId} has shared the job of jobId ${jobId} with the user of userId ${fellowRecruiterId}. The given access is ${accessLevel}`
    });

    return h.response(accessRecord).code(200);
  }
  catch (error) {
    console.error(error.stack);
    return h.response({ error: true, message: 'Bad Request' }).code(400);
  }
}

const updateSharedJob = async (request, h) => {
  try {
    const authRes = validateIsLoggedIn(request, h);
     if(authRes.error) return h.response(authRes.response).code(authRes.code);
    

    const { credentials } = request.auth || {};
    const { id: userId } = credentials || {};
    // Checking user type from jwt
    let luserTypeName = request.auth.artifacts.decoded.userTypeName;
    if (luserTypeName !== 'employer') {
      return h.response({ error: true, message: 'You are not authorized!' }).code(403);
    }
    const { jobId: rParamsJobId } = request.params || {};
    const { Job, Jobhiremember, Jobauditlog, Userinfo, Usertype } = request.getModels('xpaxr');

    // get the company of the recruiter
    const userRecord = await Userinfo.findOne({ where: { userId }, attributes: { exclude: ['createdAt', 'updatedAt'] } });
    const userProfileInfo = userRecord && userRecord.toJSON();
    const { companyId: recruiterCompanyId } = userProfileInfo || {};

    const existingJobRecord = await Job.findOne({ where: { jobId: rParamsJobId, isDeleted: false } });
    const existingJobInfo = existingJobRecord && existingJobRecord.toJSON();
    const { jobId, companyId: creatorCompanyId } = existingJobInfo || {};
    if (!jobId) return h.response({ error: true, message: `No job found` }).code(403);
    if (recruiterCompanyId !== creatorCompanyId) return h.response({ error: true, message: `You are not authorized` }).code(403);

    // does (s)he have access to do this?
    const doIhaveAccessRecord = await Jobhiremember.findOne({ where: { jobId, userId } });
    const doIhaveAccessInfo = doIhaveAccessRecord && doIhaveAccessRecord.toJSON();
    const { accessLevel: luserAccessLevel } = doIhaveAccessInfo || {};

    if (luserAccessLevel !== 'creator' && luserAccessLevel !== 'administrator') return h.response({ error: true, message: 'You are not authorized!' }).code(403);

    const { accessLevel, userId: fellowRecruiterId } = request.payload || {};
    if (!(accessLevel && fellowRecruiterId)) return h.response({ error: true, message: 'Please provide necessary details' }).code(400);
    const validAccessLevel = ['viewer', 'administrator'];
    const isValidAccessLevel = validAccessLevel.includes(accessLevel.toLowerCase());

    if (!isValidAccessLevel) return h.response({ error: true, message: 'Not a valid access level!' }).code(400);
    if (userId === fellowRecruiterId) return h.response({ error: true, message: 'Can not update this access record!' }).code(400);

    // is he really a fellow recruiter
    const fellowUserRecord = await Userinfo.findOne({
      where: { userId: fellowRecruiterId },
      include: [{
        model: Usertype,
        as: "userType",
        required: true,
      }]
    });
    const fellowUserProfileInfo = fellowUserRecord && fellowUserRecord.toJSON();
    const { userType: fuserType } = fellowUserProfileInfo || {};
    const { userTypeName: fuserTypeName } = fuserType || {};

    if (fuserTypeName !== 'employer') return h.response({ error: true, message: 'The fellow user is not an employer.' }).code(400);

    // is already shared with this fellow recruiter
    const alreadySharedRecord = await Jobhiremember.findOne({ where: { jobId, userId: fellowRecruiterId } });
    const alreadySharedInfo = alreadySharedRecord && alreadySharedRecord.toJSON();
    const { jobHireMemberId, accessLevel: oldAccessLevel } = alreadySharedInfo || {};

    if (!jobHireMemberId) return h.response({ error: true, message: 'Not shared the job with this user yet!' }).code(400);
    if (oldAccessLevel === 'creator') return h.response({ error: true, message: 'This record can not be updated!' }).code(400);
    if (oldAccessLevel === accessLevel) return h.response({ error: true, message: 'Already given this access to this user!' }).code(400);

    // update the shared job          
    await Jobhiremember.update({ accessLevel, userId: fellowRecruiterId, jobId }, { where: { jobId, userId: fellowRecruiterId } });
    await Jobauditlog.create({
      affectedJobId: jobId,
      performerUserId: userId,
      actionName: 'Update the Access of the Shared Job',
      actionType: 'UPDATE',
      actionDescription: `The user of userId ${userId} has updated the access of the shared job of jobId ${jobId} with the user of userId ${fellowRecruiterId}. Previous given access was ${oldAccessLevel}, Current given access is ${accessLevel}`
    });

    const updatedAccessRecord = await Jobhiremember.findOne({ where: { jobId, userId: fellowRecruiterId } });
    return h.response(updatedAccessRecord).code(200);
  }
  catch (error) {
    console.error(error.stack);
    return h.response({ error: true, message: 'Bad Request' }).code(400);
  }
}

const deleteJobAccessRecord = async (request, h) => {
  try {
    const authRes = validateIsLoggedIn(request, h);
     if(authRes.error) return h.response(authRes.response).code(authRes.code);
    

    const { credentials } = request.auth || {};
    const { id: userId } = credentials || {};
    // Checking user type from jwt
    let luserTypeName = request.auth.artifacts.decoded.userTypeName;
    if (luserTypeName !== 'employer') {
      return h.response({ error: true, message: 'You are not authorized!' }).code(403);
    }

    const { jobId: rParamsJobId } = request.params || {};
    const { Job, Jobhiremember, Jobauditlog, Userinfo } = request.getModels('xpaxr');

    // get the company of the recruiter
    const userRecord = await Userinfo.findOne({ where: { userId }, attributes: { exclude: ['createdAt', 'updatedAt'] } });
    const userProfileInfo = userRecord && userRecord.toJSON();
    const { companyId: recruiterCompanyId } = userProfileInfo || {};

    const jobRecord = await Job.findOne({ where: { jobId: rParamsJobId, isDeleted: false } });
    const jobRecordInfo = jobRecord && jobRecord.toJSON();
    const { jobId, companyId: creatorCompanyId } = jobRecordInfo || {};
    if (!jobId) return h.response({ error: true, message: 'No job found' }).code(400);

    if (recruiterCompanyId !== creatorCompanyId) return h.response({ error: true, message: `You are not authorized` }).code(403);

    // does (s)he have access to do this?
    const doIhaveAccessRecord = await Jobhiremember.findOne({ where: { jobId, userId } });
    const doIhaveAccessInfo = doIhaveAccessRecord && doIhaveAccessRecord.toJSON();
    const { accessLevel: luserAccessLevel } = doIhaveAccessInfo || {};

    if (luserAccessLevel !== 'creator' && luserAccessLevel !== 'administrator') return h.response({ error: true, message: 'You are not authorized!' }).code(403);

    const { userId: fellowRecruiterId } = request.payload || {};
    if (!fellowRecruiterId) return h.response({ error: true, message: 'Please provide necessary details' }).code(400);

    // is already shared with this fellow recruiter
    const alreadySharedRecord = await Jobhiremember.findOne({ where: { jobId, userId: fellowRecruiterId } });
    const alreadySharedInfo = alreadySharedRecord && alreadySharedRecord.toJSON();
    const { jobHireMemberId, accessLevel } = alreadySharedInfo || {};

    if (!jobHireMemberId) return h.response({ error: true, message: 'Not shared the job with this user yet!' }).code(400);
    if (accessLevel === 'creator') return h.response({ error: true, message: 'This record can not be deleted!' }).code(400);
    if (userId === fellowRecruiterId) return h.response({ error: true, message: 'This record can not be deleted!' }).code(400);

    // delete the shared job record
    await Jobhiremember.destroy({ where: { jobId, userId: fellowRecruiterId } });
    await Jobauditlog.create({
      affectedJobId: jobId,
      performerUserId: userId,
      actionName: 'Delete the Access of the Shared Job',
      actionType: 'DELETE',
      actionDescription: `The user of userId ${userId} has deleted the access of the shared job of jobId ${jobId} from the user of userId ${fellowRecruiterId}. Now it is unshared with that user`
    });

    return h.response({ message: 'Access record deleted' }).code(200);
  }
  catch (error) {
    console.error(error.stack);
    return h.response({ error: true, message: 'Bad Request' }).code(400);
  }
}

const getApplicationAccessRecords = async (request, h) => {
  try {
    const authRes = validateIsLoggedIn(request, h);
     if(authRes.error) return h.response(authRes.response).code(authRes.code);
    

    const { credentials } = request.auth || {};
    const { id: userId } = credentials || {};
    // Checking user type from jwt
    let luserTypeName = request.auth.artifacts.decoded.userTypeName;
    if (luserTypeName !== 'employer') {
      return h.response({ error: true, message: 'You are not authorized!' }).code(403);
    }
    const { applicationId } = request.params || {};
    const { Userinfo, Job, Jobapplication, Applicationhiremember } = request.getModels('xpaxr');

    // get the company of the luser recruiter
    const luserRecord = await Userinfo.findOne({ where: { userId }, attributes: { exclude: ['createdAt', 'updatedAt'] } });
    const luserProfileInfo = luserRecord && luserRecord.toJSON();
    const { companyId: luserCompanyId } = luserProfileInfo || {};

    // does the application really exist?
    const applicationRecord = await Jobapplication.findOne({ where: { applicationId } });
    const applicationRecordInfo = applicationRecord && applicationRecord.toJSON();
    const { applicationId: existingApplicationId, jobId: applicationJobId } = applicationRecordInfo || {};
    if (!existingApplicationId) return h.response({ error: true, message: 'No application found' }).code(400);

    // does the job really exist and is it from the same company?
    const jobRecord = await Job.findOne({ where: { jobId: applicationJobId, isDeleted: false } });
    const jobRecordInfo = jobRecord && jobRecord.toJSON();
    const { jobId: existingJobId, companyId: creatorCompanyId } = jobRecordInfo || {};
    if (!existingJobId) return h.response({ error: true, message: 'No job found' }).code(400);
    if (luserCompanyId !== creatorCompanyId) return h.response({ error: true, message: 'You are not authorized!' }).code(403);

    const luserAccessRecord = await Applicationhiremember.findOne({ where: { applicationId, userId } });
    const luserAccessInfo = luserAccessRecord && luserAccessRecord.toJSON();
    const { accessLevel } = luserAccessInfo || {};
    if (accessLevel !== 'jobcreator' && accessLevel !== 'administrator') return h.response({ error: true, message: 'You are not authorized!' }).code(403);

    // find all access records (using SQL to avoid nested ugliness in the response)
    const db1 = request.getDb('xpaxr');
    const sqlStmt = `select ui.first_name, ui.email, ahm.*
            from hris.applicationhiremember ahm
                inner join hris.userinfo ui on ui.user_id=ahm.user_id                
            where ahm.application_id=:applicationId and ui.company_id=:luserCompanyId`;

    const sequelize = db1.sequelize;
    const allSQLAccessRecords = await sequelize.query(sqlStmt, {
      type: QueryTypes.SELECT,
      replacements: {
        applicationId, luserCompanyId
      },
    });
    const accessRecords = camelizeKeys(allSQLAccessRecords);
    return h.response({ accessRecords }).code(200);
  }
  catch (error) {
    console.error(error.stack);
    return h.response({ error: true, message: 'Bad Request' }).code(400);
  }
}

const shareApplication = async (request, h) => {
  try {
    const authRes = validateIsLoggedIn(request, h);
     if(authRes.error) return h.response(authRes.response).code(authRes.code);
    

    const { credentials } = request.auth || {};
    const { id: userId } = credentials || {};
    // Checking user type from jwt
    let luserTypeName = request.auth.artifacts.decoded.userTypeName;
    if (luserTypeName !== 'employer') {
      return h.response({ error: true, message: 'You are not authorized!' }).code(403);
    }

    const { applicationId: rParamsApplicationId } = request.params || {};
    const { Job, Jobapplication, Applicationhiremember, Applicationauditlog, Userinfo, Usertype } = request.getModels('xpaxr');

    // get the company of the recruiter
    const userRecord = await Userinfo.findOne({ where: { userId }, attributes: { exclude: ['createdAt', 'updatedAt'] } });
    const userProfileInfo = userRecord && userRecord.toJSON();
    const { companyId: luserCompanyId } = userProfileInfo || {};

    const applicationRecord = await Jobapplication.findOne({ where: { applicationId: rParamsApplicationId, isWithdrawn: false } });
    const applicationRecordInfo = applicationRecord && applicationRecord.toJSON();
    const { applicationId, jobId: applicationJobId } = applicationRecordInfo || {};
    if (!applicationId) return h.response({ error: true, message: 'No application found' }).code(400);

    // does the job really exist and is it from the same company?
    const jobRecord = await Job.findOne({ where: { jobId: applicationJobId, isDeleted: false } });
    const jobRecordInfo = jobRecord && jobRecord.toJSON();
    const { jobId: existingJobId, companyId: creatorCompanyId } = jobRecordInfo || {};

    if (!existingJobId) return h.response({ error: true, message: 'No job found' }).code(400);
    if (luserCompanyId !== creatorCompanyId) return h.response({ error: true, message: 'You are not authorized!' }).code(403);

    // does (s)he have access to do this?
    const doIhaveAccessRecord = await Applicationhiremember.findOne({ where: { applicationId, userId } });
    const doIhaveAccessInfo = doIhaveAccessRecord && doIhaveAccessRecord.toJSON();
    const { accessLevel: luserAccessLevel } = doIhaveAccessInfo || {};

    if (luserAccessLevel !== 'jobcreator' && luserAccessLevel !== 'administrator') return h.response({ error: true, message: 'You are not authorized!' }).code(403);

    // sharing job with fellow recruiter
    const { accessLevel, userId: fellowRecruiterId } = request.payload || {};
    if (!(accessLevel && fellowRecruiterId)) return h.response({ error: true, message: 'Please provide necessary details' }).code(400);

    const validAccessLevel = ['viewer', 'administrator'];
    const isValidAccessLevel = validAccessLevel.includes(accessLevel.toLowerCase());

    if (!isValidAccessLevel) return h.response({ error: true, message: 'Not a valid access level!' }).code(400);
    if (userId === fellowRecruiterId) return h.response({ error: true, message: 'Can not share with oneself!' }).code(400);

    // is he really a fellow recruiter
    const fellowUserRecord = await Userinfo.findOne({
      where: { userId: fellowRecruiterId },
      include: [{
        model: Usertype,
        as: "userType",
        required: true,
      }]
    });
    const fellowUserProfileInfo = fellowUserRecord && fellowUserRecord.toJSON();
    const { userType: fuserType, companyId: fuserCompanyId } = fellowUserProfileInfo || {};
    const { userTypeName: fuserTypeName } = fuserType || {};

    if (fuserTypeName !== 'employer' && fuserTypeName !== 'supervisor' && fuserTypeName !== 'workbuddy') return h.response({ error: true, message: 'The fellow user is not an employer or supervisor or workbuddy.' }).code(400);
    if (accessLevel !== 'viewer' && (fuserTypeName === 'supervisor' || fuserTypeName === 'workbuddy')) return h.response({ error: true, message: 'The given access is not applicable for the supervisor/workbuddy.' }).code(400);
    if (luserCompanyId !== fuserCompanyId) return h.response({ error: true, message: `The fellow ${fuserTypeName} is not from the same company.` }).code(400);

    // is already shared with this fellow recruiter
    const alreadySharedRecord = await Applicationhiremember.findOne({ where: { applicationId, userId: fellowRecruiterId } });
    const alreadySharedInfo = alreadySharedRecord && alreadySharedRecord.toJSON();
    const { applicationHireMemberId } = alreadySharedInfo || {};

    if (applicationHireMemberId) return h.response({ error: true, message: 'Already shared with this user!' }).code(400);

    const accessRecord = await Applicationhiremember.create({ accessLevel, userId: fellowRecruiterId, applicationId, });
    await Applicationauditlog.create({
      affectedApplicationId: applicationId,
      performerUserId: userId,
      actionName: 'Share an Application',
      actionType: 'CREATE',
      actionDescription: `The user of userId ${userId} has shared the application of applicationId ${applicationId} with the user of userId ${fellowRecruiterId}. The given access is ${accessLevel}`
    });

    return h.response(accessRecord).code(200);
  }
  catch (error) {
    console.error(error.stack);
    return h.response({ error: true, message: 'Bad Request' }).code(400);
  }
}

const updateSharedApplication = async (request, h) => {
  try {
    const authRes = validateIsLoggedIn(request, h);
     if(authRes.error) return h.response(authRes.response).code(authRes.code);
    

    const { credentials } = request.auth || {};
    const { id: userId } = credentials || {};
    // Checking user type from jwt
    let luserTypeName = request.auth.artifacts.decoded.userTypeName;
    if (luserTypeName !== 'employer') {
      return h.response({ error: true, message: 'You are not authorized!' }).code(403);
    }

    const { applicationId: rParamsApplicationId } = request.params || {};
    const { Job, Jobapplication, Applicationhiremember, Applicationauditlog, Userinfo, Usertype } = request.getModels('xpaxr');

    // get the company of the recruiter
    const userRecord = await Userinfo.findOne({ where: { userId }, attributes: { exclude: ['createdAt', 'updatedAt'] } });
    const userProfileInfo = userRecord && userRecord.toJSON();
    const { companyId: luserCompanyId } = userProfileInfo || {};

    const applicationRecord = await Jobapplication.findOne({ where: { applicationId: rParamsApplicationId, isWithdrawn: false } });
    const applicationRecordInfo = applicationRecord && applicationRecord.toJSON();
    const { applicationId, jobId: applicationJobId } = applicationRecordInfo || {};
    if (!applicationId) return h.response({ error: true, message: 'No application found' }).code(400);

    // does the job really exist and is it from the same company?
    const jobRecord = await Job.findOne({ where: { jobId: applicationJobId, isDeleted: false } });
    const jobRecordInfo = jobRecord && jobRecord.toJSON();
    const { jobId, companyId: creatorCompanyId } = jobRecordInfo || {};

    if (!jobId) return h.response({ error: true, message: 'No job found' }).code(400);
    if (luserCompanyId !== creatorCompanyId) return h.response({ error: true, message: 'You are not authorized!' }).code(403);

    // does (s)he have access to do this?
    const doIhaveAccessRecord = await Applicationhiremember.findOne({ where: { applicationId, userId } });
    const doIhaveAccessInfo = doIhaveAccessRecord && doIhaveAccessRecord.toJSON();
    const { accessLevel: luserAccessLevel } = doIhaveAccessInfo || {};

    if (luserAccessLevel !== 'jobcreator' && luserAccessLevel !== 'administrator') return h.response({ error: true, message: 'You are not authorized!' }).code(403);

    // update the shared application access
    const { accessLevel, userId: fellowRecruiterId } = request.payload || {};
    if (!(accessLevel && fellowRecruiterId)) return h.response({ error: true, message: 'Please provide necessary details' }).code(400);
    const validAccessLevel = ['viewer', 'administrator'];
    const isValidAccessLevel = validAccessLevel.includes(accessLevel.toLowerCase());

    if (!isValidAccessLevel) return h.response({ error: true, message: 'Not a valid access level!' }).code(400);
    if (userId === fellowRecruiterId) return h.response({ error: true, message: 'Can not update your own access record!' }).code(400);

    // is he really a fellow recruiter
    const fellowUserRecord = await Userinfo.findOne({
      where: { userId: fellowRecruiterId },
      include: [{
        model: Usertype,
        as: "userType",
        required: true,
      }]
    });
    const fellowUserProfileInfo = fellowUserRecord && fellowUserRecord.toJSON();
    const { userType: fuserType, companyId: fuserCompanyId } = fellowUserProfileInfo || {};
    const { userTypeName: fuserTypeName } = fuserType || {};

    if (fuserTypeName !== 'employer' && fuserTypeName !== 'supervisor' && fuserTypeName !== 'workbuddy') return h.response({ error: true, message: 'The fellow user is not an employer or supervisor or workbuddy.' }).code(400);
    if (accessLevel !== 'viewer' && (fuserTypeName === 'supervisor' || fuserTypeName === 'workbuddy')) return h.response({ error: true, message: 'The given access is not applicable for the supervisor/workbuddy.' }).code(400);
    if (luserCompanyId !== fuserCompanyId) return h.response({ error: true, message: `The fellow ${fuserTypeName} is not from the same company.` }).code(400);

    // is already shared with this fellow recruiter
    const alreadySharedRecord = await Applicationhiremember.findOne({ where: { applicationId, userId: fellowRecruiterId } });
    const alreadySharedInfo = alreadySharedRecord && alreadySharedRecord.toJSON();
    const { applicationHireMemberId, accessLevel: oldAccessLevel, userId: accessLevelUserId } = alreadySharedInfo || {};

    if (!applicationHireMemberId) return h.response({ error: true, message: 'Not shared the job with this user yet!' }).code(400);
    if (oldAccessLevel === 'jobcreator') return h.response({ error: true, message: 'This record can not be updated!' }).code(400);
    if (userId === accessLevelUserId) return h.response({ error: true, message: 'Can not update your own access record!' }).code(400);
    if (oldAccessLevel === accessLevel) return h.response({ error: true, message: 'Already given this access to this user!' }).code(400);

    // update the shared job          
    await Applicationhiremember.update({ accessLevel }, { where: { applicationId, userId: fellowRecruiterId } });
    await Applicationauditlog.create({
      affectedApplicationId: applicationId,
      performerUserId: userId,
      actionName: 'Update the Access of the Shared Application',
      actionType: 'UPDATE',
      actionDescription: `The user of userId ${userId} has updated the access of the shared application of applicationId ${applicationId} with the user of userId ${fellowRecruiterId}. Previous given access was ${oldAccessLevel}, Current given access is ${accessLevel}`
    });

    const updatedAccessRecord = await Applicationhiremember.findOne({ where: { applicationId, userId: fellowRecruiterId } });
    return h.response(updatedAccessRecord).code(200);
  }
  catch (error) {
    console.error(error.stack);
    return h.response({ error: true, message: 'Bad Request' }).code(400);
  }
}

const deleteApplicationAccessRecord = async (request, h) => {
  try {
    const authRes = validateIsLoggedIn(request, h);
     if(authRes.error) return h.response(authRes.response).code(authRes.code);
    

    const { credentials } = request.auth || {};
    const { id: userId } = credentials || {};
    // Checking user type from jwt
    let luserTypeName = request.auth.artifacts.decoded.userTypeName;
    if (luserTypeName !== 'employer') {
      return h.response({ error: true, message: 'You are not authorized!' }).code(403);
    }

    const { applicationId: rParamsApplicationId } = request.params || {};
    const { Job, Jobapplication, Applicationhiremember, Applicationauditlog, Userinfo, Usertype } = request.getModels('xpaxr');

    // get the company of the recruiter
    const userRecord = await Userinfo.findOne({ where: { userId }, attributes: { exclude: ['createdAt', 'updatedAt'] } });
    const userProfileInfo = userRecord && userRecord.toJSON();
    const { companyId: luserCompanyId } = userProfileInfo || {};

    const applicationRecord = await Jobapplication.findOne({ where: { applicationId: rParamsApplicationId, isWithdrawn: false } });
    const applicationRecordInfo = applicationRecord && applicationRecord.toJSON();
    const { applicationId, jobId: applicationJobId } = applicationRecordInfo || {};
    if (!applicationId) return h.response({ error: true, message: 'No application found' }).code(400);

    // does the job really exist and is it from the same company?
    const jobRecord = await Job.findOne({ where: { jobId: applicationJobId, isDeleted: false } });
    const jobRecordInfo = jobRecord && jobRecord.toJSON();
    const { jobId, companyId: creatorCompanyId } = jobRecordInfo || {};

    if (!jobId) return h.response({ error: true, message: 'No job found' }).code(400);
    if (luserCompanyId !== creatorCompanyId) return h.response({ error: true, message: 'You are not authorized!' }).code(403);

    // does (s)he have access to do this?
    const doIhaveAccessRecord = await Applicationhiremember.findOne({ where: { applicationId, userId } });
    const doIhaveAccessInfo = doIhaveAccessRecord && doIhaveAccessRecord.toJSON();
    const { accessLevel: luserAccessLevel } = doIhaveAccessInfo || {};

    if (luserAccessLevel !== 'jobcreator' && luserAccessLevel !== 'administrator') return h.response({ error: true, message: 'You are not authorized!' }).code(403);

    const { userId: fellowRecruiterId } = request.payload || {};
    if (!fellowRecruiterId) return h.response({ error: true, message: 'Please provide necessary details' }).code(400);

    // is already shared with this fellow recruiter
    const alreadySharedRecord = await Applicationhiremember.findOne({ where: { applicationId, userId: fellowRecruiterId } });
    const alreadySharedInfo = alreadySharedRecord && alreadySharedRecord.toJSON();
    const { applicationHireMemberId, accessLevel, userId: accessLevelUserId } = alreadySharedInfo || {};

    if (!applicationHireMemberId) return h.response({ error: true, message: 'Not shared the job with this user yet!' }).code(400);
    if (accessLevel === 'jobcreator' || accessLevel === 'candidate') return h.response({ error: true, message: 'This record can not be deleted!' }).code(400);
    if (userId === accessLevelUserId) return h.response({ error: true, message: 'Can not delete your own access record!' }).code(400);

    // delete the shared job record
    await Applicationhiremember.destroy({ where: { applicationId, userId: fellowRecruiterId } });
    await Applicationauditlog.create({
      affectedApplicationId: applicationId,
      performerUserId: userId,
      actionName: 'Delete the Access of the Shared Application',
      actionType: 'DELETE',
      actionDescription: `The user of userId ${userId} has deleted the access of the shared application of applicationId ${applicationId} from the user of userId ${fellowRecruiterId}. Now it is unshared with that user`
    });
    return h.response({ message: 'Access record deleted' }).code(200);
  }
  catch (error) {
    console.error(error.stack);
    return h.response({ error: true, message: 'Bad Request' }).code(400);
  }
}

module.exports = {
  getJobAccessRecords,
  shareJob,
  updateSharedJob,
  deleteJobAccessRecord,

  getApplicationAccessRecords,
  shareApplication,
  updateSharedApplication,
  deleteApplicationAccessRecord,
}
