const { Op, Sequelize, QueryTypes, cast, literal } = require('sequelize');
const validator = require('validator');
import { camelizeKeys } from '../../utils/camelizeKeys'
import { sendEmailAsync } from '../../utils/email'
import formatQueryRes from '../../utils/index'
import { isArray } from 'lodash';
const axios = require('axios')
const moment = require('moment');
const config = require('config');

const createJob = async (request, h) => {
  try {
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden', code: "xemp-1" }).code(401);
    }
    // Checking user type from jwt
    let luserTypeName = request.auth.artifacts.decoded.userTypeName;
    if (luserTypeName !== 'employer') {
      return h.response({ error: true, message: 'You are not authorized!' }).code(403);
    }

    const jobDetails = request.payload || {};
    const { jobName, jobDescription, jobIndustryId, jobLocationId, jobFunctionId, jobTypeId, minExp, duration, closeDate, jobSkills } = jobDetails;
    if (!(jobName && jobDescription && jobIndustryId && jobLocationId && jobFunctionId && jobTypeId && minExp && closeDate)) {
      return h.response({ error: true, message: 'Please provide necessary details' }).code(400);
    }

    jobDetails.closeDate = closeDate && new Date(closeDate);
    const isValidCloseDate = closeDate ? !isNaN(Date.parse(jobDetails.closeDate)) : true;
    if (!isValidCloseDate) return h.response({ error: true, message: 'Invalid closeDate!' }).code(400);

    const { credentials } = request.auth || {};
    const { id: userId } = credentials || {};

    const { Job, Jobname, Jobskill, Jobhiremember, Jobauditlog, Userinfo, Jobtype } = request.getModels('xpaxr');
    // get the company of the recruiter
    const userRecord = await Userinfo.findOne({ where: { userId }, attributes: { exclude: ['createdAt', 'updatedAt'] } });
    const userProfileInfo = userRecord && userRecord.toJSON();
    const { companyId } = userProfileInfo || {};

    const jobTypeRecord = await Jobtype.findOne({ where: { jobTypeId } });
    const jobTypeInfo = jobTypeRecord && jobTypeRecord.toJSON();
    const { jobTypeName } = jobTypeInfo || {};

    const jobsWithDuration = ['Internship', 'Full-time Contract', 'Part-time Contract'];
    const isJobWithDuration = jobsWithDuration.includes(jobTypeName);

    if (isJobWithDuration && !duration) {
      return h.response({ error: true, message: 'Please provide the duration' }).code(400);
    }
    if (!isJobWithDuration) {
      jobDetails.duration = null;
    }

    // check if job name already exists
    const jobNameRecord = await Jobname.findOne({ where: { jobNameLower: jobName.toLowerCase() } });
    const jobNameInfo = jobNameRecord && jobNameRecord.toJSON();
    const { jobNameId: oldJobNameId } = jobNameInfo || {};

    let jobNameIdToSave;
    if (!oldJobNameId) {
      const newJobNameRecord = await Jobname.create({
        jobName: jobName.trim(),
        jobNameLower: jobName.toLowerCase().trim(),
      });
      const newJobNameInfo = newJobNameRecord && newJobNameRecord.toJSON();
      const { jobNameId: newJobNameId } = newJobNameInfo || {};
      jobNameIdToSave = newJobNameId;
    } else {
      jobNameIdToSave = oldJobNameId;
    }

    // job skills (if skill exist, use the existing id, if not create and then use that new id)
    if (jobSkills && !isArray(jobSkills)) {
      return h.response({ error: true, message: 'jobSkills must be an array of strings' }).code(400);
    }
    const jobskillIds = [];
    if (jobSkills && isArray(jobSkills)) {
      for (let i = 0; i < jobSkills.length; i++) {
        const item = jobSkills[i].toLowerCase().trim();

        // check if job skill name already exists
        const jobskillRecord = await Jobskill.findOne({ where: { jobskillNameLower: item } });
        const jobskillInfo = jobskillRecord && jobskillRecord.toJSON();
        const { jobskillId: oldJobskillId } = jobskillInfo || {};

        if (!oldJobskillId) {
          const newJobskillRecord = await Jobskill.create({
            jobskillName: item,
            jobskillNameLower: item,
          });
          const newJobskillInfo = newJobskillRecord && newJobskillRecord.toJSON();
          const { jobskillId: newJobskillId } = newJobskillInfo || {};
          jobskillIds.push(newJobskillId);
        } else {
          jobskillIds.push(oldJobskillId);
        }
      }
    }

    // create job
    const resRecord = await Job.create({ ...jobDetails, jobNameId: jobNameIdToSave, active: true, userId, companyId, jobskillIds });
    const { jobId } = resRecord;
    await Jobhiremember.create({ accessLevel: 'creator', userId, jobId: resRecord.jobId, })
    await Jobauditlog.create({
      affectedJobId: jobId,
      performerUserId: userId,
      actionName: 'Create a Job',
      actionType: 'CREATE',
      actionDescription: `The user of userId ${userId} has created the job of jobId ${jobId}`
    });
    return h.response(resRecord).code(200);
  }
  catch (error) {
    console.error(error.stack);
    return h.response({ error: true, message: 'Bad Request' }).code(400);
  }
}

const getSingleJob = async (request, h) => {
  try {
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden', code: "xemp-1" }).code(401);
    }
    const { credentials } = request.auth || {};
    const { id: userId } = credentials || {};
    const { jobUuid } = request.params || {};

    // Checking user type from jwt
    let luserTypeName = request.auth.artifacts.decoded.userTypeName;
    if (luserTypeName !== 'candidate' && luserTypeName !== 'employer') return h.response({ error: true, message: 'You are not authorized!' }).code(403);

    const { Jobvisit, Jobskill, Jobapplication, Userinfo } = request.getModels('xpaxr');

    // get the company of the luser (using it only if he is a recruiter)
    const luserRecord = await Userinfo.findOne({ where: { userId }, attributes: { exclude: ['createdAt', 'updatedAt'] } });
    const luserProfileInfo = luserRecord && luserRecord.toJSON();
    const { companyId: recruiterCompanyId } = luserProfileInfo || {};

    const db1 = request.getDb('xpaxr');

    const isCandidateView = luserTypeName === 'candidate';
    const isEmployerView = luserTypeName === 'employer';
    // get sql statement for getting jobs or jobs count        
    function getSqlStmt(queryType) {
      let sqlStmt;
      const type = queryType && queryType.toLowerCase();
      if (type === 'count') {
        sqlStmt = `select count(*)`;
      } else {
        sqlStmt = `select
                jn.job_name, j.*, jt.*, jf.*,ji.*,jl.*,c.display_name as company_name,jqr.response_id,jqr.question_id,jqr.response_val`;

        if (isEmployerView) sqlStmt += `, jhm.access_level`
      }

      sqlStmt += `
            from hris.jobs j
                inner join hris.jobname jn on jn.job_name_id=j.job_name_id
                left join hris.jobsquesresponses jqr on jqr.job_id=j.job_id
                inner join hris.company c on c.company_id=j.company_id
                inner join hris.jobtype jt on jt.job_type_id=j.job_type_id                
                inner join hris.jobfunction jf on jf.job_function_id=j.job_function_id                
                inner join hris.jobindustry ji on ji.job_industry_id=j.job_industry_id
                inner join hris.joblocation jl on jl.job_location_id=j.job_location_id`;

      // if he is an employer
      if (isEmployerView) sqlStmt += ` inner join hris.jobhiremember jhm on jhm.job_id=j.job_id and jhm.user_id=:userId`;
      sqlStmt += ` where j.active=true and j.is_deleted=false and j.job_uuid=:jobUuid`;

      // if he is an employer
      if (isCandidateView) sqlStmt += ` and j.is_private=false`;
      if (isEmployerView) sqlStmt += ` and j.company_id=:recruiterCompanyId`;

      return sqlStmt;
    };

    const sequelize = db1.sequelize;
    const sqlJobArray = await sequelize.query(getSqlStmt(), {
      type: QueryTypes.SELECT,
      replacements: { jobUuid, recruiterCompanyId, userId },
    });
    const rawJobArray = camelizeKeys(sqlJobArray);
    const { jobId: foundJobId } = rawJobArray[0] || {};

    if (!foundJobId) return h.response({ error: true, message: 'No job found!' }).code(400);

    // check if already applied
    if (luserTypeName === 'candidate') {
      const rawAllAppliedJobs = await Jobapplication.findAll({ raw: true, nest: true, where: { userId } });
      const appliedJobIds = [];
      rawAllAppliedJobs.forEach(aj => {
        const { jobId } = aj || {};
        if (jobId) {
          appliedJobIds.push(Number(jobId));
        }
      });

      rawJobArray.forEach(j => {
        const { jobId } = j || {};
        if (appliedJobIds.includes(Number(jobId))) {
          j.isApplied = true;
        } else {
          j.isApplied = false;
        }
      });

    }

    const jobsMap = new Map();
    const jobQuesMap = {};
    const fres = [];

    // attaching jobQuestionResponses
    if (Array.isArray(rawJobArray) && rawJobArray.length) {
      rawJobArray.forEach(r => {
        const { jobId, questionId, responseId, responseVal, ...rest } = r || {};
        jobsMap.set(jobId, { jobId, ...rest });

        if (responseId) {
          if (jobQuesMap[jobId]) {
            jobQuesMap[jobId].push({ questionId, responseId, responseVal });
          } else {
            jobQuesMap[jobId] = [{ questionId, responseId, responseVal }];
          }
        }
      });
      jobsMap.forEach((jqrObj, jm) => {
        const records = jobQuesMap[jm] || [];

        const questions = [];
        for (let response of records) {
          const { questionId, responseVal } = response;
          const res = { questionId, answer: responseVal.answer };
          questions.push(res);
        }
        jqrObj.jobQuestionResponses = questions;
        fres.push(jqrObj);
      });
    }
    const responseJob = fres[0];

    // attaching skills
    const { jobskillIds } = responseJob;
    const jobskillRecords = await Jobskill.findAll({ where: { jobskillId: jobskillIds }, attributes: ['jobskillName'] });
    // const jobskillData = jobskillRecords && jobskillRecords.toJSON();
    const jobSkills = [];

    for (let item of jobskillRecords) {
      const { jobskillName } = item;
      if (jobskillName) jobSkills.push(jobskillName);
    }
    responseJob.jobSkills = jobSkills;

    // create job visit record
    await Jobvisit.create({ visitorId: userId, jobId: foundJobId });

    // attaching isQuestionnaireComplete
    if (responseJob.accessLevel === 'creator' || responseJob.accessLevel === 'administrator') {
      const sqlStmtForJobQuesCount = `select count(*) from hris.questionnaire q
              inner join hris.questiontarget qt on qt.target_id=q.question_target_id
              where qt.target_id=2`;

      const allSQLJobQuesCount = await sequelize.query(sqlStmtForJobQuesCount, {
        type: QueryTypes.SELECT,
        replacements: {},
      });
      const jobQuesCount = allSQLJobQuesCount[0].count;

      const sqlStmtForJobResCount = `select count(*) 
              from hris.jobsquesresponses jqr
              where jqr.job_id=:jobId`;

      const allSQLJobResCount = await sequelize.query(sqlStmtForJobResCount, {
        type: QueryTypes.SELECT,
        replacements: {
          jobId: responseJob.jobId,
        },
      });
      const jobResCount = allSQLJobResCount[0].count;

      if (jobQuesCount === jobResCount) {
        responseJob.isQuestionnaireComplete = true;
      } else {
        responseJob.isQuestionnaireComplete = false;
      }
    }

    return h.response(responseJob).code(200);

  } catch (error) {
    console.error(error.stack);
    return h.response({ error: true, message: 'Internal Server Error!' }).code(500);
  }
}

const getAllJobs = async (request, h) => {
  try {
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden', code: "xemp-1" }).code(401);
    }
    const { credentials } = request.auth || {};
    const { id: userId } = credentials || {};

    const { Jobapplication } = request.getModels('xpaxr');

    // Checking user type from jwt
    let luserTypeName = request.auth.artifacts.decoded.userTypeName;
    if (luserTypeName !== 'candidate') return h.response({ error: true, message: 'You are not authorized!' }).code(403);

    const { recommended, limit, offset, jobTypeId, jobFunctionId, jobLocationId, jobIndustryId, minExp, sort, startDate, endDate, search } = request.query;
    const searchVal = `%${search ? search.toLowerCase() : ''}%`;
    const recommendedVal = recommended ? Number(recommended) : 1;

    // sort query
    let [sortBy, sortType] = sort ? sort.split(':') : (recommendedVal === 1) ? ['score', 'DESC'] : ['created_at', 'desc'];
    if (!sortType && sortBy !== 'created_at') sortType = 'asc';
    if (!sortType && sortBy === 'created_at') sortType = 'desc';

    const validSorts = ['score', 'created_at', 'job_name'];
    const isSortReqValid = validSorts.includes(sortBy);
    const validSortTypes = ['asc', 'desc'];
    const isSortTypeReqValid = validSortTypes.includes(sortType.toLowerCase());

    const validRecommendedVal = [0, 1];
    const isRecommendedValReqValid = validRecommendedVal.includes(recommendedVal);

    const isSortByValid = (recommendedVal !== 1 && sortBy === 'score') ? false : true;

    // pagination query
    const limitNum = limit ? Number(limit) : 10;
    const offsetNum = offset ? Number(offset) : 0;

    // query validation
    if (isNaN(limitNum)) return h.response({ error: true, message: 'Invalid limit query parameter! The limit query parameter must be a number!' }).code(400);
    if (isNaN(offsetNum)) return h.response({ error: true, message: 'Invalid offset query parameter! The offset query parameter must be a number!' }).code(400);
    if (isNaN(recommendedVal) || !isRecommendedValReqValid) return h.response({ error: true, message: 'Invalid recommended query parameter!' }).code(400);

    if (!sortBy || !isSortReqValid) return h.response({ error: true, message: 'Invalid sort query parameter!' }).code(400);
    if (!isSortTypeReqValid) return h.response({ error: true, message: 'Invalid sort query parameter! Sort type is invalid, it should be either "asc" or "desc"!' }).code(400);
    if (!isSortByValid) return h.response({ error: true, message: 'Invalid sort query parameter!' }).code(400);

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

    const jobIdArray = [];
    let recommendations;
    // GET RECOMMENDED JOBS FROM DATA SCIENCE SERVER
    if (recommendedVal === 1) {
      /* UNCOMMENT THESE FOLLOWING LINES when going for staging */

      let model = request.getModels('xpaxr');
      if (!await isUserQuestionnaireDone(userId, model)) return h.response({ error: "Questionnaire Not Done" }).code(409)

      try {
        const recommendationRes = await axios.get(`http://${config.dsServer.host}:${config.dsServer.port}/user/recommendation`, { params: { user_id: userId } })
        recommendations = recommendationRes?.data?.recommendation //this will be  sorted array of {job_id,score}
        if (!isArray(recommendations) || (isArray(recommendations) && !recommendations.length)) return h.response({ error: true, message: 'Something wrong with Data Science Server!' }).code(500);

        // storing all the jobIds in the given order            
        recommendations.forEach(item => {
          jobIdArray.push(item.job_id);
        });
      } catch (error) {
        console.error(error.stack);
        if (error.response){
            return h.response(camelizeKeys(error.response.data)).code(error.response.status);
        }
        return h.response({ error: true, message: 'Bad Request' }).code(400);

        // recommendations = [
        //     { job_id: '1', score: '1.0' },
        //     { job_id: '2', score: '0.9' },
        //     { job_id: '3', score: '0.8' },
        //     { job_id: '4', score: '0.7' },
        //     { job_id: '5', score: '0.6' },
        //     { job_id: '6', score: '0.5' },
        //     { job_id: '7', score: '0.4' },
        //     { job_id: '8', score: '0.3' },
        //     { job_id: '9', score: '0.2' },
        //     { job_id: '10', score: '0.1' },
        // ]
        // // storing all the jobIds in the given order            
        // recommendations.forEach(item => {
        //     jobIdArray.push(item.job_id);
        // });

      }
    }

    const db1 = request.getDb('xpaxr');
    const filters = { jobIdArray, recommendedVal, jobTypeId, jobFunctionId, jobIndustryId, jobLocationId, minExp, search, sortBy, sortType, startDate };

    // get sql statement for getting jobs or jobs count          
    const timeNow = new Date();
    function getSqlStmt(queryType, obj = filters) {
      const { jobIdArray, recommendedVal, jobTypeId, jobFunctionId, jobIndustryId, jobLocationId, minExp, search, sortBy, sortType, startDate } = obj;
      let sqlStmt;
      const type = queryType && queryType.toLowerCase();
      if (type === 'count') {
        sqlStmt = `select count(*)`;
      } else {
        sqlStmt = `select
                    jn.job_name, j.*, jt.*, jf.*,ji.*,jl.*,c.display_name as company_name`;
      }

      sqlStmt += `
            from hris.jobs j
                inner join hris.jobname jn on jn.job_name_id=j.job_name_id
                inner join hris.company c on c.company_id=j.company_id
                inner join hris.jobtype jt on jt.job_type_id=j.job_type_id                
                inner join hris.jobfunction jf on jf.job_function_id=j.job_function_id                
                inner join hris.jobindustry ji on ji.job_industry_id=j.job_industry_id
                inner join hris.joblocation jl on jl.job_location_id=j.job_location_id
            where j.active=true and j.is_deleted=false 
                and j.is_private=false and j.close_date > :timeNow`;

      if (startDate) sqlStmt += ` and j.created_at >= :lowerDateRange and j.created_at <= :upperDateRange`;
      if (recommendedVal === 1) sqlStmt += ` and j.job_id in (:jobIdArray)`;
      // filters
      if (jobTypeId) {
        sqlStmt += isArray(jobTypeId) ? ` and j.job_type_id in (:jobTypeId)` : ` and j.job_type_id=:jobTypeId`;
      }
      if (jobFunctionId) {
        sqlStmt += isArray(jobFunctionId) ? ` and j.job_function_id in (:jobFunctionId)` : ` and j.job_function_id=:jobFunctionId`;
      }
      if (jobIndustryId) {
        sqlStmt += isArray(jobIndustryId) ? ` and j.job_industry_id in (:jobIndustryId)` : ` and j.job_industry_id=:jobIndustryId`;
      }
      if (jobLocationId) {
        sqlStmt += isArray(jobLocationId) ? ` and j.job_location_id in (:jobLocationId)` : ` and j.job_location_id=:jobLocationId`;
      }
      if (minExp) sqlStmt += ` and j.min_exp=:minExp`;

      // search
      if (search) {
        sqlStmt += ` and (
                    jn.job_name ilike :searchVal
                    or jt.job_type_name ilike :searchVal
                    or jf.job_function_name ilike :searchVal
                    or ji.job_industry_name ilike :searchVal
                    or jl.job_location_name ilike :searchVal
                    or j.job_description ilike :searchVal
                )`;
      }

      if (type !== 'count') {
        // sorts (order)
        if (recommendedVal === 1) {
          if (sortBy === 'score') {
            sqlStmt += ` order by case`
            for (let i = 0; i < jobIdArray.length; i++) {
              sqlStmt += ` WHEN j.job_id=${jobIdArray[i]} THEN ${i}`;
            }
            sqlStmt += ` end`;
            if (sortType === 'asc') sqlStmt += ` desc`; //by default, above method keeps them in the order of the Data Science Server in the sense of asc, to reverse it you must use desc
          } else {
            if (sortBy === 'job_name') {
              sqlStmt += ` order by jn.${sortBy} ${sortType}`;
            } else {
              sqlStmt += ` order by j.${sortBy} ${sortType}`;
            }
          }
        } else {
          if (sortBy === 'job_name') {
            sqlStmt += ` order by jn.${sortBy} ${sortType}`;
          } else {
            sqlStmt += ` order by j.${sortBy} ${sortType}`;
          }
        };
        // limit and offset
        sqlStmt += ` limit :limitNum  offset :offsetNum`
      };

      return sqlStmt;
    };

    const sequelize = db1.sequelize;
    const allSQLJobs = await sequelize.query(getSqlStmt(), {
      type: QueryTypes.SELECT,
      replacements: { timeNow, jobIdArray, jobTypeId, jobFunctionId, jobIndustryId, jobLocationId, minExp, sortBy, sortType, limitNum, offsetNum, searchVal, lowerDateRange, upperDateRange },
    });
    const allSQLJobsCount = await sequelize.query(getSqlStmt('count'), {
      type: QueryTypes.SELECT,
      replacements: { timeNow, jobIdArray, jobTypeId, jobFunctionId, jobIndustryId, jobLocationId, minExp, sortBy, sortType, limitNum, offsetNum, searchVal, lowerDateRange, upperDateRange },
    });
    const allJobs = camelizeKeys(allSQLJobs);

    // check if already applied
    const rawAllAppliedJobs = await Jobapplication.findAll({ raw: true, nest: true, where: { userId } });
    const appliedJobIds = [];
    rawAllAppliedJobs.forEach(aj => {
      const { jobId } = aj || {};
      if (jobId) {
        appliedJobIds.push(Number(jobId));
      }
    });

    allJobs.forEach(j => {
      const { jobId } = j || {};
      if (appliedJobIds.includes(Number(jobId))) {
        j.isApplied = true;
      } else {
        j.isApplied = false;
      }
    });

    if (recommendedVal === 1 && recommendations) {
      // recommendations
      // [{job_id: 7, score: 0.9 }]
      const rjMap = new Map();

      for (let rjItem of recommendations) {
        rjMap.set(rjItem.job_id, rjItem.score);
      }
      for (let job of allJobs) {
        job.score = rjMap.get(job.jobId);
      }
    }
    const responses = { count: allSQLJobsCount[0].count, jobs: allJobs };
    return h.response(responses).code(200);

  } catch (error) {
    console.error(error.stack);
    return h.response({ error: true, message: 'Internal Server Error!' }).code(500);
  }
}

const getRecruiterJobs = async (request, h) => {
  try {
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden', code: "xemp-1" }).code(401);
    }
    const { credentials } = request.auth || {};
    const { id: userId } = credentials || {};

    const { Userinfo } = request.getModels('xpaxr');

    // Checking user type from jwt
    let luserTypeName = request.auth.artifacts.decoded.userTypeName;
    if (luserTypeName !== 'employer') {
      return h.response({ error: true, message: 'You are not authorized!' }).code(403);
    }

    // get the company of the luser recruiter
    const luserRecord = await Userinfo.findOne({ where: { userId }, attributes: { exclude: ['createdAt', 'updatedAt'] } });
    const luserProfileInfo = luserRecord && luserRecord.toJSON();
    const { companyId: recruiterCompanyId } = luserProfileInfo || {};

    const { ownJobs, limit, offset, jobTypeId, jobFunctionId, jobLocationId, jobIndustryId, minExp, sort, startDate, endDate, search } = request.query;
    const searchVal = `%${search ? search.toLowerCase() : ''}%`;
    const ownJobsVal = ownJobs ? Number(ownJobs) : 0;

    // sort query
    let [sortBy, sortType] = sort ? sort.split(':') : ['created_at', 'desc'];
    if (!sortType && sortBy !== 'created_at') sortType = 'asc';
    if (!sortType && sortBy === 'created_at') sortType = 'desc';

    const validSorts = ['created_at', 'job_name'];
    const isSortReqValid = validSorts.includes(sortBy);

    const validSortTypes = ['asc', 'desc'];
    const isSortTypeReqValid = validSortTypes.includes(sortType.toLowerCase());

    const validOwnJobsVal = [0, 1];
    const isOwnJobsReqValid = validOwnJobsVal.includes(ownJobsVal);

    // pagination query
    const limitNum = limit ? Number(limit) : 10;
    const offsetNum = offset ? Number(offset) : 0;

    // query validation        
    if (isNaN(limitNum)) return h.response({ error: true, message: 'Invalid limit query parameter! The limit query parameter must be a number!' }).code(400);
    if (isNaN(offsetNum)) return h.response({ error: true, message: 'Invalid offset query parameter! The offset query parameter must be a number!' }).code(400);
    if (isNaN(ownJobsVal) || !isOwnJobsReqValid) return h.response({ error: true, message: 'Invalid ownJobs query parameter!' }).code(400);

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

    // get sql statement for getting jobs or jobs count
    const filters = { startDate, ownJobsVal, jobTypeId, jobFunctionId, jobIndustryId, jobLocationId, minExp, search, sortBy, sortType };
    function getSqlStmt(queryType, obj = filters) {
      const { startDate, ownJobsVal, jobTypeId, jobFunctionId, jobIndustryId, jobLocationId, minExp, search, sortBy, sortType } = obj;
      let sqlStmt;
      const type = queryType && queryType.toLowerCase();
      if (type === 'count') {
        sqlStmt = `select count(*)`;
      } else {
        sqlStmt = `select
                jhm.access_level, jn.job_name, j.*, jt.*, jf.*,ji.*,jl.*,c.display_name as company_name`;
      }

      sqlStmt += `                    
                from hris.jobs j
                    inner join hris.jobname jn on jn.job_name_id=j.job_name_id
                    inner join hris.company c on c.company_id=j.company_id
                    inner join hris.jobtype jt on jt.job_type_id=j.job_type_id                
                    inner join hris.jobfunction jf on jf.job_function_id=j.job_function_id                
                    inner join hris.jobindustry ji on ji.job_industry_id=j.job_industry_id
                    inner join hris.joblocation jl on jl.job_location_id=j.job_location_id
                    inner join hris.jobhiremember jhm on jhm.job_id=j.job_id 
                where j.active=true and j.is_deleted=false 
                    and j.company_id=:recruiterCompanyId 
                    and jhm.access_level in ('creator', 'administrator', 'viewer') 
                    and jhm.user_id=:userId`;

      if (startDate) sqlStmt += ` and j.created_at >= :lowerDateRange and j.created_at <= :upperDateRange`;
      // filters
      if (ownJobsVal === 'true') {
        sqlStmt += ` and j.user_id=:userId`;
      }
      if (jobTypeId) {
        sqlStmt += isArray(jobTypeId) ? ` and j.job_type_id in (:jobTypeId)` : ` and j.job_type_id=:jobTypeId`;
      }
      if (jobFunctionId) {
        sqlStmt += isArray(jobFunctionId) ? ` and j.job_function_id in (:jobFunctionId)` : ` and j.job_function_id=:jobFunctionId`;
      }
      if (jobIndustryId) {
        sqlStmt += isArray(jobIndustryId) ? ` and j.job_industry_id in (:jobIndustryId)` : ` and j.job_industry_id=:jobIndustryId`;
      }
      if (jobLocationId) {
        sqlStmt += isArray(jobLocationId) ? ` and j.job_location_id in (:jobLocationId)` : ` and j.job_location_id=:jobLocationId`;
      }
      if (minExp) sqlStmt += ` and j.min_exp=:minExp`;

      // search
      if (search) {
        sqlStmt += ` and (
                    jn.job_name ilike :searchVal
                    or jt.job_type_name ilike :searchVal
                    or jf.job_function_name ilike :searchVal
                    or ji.job_industry_name ilike :searchVal
                    or jl.job_location_name ilike :searchVal
                    or j.job_description ilike :searchVal
                )`;
      };

      if (type !== 'count') {
        // sorts
        if (sortBy === 'job_name') {
          sqlStmt += ` order by jn.${sortBy} ${sortType}`;
        } else {
          sqlStmt += ` order by j.${sortBy} ${sortType}`;
        }
        // limit and offset
        sqlStmt += ` limit :limitNum  offset :offsetNum`
      };

      return sqlStmt;
    }

    const sequelize = db1.sequelize;
    const allSQLJobs = await sequelize.query(getSqlStmt(), {
      type: QueryTypes.SELECT,
      replacements: {
        userId, recruiterCompanyId,
        jobTypeId, jobFunctionId, jobIndustryId, jobLocationId, minExp,
        sortBy, sortType, limitNum, offsetNum,
        searchVal, lowerDateRange, upperDateRange
      },
    });
    const allSQLJobsCount = await sequelize.query(getSqlStmt('count'), {
      type: QueryTypes.SELECT,
      replacements: {
        userId, recruiterCompanyId,
        jobTypeId, jobFunctionId, jobIndustryId, jobLocationId, minExp,
        sortBy, sortType, limitNum, offsetNum,
        searchVal, lowerDateRange, upperDateRange
      },
    });
    const allJobs = camelizeKeys(allSQLJobs);

    for (let j of allJobs) {
      if (j.accessLevel === 'creator' || j.accessLevel === 'administrator') {
        const sqlStmtForJobQuesCount = `select count(*) from hris.questionnaire q
                inner join hris.questiontarget qt on qt.target_id=q.question_target_id
                where qt.target_id=2`;

        const allSQLJobQuesCount = await sequelize.query(sqlStmtForJobQuesCount, {
          type: QueryTypes.SELECT,
          replacements: {},
        });
        const jobQuesCount = allSQLJobQuesCount[0].count;

        const sqlStmtForJobResCount = `select count(*) 
                from hris.jobsquesresponses jqr
                where jqr.job_id=:jobId`;

        const allSQLJobResCount = await sequelize.query(sqlStmtForJobResCount, {
          type: QueryTypes.SELECT,
          replacements: {
            jobId: j.jobId,
          },
        });
        const jobResCount = allSQLJobResCount[0].count;

        if (jobQuesCount === jobResCount) {
          j.isQuestionnaireComplete = true;
        } else {
          j.isQuestionnaireComplete = false;
        }
      }
    };

    const responses = { count: allSQLJobsCount[0].count, jobs: allJobs };
    return h.response(responses).code(200);
  }
  catch (error) {
    console.error(error.stack);
    return h.response({ error: true, message: 'Internal Server Error!' }).code(500);
  }
}

const updateJob = async (request, h) => {
  try {
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden', code: "xemp-1" }).code(401);
    }
    // Checking user type from jwt
    let luserTypeName = request.auth.artifacts.decoded.userTypeName;
    if (luserTypeName !== 'employer') {
      return h.response({ error: true, message: 'You are not authorized!' }).code(403);
    }

    const { credentials } = request.auth || {};
    const { id: userId } = credentials || {};

    const { jobUuid } = request.params || {};
    const { jobName, jobDescription, jobIndustryId, jobFunctionId, jobTypeId, jobLocationId, minExp, isPrivate, duration, closeDate, jobSkills } = request.payload || {};

    const closeDateVal = closeDate && new Date(closeDate);
    const isValidCloseDate = closeDate ? !isNaN(Date.parse(closeDateVal)) : true;
    if (!isValidCloseDate) return h.response({ error: true, message: 'Invalid closeDate!' }).code(400);

    const { Job, Jobname, Jobskill, Jobhiremember, Jobauditlog, Jobtype, Userinfo } = request.getModels('xpaxr');
    // get the company of the recruiter
    const userRecord = await Userinfo.findOne({ where: { userId }, attributes: { exclude: ['createdAt', 'updatedAt'] } });
    const userProfileInfo = userRecord && userRecord.toJSON();
    const { companyId: recruiterCompanyId } = userProfileInfo || {};

    const existingJobRecord = await Job.findOne({ where: { jobUuid, isDeleted: false } });
    const existingJobInfo = existingJobRecord && existingJobRecord.toJSON();
    const { jobId, companyId: creatorCompanyId } = existingJobInfo || {};

    if (!jobId) return h.response({ error: true, message: `No job found!` }).code(400);
    if (recruiterCompanyId !== creatorCompanyId) {
      return h.response({ error: true, message: `You are not authorized!` }).code(403);
    }

    // does (s)he have access to do this?
    const doIhaveAccessRecord = await Jobhiremember.findOne({ where: { jobId, userId } });
    const doIhaveAccessInfo = doIhaveAccessRecord && doIhaveAccessRecord.toJSON();
    const { accessLevel: luserAccessLevel } = doIhaveAccessInfo || {};

    if (luserAccessLevel !== 'creator' && luserAccessLevel !== 'administrator') return h.response({ error: true, message: 'You are not authorized!' }).code(403);

    let typeIdOfThisUpdatedJob;
    let durationVal = duration;
    if (!durationVal) {
      const jobRecord = await Job.findOne({ where: { jobUuid } });
      const jobInfo = jobRecord && jobRecord.toJSON();
      const { jobTypeId: thisJobTypeId, duration: thisJobDuration } = jobInfo || {};
      durationVal = thisJobDuration;
    }

    if (jobTypeId) {
      typeIdOfThisUpdatedJob = jobTypeId;
    } else {
      const jobRecord = await Job.findOne({ where: { jobUuid } });
      const jobInfo = jobRecord && jobRecord.toJSON();
      const { jobTypeId: thisJobTypeId } = jobInfo || {};
      typeIdOfThisUpdatedJob = thisJobTypeId;
    }

    const jobTypeRecord = await Jobtype.findOne({ where: { jobTypeId: typeIdOfThisUpdatedJob } });
    const jobTypeInfo = jobTypeRecord && jobTypeRecord.toJSON();
    const { jobTypeName } = jobTypeInfo || {};

    const jobsWithDuration = ['Internship', 'Full-time Contract', 'Part-time Contract'];
    const isJobWithDuration = jobsWithDuration.includes(jobTypeName);

    if (isJobWithDuration && !durationVal) {
      return h.response({ error: true, message: 'Please provide the duration!' }).code(400);
    }
    if (!isJobWithDuration) {
      durationVal = null;
    }

    // check if job name already exists
    let jobNameIdToSave;
    if (jobName) {
      const jobNameRecord = await Jobname.findOne({ where: { jobNameLower: jobName.toLowerCase() } });
      const jobNameInfo = jobNameRecord && jobNameRecord.toJSON();
      const { jobNameId: oldJobNameId } = jobNameInfo || {};

      if (!oldJobNameId) {
        const newJobNameRecord = await Jobname.create({
          jobName,
          jobNameLower: jobName.toLowerCase().trim(),
        });
        const newJobNameInfo = newJobNameRecord && newJobNameRecord.toJSON();
        const { jobNameId: newJobNameId } = newJobNameInfo || {};
        jobNameIdToSave = newJobNameId;
      } else {
        jobNameIdToSave = oldJobNameId;
      }
    }

    // job skills (if skill exist, use the existing id, if not create and then use that new id)
    if (jobSkills && !isArray(jobSkills)) {
      return h.response({ error: true, message: 'jobSkills must be an array of strings' }).code(400);
    }
    const jobskillIds = [];
    if (jobSkills && isArray(jobSkills)) {
      for (let i = 0; i < jobSkills.length; i++) {
        const item = jobSkills[i];

        // check if job skill name already exists
        const jobskillRecord = await Jobskill.findOne({ where: { jobskillNameLower: item.toLowerCase() } });
        const jobskillInfo = jobskillRecord && jobskillRecord.toJSON();
        const { jobskillId: oldJobskillId } = jobskillInfo || {};

        if (!oldJobskillId) {
          const newJobskillRecord = await Jobskill.create({
            jobskillName: item,
            jobskillNameLower: item.toLowerCase().trim(),
          });
          const newJobskillInfo = newJobskillRecord && newJobskillRecord.toJSON();
          const { jobskillId: newJobskillId } = newJobskillInfo || {};
          jobskillIds.push(newJobskillId);
        } else {
          jobskillIds.push(oldJobskillId);
        }
      }
    }

    await Job.update({ jobNameId: jobNameIdToSave, jobDescription, jobIndustryId, jobFunctionId, jobTypeId, jobLocationId, minExp, isPrivate, duration: durationVal, closeDate: closeDateVal, jobskillIds }, { where: { jobUuid } });
    const record = await Job.findOne({ where: { jobUuid } });

    await Jobauditlog.create({
      affectedJobId: jobId,
      performerUserId: userId,
      actionName: 'Update a Job',
      actionType: 'UPDATE',
      actionDescription: `The user of userId ${userId} has updated the job of jobId ${jobId}`
    });

    return h.response(record).code(200);
  }
  catch (error) {
    console.error(error.stack);
    return h.response({ error: true, message: 'Bad Request' }).code(400);
  }
}

const deleteJob = async (request, h) => {
  try {
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden', code: "xemp-1" }).code(401);
    }
    // Checking user type from jwt
    let luserTypeName = request.auth.artifacts.decoded.userTypeName;
    if (luserTypeName !== 'employer') {
      return h.response({ error: true, message: 'You are not authorized!' }).code(403);
    }

    const { credentials } = request.auth || {};
    const { id: userId } = credentials || {};

    const { jobUuid } = request.params || {};

    const { Job, Jobhiremember, Jobauditlog, Userinfo } = request.getModels('xpaxr');
    // get the company of the recruiter
    const userRecord = await Userinfo.findOne({ where: { userId }, attributes: { exclude: ['createdAt', 'updatedAt'] } });
    const userProfileInfo = userRecord && userRecord.toJSON();
    const { companyId: luserCompanyId } = userProfileInfo || {};

    const existingJobRecord = await Job.findOne({ where: { jobUuid, isDeleted: false } });
    const existingJobInfo = existingJobRecord && existingJobRecord.toJSON();
    const { jobId, companyId: creatorCompanyId } = existingJobInfo || {};

    if (!jobId) return h.response({ error: true, message: `No job found!` }).code(400);
    if (luserCompanyId !== creatorCompanyId) return h.response({ error: true, message: `You are not authorized!` }).code(403);

    // does (s)he have access to do this?
    const doIhaveAccessRecord = await Jobhiremember.findOne({ where: { jobId, userId } });
    const doIhaveAccessInfo = doIhaveAccessRecord && doIhaveAccessRecord.toJSON();
    const { accessLevel: luserAccessLevel } = doIhaveAccessInfo || {};

    if (luserAccessLevel !== 'creator' && luserAccessLevel !== 'administrator') return h.response({ error: true, message: 'You are not authorized!' }).code(403);

    const timeNow = new Date();
    await Job.update({ isDeleted: true, deletedAt: timeNow }, { where: { jobUuid } });

    await Jobauditlog.create({
      affectedJobId: jobId,
      performerUserId: userId,
      actionName: 'DELETE a Job',
      actionType: 'DELETE',
      actionDescription: `The user of userId ${userId} has deleted the job of jobId ${jobId}`
    });

    return h.response({ message: `Job deletion successful!` }).code(200);
  }
  catch (error) {
    console.error(error.stack);
    return h.response({ error: true, message: 'Bad Request' }).code(400);
  }
}

const getAllDeletedJobs = async (request, h) => {
  try {
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden', code: "xemp-1" }).code(401);
    }
    // Checking user type from jwt
    let luserTypeName = request.auth.artifacts.decoded.userTypeName;
    if (luserTypeName !== 'superadmin') return h.response({ error: true, message: 'You are not authorized!' }).code(403);

    const { limit, offset, sort, search, jobId, companyId, createdStartDate, createdEndDate, deletedStartDate, deletedEndDate } = request.query;
    const searchVal = `%${search ? search.toLowerCase() : ''}%`;

    // sort query
    let [sortBy, sortType] = sort ? sort.split(':') : ['deleted_at', 'desc'];
    if (!sortType && sortBy !== 'deleted_at') sortType = 'asc';
    if (!sortType && sortBy === 'deleted_at') sortType = 'desc';

    const validSorts = ['deleted_at', 'created_at', 'job_name', 'company_name'];
    const isSortReqValid = validSorts.includes(sortBy);

    const validSortTypes = ['asc', 'desc'];
    const isSortTypeReqValid = validSortTypes.includes(sortType.toLowerCase());

    // pagination query
    const limitNum = limit ? Number(limit) : 10;
    const offsetNum = offset ? Number(offset) : 0;

    // query validation        
    if (isNaN(limitNum)) return h.response({ error: true, message: 'Invalid limit query parameter! The limit query parameter must be a number!' }).code(400);
    if (isNaN(offsetNum)) return h.response({ error: true, message: 'Invalid offset query parameter! The offset query parameter must be a number!' }).code(400);

    if (!sortBy || !isSortReqValid) return h.response({ error: true, message: 'Invalid sort query parameter!' }).code(400);
    if (!isSortTypeReqValid) return h.response({ error: true, message: 'Invalid sort query parameter! Sort type is invalid, it should be either "asc" or "desc"!' }).code(400);

    if (limitNum < 0) return h.response({ error: true, message: 'Limit must be greater than 0!' }).code(400);
    if (limitNum > 100) return h.response({ error: true, message: 'Limit must not exceed 100!' }).code(400);

    if (isArray(jobId)) return h.response({ error: true, message: 'Please provide only one jobId!' }).code(400);
    if (isArray(companyId)) return h.response({ error: true, message: 'Please provide only one companyId!' }).code(400);

    // custom date search query
    let createdLowerDateRange;
    let createdUpperDateRange;
    let deletedLowerDateRange;
    let deletedUpperDateRange;

    if (!createdStartDate && createdEndDate) return h.response({ error: true, message: `You can't send createdEndDate without createdStartDate!` }).code(400);
    if (!deletedStartDate && deletedEndDate) return h.response({ error: true, message: `You can't send deletedEndDate without deletedStartDate!` }).code(400);

    if (createdStartDate) {
      if (createdStartDate && !createdEndDate) {
        createdLowerDateRange = new Date(createdStartDate);
        createdUpperDateRange = new Date(); //Now()
      }
      if (createdStartDate && createdEndDate) {
        createdLowerDateRange = new Date(createdStartDate);
        createdUpperDateRange = new Date(createdEndDate);
      }

      const isValidDate = !isNaN(Date.parse(createdLowerDateRange)) && !isNaN(Date.parse(createdUpperDateRange));
      if (!isValidDate) return h.response({ error: true, message: 'Invalid createdStartDate or createdEndDate query parameter!' }).code(400);
      const isValidDateRange = createdLowerDateRange.getTime() < createdUpperDateRange.getTime();
      if (!isValidDateRange) return h.response({ error: true, message: 'createdEndDate must be after createdStartDate!' }).code(400);
    }

    if (deletedStartDate) {
      if (deletedStartDate && !deletedEndDate) {
        deletedLowerDateRange = new Date(deletedStartDate);
        deletedUpperDateRange = new Date(); //Now()
      }
      if (deletedStartDate && deletedEndDate) {
        deletedLowerDateRange = new Date(deletedStartDate);
        deletedUpperDateRange = new Date(deletedEndDate);
      }

      const isValidDate = !isNaN(Date.parse(deletedLowerDateRange)) && !isNaN(Date.parse(deletedUpperDateRange));
      if (!isValidDate) return h.response({ error: true, message: 'Invalid deletedStartDate or deletedEndDate query parameter!' }).code(400);
      const isValidDateRange = deletedLowerDateRange.getTime() < deletedUpperDateRange.getTime();
      if (!isValidDateRange) return h.response({ error: true, message: 'deletedEndDate must be after deletedStartDate!' }).code(400);
    }

    const db1 = request.getDb('xpaxr');

    // get sql statement for getting deleted jobs or its count
    const filters = { createdStartDate, deletedStartDate, jobId, companyId, search };
    function getSqlStmt(queryType, obj = filters) {
      const { createdStartDate, deletedStartDate, jobId, companyId, search } = obj;
      let sqlStmt;
      const type = queryType && queryType.toLowerCase();
      if (type === 'count') {
        sqlStmt = `select count(*)`;
      } else {
        sqlStmt = `select
                jn.job_name, j.*, jt.*, jf.*,ji.*,jl.*, c.display_name as company_name`;
      }

      sqlStmt += `                    
                from hris.jobs j
                    inner join hris.jobname jn on jn.job_name_id=j.job_name_id
                    inner join hris.company c on c.company_id=j.company_id
                    inner join hris.jobtype jt on jt.job_type_id=j.job_type_id                
                    inner join hris.jobfunction jf on jf.job_function_id=j.job_function_id                
                    inner join hris.jobindustry ji on ji.job_industry_id=j.job_industry_id
                    inner join hris.joblocation jl on jl.job_location_id=j.job_location_id                    
                where j.is_deleted=true`;

      if (createdStartDate) sqlStmt += ` and j.created_at >= :createdLowerDateRange and j.created_at <= :createdUpperDateRange`;
      if (deletedStartDate) sqlStmt += ` and j.deleted_at >= :deletedLowerDateRange and j.deleted_at <= :deletedUpperDateRange`;

      // filters
      if (jobId) sqlStmt += ` and j.job_id=:jobId`;
      if (companyId) sqlStmt += ` and j.company_id=:companyId`;

      // search
      if (search) {
        sqlStmt += ` and jn.job_name ilike :searchVal`;
      };

      if (type !== 'count') {
        // sorts
        if (sortBy === 'job_name') {
          sqlStmt += ` order by jn.${sortBy} ${sortType}`;
        } else if (sortBy === 'company_name') {
          sqlStmt += ` order by c.${sortBy} ${sortType}`;
        } else {
          sqlStmt += ` order by j.${sortBy} ${sortType}`;
        }
        // limit and offset
        sqlStmt += ` limit :limitNum  offset :offsetNum`
      };

      return sqlStmt;
    }

    const sequelize = db1.sequelize;
    const allDeletedSQLJobs = await sequelize.query(getSqlStmt(), {
      type: QueryTypes.SELECT,
      replacements: {
        jobId, companyId,
        sortBy, sortType, searchVal,
        limitNum, offsetNum,
        createdLowerDateRange, createdUpperDateRange,
        deletedLowerDateRange, deletedUpperDateRange
      },
    });
    const allDeletedSQLJobsCount = await sequelize.query(getSqlStmt('count'), {
      type: QueryTypes.SELECT,
      replacements: {
        jobId, companyId,
        sortBy, sortType, searchVal,
        limitNum, offsetNum,
        createdLowerDateRange, createdUpperDateRange,
        deletedLowerDateRange, deletedUpperDateRange
      },
    });
    const allDeletedJobs = camelizeKeys(allDeletedSQLJobs);

    const responses = { count: allDeletedSQLJobsCount[0].count, jobs: allDeletedJobs };
    return h.response(responses).code(200);
  }
  catch (error) {
    console.error(error.stack);
    return h.response({ error: true, message: 'Bad Request' }).code(400);
  }
}

const restoreDeletedJob = async (request, h) => {
  try {
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden', code: "xemp-1" }).code(401);
    }
    // Checking user type from jwt
    let luserTypeName = request.auth.artifacts.decoded.userTypeName;
    if (luserTypeName !== 'superadmin') return h.response({ error: true, message: 'You are not authorized!' }).code(403);

    const { credentials } = request.auth || {};
    const { id: userId } = credentials || {};

    const { jobId } = request.payload || {};
    if (!jobId) return h.response({ error: true, message: `Please provide a jobId!` }).code(400);

    const { Job, Jobauditlog } = request.getModels('xpaxr');

    const jobRecord = await Job.findOne({ where: { jobId } });
    const jobInfo = jobRecord && jobRecord.toJSON();
    const { jobId: existingJobId, isDeleted: isAlreadyDeleted } = jobInfo || {};

    if (!existingJobId) return h.response({ error: true, message: `No job found!` }).code(400);
    if (!isAlreadyDeleted) return h.response({ error: true, message: `This job hasn't been deleted yet!` }).code(400);

    await Job.update({ isDeleted: false, deletedAt: null }, { where: { jobId } });
    const restoredJob = await Job.findOne({ where: { jobId } });

    await Jobauditlog.create({
      affectedJobId: jobId,
      performerUserId: userId,
      actionName: 'RESTORE a Job',
      actionType: 'UPDATE',
      actionDescription: `The user of userId ${userId} has restored the deleted job of jobId ${jobId}`
    });

    return h.response(restoredJob).code(200);
  }
  catch (error) {
    console.error(error.stack);
    return h.response({ error: true, message: 'Bad Request' }).code(400);
  }
}

const createJobQuesResponses = async (request, h) => {
  try {
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden', code: "xemp-1" }).code(401);
    }
    // Checking user type from jwt
    let luserTypeName = request.auth.artifacts.decoded.userTypeName;
    if (luserTypeName !== 'employer') {
      return h.response({ error: true, message: 'You are not authorized!' }).code(403);
    }

    const { credentials } = request.auth || {};
    const { id: userId } = credentials || {};

    const { jobId } = request.params || {};
    const questionResponses = request.payload || {};

    const responses = []
    for (let response of questionResponses) {
      const { questionId, answer } = response;
      const record = { questionId, responseVal: { 'answer': answer }, jobId }
      responses.push(record);
    }
    const { Userinfo, Jobsquesresponse, Jobhiremember, Job } = request.getModels('xpaxr');

    // get the company of the recruiter
    const userRecord = await Userinfo.findOne({ where: { userId }, attributes: { exclude: ['createdAt', 'updatedAt'] } });
    const userProfileInfo = userRecord && userRecord.toJSON();
    const { companyId: luserCompanyId } = userProfileInfo || {};

    const existingJobRecord = await Job.findOne({ where: { jobId, isDeleted: false } });
    const existingJobInfo = existingJobRecord && existingJobRecord.toJSON();
    const { jobId: existingJobId, companyId: creatorCompanyId } = existingJobInfo || {};

    if (!existingJobId) return h.response({ error: true, message: 'No Job found!' }).code(400);
    if (luserCompanyId !== creatorCompanyId) return h.response({ error: true, message: 'You are not authorized!' }).code(400);

    // does (s)he have access to do this?
    const doIhaveAccessRecord = await Jobhiremember.findOne({ where: { jobId: existingJobId, userId } });
    const doIhaveAccessInfo = doIhaveAccessRecord && doIhaveAccessRecord.toJSON();
    const { accessLevel: luserAccessLevel } = doIhaveAccessInfo || {};

    if (luserAccessLevel !== 'creator' && luserAccessLevel !== 'administrator') return h.response({ error: true, message: 'You are not authorized!' }).code(403);

    const records = await Jobsquesresponse.bulkCreate(responses, { updateOnDuplicate: ["responseVal"] });

    // formatting the questionaire response
    const quesResponses = [];
    for (let response of records) {
      const { questionId, responseVal } = response;
      const res = { questionId, answer: responseVal.answer };
      quesResponses.push(res);
    }

    return h.response({ responses: quesResponses }).code(200);
  }
  catch (error) {
    console.error(error.stack);
    return h.response({ error: true, message: 'Bad Request' }).code(400);
  }
}

const getJobQuesResponses = async (request, h) => {
  try {
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden', code: "xemp-1" }).code(401);
    }
    // Checking user type from jwt
    let luserTypeName = request.auth.artifacts.decoded.userTypeName;
    if (luserTypeName !== 'employer') {
      return h.response({ error: true, message: 'You are not authorized!' }).code(403);
    }

    const { credentials } = request.auth || {};
    const { id: userId } = credentials || {};

    const { jobId } = request.params || {};
    const { Userinfo, Job, Jobsquesresponse, Jobhiremember } = request.getModels('xpaxr');

    // get the company of the recruiter
    const userRecord = await Userinfo.findOne({ where: { userId }, attributes: { exclude: ['createdAt', 'updatedAt'] } });
    const userProfileInfo = userRecord && userRecord.toJSON();
    const { companyId: luserCompanyId } = userProfileInfo || {};

    const existingJobRecord = await Job.findOne({ where: { jobId, isDeleted: false } });
    const existingJobInfo = existingJobRecord && existingJobRecord.toJSON();
    const { jobId: existingJobId, companyId: creatorCompanyId } = existingJobInfo || {};

    if (!existingJobId) return h.response({ error: true, message: 'No Job found!' }).code(400);
    if (luserCompanyId !== creatorCompanyId) return h.response({ error: true, message: 'You are not authorized!' }).code(400);

    // does (s)he have access to do this?
    const doIhaveAccessRecord = await Jobhiremember.findOne({ where: { jobId: existingJobId, userId } });
    const doIhaveAccessInfo = doIhaveAccessRecord && doIhaveAccessRecord.toJSON();
    const { accessLevel: luserAccessLevel } = doIhaveAccessInfo || {};

    if (luserAccessLevel !== 'creator' && luserAccessLevel !== 'administrator') return h.response({ error: true, message: 'You are not authorized!' }).code(403);

    const records = await Jobsquesresponse.findAll({ where: { jobId } });
    const responses = [];
    for (let response of records) {
      const { questionId, responseVal } = response;
      const res = { questionId, answer: responseVal.answer };
      responses.push(res);
    }
    return h.response({ responses }).code(200);
  }
  catch (error) {
    console.error(error.stack);
    return h.response({ error: true, message: 'Internal Server Error!' }).code(500);
  }
}

const isUserQuestionnaireDone = async (userId, model) => {
  const { Userquesresponse, Questionnaire, Questiontarget } = model
  let questionnaireCount = Questionnaire.count({
    include: [{
      model: Questiontarget,
      as: "questionTarget",
      where: {
        targetName: "empauwer_me",        
        
      },
      required: true
    }],
    where: {
      isActive: true,
      part: [1, 2]
    },
    required: true
  })

  let responsesCount = Userquesresponse.count({
    required: true,
    include: [
      {
        model: Questionnaire,
        as: "question",
        where: {
          isActive: true
        },
        required: true
      }
    ],
    where: {
      userId
    }
  });
  return await questionnaireCount <= await responsesCount;
}

module.exports = {
  createJob,
  getSingleJob,
  getAllJobs,
  getRecruiterJobs,

  updateJob,
  deleteJob,
  getAllDeletedJobs,
  restoreDeletedJob,

  createJobQuesResponses,
  getJobQuesResponses,
}
