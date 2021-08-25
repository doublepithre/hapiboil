const { Op, Sequelize, QueryTypes, cast, literal } = require('sequelize');
const validator = require('validator');
import { camelizeKeys } from '../../utils/camelizeKeys'
import { sendEmailAsync } from '../../utils/email'
import formatQueryRes from '../../utils/index'
import { isArray } from 'lodash';
const axios = require('axios')
const moment = require('moment');
const config = require('config');


const getOnboardingTaskLists = async (request, h) => {
  try {
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden' }).code(403);
    }
    // Checking user type from jwt
    let luserTypeName = request.auth.artifacts.decoded.userTypeName;
    if (luserTypeName !== 'employer') return h.response({ error: true, message: 'You are not authorized!' }).code(403);

    const { credentials } = request.auth || {};
    const { id: userId } = credentials || {};
    const { onboardingId } = request.params || {};

    const { Userinfo, Onboarding, Job } = request.getModels('xpaxr');

    // get the company of the recruiter
    const userRecord = await Userinfo.findOne({ where: { userId }, attributes: { exclude: ['createdAt', 'updatedAt'] } });
    const userProfileInfo = userRecord && userRecord.toJSON();
    const { companyId: luserCompanyId } = userProfileInfo || {};

    const onboardingRecord = await Onboarding.findOne({
      where: { onboardingId },
      include: [{
        model: Job,
        as: 'job',
        required: true,
      }],
    });
    const onboardingData = onboardingRecord && onboardingRecord.toJSON();
    const { onboarder, job } = onboardingData || {};
    const { companyId: onboarderCompanyId } = job || {};

    if (!(onboarder === userId && luserCompanyId === onboarderCompanyId)) return h.response({ error: true, message: 'You are not authorized!' }).code(400);

    const sqlStmt = `select jn.job_name, jl.job_location_name, onb.onboarder, onb.onboardee, oft.*, ot.*
        from hris.onboardingtasks ot
            inner join hris.onboardingfixedtasks oft on oft.onboardingfixedtask_id=ot.task_id
            inner join hris.onboardings onb on onb.onboarding_id=ot.onboarding_id
            inner join hris.jobs j on onb.job_id=j.job_id
            inner join hris.jobname jn on jn.job_name_id=j.job_name_id
            inner join hris.joblocation jl on jl.job_location_id=j.job_location_id
        where ot.onboarding_id=:onboardingId and onb.onboarder=:userId`;

    const db1 = request.getDb('xpaxr');
    const sequelize = db1.sequelize;
    const onboardingTaskListSQL = await sequelize.query(sqlStmt, {
      type: QueryTypes.SELECT,
      replacements: {
        onboardingId, userId,
      },
    });
    const onboardingTasks = camelizeKeys(onboardingTaskListSQL);

    const struc = {};
    onboardingTasks.forEach(item => {
      const { type, subType } = item || {};
      if (type) {
        if (subType) {
          if (!struc.hasOwnProperty(type)) struc[type] = {};
          if (!struc[type].hasOwnProperty(subType)) struc[type][subType] = [];

          struc[type][subType].push(item);

        } else {
          if (!struc.hasOwnProperty(type)) struc[type] = {};
          if (!struc[type].hasOwnProperty('general')) struc[type]['general'] = [];
          struc[type]['general'].push(item);
        }
      }
    });

    const responses = { onboardingTasks: struc };
    return h.response(responses).code(200);
  }
  catch (error) {
    console.error(error.stack);
    return h.response({ error: true, message: 'Bad Request' }).code(400);
  }
}

const getOnboardingLists = async (request, h) => {
  try {
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden' }).code(403);
    }
    // Checking user type from jwt
    let luserTypeName = request.auth.artifacts.decoded.userTypeName;
    if (luserTypeName !== 'employer') return h.response({ error: true, message: 'You are not authorized!' }).code(403);

    const { credentials } = request.auth || {};
    const { id: userId } = credentials || {};

    const { Userinfo } = request.getModels('xpaxr');
    const { limit, offset, sort, search } = request.query;
    const searchVal = `%${search ? search.toLowerCase() : ''}%`;

    // sort query
    let [sortBy, sortType] = sort ? sort.split(':') : ['first_name', 'asc'];
    if (!sortType) sortType = 'asc';
    const validSorts = ['first_name', 'last_name'];
    const isSortReqValid = validSorts.includes(sortBy);

    const sortTypeLower = sortType.toLowerCase();
    const validSortTypes = ['asc', 'desc'];
    const isSortTypeReqValid = validSortTypes.includes(sortTypeLower);

    // pagination
    const limitNum = limit ? Number(limit) : 10;
    const offsetNum = offset ? Number(offset) : 0;

    if (isNaN(limitNum)) return h.response({ error: true, message: 'Invalid limit query parameter! The limit query parameter must be a number!' }).code(400);
    if (isNaN(offsetNum)) return h.response({ error: true, message: 'Invalid offset query parameter! The offset query parameter must be a number!' }).code(400);
    if (!isSortReqValid) return h.response({ error: true, message: 'Invalid sort query parameter!' }).code(400);
    if (!isSortTypeReqValid) return h.response({ error: true, message: 'Invalid sort query parameter! Sort type is invalid, it should be either "asc" or "desc"!' }).code(400);

    if (limitNum < 0) return h.response({ error: true, message: 'Limit must be greater than 0!' }).code(400);
    if (limitNum > 100) return h.response({ error: true, message: 'Limit must not exceed 100!' }).code(400);

    // get the company of the recruiter
    const userRecord = await Userinfo.findOne({ where: { userId }, attributes: { exclude: ['createdAt', 'updatedAt'] } });
    const userProfileInfo = userRecord && userRecord.toJSON();
    const { companyId: luserCompanyId } = userProfileInfo || {};

    const filters = { search, sortBy, sortType }
    function getSqlStmt(queryType, obj = filters) {
      const { search, sortBy, sortType } = obj;
      let sqlStmt;
      const type = queryType && queryType.toLowerCase();
      if (type === 'count') {
        sqlStmt = `select count(*)`;
      } else {
        sqlStmt = `select jn.job_name, jl.job_location_name, ui.*, onb.*`;
      }

      sqlStmt += `
                from hris.onboardings onb
                    inner join hris.userinfo ui on ui.user_id=onb.onboardee
                    inner join hris.jobs j on onb.job_id=j.job_id
                    inner join hris.jobname jn on jn.job_name_id=j.job_name_id
                    inner join hris.joblocation jl on jl.job_location_id=j.job_location_id
                where onb.onboarder=:userId and onb.company_id=:luserCompanyId`;

      // search
      if (search) {
        sqlStmt += ` and (
                        ui.first_name ilike :searchVal
                        or ui.last_name ilike :searchVal                    
                        or ui.email ilike :searchVal                    
                    )`;
      }

      if (type !== 'count') {
        // sorts
        sqlStmt += ` order by ${sortBy} ${sortType}`
        // limit and offset
        sqlStmt += ` limit :limitNum  offset :offsetNum`
      };

      return sqlStmt;
    }

    const db1 = request.getDb('xpaxr');
    const sequelize = db1.sequelize;
    const onboardingListSQL = await sequelize.query(getSqlStmt(), {
      type: QueryTypes.SELECT,
      replacements: {
        userId, limitNum, offsetNum, searchVal, luserCompanyId,
      },
    });
    const allSQLonboardingsCount = await sequelize.query(getSqlStmt('count'), {
      type: QueryTypes.SELECT,
      replacements: {
        userId, limitNum, offsetNum, searchVal, luserCompanyId,
      },
    });
    const onboardings = camelizeKeys(onboardingListSQL);
    const responses = { count: allSQLonboardingsCount[0].count, onboardings };
    return h.response(responses).code(200);
  }
  catch (error) {
    console.error(error.stack);
    return h.response({ error: true, message: 'Bad Request' }).code(400);
  }
}

const getOnboardingDetails = async (request, h) => {
  try {
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden' }).code(403);
    }
    // Checking user type from jwt
    let luserTypeName = request.auth.artifacts.decoded.userTypeName;
    if (luserTypeName !== 'employer') return h.response({ error: true, message: 'You are not authorized!' }).code(403);

    const { credentials } = request.auth || {};
    const { id: userId } = credentials || {};

    const { onboardingId } = request.params || {};

    const { Userinfo } = request.getModels('xpaxr');

    // get the company of the recruiter
    const userRecord = await Userinfo.findOne({ where: { userId }, attributes: { exclude: ['createdAt', 'updatedAt'] } });
    const userProfileInfo = userRecord && userRecord.toJSON();
    const { companyId: luserCompanyId } = userProfileInfo || {};

    const sqlStmt = `select jn.job_name, jl.job_location_name, ui.*, onb.*
        from hris.onboardings onb
            inner join hris.userinfo ui on ui.user_id=onb.onboardee
            inner join hris.jobs j on onb.job_id=j.job_id
            inner join hris.jobname jn on jn.job_name_id=j.job_name_id
            inner join hris.joblocation jl on jl.job_location_id=j.job_location_id
        where onb.onboarding_id=:onboardingId and onb.onboarder=:userId and onb.company_id=:luserCompanyId`;

    const db1 = request.getDb('xpaxr');
    const sequelize = db1.sequelize;
    const onboardingTaskDetailsSQL = await sequelize.query(sqlStmt, {
      type: QueryTypes.SELECT,
      replacements: {
        onboardingId, userId, luserCompanyId,
      },
    });
    const onboardingDetails = camelizeKeys(onboardingTaskDetailsSQL)[0];
    if (!onboardingDetails) return h.response({ error: true, message: `Either You are not authorized or this onboarding doesn't exist!` }).code(400);

    const responses = onboardingDetails;
    return h.response(responses).code(200);
  }
  catch (error) {
    console.error(error.stack);
    return h.response({ error: true, message: 'Bad Request' }).code(400);
  }
}

const updateOnboardingTaskStatus = async (request, h) => {
  try {
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden' }).code(403);
    }
    // Checking user type from jwt
    let luserTypeName = request.auth.artifacts.decoded.userTypeName;
    if (luserTypeName !== 'employer') return h.response({ error: true, message: 'You are not authorized!' }).code(403);

    const { credentials } = request.auth || {};
    const { id: userId } = credentials || {};

    const { onboardingtaskId } = request.params || {};
    const { status } = request.payload || {};

    const validUpdateRequests = ['status'];
    const requestedUpdateOperations = Object.keys(request.payload) || [];
    const isAllReqsValid = requestedUpdateOperations.every(req => validUpdateRequests.includes(req));
    if (!isAllReqsValid) return h.response({ error: true, message: 'Invalid update request(s)' }).code(400);

    const validStatus = ['ongoing', 'complete', 'not applicable'];
    if (!validStatus.includes(status)) return h.response({ error: true, message: 'Invalid status' }).code(400);

    const { Userinfo, Onboarding, Onboardingtask, Onboardingtasktype, Onboardingfixedtask, Emailtemplate, Emaillog, Companyinfo } = request.getModels('xpaxr');

    // get the company of the recruiter
    const userRecord = await Userinfo.findOne({ where: { userId }, attributes: { exclude: ['createdAt', 'updatedAt'] } });
    const userProfileInfo = userRecord && userRecord.toJSON();
    const { companyId: luserCompanyId } = userProfileInfo || {};

    const sqlStmt = `select  
                otask.*, ob.company_id, ob.onboarder
            from hris.onboardingtasks otask
                inner join hris.onboardings ob on ob.onboarding_id=otask.onboarding_id
				inner join  hris.company c on c.company_id=ob.company_id
            where otask.onboardingtask_id=:onboardingtaskId`;

    const db1 = request.getDb('xpaxr');
    const sequelize = db1.sequelize;
    const onboardingTaskDetailsSQL = await sequelize.query(sqlStmt, {
      type: QueryTypes.SELECT,
      replacements: {
        onboardingtaskId
      },
    });
    const onboardingTaskDetails = camelizeKeys(onboardingTaskDetailsSQL)[0];
    const { onboardingtaskId: existingOnboardingtaskId, onboardingId, onboarder, companyId: creatorCompanyId, status: oldStatus } = onboardingTaskDetails || {};

    if (!existingOnboardingtaskId) return h.response({ error: true, message: `No task found!` }).code(400);
    if (luserCompanyId !== creatorCompanyId) return h.response({ error: true, message: `You are not authorized!` }).code(403);

    // can (s)he update this application?
    if (userId !== onboarder) return h.response({ error: true, message: 'You are not authorized to update the task!' }).code(403);

    if (oldStatus === status) return h.response({ error: true, message: 'Already has this status!' }).code(400);

    await Onboardingtask.update({ status }, { where: { onboardingtaskId } });
    const updatedRecord = await Onboardingtask.findOne({ where: { onboardingtaskId } });
    const updatedData = updatedRecord && updatedRecord.toJSON();

    const allTasks = await Onboardingtask.findAll({ where: { onboardingId } });
    const isAllComplete = allTasks.every(item => {
      const record = item.toJSON();
      return record.status === 'complete';
    });
    if (isAllComplete) {
      await Onboarding.update({ status: 'complete' }, { where: { onboardingId } });
    }
    else {
      await Onboarding.update({ status: 'ongoing' }, { where: { onboardingId } });
    }
    return h.response(updatedRecord).code(200);
  }
  catch (error) {
    console.error(error.stack);
    return h.response({ error: true, message: 'Bad Request' }).code(400);
  }
}

module.exports = {
  updateOnboardingTaskStatus,
  getOnboardingTaskLists,
  getOnboardingLists,
  getOnboardingDetails,
}
