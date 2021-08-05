const { Op, Sequelize, QueryTypes, cast, literal } = require('sequelize');
const validator = require('validator');
import { camelizeKeys } from '../utils/camelizeKeys'
import { sendEmailAsync } from '../utils/email'
import formatQueryRes from '../utils/index'
import { isArray } from 'lodash';
const axios = require('axios')
const config = require('config');

const createJob = async (request, h) => {
    try {
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden' }).code(403);
        }
        // Checking user type from jwt
        let luserTypeName = request.auth.artifacts.decoded.userTypeName;
        if (luserTypeName !== 'employer') {
            return h.response({ error: true, message: 'You are not authorized!' }).code(403);
        }

        const jobDetails = request.payload || {};
        const { jobName, jobDescription, jobIndustryId, jobLocationId, jobFunctionId, jobTypeId, minExp, duration, closeDate, jobSkills } = jobDetails;
        if (!(jobName && jobDescription && jobIndustryId && jobLocationId && jobFunctionId && jobTypeId && minExp && closeDate && jobSkills)) {
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
                jobName,
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

const getJobDetailsOptions = async (request, h) => {
    try {
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden' }).code(403);
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
            return h.response({ message: 'Forbidden' }).code(403);
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

const getSingleJob = async (request, h) => {
    try {
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden' }).code(403);
        }
        const { credentials } = request.auth || {};
        const { id: userId } = credentials || {};
        const { jobUuid } = request.params || {};

        // Checking user type from jwt
        let luserTypeName = request.auth.artifacts.decoded.userTypeName;
        if (luserTypeName !== 'candidate' && luserTypeName !== 'employer') return h.response({ error: true, message: 'You are not authorized!' }).code(403);

        const { Jobskill, Jobapplication, Userinfo } = request.getModels('xpaxr');

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
        return h.response(responseJob).code(200);

    } catch (error) {
        console.error(error.stack);
        return h.response({ error: true, message: 'Internal Server Error!' }).code(500);
    }
}

const getAllJobs = async (request, h) => {
    try {
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden' }).code(403);
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
        // GET RECOMMENDED JOBS FROM DATA SCIENCE SERVER
        if (recommendedVal === 1) {
            /* UNCOMMENT THESE FOLLOWING LINES when going for staging */

            let model = request.getModels('xpaxr');
            if (!await isUserQuestionnaireDone(userId, model)) return h.response({ error: "Questionnaire Not Done" }).code(409)

            try {
                const recommendationRes = await axios.get(`http://${config.dsServer.host}:${config.dsServer.port}/user/recommendation`, { params: { user_id: userId } })
                const recommendations = recommendationRes?.data?.recommendation //this will be  sorted array of {job_id,score}
                if (!isArray(recommendations) || (isArray(recommendations) && !recommendations.length)) return h.response({ error: true, message: 'Something wrong with Data Science Server!' }).code(500);

                // storing all the jobIds in the given order            
                recommendations.forEach(item => {
                    jobIdArray.push(item.job_id);
                });
            } catch (error) {
                return h.response({ error: true, message: 'Something wrong with Data Science Server!' }).code(500);
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
            return h.response({ message: 'Forbidden' }).code(403);
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
            return h.response({ message: 'Forbidden' }).code(403);
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
            return h.response({ message: 'Forbidden' }).code(403);
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
            return h.response({ message: 'Forbidden' }).code(403);
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
            return h.response({ message: 'Forbidden' }).code(403);
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

const getJobAccessRecords = async (request, h) => {
    try {
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden' }).code(403);
        }
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
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden' }).code(403);
        }
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
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden' }).code(403);
        }
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
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden' }).code(403);
        }
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

const createJobQuesResponses = async (request, h) => {
    try {
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden' }).code(403);
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
            return h.response({ message: 'Forbidden' }).code(403);
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

const applyToJob = async (request, h) => {
    try {
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden' }).code(403);
        }
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

        const record = { jobId, userId, isApplied: true, isWithdrawn: false, status: "applied" }
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
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden' }).code(403);
        }
        let luserTypeName = request.auth.artifacts.decoded.userTypeName;
        if (luserTypeName !== 'candidate') {
            return h.response({ error: true, message: 'You are not authorized!' }).code(403);
        }

        const { credentials } = request.auth || {};
        const { id: userId } = credentials || {};

        const { limit, offset, sort, search, status, startDate, endDate } = request.query;
        const searchVal = `%${search ? search.toLowerCase() : ''}%`;

        // Checking if application status is valid
        const validStatus = ['applied', 'withdrawn', 'shortlisted', 'interview', 'closed', 'offer', 'hired'];
        const isStatusReqValid = (status && isArray(status)) ? (
            status.every(req => validStatus.includes(req))
        ) : validStatus.includes(status);
        if (status && !isStatusReqValid) return h.response({ error: true, message: 'Invalid status query parameter!' }).code(400);

        // sort query
        let [sortBy, sortType] = sort ? sort.split(':') : ['created_at', 'desc'];
        if (!sortType && sortBy !== 'created_at') sortType = 'asc';
        if (!sortType && sortBy === 'created_at') sortType = 'desc';

        const validSorts = ['status', 'created_at', 'job_name', 'last_updated'];
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
        const filters = { startDate, search, sortBy, sortType, status };
        function getSqlStmt(queryType, obj = filters) {
            const { startDate, search, sortBy, sortType, status } = obj;
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
                } else if (sortBy === 'last_updated') {
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
                status,
                lowerDateRange, upperDateRange,
            },
        });
        const allSQLAppliedJobsCount = await sequelize.query(getSqlStmt('count'), {
            type: QueryTypes.SELECT,
            replacements: {
                userId,
                sortBy, sortType, limitNum, offsetNum,
                searchVal,
                status,
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
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden' }).code(403);
        }
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


        await Jobapplication.update({ isWithdrawn: true, status: 'withdrawn' }, { where: { applicationId: applicationId } });
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

const getApplicationPieChart = async (request, h) => {
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
            return h.response({ message: 'Forbidden' }).code(403);
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

const getAllEmployerApplicantsSelectiveProfile = async (request, h) => {
    try {
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden' }).code(403);
        }
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

        if (!qStartDate) {
            // get latest applications within last 14 days
            startDate = new Date();
            startDate.setDate(startDate.getDate() - 14);
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
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden' }).code(403);
        }
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
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden' }).code(403);
        }
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

const getApplicationAccessRecords = async (request, h) => {
    try {
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden' }).code(403);
        }
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
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden' }).code(403);
        }
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
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden' }).code(403);
        }
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
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden' }).code(403);
        }
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

const updateApplicationStatus = async (request, h) => {
    try {
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden' }).code(403);
        }
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
        const { companyId: luserCompanyId, firstName: luserFirstName } = userProfileInfo || {};

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

        if(!(onboarder === userId && luserCompanyId === onboarderCompanyId)) return h.response({ error: true, message: 'You are not authorized!' }).code(400);

        const sqlStmt = `select jn.job_name, jl.job_location_name, onb.onboarder, onb.onboardee, ot.*, oft.*
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
                    if(!struc.hasOwnProperty(type)) struc[type] = {};
                    if (!struc[type].hasOwnProperty(subType)) struc[type][subType] = [];
                    
                    struc[type][subType].push(item);

                } else {
                    if(!struc.hasOwnProperty(type)) struc[type] = {};
                    struc[type]['general'] = item;
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

        const { Userinfo, Onboarding, Onboardingtask, Onboardingtasktype, Onboardingfixedtask, Emailtemplate, Emaillog, Companyinfo } = request.getModels('xpaxr');
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
        const { companyId: luserCompanyId, firstName: luserFirstName } = userProfileInfo || {};

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
                where onb.onboarder=:userId`;

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
                userId, limitNum, offsetNum, searchVal,
            },
        });
        const allSQLonboardingsCount = await sequelize.query(getSqlStmt('count'), {
            type: QueryTypes.SELECT,
            replacements: {
                userId, limitNum, offsetNum, searchVal,
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

        const { Userinfo, Onboarding, Onboardingtask, Onboardingtasktype, Onboardingfixedtask, Emailtemplate, Emaillog, Companyinfo } = request.getModels('xpaxr');

        // get the company of the recruiter
        const userRecord = await Userinfo.findOne({ where: { userId }, attributes: { exclude: ['createdAt', 'updatedAt'] } });
        const userProfileInfo = userRecord && userRecord.toJSON();
        const { companyId: luserCompanyId, firstName: luserFirstName } = userProfileInfo || {};

        const sqlStmt = `select jn.job_name, jl.job_location_name, ui.*, onb.*
        from hris.onboardings onb
            inner join hris.userinfo ui on ui.user_id=onb.onboardee
            inner join hris.jobs j on onb.job_id=j.job_id
            inner join hris.jobname jn on jn.job_name_id=j.job_name_id
            inner join hris.joblocation jl on jl.job_location_id=j.job_location_id
        where onb.onboarding_id=:onboardingId and onb.onboarder=:userId`;

        const db1 = request.getDb('xpaxr');
        const sequelize = db1.sequelize;
        const onboardingTaskDetailsSQL = await sequelize.query(sqlStmt, {
            type: QueryTypes.SELECT,
            replacements: {
                onboardingId, userId,
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

        const validStatus = ['ongoing', 'complete', 'incomplete', 'not applicable'];
        if (!validStatus.includes(status)) return h.response({ error: true, message: 'Invalid status' }).code(400);

        const { Userinfo, Onboarding, Onboardingtask, Onboardingtasktype, Onboardingfixedtask, Emailtemplate, Emaillog, Companyinfo } = request.getModels('xpaxr');

        // get the company of the recruiter
        const userRecord = await Userinfo.findOne({ where: { userId }, attributes: { exclude: ['createdAt', 'updatedAt'] } });
        const userProfileInfo = userRecord && userRecord.toJSON();
        const { companyId: luserCompanyId, firstName: luserFirstName } = userProfileInfo || {};

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

        // if (oldStatus === 'complete') return h.response({ error: true, message: 'Already hired. So the status can not change!' }).code(400);
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

const getRecommendedTalents = async (request, h) => {
    try {
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden' }).code(403);
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
            return h.response({ message: 'Forbidden' }).code(403);
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
        for (let i = 0; i < allOwnJobIdsSQL.length; i++) {
            const ownJob = allOwnJobIdsSQL[i];
            if (typeReq === 'applicant') {
                const applications = await Jobapplication.findAll({ where: { jobId: ownJob.job_id }, attributes: ['userId'] });
                applications[0] && applications.forEach((item) => addIdsIfNotExist(item.userId, applicantIds));

            } else if (typeReq === 'talent') {
                try {
                    const recommendationRes = await axios.get(`http://${config.dsServer.host}:${config.dsServer.port}/job/recommendation`, { params: { job_id: ownJob.job_id } })
                    const recommendations = recommendationRes?.data?.recommendation //this will be  sorted array of {job_id,score}

                    // storing all the talentUserIds in the given order   
                    recommendations.forEach(item => {
                        talentUserIds.push(item.user_id);
                    });

                    recommendations[0] && recommendations.forEach((item) => addIdsIfNotExist(item.user_id, talentUserIds));

                } catch (error) {
                    console.log(error.stack);
                    return h.response({ error: true, message: 'Something wrong with Data Science Server!' }).code(500);
                }
            }

            // FAKE RECOMMENDED DATA (delete it when going for staging)
            // const recommendation =  [
            //         { user_id: '167', score: '10' },
            //         { user_id: '169', score: '9' },
            //         { user_id: '161', score: '8' },
            //         { user_id: '164', score: '7' },
            //         { user_id: '160', score: '6' },
            //         { user_id: '165', score: '5' },
            //         { user_id: '162', score: '4' },
            //         { user_id: '168', score: '3' },
            //         { user_id: '166', score: '2' },
            //         { user_id: '163', score: '1' },
            // ]
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
            return h.response({ message: 'Forbidden' }).code(403);
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

const isUserQuestionnaireDone = async (userId, model) => {
    const { Userquesresponse, Questionnaire, Questiontarget } = model
    let questionnaireCount = Questionnaire.count({
        include: [{
            model: Questiontarget,
            as: "questionTarget",
            where: {
                targetName: "empauwer_me"
            },
            required: true
        }],
        where: {
            isActive: true
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
    return await questionnaireCount === await responsesCount;
}

module.exports = {
    createJob,
    getJobDetailsOptions,
    getAutoComplete,

    getSingleJob,
    getAllJobs,
    getRecruiterJobs,

    updateJob,
    deleteJob,
    getAllDeletedJobs,
    restoreDeletedJob,

    getJobAccessRecords,
    shareJob,
    updateSharedJob,
    deleteJobAccessRecord,

    createJobQuesResponses,
    getJobQuesResponses,

    applyToJob,
    getAppliedJobs,
    withdrawFromAppliedJob,

    getApplicationPieChart,
    getJobApplicationPieChart,

    getAllEmployerApplicantsSelectiveProfile,
    getAllApplicantsSelectiveProfile,
    getApplicantProfile,

    getApplicationAccessRecords,
    shareApplication,
    updateSharedApplication,
    deleteApplicationAccessRecord,
    updateApplicationStatus,

    updateOnboardingTaskStatus,
    getOnboardingTaskLists,
    getOnboardingLists,
    getOnboardingDetails,

    getRecommendedTalents,
    getTalentsAndApplicants,
    getTalentProfile,
}
