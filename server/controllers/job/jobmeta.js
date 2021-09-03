const { Op, Sequelize, QueryTypes, cast, literal } = require('sequelize');
const validator = require('validator');
import { camelizeKeys } from '../../utils/camelizeKeys'
import { sendEmailAsync } from '../../utils/email'
import formatQueryRes from '../../utils/index'
import { isArray } from 'lodash';
const axios = require('axios')
const moment = require('moment');
const config = require('config');

const getJobDetailsOptions = async (request, h) => {
  try {
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden', code: "xemp-1" }).code(401);
    }
    const { Jobtype, Jobfunction, Jobindustry, Joblocation } = request.getModels('xpaxr');
    const [jobTypes, jobFunctions, jobIndustries, jobLocations] = await Promise.all([
      Jobtype.findAll({}),
      Jobfunction.findAll({}),
      Jobindustry.findAll({}),
      Joblocation.findAll({})
    ]);
    const responses = {
      function: jobFunctions,
      industry: jobIndustries,
      location: jobLocations,
      type: jobTypes,
    };
    return h.response(responses).code(200);
  }
  catch (error) {
    console.error(error.stack);
    return h.response({ error: true, message: 'Internal Server Error!' }).code(500);
  }
}

const getAutoComplete = async (request, h) => {
  try {
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden', code: "xemp-1" }).code(401);
    }
    const { search, type } = request.query;
    if (!(search && type)) return h.response({ error: true, message: 'Query parameters missing (search and type)!' }).code(400);
    const searchVal = `%${search.toLowerCase()}%`;

    const validTypes = ['jobName', 'jobIndustry', 'jobFunction', 'countryName'];
    const isTypeReqValid = validTypes.includes(type);
    if (!isTypeReqValid) return h.response({ error: true, message: 'Not a valid type parameter!' }).code(400);

    const db1 = request.getDb('xpaxr');

    // get sql statement for getting jobs or jobs count
    const filters = { type };
    function getSqlStmt(queryType, obj = filters) {
      const { type } = obj;
      let sqlStmt;
      const queryTypeLower = queryType && queryType.toLowerCase();
      if (queryTypeLower === 'count') {
        sqlStmt = `select count(*)`;
      } else {
        sqlStmt = `select`;

        if (type === 'jobName') sqlStmt += ` jn.job_name_id, jn.job_name`;
        if (type === 'jobIndustry') sqlStmt += `  ji.job_industry_id, ji.job_industry_name`;
        if (type === 'jobFunction') sqlStmt += ` jf.job_function_id, jf.job_function_name`;
        if (type === 'countryName') sqlStmt += ` c.country_id, c.country_full`;
      }

      if (type === 'jobName') sqlStmt += ` from hris.jobname jn where jn.job_name ilike :searchVal`;
      if (type === 'jobIndustry') sqlStmt += ` from hris.jobindustry ji where ji.job_industry_name ilike :searchVal`;
      if (type === 'jobFunction') sqlStmt += ` from hris.jobfunction jf where jf.job_function_name ilike :searchVal`;
      if (type === 'countryName') sqlStmt += ` from hris.country c where c.country_full ilike :searchVal`;

      if (queryTypeLower !== 'count') sqlStmt += ` limit 10`
      return sqlStmt;
    };

    const sequelize = db1.sequelize;
    const allSQLAutoCompletes = await sequelize.query(getSqlStmt(), {
      type: QueryTypes.SELECT,
      replacements: { searchVal },
    });
    const allSQLAutoCompletesCount = await sequelize.query(getSqlStmt('count'), {
      type: QueryTypes.SELECT,
      replacements: { searchVal },
    });
    const allAutoCompletes = camelizeKeys(allSQLAutoCompletes);

    const responses = { count: allSQLAutoCompletesCount[0].count, autoCompletes: allAutoCompletes };
    return h.response(responses).code(200);
  }
  catch (error) {
    console.error(error.stack);
    return h.response({ error: true, message: 'Internal Server Error!' }).code(500);
  }
}

const getJobVisitCount = async (request, h) => {
  try {
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden', code: "xemp-1" }).code(401);
    }
    const { credentials } = request.auth || {};
    const { id: userId } = credentials || {};

    // Checking user type from jwt
    let luserTypeName = request.auth.artifacts.decoded.userTypeName;
    if (luserTypeName !== 'employer') return h.response({ error: true, message: 'You are not authorized!' }).code(403);

    const { startDate: qStartDate, endDate: qEndDate } = request.query || {};
    const { jobId } = request.params || {};

    const { Userinfo, Job, Jobhiremember } = request.getModels('xpaxr');

    // get company of luser
    const userRecord = await Userinfo.findOne({ where: { userId } });
    const userInfo = userRecord && userRecord.toJSON();
    const { companyId: luserCompanyId } = userInfo || {};

    // check if (s)he has access to see it
    const jobRecord = await Job.findOne({ where: { jobId } });
    const jobRecordInfo = jobRecord && jobRecord.toJSON();
    const { jobId: existingJobId, companyId: creatorCompanyId } = jobRecordInfo || {};
    if (!existingJobId) return h.response({ error: true, message: 'No job found' }).code(400);
    if (luserCompanyId !== creatorCompanyId) return h.response({ error: true, message: 'You are not authorized!' }).code(403);

    const luserAccessRecord = await Jobhiremember.findOne({ where: { jobId, userId } });
    const luserAccessInfo = luserAccessRecord && luserAccessRecord.toJSON();
    const { accessLevel } = luserAccessInfo || {};
    if (accessLevel !== 'creator' && accessLevel !== 'administrator') return h.response({ error: true, message: 'You are not authorized!' }).code(403);

    // ______QUERY PARAMETERS
    // custom date search query
    let lowerDateRange;
    let upperDateRange;
    let startDate = qStartDate;
    const endDate = qEndDate;
    if (!qStartDate && endDate) return h.response({ error: true, message: `You can't send endDate without startDate!` }).code(400);

    if (!qStartDate) {
      // get latest applications within last 14 days
      startDate = moment().subtract(14, 'd').format();
    }
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

    const sqlStmt = `select *
        from hris.jobvisit jv
        where jv.visited_at >= :lowerDateRange and jv.visited_at <= :upperDateRange
            and jv.job_id=:jobId
        order by jv.visited_at desc`;

    const db1 = request.getDb('xpaxr');
    const sequelize = db1.sequelize;

    const jobVisitRecordsSQL = await sequelize.query(sqlStmt, {
      type: QueryTypes.SELECT,
      replacements: {
        jobId, lowerDateRange, upperDateRange
      },
    });
    const jobVisitRecords = camelizeKeys(jobVisitRecordsSQL);
    const uniqueVisitorIds = [];
    jobVisitRecords.forEach(item => uniqueVisitorIds.push(Number(item.visitorId)));
    const uniqueVisitRecords = jobVisitRecords.filter((v, i, a) => a.findIndex(t => (t.visitorId === v.visitorId)) === i)

    const uniqueVisits = uniqueVisitRecords.length;

    return h.response({ jobVisitCount: uniqueVisits }).code(200);
  }
  catch (error) {
    console.error(error.stack);
    return h.response({ error: true, message: 'Bad Request!' }).code(500);
  }
}

const getTop5EJobWithVisitCount = async (request, h) => {
  try {
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden', code: "xemp-1" }).code(401);
    }
    const { credentials } = request.auth || {};
    const { id: userId } = credentials || {};

    // Checking user type from jwt
    let luserTypeName = request.auth.artifacts.decoded.userTypeName;
    if (luserTypeName !== 'employer') return h.response({ error: true, message: 'You are not authorized!' }).code(403);

    const { Userinfo } = request.getModels('xpaxr');

    // get company of luser
    const userRecord = await Userinfo.findOne({ where: { userId } });
    const userInfo = userRecord && userRecord.toJSON();
    const { companyId: luserCompanyId } = userInfo || {};

    const sqlStmt = `select distinct
            jv.job_id, jv.visitor_id
        from hris.jobvisit jv
            inner join hris.jobs j on j.job_id=jv.job_id
            inner join hris.jobhiremember jhm on jhm.user_id=j.user_id and jhm.access_level in('creator','administrator')
        where j.user_id=:userId and j.company_id=:luserCompanyId

        group by jv.job_id, jv.visitor_id`;

    const db1 = request.getDb('xpaxr');
    const sequelize = db1.sequelize;

    const jobVisitRecordsSQL = await sequelize.query(sqlStmt, {
      type: QueryTypes.SELECT,
      replacements: {
        userId, luserCompanyId
      },
    });

    const jobVisitRecords = camelizeKeys(jobVisitRecordsSQL);
    console.log(jobVisitRecords);
    if (!jobVisitRecords[0]) return h.response({ jobs: [] }).code(200);

    const myMap = new Map();
    for (let item of jobVisitRecords) {
      if (myMap.get(item.jobId) === undefined) {
        myMap.set(item.jobId, [item.visitorId]);
      } else {
        const mapVal = myMap.get(item.jobId);
        mapVal.push(item.visitorId)
        myMap.set(item.jobId, mapVal);
      }
    };
    const refinedMap = new Map([...myMap].sort((item1, item2) => {
      return item2[1].length - item1[1].length;
    }));
    const jobIdArray = [...refinedMap.keys()];

    function getSqlStmt() {
      let sqlStmt = `select
                j.job_id, jn.job_name`;

      sqlStmt += `                    
                from hris.jobs j
                    inner join hris.jobname jn on jn.job_name_id=j.job_name_id
                    inner join hris.jobhiremember jhm on jhm.job_id=j.job_id 
                where j.active=true and j.is_deleted=false 
                    and j.company_id=:luserCompanyId 
                    and jhm.access_level in ('creator', 'administrator', 'viewer') 
                    and jhm.user_id=:userId
                    
                    and j.job_id in (:jobIdArray)`;

      sqlStmt += ` order by case`

      jobIdArray.forEach((jobId, index) => {
        sqlStmt += ` WHEN j.job_id=${jobId} THEN ${index}`;
      });

      sqlStmt += ` end asc`;
      sqlStmt += ` limit 5`;
      return sqlStmt;
    };

    const allSQLJobs = await sequelize.query(getSqlStmt(), {
      type: QueryTypes.SELECT,
      replacements: {
        userId, luserCompanyId, jobIdArray,
      },
    });
    const allJobs = camelizeKeys(allSQLJobs);

    for (let job of allJobs) {
      job.visitCount = refinedMap.get(job.jobId).length;
    };

    const responses = { jobs: allJobs };
    return h.response(responses).code(200);
  }
  catch (error) {
    console.error(error.stack);
    return h.response({ error: true, message: 'Bad Request!' }).code(500);
  }
}

const getApplicationPieChart = async (request, h) => {
  try {
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden', code: "xemp-1" }).code(401);
    }
    // Checking user type from jwt
    let luserTypeName = request.auth.artifacts.decoded.userTypeName;
    if (luserTypeName !== 'employer') return h.response({ error: true, message: 'You are not authorized!' }).code(403);

    const { credentials } = request.auth || {};
    const { id: userId } = credentials || {};

    const { Userinfo } = request.getModels('xpaxr');

    // get the company of the recruiter
    const userRecord = await Userinfo.findOne({ where: { userId }, attributes: { exclude: ['createdAt', 'updatedAt'] } });
    const userProfileInfo = userRecord && userRecord.toJSON();
    const { companyId: luserCompanyId, firstName: luserFirstName } = userProfileInfo || {};

    const sqlStmt = `select count(status), ja.job_id, ja.status
            from hris.jobapplications ja
                inner join hris.jobs j on j.job_id=ja.job_id and j.company_id=:luserCompanyId
                inner join hris.jobhiremember jhm on jhm.job_id=ja.job_id and jhm.user_id=:userId and jhm.access_level in ('creator', 'administrator')
            where ja.status not in ('withdrawn','closed')
            group by ja.job_id, status
            order by status`;

    const db1 = request.getDb('xpaxr');
    const sequelize = db1.sequelize;
    const onboardingTaskDetailsSQL = await sequelize.query(sqlStmt, {
      type: QueryTypes.SELECT,
      replacements: {
        userId, luserCompanyId
      },
    });
    const d = camelizeKeys(onboardingTaskDetailsSQL);
    /* grouped by status and jobId, so the items are same jobId 
    but different status and same status but different jobId
    d = [
      {
        count,
        jobId,
        status
      }
    ] 
    */

    // the status priority/power defining
    const hstatusMap = {
      applied: 1,
      shortlisted: 2,
      interview: 3,
      offer: 4,
    };

    const hiredJobs = {}; //we could have used an array (pushing the hired jobIds and then using includes() method), but it is less efficient than hashMap, so using this obj (hashMap)
    const jhstatus = {};//loop through js status and count applied shortlisted etc counts
    const jstatuscounts = {};//the counts for statuses based on each job

    d.forEach(r => {
      const { jobId, status, count } = r || {};
      if (count > 0) {
        if (jstatuscounts[jobId]) {
          jstatuscounts[jobId][status] = count;
        } else {
          jstatuscounts[jobId] = {
            [status]: count
          }
        }
        if (status === 'hired' && count > 0) {
          hiredJobs[jobId] = true;
        }
        // const jstatusMapValue: number = hstatusMap[status];
        // const jhstatusValue: number = hstatusMap[jhstatus[jobId]: status string];
        if (hstatusMap[status] > hstatusMap[jhstatus[jobId]]) {
          jhstatus[jobId] = status;
        }
        else if (!jhstatus[jobId]) {
          jhstatus[jobId] = status;
        }
      }
    });


    // jhstatus = {
    //     123: 'interview',
    //     124: 'offer',
    //     125: 'offer',
    // }
    const out = {
      applied: 0,
      shortlisted: 0,
      interview: 0,
      offer: 0,
    };
    d.forEach(r => {
      const { jobId, status, count } = r || {};
      if (count > 0 && !hiredJobs[jobId]) {
        if (out[status]) {
          out[status] = Number(out[status]) + Number(count);
        } else {
          out[status] = Number(count);
        }
      }

    });


    // here out is for application pie chart data
    let total = 0;
    Object.entries(out).forEach(([key, value]) => total += Number(value));
    const responses = {
      total,
      status: out,
    }

    return h.response(responses).code(200);
  }
  catch (error) {
    console.error(error.stack);
    return h.response({ error: true, message: 'Bad Request' }).code(400);
  }
}

const getJobApplicationPieChart = async (request, h) => {
  try {
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden', code: "xemp-1" }).code(401);
    }
    // Checking user type from jwt
    let luserTypeName = request.auth.artifacts.decoded.userTypeName;
    if (luserTypeName !== 'employer') return h.response({ error: true, message: 'You are not authorized!' }).code(403);

    const { credentials } = request.auth || {};
    const { id: userId } = credentials || {};

    const { Userinfo } = request.getModels('xpaxr');

    // get the company of the recruiter
    const userRecord = await Userinfo.findOne({ where: { userId }, attributes: { exclude: ['createdAt', 'updatedAt'] } });
    const userProfileInfo = userRecord && userRecord.toJSON();
    const { companyId: luserCompanyId, firstName: luserFirstName } = userProfileInfo || {};

    const sqlStmt = `select count(status), ja.job_id, ja.status
            from hris.jobapplications ja
                inner join hris.jobs j on j.job_id=ja.job_id and j.company_id=:luserCompanyId
                inner join hris.jobhiremember jhm on jhm.job_id=ja.job_id and jhm.user_id=:userId and jhm.access_level in ('creator', 'administrator')
            where true 
                and ja.status not in ('withdrawn','closed')
            group by ja.job_id, status
            order by status`;

    const db1 = request.getDb('xpaxr');
    const sequelize = db1.sequelize;
    const onboardingTaskDetailsSQL = await sequelize.query(sqlStmt, {
      type: QueryTypes.SELECT,
      replacements: {
        userId, luserCompanyId
      },
    });
    const d = camelizeKeys(onboardingTaskDetailsSQL);
    /* grouped by status and jobId, so the items are same jobId 
    but different status and same status but different jobId
    d = [
      {
        count,
        jobId,
        status
      }
    ] 
    */

    // the status priority/power defining
    const hstatusMap = {
      applied: 1,
      shortlisted: 2,
      interview: 3,
      offer: 4,
    };

    const hiredJobs = {}; //we could have used an array (pushing the hired jobIds and then using includes() method), but it is less efficient than hashMap, so using this obj (hashMap)
    const jhstatus = {};//loop through js status and count applied shortlisted etc counts
    const jstatuscounts = {};//the counts for statuses based on each job

    d.forEach(r => {
      const { jobId, status, count } = r || {};
      if (count > 0) {
        if (jstatuscounts[jobId]) {
          jstatuscounts[jobId][status] = count;
        } else {
          jstatuscounts[jobId] = {
            [status]: count
          }
        }
        if (status === 'hired' && count > 0) {
          hiredJobs[jobId] = true;
        }

        // const jstatusMapValue: number = hstatusMap[status];
        // const jhstatusValue: number = hstatusMap[jhstatus[jobId]: status string];
        if (hstatusMap[status] > hstatusMap[jhstatus[jobId]]) {
          jhstatus[jobId] = status;
        }

        else if (!jhstatus[jobId]) {
          jhstatus[jobId] = status;
        }
      }
    });


    // jhstatus = {
    //     123: 'interview',
    //     124: 'offer',
    //     125: 'offer',
    // }

    const out = {
      applied: 0,
      shortlisted: 0,
      interview: 0,
      offer: 0,
    };
    d.forEach(r => {
      const { jobId, status, count } = r || {};
      if (count > 0 && !hiredJobs[jobId]) {
        if (out[status]) {
          out[status] = Number(out[status]) + Number(count);
        } else {
          out[status] = Number(count);
        }
      }

    });

    const jobBasedOut = {
      applied: 0,
      shortlisted: 0,
      interview: 0,
      offer: 0,
    };
    Object.entries(jhstatus).forEach(([key, value]) => {
      if (jobBasedOut[value]) {
        jobBasedOut[value]++
      } else {
        jobBasedOut[value] = 1;
      }
    });

    // here out is for application pie chart data
    let total = 0;
    Object.entries(jobBasedOut).forEach(([key, value]) => total += Number(value));
    const responses = {
      total,
      status: jobBasedOut,
    }

    return h.response(responses).code(200);
  }
  catch (error) {
    console.error(error.stack);
    return h.response({ error: true, message: 'Bad Request' }).code(400);
  }
}

const getRecommendedTalents = async (request, h) => {
  try {
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden', code: "xemp-1" }).code(401);
    }
    const { credentials } = request.auth || {};
    const { id: userId } = credentials || {};
    // Checking user type from jwt
    let luserTypeName = request.auth.artifacts.decoded.userTypeName;
    if (luserTypeName !== 'employer') return h.response({ error: true, message: 'You are not authorized!' }).code(403);

    const { jobId } = request.params || {};
    const { Jobhiremember } = request.getModels('xpaxr');
    const accessRecord = await Jobhiremember.findOne({ where: { userId, jobId } });
    const accessInfo = accessRecord && accessRecord.toJSON();
    const { jobHireMemberId } = accessInfo || {};
    if (!jobHireMemberId) return h.response({ error: true, message: 'You are not authorized!' }).code(403);

    /* UNCOMMENT THESE FOLLOWING LINES when going for staging */
    let model = request.getModels('xpaxr');
    if (!await isJobQuestionnaireDone(jobId, model)) return h.response({ error: "Questionnaire Not Done" }).code(409)
    const userIdArray = [];

    try {
      const recommendationRes = await axios.get(`http://${config.dsServer.host}:${config.dsServer.port}/job/recommendation`, { params: { job_id: jobId } })
      const recommendations = recommendationRes?.data?.recommendation //this will be  sorted array of {job_id,score}
      if (!isArray(recommendations) || (isArray(recommendations) && !recommendations.length)) return h.response({ error: true, message: 'Something wrong with Data Science Server!' }).code(500);

      // storing all the talentUserIds in the given order   
      recommendations.forEach(item => {
        userIdArray.push(item.user_id);
      });
    } catch (error) {
      return h.response({ error: true, message: 'Something wrong with Data Science Server!' }).code(500);
    }

    // FAKE RECOMMENDED DATA (delete it when going for staging)
    // const recommendations = [
    //     { user_id: '167', score: '10' },
    //     { user_id: '169', score: '9' },
    //     { user_id: '161', score: '8' },
    //     { user_id: '164', score: '7' },
    //     { user_id: '160', score: '6' },
    //     { user_id: '165', score: '5' },
    //     { user_id: '162', score: '4' },
    //     { user_id: '168', score: '3' },
    //     { user_id: '166', score: '2' },
    //     { user_id: '163', score: '1' },
    // ]        

    const { limit, offset, sort, search } = request.query;
    const searchVal = `%${search ? search.toLowerCase() : ''}%`;

    // sort query
    let [sortBy, sortType] = sort ? sort.split(':') : ['score', 'asc'];
    const validSorts = ['score', 'first_name', 'last_name'];
    const isSortReqValid = validSorts.includes(sortBy);

    // pagination
    const limitNum = limit ? Number(limit) : 10;
    const offsetNum = offset ? Number(offset) : 0;
    if (isNaN(limitNum) || isNaN(offsetNum) || !isSortReqValid) {
      return h.response({ error: true, message: 'Invalid query parameters!' }).code(400);
    }
    if (limitNum > 100) {
      return h.response({ error: true, message: 'Limit must not exceed 100!' }).code(400);
    }

    const db1 = request.getDb('xpaxr');
    // get sql statement for getting jobs or jobs count
    const filters = { search, sortBy, sortType };
    function getSqlStmt(queryType, obj = filters) {
      const { search, sortBy, sortType } = obj;
      let sqlStmt;
      const type = queryType && queryType.toLowerCase();
      if (type === 'count') {
        sqlStmt = `select count(*)`;
      } else {
        sqlStmt = `select ui.*, ut.user_type_name, ur.role_name `;
      }

      sqlStmt += `            
                from hris.userinfo ui
                    inner join hris.usertype ut on ut.user_type_id=ui.user_type_id
                    inner join hris.userrole ur on ur.role_id=ui.role_id
                where ui.user_id in (:userIdArray)`;

      // search
      if (search) {
        sqlStmt += ` and (
                    ui.first_name ilike :searchVal
                    or ui.last_name ilike :searchVal                    
                )`;
      }

      if (type !== 'count') {
        // sorts (order)
        if (sortBy === 'score') {
          sqlStmt += ` order by case`
          for (let i = 0; i < userIdArray.length; i++) {
            sqlStmt += ` WHEN ui.user_id=${userIdArray[i]} THEN ${i}`;
          }
          sqlStmt += ` end`;
          if (sortType === 'asc') sqlStmt += ` desc`; //by default, above method keeps them in the order of the Data Science Server in the sense of asc, to reverse it you must use desc
        } else {
          sqlStmt += ` order by ${sortBy} ${sortType}`;
        }
        // limit and offset
        sqlStmt += ` limit :limitNum  offset :offsetNum`
      };

      return sqlStmt;
    };

    const sequelize = db1.sequelize;
    const allSQLTalents = await sequelize.query(getSqlStmt(), {
      type: QueryTypes.SELECT,
      replacements: {
        limitNum, offsetNum,
        userIdArray,
        searchVal
      },
    });
    const allSQLTalentsCount = await sequelize.query(getSqlStmt('count'), {
      type: QueryTypes.SELECT,
      replacements: {
        limitNum, offsetNum,
        userIdArray,
        searchVal
      },
    });
    const allTalents = camelizeKeys(allSQLTalents);


    const paginatedResponse = { count: allSQLTalentsCount[0].count, users: allTalents }
    return h.response(paginatedResponse).code(200);
  }
  catch (error) {
    console.error(error.stack);
    return h.response({ error: true, message: 'Bad Request!' }).code(500);
  }
}

const getTalentsAndApplicants = async (request, h) => {
  try {
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden', code: "xemp-1" }).code(401);
    }
    const { credentials } = request.auth || {};
    const { id: luserId } = credentials || {};
    // Checking user type from jwt
    let luserTypeName = request.auth.artifacts.decoded.userTypeName;
    if (luserTypeName !== 'employer') return h.response({ error: true, message: 'You are not authorized!' }).code(403);

    const db1 = request.getDb('xpaxr');
    const sequelize = db1.sequelize;

    // _______________QUERY PARAMETERS
    const { limit, offset, sort, search, type } = request.query;
    const typeReq = type || 'talent';
    const validTypes = ['applicant', 'talent'];
    const isTypeReqValid = validTypes.includes(typeReq);

    const searchVal = `%${search ? search.toLowerCase() : ''}%`;

    // sort query
    let [sortBy, sortType] = sort ? sort.split(':') : ['score', 'ASC'];
    const validSorts = ['score', 'first_name', 'last_name'];
    const isSortReqValid = validSorts.includes(sortBy);

    // pagination
    const limitNum = limit ? Number(limit) : 10;
    const offsetNum = offset ? Number(offset) : 0;
    if (isNaN(limitNum) || isNaN(offsetNum) || !isSortReqValid) {
      return h.response({ error: true, message: 'Invalid query parameters!' }).code(400);
    }
    if (!isTypeReqValid) {
      return h.response({ error: true, message: 'Invalid type query parameter!' }).code(400);
    }
    if (limitNum > 100) {
      return h.response({ error: true, message: 'Limit must not exceed 100!' }).code(400);
    }

    //   finding all jobs of this recruiter
    const { Jobapplication } = request.getModels('xpaxr');
    const sqlStmt = `select j.job_id
            from hris.jobs j
            where j.user_id=:luserId
        `;
    const allOwnJobIdsSQL = await sequelize.query(sqlStmt, {
      type: QueryTypes.SELECT,
      replacements: { luserId },
    });

    const addIdsIfNotExist = (id, array) => {
      if (!array.includes(id)) {
        array.push(id.toString());
      }
    }

    const applicantIds = [];
    const talentUserIds = [];
    let recommendations;
    for (let i = 0; i < allOwnJobIdsSQL.length; i++) {
      const ownJob = allOwnJobIdsSQL[i];
      if (typeReq === 'applicant') {
        const applications = await Jobapplication.findAll({ where: { jobId: ownJob.job_id }, attributes: ['userId'] });
        applications[0] && applications.forEach((item) => addIdsIfNotExist(item.userId, applicantIds));

      } else if (typeReq === 'talent') {
        try {
          const recommendationRes = await axios.get(`http://${config.dsServer.host}:${config.dsServer.port}/job/recommendation`, { params: { job_id: ownJob.job_id } })
          recommendations = recommendationRes?.data?.recommendation //this will be  sorted array of {job_id,score}

          // storing all the talentUserIds in the given order   
          recommendations.forEach(item => {
            talentUserIds.push(item.user_id);
          });

          recommendations[0] && recommendations.forEach((item) => addIdsIfNotExist(item.user_id, talentUserIds));

        } catch (error) {
          console.log(error.stack);
          return h.response({ error: true, message: 'Something wrong with Data Science Server!' }).code(500);

          // recommendations = [
          //     { user_id: '167', user_score: '1.0' },
          //     { user_id: '169', user_score: '0.9' },
          //     { user_id: '161', user_score: '0.8' },
          //     { user_id: '164', user_score: '0.7' },
          //     { user_id: '160', user_score: '0.6' },
          //     { user_id: '165', user_score: '0.5' },
          //     { user_id: '162', user_score: '0.4' },
          //     { user_id: '168', user_score: '0.3' },
          //     { user_id: '166', user_score: '0.2' },
          //     { user_id: '163', user_score: '0.1' },
          // ]
          // recommendations.forEach(item => {
          //     talentUserIds.push(item.user_id);
          // });
        }
      }
    };

    console.log(applicantIds, talentUserIds);
    const refinedApplicantUnique = new Set([...applicantIds]);
    const refinedTalentUnique = new Set([...talentUserIds]);
    const finalArray = typeReq === 'talent' ? [...refinedTalentUnique] : [...refinedApplicantUnique];
    if (!finalArray.length) return h.response({ error: true, message: 'No users found!' }).code(400);;

    // get sql statement for getting jobs or jobs count
    const filters = { search, sortBy, sortType };
    function getSqlStmt(queryType, obj = filters) {
      const { search, sortBy, sortType } = obj;
      let sqlStmt;
      const type = queryType && queryType.toLowerCase();
      if (type === 'count') {
        sqlStmt = `select count(*)`;
      } else {
        sqlStmt = `select ui.*, ut.user_type_name, ur.role_name `;
      }

      sqlStmt += `            
                from hris.userinfo ui
                    inner join hris.usertype ut on ut.user_type_id=ui.user_type_id
                    inner join hris.userrole ur on ur.role_id=ui.role_id
                where ui.user_id in (:finalArray)`;

      // search
      if (search) {
        sqlStmt += ` and (
                    ui.first_name ilike :searchVal
                    or ui.last_name ilike :searchVal                    
                )`;
      }

      if (type !== 'count') {
        // sorts (order)
        if (sortBy === 'score') {
          sqlStmt += ` order by case`
          for (let i = 0; i < finalArray.length; i++) {
            sqlStmt += ` WHEN ui.user_id=${finalArray[i]} THEN ${i}`;
          }
          sqlStmt += ` end`;
          if (sortType === 'asc') sqlStmt += ` desc`; //by default, above method keeps them in the order of the Data Science Server in the sense of asc, to reverse it you must use desc
        } else {
          sqlStmt += ` order by ${sortBy} ${sortType}`;
        }
        // limit and offset
        sqlStmt += ` limit :limitNum  offset :offsetNum`
      };

      return sqlStmt;
    };

    const allSQLTalents = await sequelize.query(getSqlStmt(), {
      type: QueryTypes.SELECT,
      replacements: {
        limitNum, offsetNum,
        finalArray,
        searchVal
      },
    });
    const allSQLTalentsCount = await sequelize.query(getSqlStmt('count'), {
      type: QueryTypes.SELECT,
      replacements: {
        limitNum, offsetNum,
        finalArray,
        searchVal
      },
    });
    const allTalents = camelizeKeys(allSQLTalents);

    if (typeReq === 'talent' && recommendations) {
      // recommendations
      // [{user_id: 7, score: 0.9 }]
      const rtMap = new Map();

      for (let rtItem of recommendations) {
        rtMap.set(rtItem.user_id, rtItem.user_score);
      }
      for (let talent of allTalents) {
        talent.score = rtMap.get(talent.userId);
      }
    }

    const paginatedResponse = { count: allSQLTalentsCount[0].count, type: typeReq, users: allTalents }
    return h.response(paginatedResponse).code(200);
  }
  catch (error) {
    console.error(error.stack);
    return h.response({ error: true, message: 'Bad Request!' }).code(500);
  }
}

const getTalentProfile = async (request, h) => {
  try {
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden', code: "xemp-1" }).code(401);
    }
    // Checking user type from jwt
    let luserTypeName = request.auth.artifacts.decoded.userTypeName;
    if (luserTypeName !== 'employer') {
      return h.response({ error: true, message: 'You are not authorized!' }).code(403);
    }

    const { Userinfo, Usertype, Userrole } = request.getModels('xpaxr');

    const { userId } = request.params || {};
    const userRecord = await Userinfo.findOne({ where: { userId }, attributes: { exclude: ['createdAt', 'updatedAt'] } });
    const talentProfileInfo = userRecord && userRecord.toJSON();
    const { userId: rUserId, userTypeId, roleId, inTalentPool } = talentProfileInfo || {};

    if (!rUserId) return h.response({ error: true, message: 'No user found!' }).code(400);

    const userTypeRecord = await Usertype.findOne({ where: { userTypeId } });
    const userRoleRecord = await Userrole.findOne({ where: { roleId } });
    const { userTypeName } = userTypeRecord && userTypeRecord.toJSON();
    const { roleName } = userRoleRecord && userRoleRecord.toJSON();

    if (roleName !== 'candidate') return h.response({ error: true, message: 'This user is not a candidate!' }).code(400);
    if (!inTalentPool) return h.response({ error: true, message: 'You are not authorized. User has not agreed to join the Talent Pool!' }).code(403);

    talentProfileInfo.userTypeName = userTypeName;
    talentProfileInfo.roleName = roleName;

    return h.response(talentProfileInfo).code(200);
  }
  catch (error) {
    console.error(error.stack);
    return h.response({ error: true, message: 'Bad Request!' }).code(500);
  }
}

const isJobQuestionnaireDone = async (jobId, model) => {
  const { Jobsquesresponse, Questionnaire, Questiontarget } = model
  let questionnaireCount = Questionnaire.count({
    include: [{
      model: Questiontarget,
      as: "questionTarget",
      where: {
        targetName: "empauwer_all"
      },
      required: true
    }],
    where: {
      isActive: true
    },
    required: true
  })

  let responsesCount = Jobsquesresponse.count({
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
      jobId
    }
  });
  return await questionnaireCount === await responsesCount;
}

module.exports = {
  getJobDetailsOptions,
  getAutoComplete,

  getTop5EJobWithVisitCount,
  getJobVisitCount,

  getApplicationPieChart,
  getJobApplicationPieChart,

  getRecommendedTalents,
  getTalentsAndApplicants,
  getTalentProfile,
}
