const { Op, Sequelize, QueryTypes, cast, literal } = require('sequelize');
const validator = require('validator');
import { camelizeKeys } from '../../utils/camelizeKeys'
import { sendEmailAsync } from '../../utils/email'
import formatQueryRes from '../../utils/index'
import { isArray } from 'lodash';
import { validateIsLoggedIn } from '../../utils/authValidations';
const axios = require('axios')
const moment = require('moment');
const config = require('config');

const applyToJob = async (request, h) => {
  try {
    const authRes = validateIsLoggedIn(request, h);
     if(authRes.error) return h.response(authRes.response).code(authRes.code);
    
    
    let luserTypeName = request.auth.artifacts.decoded.userTypeName;
    if (luserTypeName !== 'candidate') {
      return h.response({ error: true, message: 'You are not authorized!' }).code(403);
    }

    // Candidate should not be allowed to modify status
    const { jobId } = request.payload || {};
    if (!jobId) {
      return h.response({ error: true, message: 'Please provide a jobId!' }).code(400);
    }

    const { credentials } = request.auth || {};
    const { id: userId } = credentials || {};

    const record = { jobId, userId, isApplied: true, isWithdrawn: false, status: "applied", updatedAt: new Date() }
    const { Companyinfo, Userinfo, Jobapplication, Applicationhiremember, Applicationauditlog, Emailtemplate, Emaillog } = request.getModels('xpaxr');

    // candidate details
    const luserRecord = await Userinfo.findOne({ where: { userId } });
    const luserInfo = luserRecord && luserRecord.toJSON();
    const { firstName: luserFirstName, email: luserEmail } = luserInfo || {};

    // Job Details
    const db1 = request.getDb('xpaxr');
    const getJobDetailsSqlStmt = `select
                j.job_id, jn.job_name, j.close_date,
                c.display_name as company_name, j.company_Id,
                j.user_id
            from hris.jobs j
                inner join hris.jobname jn on jn.job_name_id=j.job_name_id
                inner join hris.company c on c.company_id=j.company_id
            where j.job_id=:jobId and j.is_deleted=false`;

    const sequelize = db1.sequelize;
    const appliedJobDetailsRAW = await sequelize.query(getJobDetailsSqlStmt, {
      type: QueryTypes.SELECT,
      replacements: {
        jobId
      },
    });
    const appliedJobDetails = camelizeKeys(appliedJobDetailsRAW)[0];
    const { jobId: jobIdinTheDB, userId: employerId, companyId: creatorCompanyId, closeDate: jobCloseDate } = appliedJobDetails || {};

    if (!jobIdinTheDB) return h.response({ error: true, message: 'No job found!' }).code(400);
    if (jobCloseDate < new Date()) return h.response({ error: true, message: 'This job is no longer accepting any applicants!' }).code(400);

    const alreadyAppliedRecord = await Jobapplication.findOne({ where: { jobId, userId, isApplied: true } });
    const { applicationId: alreadyAppliedApplicationId } = alreadyAppliedRecord || {};
    if (alreadyAppliedApplicationId) return h.response({ error: true, message: 'Already applied!' }).code(400);

    const [recordRes] = await Jobapplication.upsert(record);
    const recordResponse = recordRes && recordRes.toJSON();
    const { applicationId } = recordRes;

    await Promise.all([
      Applicationhiremember.create({ applicationId, userId, accessLevel: 'candidate', }),
      Applicationhiremember.create({ applicationId, userId: employerId, accessLevel: 'jobcreator', }),
      Applicationauditlog.create({
        affectedApplicationId: applicationId,
        performerUserId: userId,
        actionName: 'Apply to a Job',
        actionType: 'CREATE',
        actionDescription: `The user of userId ${userId} has applied to the job of jobId ${jobId}`
      })
    ]);

    // get creator if still exists or else get the earliest administrator firstName
    const getJobCreatorSqlStmt = `select 
                jhm.access_level, ui.active, ui.first_name
            from hris.jobhiremember jhm
                inner join hris.userinfo ui on jhm.user_id=ui.user_id
            where jhm.access_level='creator' and ui.active=true
                and jhm.job_id=:jobId`;

    const creatorRAW = await sequelize.query(getJobCreatorSqlStmt, {
      type: QueryTypes.SELECT,
      replacements: {
        jobId
      },
    });

    // get administrators
    const getAdministratorsSqlStmt = `select 
                jhm.access_level, ui.active, ui.first_name
            from hris.jobhiremember jhm
                inner join hris.userinfo ui on jhm.user_id=ui.user_id
            where jhm.access_level='administrator' and ui.active=true
                and jhm.job_id=34
            order by jhm.created_at asc`;

    const administratorsRAW = await sequelize.query(getAdministratorsSqlStmt, {
      type: QueryTypes.SELECT,
      replacements: {
        jobId
      },
    });

    const creatorRecord = camelizeKeys(creatorRAW)[0];
    const { firstName: jobCreatorFirstName } = creatorRecord || {};

    const earliestAdministratorRecord = camelizeKeys(administratorsRAW)[0];
    const { firstName: earliestAdministratorFirstName } = earliestAdministratorRecord || {};

    const recruiterFirstName = jobCreatorFirstName || earliestAdministratorFirstName;

    // ----------------start of sending emails        
    const customTemplateRecord = await Emailtemplate.findOne({ where: { templateName: `application-applied-email`, isDefaultTemplate: false, companyId: creatorCompanyId, status: 'active' } })
    const customTemplateInfo = customTemplateRecord && customTemplateRecord.toJSON();
    const { id: customTemplateId, ownerId: cTemplateOwnerId } = customTemplateInfo || {};
    const templateName = `application-applied-email`;
    const ownerId = customTemplateId ? cTemplateOwnerId : null;
    const isX0PATemplate = customTemplateId ? false : true;

    const emailData = {
      emails: [luserEmail],
      email: luserEmail,
      ccEmails: [],
      templateName,
      ownerId,
      isX0PATemplate,

      companyName: appliedJobDetails.companyName,
      candidateFirstName: luserFirstName,
      recruiterFirstName,
      jobName: appliedJobDetails.jobName,
    };

    const additionalEData = {
      userId: employerId,
      Emailtemplate,
      Userinfo,
      Companyinfo,
      Emaillog,
    };
    sendEmailAsync(emailData, additionalEData);
    // ----------------end of sending emails      

    delete recordResponse.createdAt;
    delete recordResponse.updatedAt;
    delete recordResponse.userId;
    return h.response(recordResponse).code(200);
  }
  catch (error) {
    console.error(error.stack);
    return h.response({ error: true, message: 'Bad Request' }).code(400);
  }
}

const getAppliedJobs = async (request, h) => {
  try {
    const authRes = validateIsLoggedIn(request, h);
     if(authRes.error) return h.response(authRes.response).code(authRes.code);
    
    
    let luserTypeName = request.auth.artifacts.decoded.userTypeName;
    if (luserTypeName !== 'candidate') {
      return h.response({ error: true, message: 'You are not authorized!' }).code(403);
    }

    const { credentials } = request.auth || {};
    const { id: userId } = credentials || {};

    const { limit, offset, sort, search, status, startDate, endDate, exclude } = request.query;
    const searchVal = `%${search ? search.toLowerCase() : ''}%`;

    // Checking if application status is valid
    const validStatus = ['applied', 'withdrawn', 'shortlisted', 'interview', 'closed', 'offer', 'hired'];
    const isStatusReqValid = (status && isArray(status)) ? (
      status.every(req => validStatus.includes(req))
    ) : validStatus.includes(status);
    if (status && !isStatusReqValid) return h.response({ error: true, message: 'Invalid status query parameter!' }).code(400);

    const isExcludeReqValid = (exclude && isArray(exclude)) ? (
      exclude.every(req => validStatus.includes(req))
    ) : validStatus.includes(exclude);
    if (exclude && !isExcludeReqValid) return h.response({ error: true, message: 'Invalid exclude query parameter!' }).code(400);

    // sort query
    let [sortBy, sortType] = sort ? sort.split(':') : ['created_at', 'desc'];
    if (!sortType && sortBy !== 'created_at') sortType = 'asc';
    if (!sortType && sortBy === 'created_at') sortType = 'desc';

    const validSorts = ['status', 'created_at', 'job_name', 'last_status_updated'];
    const isSortReqValid = validSorts.includes(sortBy);

    const validSortTypes = ['asc', 'desc'];
    const isSortTypeReqValid = validSortTypes.includes(sortType.toLowerCase());

    // pagination
    const limitNum = limit ? Number(limit) : 10;
    const offsetNum = offset ? Number(offset) : 0;

    // query validation
    if (isNaN(limitNum)) return h.response({ error: true, message: 'Invalid limit query parameter! The limit query parameter must be a number!' }).code(400);
    if (isNaN(offsetNum)) return h.response({ error: true, message: 'Invalid offset query parameter! The offset query parameter must be a number!' }).code(400);

    if (!sortBy || !isSortReqValid) return h.response({ error: true, message: 'Invalid sort query parameter!' }).code(400);
    if (!isSortTypeReqValid) return h.response({ error: true, message: 'Invalid sort query parameter! Sort type is invalid, it should be either "asc" or "desc"!' }).code(400);

    if (limitNum < 0) return h.response({ error: true, message: 'Limit must be greater than 0!' }).code(400);
    if (limitNum > 100) return h.response({ error: true, message: 'Limit must not exceed 100!' }).code(400);

    // custom date search query
    let lowerDateRange;
    let upperDateRange;
    if (!startDate && endDate) return h.response({ error: true, message: `You can't send endDate without startDate!` }).code(400);

    if (startDate) {
      if (startDate && !endDate) {
        lowerDateRange = new Date(startDate);
        upperDateRange = new Date(); //Now()
      }
      if (startDate && endDate) {
        lowerDateRange = new Date(startDate);
        upperDateRange = new Date(endDate);
      }

      const isValidDate = !isNaN(Date.parse(lowerDateRange)) && !isNaN(Date.parse(upperDateRange));
      if (!isValidDate) return h.response({ error: true, message: 'Unvalid createDate query!' }).code(400);
      const isValidDateRange = lowerDateRange.getTime() < upperDateRange.getTime();
      if (!isValidDateRange) return h.response({ error: true, message: 'endDate must be after startDate!' }).code(400);
    }

    const db1 = request.getDb('xpaxr');

    // get sql statement for getting jobs or jobs count
    const filters = { startDate, search, sortBy, sortType, status, exclude };
    function getSqlStmt(queryType, obj = filters) {
      const { startDate, search, sortBy, sortType, status, exclude } = obj;
      let sqlStmt;
      const type = queryType && queryType.toLowerCase();
      if (type === 'count') {
        sqlStmt = `select count(*)`;
      } else {
        sqlStmt = `select  
                    ja.application_id, ja.job_id, ja.user_id as applicant_id, ja.is_applied, ja.is_withdrawn, ja.status,
                    ja.created_at as application_date,
                    jn.job_name, jt.job_type_name, ji.job_industry_name, jf.job_function_name, jl.job_location_name, j.*, j.user_id as creator_id,
                    c.display_name as company_name`;
      }

      sqlStmt += `                    
            from hris.jobapplications ja
                inner join hris.jobs j on j.job_id=ja.job_id
                inner join hris.company c on c.company_id=j.company_id
                inner join hris.jobname jn on jn.job_name_id=j.job_name_id
                inner join hris.jobtype jt on jt.job_type_id=j.job_type_id
                inner join hris.jobindustry ji on ji.job_industry_id=j.job_industry_id
                inner join hris.jobfunction jf on jf.job_function_id=j.job_function_id
                inner join hris.joblocation jl on jl.job_location_id=j.job_location_id            
            where ja.user_id=:userId and j.is_deleted=false`;

      if (startDate) sqlStmt += ` and ja.created_at >= :lowerDateRange and ja.created_at <= :upperDateRange`;
      // filters
      if (exclude) {
        sqlStmt += isArray(exclude) ? ` and not ja.status in (:exclude)` : ` and not ja.status=:exclude`;
      }
      if (status) {
        sqlStmt += isArray(status) ? ` and ja.status in (:status)` : ` and ja.status=:status`;
      }
      // search
      if (search) {
        sqlStmt += ` and (
                    jn.job_name ilike :searchVal
                    or c.company_name ilike :searchVal
                )`;
      };

      if (type !== 'count') {
        // sorts
        if (sortBy === 'job_name') {
          sqlStmt += ` order by jn.${sortBy} ${sortType}`;
        } else if (sortBy === 'last_status_updated') {
          sqlStmt += ` order by ja.updated_at ${sortType}`;
        } else {
          sqlStmt += ` order by ja.${sortBy} ${sortType}`;
        }
        // limit and offset
        sqlStmt += ` limit :limitNum  offset :offsetNum`
      };

      return sqlStmt;
    }

    const sequelize = db1.sequelize;
    const allSQLAppliedJobs = await sequelize.query(getSqlStmt(), {
      type: QueryTypes.SELECT,
      replacements: {
        userId,
        sortBy, sortType, limitNum, offsetNum,
        searchVal,
        status, exclude,
        lowerDateRange, upperDateRange,
      },
    });
    const allSQLAppliedJobsCount = await sequelize.query(getSqlStmt('count'), {
      type: QueryTypes.SELECT,
      replacements: {
        userId,
        sortBy, sortType, limitNum, offsetNum,
        searchVal,
        status, exclude,
        lowerDateRange, upperDateRange,
      },
    });
    const allAppliedJobs = camelizeKeys(allSQLAppliedJobs);

    const paginatedResponse = { count: allSQLAppliedJobsCount[0].count, appliedJobs: allAppliedJobs }
    return h.response(paginatedResponse).code(200);
  }
  catch (error) {
    console.error(error.stack);
    return h.response({ error: true, message: 'Internal Server Error!' }).code(500);
  }
}

const withdrawFromAppliedJob = async (request, h) => {
  try {
    const authRes = validateIsLoggedIn(request, h);
     if(authRes.error) return h.response(authRes.response).code(authRes.code);
    
    
    let luserTypeName = request.auth.artifacts.decoded.userTypeName;
    if (luserTypeName !== 'candidate') {
      return h.response({ error: true, message: 'You are not authorized!' }).code(403);
    }

    const { jobId } = request.payload || {};
    if (!jobId) {
      return h.response({ error: true, message: 'Please provide a jobId!' }).code(400);
    }

    const { credentials } = request.auth || {};
    const { id: luserId } = credentials || {};

    const { Userinfo, Companyinfo, Job, Jobapplication, Applicationauditlog, Emailtemplate, Emaillog } = request.getModels('xpaxr');
    const rApplicationRecord = await Jobapplication.findOne({ where: { jobId: jobId, userId: luserId } });
    const rApplicationInfo = rApplicationRecord && rApplicationRecord.toJSON();
    const { applicationId, jobId: applicationJobId, isWithdrawn: isAlreadyWithdrawn } = rApplicationInfo || {};

    if (!applicationId) return h.response({ error: true, message: 'No applied job found!' }).code(400);

    const existingJobRecord = await Job.findOne({ where: { jobId: applicationJobId, isDeleted: false } });
    const existingJobInfo = existingJobRecord && existingJobRecord.toJSON();
    const { jobId: existingJobId } = existingJobInfo || {};

    if (!existingJobId) return h.response({ error: true, message: 'No job found!' }).code(400);
    if (isAlreadyWithdrawn) return h.response({ error: true, message: 'Already withdrawn!' }).code(400);

    // candidate details
    const luserRecord = await Userinfo.findOne({ where: { userId: luserId } });
    const luserInfo = luserRecord && luserRecord.toJSON();
    const { firstName: luserFirstName, email: luserEmail } = luserInfo || {};


    await Jobapplication.update({ isWithdrawn: true, status: 'withdrawn', updatedAt: new Date() }, { where: { applicationId: applicationId } });
    await Applicationauditlog.create({
      affectedApplicationId: applicationId,
      performerUserId: luserId,
      actionName: 'Withdraw from a Job',
      actionType: 'UPDATE',
      actionDescription: `The user of userId ${luserId} has withdrawn from the job of jobId ${jobId}`
    });

    const db1 = request.getDb('xpaxr');
    const updatedApplicationDataSqlStmt = `select  
                c.display_name as company_name,
                ja.application_id, ja.job_id, ja.user_id as applicant_id, ja.is_applied, ja.is_withdrawn, ja.status,
                jn.job_name, jt.job_type_name, ji.job_industry_name, jf.job_function_name, jl.job_location_name, j.*, j.user_id as creator_id
            from hris.jobapplications ja
                inner join hris.jobs j on j.job_id=ja.job_id
                inner join hris.jobname jn on jn.job_name_id=j.job_name_id                
				inner join  hris.company c on c.company_id=j.company_id
                                
                inner join hris.jobtype jt on jt.job_type_id=j.job_type_id
                inner join hris.jobindustry ji on ji.job_industry_id=j.job_industry_id
                inner join hris.jobfunction jf on jf.job_function_id=j.job_function_id
                inner join hris.joblocation jl on jl.job_location_id=j.job_location_id
            where ja.application_id=:applicationId and j.is_deleted=false`;

    const sequelize = db1.sequelize;
    const updatedApplicationDataRAW = await sequelize.query(updatedApplicationDataSqlStmt, {
      type: QueryTypes.SELECT,
      replacements: { applicationId },
    });
    const updatedApplicationData = camelizeKeys(updatedApplicationDataRAW)[0];

    // get creator if still exists or else get the earliest administrator firstName
    const getJobCreatorSqlStmt = `select 
                jhm.access_level, ui.active, ui.first_name, ui.user_id
            from hris.jobhiremember jhm
                inner join hris.userinfo ui on jhm.user_id=ui.user_id
            where jhm.access_level='creator' and ui.active=true
                and jhm.job_id=:jobId`;

    const creatorRAW = await sequelize.query(getJobCreatorSqlStmt, {
      type: QueryTypes.SELECT,
      replacements: {
        jobId
      },
    });

    // get administrators
    const getAdministratorsSqlStmt = `select 
                jhm.access_level, ui.active, ui.first_name, ui.user_id
            from hris.jobhiremember jhm
                inner join hris.userinfo ui on jhm.user_id=ui.user_id
            where jhm.access_level='administrator' and ui.active=true
                and jhm.job_id=34
            order by jhm.created_at asc`;

    const administratorsRAW = await sequelize.query(getAdministratorsSqlStmt, {
      type: QueryTypes.SELECT,
      replacements: {
        jobId
      },
    });

    const creatorRecord = camelizeKeys(creatorRAW)[0];
    const { firstName: jobCreatorFirstName, userId: creatorId } = creatorRecord || {};

    const earliestAdministratorRecord = camelizeKeys(administratorsRAW)[0];
    const { firstName: earliestAdministratorFirstName, userId: administratorId } = earliestAdministratorRecord || {};

    const recruiterFirstName = jobCreatorFirstName || earliestAdministratorFirstName;
    const employerId = creatorId || administratorId;

    // ----------------start of sending emails
    const customTemplateRecord = await Emailtemplate.findOne({ where: { templateName: `application-withdrawn-email`, isDefaultTemplate: false, companyId: updatedApplicationData.companyId, status: 'active' } })
    const customTemplateInfo = customTemplateRecord && customTemplateRecord.toJSON();
    const { id: customTemplateId, ownerId: cTemplateOwnerId } = customTemplateInfo || {};
    const templateName = `application-withdrawn-email`;
    const ownerId = customTemplateId ? cTemplateOwnerId : null;
    const isX0PATemplate = customTemplateId ? false : true;

    const emailData = {
      emails: [luserEmail],
      email: luserEmail,
      ccEmails: [],
      templateName,
      ownerId,
      isX0PATemplate,

      companyName: updatedApplicationData.companyName,
      candidateFirstName: luserFirstName,
      recruiterFirstName: recruiterFirstName,
      jobName: updatedApplicationData.jobName,
    };

    const additionalEData = {
      userId: employerId,
      Emailtemplate,
      Userinfo,
      Companyinfo,
      Emaillog,
    };
    sendEmailAsync(emailData, additionalEData);
    // ----------------end of sending emails     

    return h.response(updatedApplicationData).code(200);
  }
  catch (error) {
    console.log(error.stack);
    return h.response({ error: true, message: 'Internal Server Error' }).code(500);
  }
}

const getAllEmployerApplicantsSelectiveProfile = async (request, h) => {
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

    const { limit, offset, sort, search, status, startDate: qStartDate, endDate } = request.query;
    const searchVal = `%${search ? search.toLowerCase() : ''}%`;

    // Checking if application status is valid
    const validStatus = ['applied', 'shortlisted', 'interview', 'closed', 'offer', 'hired'];
    const isStatusReqValid = (status && isArray(status)) ? (
      status.every(req => validStatus.includes(req))
    ) : validStatus.includes(status);
    if (status && !isStatusReqValid) return h.response({ error: true, message: 'Invalid status query parameter!' }).code(400);

    // sort query
    let [sortBy, sortType] = sort ? sort.split(':') : ['application_date', 'desc'];
    if (!sortType && sortBy !== 'application_date') sortType = 'asc';
    if (!sortType && sortBy === 'application_date') sortType = 'desc';

    const validSorts = ['first_name', 'last_name', 'application_date', 'status'];
    const isSortReqValid = validSorts.includes(sortBy);

    const validSortTypes = ['asc', 'desc'];
    const isSortTypeReqValid = validSortTypes.includes(sortType.toLowerCase());

    // pagination
    const limitNum = limit ? Number(limit) : 10;
    const offsetNum = offset ? Number(offset) : 0;

    //   query validation
    if (isNaN(limitNum)) return h.response({ error: true, message: 'Invalid limit query parameter! The limit query parameter must be a number!' }).code(400);
    if (isNaN(offsetNum)) return h.response({ error: true, message: 'Invalid offset query parameter! The offset query parameter must be a number!' }).code(400);
    if (!sortBy || !isSortReqValid) return h.response({ error: true, message: 'Invalid sort query parameter!' }).code(400);
    if (!isSortTypeReqValid) return h.response({ error: true, message: 'Invalid sort query parameter! Sort type is invalid, it should be either "asc" or "desc"!' }).code(400);

    if (limitNum < 0) return h.response({ error: true, message: 'Limit must be greater than 0!' }).code(400);
    if (limitNum > 100) return h.response({ error: true, message: 'Limit must not exceed 100!' }).code(400);

    // custom date search query
    let lowerDateRange;
    let upperDateRange;
    let startDate = qStartDate;
    if (!qStartDate && endDate) return h.response({ error: true, message: `You can't send endDate without startDate!` }).code(400);

    // if (!qStartDate) {
    //     // get latest applications within last 14 days
    //     startDate = new Date();
    //     startDate.setDate(startDate.getDate() - 14);
    // }
    if (startDate) {
      if (startDate && !endDate) {
        lowerDateRange = new Date(startDate);
        upperDateRange = new Date(); //Now()
      }
      if (startDate && endDate) {
        lowerDateRange = new Date(startDate);
        upperDateRange = new Date(endDate);
      }

      const isValidDate = !isNaN(Date.parse(lowerDateRange)) && !isNaN(Date.parse(upperDateRange));
      if (!isValidDate) return h.response({ error: true, message: 'Invalid startDate or endDate query parameter!' }).code(400);
      const isValidDateRange = lowerDateRange.getTime() < upperDateRange.getTime();
      if (!isValidDateRange) return h.response({ error: true, message: 'endDate must be after startDate!' }).code(400);
    }

    const db1 = request.getDb('xpaxr');
    // get sql statement for getting all applications or all applications' count        
    const filters = { startDate, status, search, sortBy, sortType }
    function getSqlStmt(queryType, obj = filters) {
      const { startDate, status, search, sortBy, sortType } = obj;
      let sqlStmt;
      const type = queryType && queryType.toLowerCase();
      if (type === 'count') {
        sqlStmt = `select count(*)`;
      } else {
        sqlStmt = `select ui.*, ja.*, ja.created_at as application_date`;
      }

      sqlStmt += `
                from hris.jobapplications ja
                    inner join hris.applicationhiremember ahm on ahm.application_id=ja.application_id
                    inner join hris.userinfo ui on ui.user_id=ja.user_id                    
                where ja.is_withdrawn=false 
                    and ahm.access_level in ('jobcreator', 'viewer', 'administrator')
                    and ahm.user_id=:userId`;

      if (startDate) sqlStmt += ` and ja.created_at >= :lowerDateRange and ja.created_at <= :upperDateRange`;
      // filters
      if (status) {
        sqlStmt += isArray(status) ? ` and ja.status in (:status)` : ` and ja.status=:status`;
      }
      // search
      if (search) {
        sqlStmt += ` and (
                    ui.first_name ilike :searchVal
                    or ui.last_name ilike :searchVal                    
                )`;
      }

      if (type !== 'count') {
        // sorts
        if (sortBy === 'application_date') {
          sqlStmt += ` order by ja.created_at ${sortType}`;
        } else {
          sqlStmt += ` order by ${sortBy} ${sortType}`;
        }

        // limit and offset
        sqlStmt += ` limit :limitNum  offset :offsetNum`
      };

      return sqlStmt;
    }

    const sequelize = db1.sequelize;
    const allSQLApplications = await sequelize.query(getSqlStmt(), {
      type: QueryTypes.SELECT,
      replacements: {
        userId,
        limitNum, offsetNum,
        searchVal,
        status,
        lowerDateRange, upperDateRange,
      },
    });
    const allSQLApplicationsCount = await sequelize.query(getSqlStmt('count'), {
      type: QueryTypes.SELECT,
      replacements: {
        userId,
        limitNum, offsetNum,
        searchVal,
        status,
        lowerDateRange, upperDateRange,
      },
    });
    const allApplicantions = camelizeKeys(allSQLApplications);

    const paginatedResponse = { count: allSQLApplicationsCount[0].count, applications: allApplicantions };
    return h.response(paginatedResponse).code(200);
  }
  catch (error) {
    console.error(error.stack);
    return h.response({ error: true, message: 'Bad Request!' }).code(500);
  }
}

const getAllApplicantsSelectiveProfile = async (request, h) => {
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
    const { Job } = request.getModels('xpaxr');

    const existingJobRecord = await Job.findOne({ where: { jobId: rParamsJobId, isDeleted: false } });
    const existingJobInfo = existingJobRecord && existingJobRecord.toJSON();
    const { jobId } = existingJobInfo || {};

    if (!jobId) return h.response({ error: true, message: 'No job found!' }).code(400);

    const { limit, offset, sort, startDate, endDate, search, status } = request.query;
    const searchVal = `%${search ? search.toLowerCase() : ''}%`;

    // Checking if application status is valid
    const validStatus = ['applied', 'shortlisted', 'interview', 'closed', 'offer', 'hired'];
    const isStatusReqValid = (status && isArray(status)) ? (
      status.every(req => validStatus.includes(req))
    ) : validStatus.includes(status);
    if (status && !isStatusReqValid) return h.response({ error: true, message: 'Invalid status query parameter!' }).code(400);

    // sort query
    let [sortBy, sortType] = sort ? sort.split(':') : ['application_date', 'desc'];
    if (!sortType && sortBy !== 'application_date') sortType = 'asc';
    if (!sortType && sortBy === 'application_date') sortType = 'desc';

    const validSorts = ['first_name', 'last_name', 'application_date', 'status'];
    const isSortReqValid = validSorts.includes(sortBy);

    const validSortTypes = ['asc', 'desc'];
    const isSortTypeReqValid = validSortTypes.includes(sortType.toLowerCase());

    // pagination
    const limitNum = limit ? Number(limit) : 10;
    const offsetNum = offset ? Number(offset) : 0;

    //   query validation
    if (isNaN(limitNum)) return h.response({ error: true, message: 'Invalid limit query parameter! The limit query parameter must be a number!' }).code(400);
    if (isNaN(offsetNum)) return h.response({ error: true, message: 'Invalid offset query parameter! The offset query parameter must be a number!' }).code(400);
    if (!sortBy || !isSortReqValid) return h.response({ error: true, message: 'Invalid sort query parameter!' }).code(400);
    if (!isSortTypeReqValid) return h.response({ error: true, message: 'Invalid sort query parameter! Sort type is invalid, it should be either "asc" or "desc"!' }).code(400);

    if (limitNum < 0) return h.response({ error: true, message: 'Limit must be greater than 0!' }).code(400);
    if (limitNum > 100) return h.response({ error: true, message: 'Limit must not exceed 100!' }).code(400);

    // custom date search query
    let lowerDateRange;
    let upperDateRange;
    if (!startDate && endDate) return h.response({ error: true, message: `You can't send endDate without startDate!` }).code(400);

    if (startDate) {
      if (startDate && !endDate) {
        lowerDateRange = new Date(startDate);
        upperDateRange = new Date(); //Now()
      }
      if (startDate && endDate) {
        lowerDateRange = new Date(startDate);
        upperDateRange = new Date(endDate);
      }

      const isValidDate = !isNaN(Date.parse(lowerDateRange)) && !isNaN(Date.parse(upperDateRange));
      if (!isValidDate) return h.response({ error: true, message: 'Invalid startDate or endDate query parameter!' }).code(400);
      const isValidDateRange = lowerDateRange.getTime() < upperDateRange.getTime();
      if (!isValidDateRange) return h.response({ error: true, message: 'endDate must be after startDate!' }).code(400);
    }


    const db1 = request.getDb('xpaxr');
    // get sql statement for getting all applications or all applications' count        
    const filters = { startDate, status, search, sortBy, sortType }
    function getSqlStmt(queryType, obj = filters) {
      const { startDate, status, search, sortBy, sortType } = obj;
      let sqlStmt;
      const type = queryType && queryType.toLowerCase();
      if (type === 'count') {
        sqlStmt = `select count(*)`;
      } else {
        sqlStmt = `select ja.*, ja.created_at as application_date, ui.*`;
      }

      sqlStmt += `
                from hris.jobapplications ja
                    inner join hris.applicationhiremember ahm on ahm.application_id=ja.application_id
                    inner join hris.userinfo ui on ui.user_id=ja.user_id                    
                where ja.is_withdrawn=false 
                    and ahm.access_level in ('jobcreator', 'viewer', 'administrator')
                    and ja.job_id=:jobId and ahm.user_id=:userId`;

      if (startDate) sqlStmt += ` and ja.created_at >= :lowerDateRange and ja.created_at <= :upperDateRange`;
      // filters
      if (status) {
        sqlStmt += isArray(status) ? ` and ja.status in (:status)` : ` and ja.status=:status`;
      }
      // search
      if (search) {
        sqlStmt += ` and (
                    ui.first_name ilike :searchVal
                    or ui.last_name ilike :searchVal                    
                )`;
      }

      if (type !== 'count') {
        // sorts
        if (sortBy === 'application_date') {
          sqlStmt += ` order by ja.created_at ${sortType}`;
        } else {
          sqlStmt += ` order by ${sortBy} ${sortType}`;
        }

        // limit and offset
        sqlStmt += ` limit :limitNum  offset :offsetNum`
      };

      return sqlStmt;
    }

    const sequelize = db1.sequelize;
    const allSQLApplications = await sequelize.query(getSqlStmt(), {
      type: QueryTypes.SELECT,
      replacements: {
        jobId, userId,
        limitNum, offsetNum,
        searchVal,
        status,
        lowerDateRange, upperDateRange,
      },
    });
    const allSQLApplicationsCount = await sequelize.query(getSqlStmt('count'), {
      type: QueryTypes.SELECT,
      replacements: {
        jobId, userId,
        limitNum, offsetNum,
        searchVal,
        status,
        lowerDateRange, upperDateRange,
      },
    });
    const allApplicantions = camelizeKeys(allSQLApplications);

    const paginatedResponse = { count: allSQLApplicationsCount[0].count, applications: allApplicantions };
    return h.response(paginatedResponse).code(200);
  }
  catch (error) {
    console.error(error.stack);
    return h.response({ error: true, message: 'Bad Request!' }).code(500);
  }
}

const getApplicantProfile = async (request, h) => {
  try {
    const authRes = validateIsLoggedIn(request, h);
     if(authRes.error) return h.response(authRes.response).code(authRes.code);
    
    
    // Checking user type from jwt
    let luserTypeName = request.auth.artifacts.decoded.userTypeName;
    if (luserTypeName !== 'employer' && luserTypeName !== 'supervisor' && luserTypeName !== 'workbuddy') {
      return h.response({ error: true, message: 'You are not authorized!' }).code(403);
    }

    const { credentials } = request.auth || {};
    const { id: luserId } = credentials || {};

    const { jobId: rParamsJobId, userId } = request.params || {};
    const { Userinfo, Job, Applicationhiremember } = request.getModels('xpaxr');

    // get the company of the recruiter
    const luserRecord = await Userinfo.findOne({ where: { userId: luserId }, attributes: { exclude: ['createdAt', 'updatedAt'] } });
    const luserProfileInfo = luserRecord && luserRecord.toJSON();
    const { companyId: luserCompanyId } = luserProfileInfo || {};

    const existingJobRecord = await Job.findOne({ where: { jobId: rParamsJobId, isDeleted: false } });
    const existingJobInfo = existingJobRecord && existingJobRecord.toJSON();
    const { jobId } = existingJobInfo || {};

    if (!jobId) return h.response({ error: true, message: `No job found!` }).code(400);

    // get the applicant's profile
    const db1 = request.getDb('xpaxr');
    const sqlStmt = `select
            ja.application_id, ja.status, ja.created_at as application_date, mcm.mentor_id,
            j.company_id as job_creator_company_id, jn.job_name, c.display_name as company_name,
            j.job_uuid, j.*, jt.job_type_name, jf.job_function_name,ji.job_industry_name,jl.job_location_name,
            ui.*, ut.user_type_name, ur.role_name
        from hris.userinfo ui
            inner join hris.usertype ut on ut.user_type_id=ui.user_type_id
            inner join hris.userrole ur on ur.role_id=ui.role_id
            inner join hris.jobapplications ja on ja.user_id=ui.user_id
            
            inner join hris.jobs j on j.job_id=:jobId
            inner join hris.company c on c.company_id=j.company_id
            inner join hris.jobname jn on jn.job_name_id=j.job_name_id
            inner join hris.jobtype jt on jt.job_type_id=j.job_type_id                
            inner join hris.jobfunction jf on jf.job_function_id=j.job_function_id                
            inner join hris.jobindustry ji on ji.job_industry_id=j.job_industry_id
            inner join hris.joblocation jl on jl.job_location_id=j.job_location_id
            
            left join hris.mentorcandidatemapping mcm on mcm.candidate_id=ui.user_id
        where ui.user_id=:userId and ja.job_id=:jobId`;

    const sequelize = db1.sequelize;
    const userinfoSQL = await sequelize.query(sqlStmt, {
      type: QueryTypes.SELECT,
      replacements: {
        jobId, userId,
      },
    });
    const applicantInfo = camelizeKeys(userinfoSQL)[0];
    const { userId: auserId, applicationId, jobCreatorCompanyId } = applicantInfo || {};

    if (!auserId) return h.response({ error: true, message: 'No applicant found!' }).code(400);

    // does (s)he have access to do this?
    const doIhaveAccessRecord = await Applicationhiremember.findOne({ where: { applicationId, userId: luserId } });
    const doIhaveAccessInfo = doIhaveAccessRecord && doIhaveAccessRecord.toJSON();
    const { accessLevel: luserAccessLevel } = doIhaveAccessInfo || {};

    if (luserAccessLevel !== 'jobcreator' && luserAccessLevel !== 'administrator' && luserAccessLevel !== 'supervisor' && luserAccessLevel !== 'workbuddy') return h.response({ error: true, message: 'You are not authorized!' }).code(403);
    if (luserCompanyId !== jobCreatorCompanyId) return h.response({ error: true, message: 'You are not authorized!' }).code(403);
    delete applicantInfo.jobCreatorCompanyId;

    return h.response(applicantInfo).code(200);
  }
  catch (error) {
    console.error(error.stack);
    return h.response({ error: true, message: 'Bad Request!' }).code(500);
  }
}

const updateApplicationStatus = async (request, h) => {
  try {
    const authRes = validateIsLoggedIn(request, h);
     if(authRes.error) return h.response(authRes.response).code(authRes.code);
    
    
    // Checking user type from jwt
    let luserTypeName = request.auth.artifacts.decoded.userTypeName;
    if (luserTypeName !== 'employer') return h.response({ error: true, message: 'You are not authorized!' }).code(403);

    const { credentials } = request.auth || {};
    const { id: userId } = credentials || {};

    const { applicationId } = request.params || {};
    const { status } = request.payload || {};

    const validUpdateRequests = ['status'];
    const requestedUpdateOperations = Object.keys(request.payload) || [];
    const isAllReqsValid = requestedUpdateOperations.every(req => validUpdateRequests.includes(req));
    if (!isAllReqsValid) return h.response({ error: true, message: 'Invalid update request(s)' }).code(400);

    const validStatus = ['shortlisted', 'interview', 'closed', 'offer', 'hired'];
    if (!validStatus.includes(status)) return h.response({ error: true, message: 'Invalid status' }).code(400);

    const { Userinfo, Jobapplication, Applicationhiremember, Applicationauditlog, Onboarding, Onboardingtask, Onboardingtasktype, Onboardingfixedtask, Emailtemplate, Emaillog, Companyinfo } = request.getModels('xpaxr');

    // get the company of the recruiter
    const userRecord = await Userinfo.findOne({ where: { userId }, attributes: { exclude: ['createdAt', 'updatedAt'] } });
    const userProfileInfo = userRecord && userRecord.toJSON();
    const { companyId: luserCompanyId, firstName: luserFirstName } = userProfileInfo || {};

    const sqlStmt = `select  
                ui.first_name as candidate_first_name, ui.email as candidate_email, c.display_name as company_name,
                ja.application_id, ja.job_id, ja.status,
                jn.job_name, j.user_id as creator_id, j.company_id
            from hris.jobapplications ja
                inner join hris.jobs j on j.job_id=ja.job_id
                inner join hris.jobname jn on jn.job_name_id=j.job_name_id
                inner join hris.userinfo ui on ui.user_id=ja.user_id
				inner join  hris.company c on c.company_id=j.company_id
            where ja.application_id=:applicationId and j.is_deleted=false`;

    const db1 = request.getDb('xpaxr');
    const sequelize = db1.sequelize;
    const applicationJobDetailsSQL = await sequelize.query(sqlStmt, {
      type: QueryTypes.SELECT,
      replacements: {
        applicationId
      },
    });
    const applicationJobDetails = camelizeKeys(applicationJobDetailsSQL)[0];
    const { applicationId: existingApplicationId, companyId: creatorCompanyId, candidateEmail, candidateFirstName, companyName, jobId, jobName, status: oldStatus } = applicationJobDetails || {};

    if (!existingApplicationId) return h.response({ error: true, message: `No application found!` }).code(400);
    if (luserCompanyId !== creatorCompanyId) return h.response({ error: true, message: `You are not authorized!` }).code(403);

    // can (s)he update this application?
    const accessRecord = await Applicationhiremember.findOne({ where: { applicationId, userId } });
    const accessRecordInfo = accessRecord && accessRecord.toJSON();
    const { accessLevel: luserAccessLevel } = accessRecordInfo || {};

    if (luserAccessLevel !== 'jobcreator' && luserAccessLevel !== 'administrator') return h.response({ error: true, message: 'You are not authorized to update the application!' }).code(403);

    if (oldStatus === 'hired') return h.response({ error: true, message: 'Already hired. So the status can not change!' }).code(400);
    if (oldStatus === status) return h.response({ error: true, message: 'Already has this status!' }).code(400);

    await Jobapplication.update({ status, updatedAt: new Date() }, { where: { applicationId } });
    const updatedRecord = await Jobapplication.findOne({ where: { applicationId } });
    const updatedData = updatedRecord && updatedRecord.toJSON();

    if (updatedData.status === 'hired') {
      const onboardingRecord = await Onboarding.create({
        onboardee: updatedData.userId,
        onboarder: userId,
        status: 'ongoing',
        jobId: jobId,
        companyId: creatorCompanyId,
      });
      const onboardingData = onboardingRecord && onboardingRecord.toJSON();

      // creating onboarding tasks (copying the fixed x0pa given tasks)
      const allFixedTasks = await Onboardingfixedtask.findAll({ attributes: { exclude: ['createdAt', 'updatedAt'] } });
      for (let record of allFixedTasks) {
        const defaultData = record.toJSON();
        Onboardingtask.create({
          onboardingId: onboardingData.onboardingId,
          taskId: defaultData.onboardingfixedtaskId,
          // asignee: userId,                    
          status: 'ongoing',
        });
      }
    }

    await Applicationauditlog.create({
      affectedApplicationId: applicationId,
      performerUserId: userId,
      actionName: 'Update the Application Status',
      actionType: 'UPDATE',
      actionDescription: `The user of userId ${userId} has updated the status of application of applicationId ${applicationId}. Previous status was ${oldStatus} and current status is ${status}.`
    });

    // ----------------start of sending emails
    const customTemplateRecord = await Emailtemplate.findOne({ where: { templateName: `application-${status}-email`, isDefaultTemplate: false, companyId: luserCompanyId, status: 'active' } })
    const customTemplateInfo = customTemplateRecord && customTemplateRecord.toJSON();
    const { id: customTemplateId, ownerId: cTemplateOwnerId } = customTemplateInfo || {};
    const templateName = `application-${status}-email`;
    const ownerId = customTemplateId ? cTemplateOwnerId : null;
    const isX0PATemplate = customTemplateId ? false : true;

    const emailData = {
      emails: [candidateEmail],
      email: candidateEmail,
      ccEmails: [],
      templateName,
      ownerId,
      isX0PATemplate,

      companyName: companyName,
      candidateFirstName,
      recruiterFirstName: luserFirstName,
      jobName: jobName,
    };

    const additionalEData = {
      userId,
      Emailtemplate,
      Userinfo,
      Companyinfo,
      Emaillog,
    };
    sendEmailAsync(emailData, additionalEData);
    // ----------------end of sending emails     


    return h.response(updatedRecord).code(200);
  }
  catch (error) {
    console.error(error.stack);
    return h.response({ error: true, message: 'Bad Request' }).code(400);
  }
}

module.exports = {
  applyToJob,
  getAppliedJobs,
  withdrawFromAppliedJob,

  updateApplicationStatus,

  getAllEmployerApplicantsSelectiveProfile,
  getAllApplicantsSelectiveProfile,
  getApplicantProfile,
}
