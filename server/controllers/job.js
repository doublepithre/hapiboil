const { Op, Sequelize, QueryTypes, cast, literal } = require('sequelize');
import {camelizeKeys} from '../utils/camelizeKeys'
import formatQueryRes from '../utils/index'
import { isArray } from 'lodash';
const axios = require('axios')
const config = require('config');

const createJob = async (request, h) => {
    try {
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden'}).code(403);
        }
        // Checking user type from jwt
        let luserTypeName = request.auth.artifacts.decoded.userTypeName;   
        if(luserTypeName !== 'employer'){
            return h.response({error:true, message:'You are not authorized!'}).code(403);
        }

        const jobDetails = request.payload || {};
        const { jobName, jobDescription, jobIndustryId, jobLocationId, jobFunctionId, jobTypeId, minExp, duration } = jobDetails;
        if(!(jobName && jobDescription && jobIndustryId && jobLocationId && jobFunctionId && jobTypeId && minExp)){
            return h.response({ error: true, message: 'Please provide necessary details'}).code(400);
        }

        const { credentials } = request.auth || {};
        const { id: userId } = credentials || {};        
        
        const { Job, Jobname, Jobhiremember, Userinfo, Jobtype } = request.getModels('xpaxr');
        // get the company of the recruiter
        const userRecord = await Userinfo.findOne({ where: { userId }, attributes: { exclude: ['createdAt', 'updatedAt'] }});
        const userProfileInfo = userRecord && userRecord.toJSON();
        const { companyId } = userProfileInfo || {};

        const jobTypeRecord = await Jobtype.findOne({ where: { jobTypeId }});
        const jobTypeInfo = jobTypeRecord && jobTypeRecord.toJSON();
        const { jobTypeName } = jobTypeInfo || {};

        const jobsWithDuration = [ 'Internship', 'Full-time Contract', 'Part-time Contract'];
        const isJobWithDuration = jobsWithDuration.includes(jobTypeName);

        if(isJobWithDuration && !duration){
            return h.response({ error: true, message: 'Please provide the duration'}).code(400);
        }
        if(!isJobWithDuration){
            jobDetails.duration = null;
        }

        // check if job name already exists
        const jobNameRecord = await Jobname.findOne({ where: { jobNameLower: jobName.toLowerCase() }});
        const jobNameInfo = jobNameRecord && jobNameRecord.toJSON();
        const { jobNameId: oldJobNameId } = jobNameInfo || {};

        let jobNameIdToSave;
        if(!oldJobNameId){
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
        
        // create job
        const resRecord = await Job.create({ ...jobDetails, jobNameId: jobNameIdToSave, active: true, userId, companyId });        
        await Jobhiremember.create({ accessLevel: 'creator', userId, jobId: resRecord.jobId, })
        return h.response(resRecord).code(201);        
    }
    catch (error) {
        console.error(error.stack);
        return h.response({error: true, message: 'Bad Request'}).code(400);
    }
}

const getJobDetailsOptions = async (request, h) => {
    try{
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden'}).code(403);
        }
        const { Job, Jobtype, Jobfunction, Jobindustry, Joblocation } = request.getModels('xpaxr');
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
        return h.response({error: true, message: 'Internal Server Error!'}).code(500);
    }
}

const getAutoComplete = async (request, h) => {
    try{
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden'}).code(403);
        }
        const { search, type } = request.query;
        if(!(search && type)) return h.response({error: true, message: 'Query parameters missing (search and type)!'}).code(400);
        const searchVal = `%${ search.toLowerCase() }%`;
        
        const validTypes = [ 'score', 'created_at', 'job_name'];
        const isTypeReqValid = validTypes.includes(type);
        if(!isTypeReqValid) return h.response({error: true, message: 'Not a valid type parameter!'}).code(400);

        const db1 = request.getDb('xpaxr');

        // get sql statement for getting jobs or jobs count
        const filters = { type };
        function getSqlStmt(queryType, obj = filters){
            const { type } = obj;
            let sqlStmt;
            const queryTypeLower = queryType && queryType.toLowerCase();
            if(queryTypeLower === 'count'){
                sqlStmt = `select count(*)`;
            } else {
                sqlStmt = `select *`;
            }
                        
            if(type === 'jobName') sqlStmt += ` from hris.jobname jn where jn.job_name ilike :searchVal`;
            if(type === 'jobIndustry') sqlStmt += ` from hris.jobindustry ji where ji.job_industry_name ilike :searchVal`;
            if(type === 'jobFunction') sqlStmt += ` from hris.jobfunction jf where jf.job_function_name ilike :searchVal`;
            
            if(queryTypeLower !== 'count') sqlStmt += ` limit 10`
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
        return h.response({error: true, message: 'Internal Server Error!'}).code(500);
    }
}

const getSingleJob = async (request, h) => {
    try{
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden'}).code(403);
        }
        const { credentials } = request.auth || {};
        const { id: userId } = credentials || {};  
        const { jobUuid } = request.params || {};
        
        const { Jobapplication, Userinfo } = request.getModels('xpaxr');

        // get the company of the luser (using it only if he is a recruiter)
        const luserRecord = await Userinfo.findOne({ where: { userId }, attributes: { exclude: ['createdAt', 'updatedAt'] }});
        const luserProfileInfo = luserRecord && luserRecord.toJSON();
        const { companyId: recruiterCompanyId } = luserProfileInfo || {};
        
        // Checking user type from jwt
        let luserTypeName = request.auth.artifacts.decoded.userTypeName;             
                
        const db1 = request.getDb('xpaxr');

        // get sql statement for getting jobs or jobs count        
        function getSqlStmt(queryType){            
            let sqlStmt;
            const type = queryType && queryType.toLowerCase();
            if(type === 'count'){
                sqlStmt = `select count(*)`;
            } else {
                sqlStmt = `select
                jn.job_name, j.*, jt.*, jf.*,ji.*,jl.*,c.display_name as company_name,jqr.response_id,jqr.question_id,jqr.response_val`;
            }

            sqlStmt += `
            from hris.jobs j
                inner join hris.jobname jn on jn.job_name_id=j.job_name_id
                left join hris.jobsquesresponses jqr on jqr.job_id=j.job_id
                inner join hris.company c on c.company_id=j.company_id
                inner join hris.jobtype jt on jt.job_type_id=j.job_type_id                
                inner join hris.jobfunction jf on jf.job_function_id=j.job_function_id                
                inner join hris.jobindustry ji on ji.job_industry_id=j.job_industry_id
                inner join hris.joblocation jl on jl.job_location_id=j.job_location_id
            where j.active=true and j.job_uuid=:jobUuid`;

            // if he is an employer
            if(luserTypeName === 'candidate') sqlStmt += ` and j.is_private=false `;        
            if(luserTypeName === 'employer') sqlStmt += ` and j.company_id=:recruiterCompanyId`;        
            
            return sqlStmt;
        };

        const sequelize = db1.sequelize;
      	const sqlJobArray = await sequelize.query(getSqlStmt(), {
            type: QueryTypes.SELECT,
            replacements: { jobUuid, recruiterCompanyId },
        });      	        
        const rawJobArray = camelizeKeys(sqlJobArray);

        // check if already applied
        if(luserTypeName === 'candidate'){
            const rawAllAppliedJobs = await Jobapplication.findAll({ raw: true, nest: true, where: { userId }});           
            const appliedJobIds = [];
            rawAllAppliedJobs.forEach(aj => {
                const { jobId } = aj || {};
                if(jobId) {
                    appliedJobIds.push(Number(jobId));
                }
            });

            rawJobArray.forEach(j => {
                const { jobId } = j || {};
                if(appliedJobIds.includes(Number(jobId))) {
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
        if(Array.isArray(rawJobArray) && rawJobArray.length) {
            rawJobArray.forEach(r => {
                const { jobId, questionId, responseId, responseVal, ...rest } = r || {};
                jobsMap.set(jobId, { jobId, ...rest });
                
                if(responseId){
                    if(jobQuesMap[jobId]) {
                        jobQuesMap[jobId].push({questionId, responseId, responseVal});
                        } else {
                        jobQuesMap[jobId] = [{questionId, responseId, responseVal}];
                    }
                }
            });
            jobsMap.forEach((jqrObj, jm) => {
                const records = jobQuesMap[jm] || [];

                const questions = [];
                for (let response of records) {
                    const { questionId, responseVal } = response;
                    const res = { questionId, answer:responseVal.answer };
                    questions.push(res);
                }
                jqrObj.jobQuestionResponses = questions;
                fres.push(jqrObj);
            });                
        }   
        const responseJob = fres[0];
        return h.response(responseJob).code(200);

    } catch (error) {
        console.error(error.stack);
        return h.response({error: true, message: 'Internal Server Error!'}).code(500);
    }
}

const getAllJobs = async (request, h) => {
    try{
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden'}).code(403);
        }
        const { credentials } = request.auth || {};
        const { id: userId } = credentials || {};  
        
        const { Jobapplication, Userinfo } = request.getModels('xpaxr');

        // Checking user type from jwt
        let luserTypeName = request.auth.artifacts.decoded.userTypeName;   
        if(luserTypeName !== 'candidate') return h.response({error:true, message:'You are not authorized!'}).code(403);
        
        const { recommended, limit, offset, jobTypeId, jobFunctionId, jobLocationId, jobIndustryId, minExp, sort, createDate, search } = request.query;
        const searchVal = `%${search ? search.toLowerCase() : ''}%`;
        const recommendedVal = recommended ? Number(recommended) : 1;

        // sort query
        let [sortBy, sortType] = sort ? sort.split(':') : (recommendedVal === 1) ? ['score', 'DESC'] : ['created_at', 'DESC'];
        if (!sortType && sortBy !== 'created_at') sortType = 'ASC';
        if (!sortType && sortBy === 'created_at') sortType = 'DESC';
        const validSorts = [ 'score', 'created_at', 'job_name'];
        const isSortReqValid = validSorts.includes(sortBy);

        const validRecommendedVal = [ 0, 1];
        const isRecommendedValReqValid = validRecommendedVal.includes(recommendedVal);

        const isSortByValid = (recommendedVal !== 1 && sortBy === 'score') ? false : true;

        // pagination query
        const limitNum = limit ? Number(limit) : 10;
        const offsetNum = offset ? Number(offset) : 0;        

        // query validation
        if(isNaN(limitNum) || isNaN(offsetNum) || isNaN(recommendedVal) || !sortBy || !isSortReqValid || !isSortByValid || !isRecommendedValReqValid) return h.response({error: true, message: 'Invalid query parameters!'}).code(400);        
        if(limitNum>100) return h.response({error: true, message: 'Limit must not exceed 100!'}).code(400);

        // custom date search query
        let lowerDateRange;
        let upperDateRange;
        if(createDate){
            if(!isArray(createDate)) {
                lowerDateRange = new Date(createDate);
                upperDateRange = new Date('2999-12-31');
            } else {
                if(!createDate[0]) lowerDateRange = new Date('2000-01-01');
                if(!createDate[1]) upperDateRange = new Date('2999-12-31');
                
                lowerDateRange = new Date(createDate[0]);
                upperDateRange = new Date(createDate[1]);
            }    
            const isValidDate = !isNaN(Date.parse(lowerDateRange)) && !isNaN(Date.parse(upperDateRange));
            if(!isValidDate) return h.response({error: true, message: 'Unvalid createDate query!'}).code(400);
            const isValidDateRange = lowerDateRange.getTime() < upperDateRange.getTime();
            if(!isValidDateRange) return h.response({error: true, message: 'Unvalid createDate range!'}).code(400);                        
        } else {
            lowerDateRange = new Date('2000-01-01');
            upperDateRange = new Date('2999-12-31');
        }

        let recommendations;
        const jobIdArray = [];
        // GET RECOMMENDED JOBS FROM DATA SCIENCE SERVER
        if(recommendedVal === 1){
            /* UNCOMMENT THESE FOLLOWING LINES when going for staging */

            // let model = request.getModels('xpaxr');
            // if (!await isUserQuestionnaireDone(userId,model)) return h.response({error:"Questionnaire Not Done"}).code(409)
            // recommendations = await axios.get(`http://${config.dsServer.host}:${config.dsServer.port}/user/recommendation`,{ params: { user_id: userId } })
            // recommendations = recommendations.data["recommendation"] //this will be  sorted array of {job_id,score}
            
            

            // FAKE RECOMMENDED DATA (delete it when going for staging)
            const recommendations = [
                { job_id: '5', score: '5' },
                { job_id: '7', score: '4' },
                { job_id: '9', score: '3' },
                { job_id: '6', score: '2' },
                { job_id: '8', score: '1' },
            ]
        
            // storing all the jobIds in the given order            
            recommendations.forEach(item =>{
                jobIdArray.push(item.job_id);
            });
        }

        const db1 = request.getDb('xpaxr');
        const filters = { jobIdArray, recommendedVal,  search, sortBy, sortType };

        // get sql statement for getting jobs or jobs count        
        function getSqlStmt(queryType, obj = filters){
            const { jobIdArray, recommendedVal, jobTypeId, jobFunctionId, jobIndustryId, jobLocationId, minExp, search, sortBy, sortType } = obj;
            let sqlStmt;
            const type = queryType && queryType.toLowerCase();
            if(type === 'count'){
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
            where j.active=true 
                and j.is_private=false 
                and j.created_at > :lowerDateRange and j.created_at < :upperDateRange`;
            
            if(recommendedVal === 1) sqlStmt += ` and j.job_id in (:jobIdArray)`
            // filters
            if(jobTypeId){
                sqlStmt += isArray(jobTypeId) ? ` and j.job_type_id in (:jobTypeId)` : ` and j.job_type_id=:jobTypeId`;
            } 
            if(jobFunctionId){
                sqlStmt += isArray(jobFunctionId) ? ` and j.job_function_id in (:jobFunctionId)` : ` and j.job_function_id=:jobFunctionId`;
            } 
            if(jobIndustryId){
                sqlStmt += isArray(jobIndustryId) ? ` and j.job_industry_id in (:jobIndustryId)` : ` and j.job_industry_id=:jobIndustryId`;
            }         
            if(jobLocationId){
                sqlStmt += isArray(jobLocationId) ? ` and j.job_location_id in (:jobLocationId)` : ` and j.job_location_id=:jobLocationId`;
            }         
            if(minExp) sqlStmt += ` and j.min_exp=:minExp`;

            // search
            if(search) {
                sqlStmt += ` and (
                    jn.job_name ilike :searchVal
                    or j.job_description ilike :searchVal
                    or jt.job_type_name ilike :searchVal
                    or jf.job_function_name ilike :searchVal
                    or ji.job_industry_name ilike :searchVal
                    or jl.job_location_name ilike :searchVal
                )`;
            }

            if(type !== 'count') {
                // sorts (order)
                if(recommendedVal === 1){
                    if(sortBy === 'score'){
                        sqlStmt += ` order by case`
                        for( let i=0; i<jobIdArray.length; i++){
                            sqlStmt += ` WHEN j.job_id=${ jobIdArray[i] } THEN ${ i }`;
                        }
                        sqlStmt += ` end`;
                        if(sortType === 'asc') sqlStmt += ` desc`; //by default, above method keeps them in the order of the Data Science Server in the sense of asc, to reverse it you must use desc
                    } else {
                        if(sortBy === 'job_name') {
                            sqlStmt += ` order by jn.${sortBy} ${sortType}`;
                        } else {
                            sqlStmt += ` order by j.${sortBy} ${sortType}`;
                        }
                    }
                } else {
                    sqlStmt += ` order by j.${sortBy} ${sortType}`;
                };
                // limit and offset
                sqlStmt += ` limit :limitNum  offset :offsetNum`
            };

            return sqlStmt;
        };

        const sequelize = db1.sequelize;
      	const allSQLJobs = await sequelize.query(getSqlStmt(), {
            type: QueryTypes.SELECT,
            replacements: { jobIdArray, jobTypeId, jobFunctionId, jobIndustryId, jobLocationId, minExp, sortBy, sortType, limitNum, offsetNum, searchVal, lowerDateRange, upperDateRange },
        });
      	const allSQLJobsCount = await sequelize.query(getSqlStmt('count'), {
            type: QueryTypes.SELECT,
            replacements: { jobIdArray, jobTypeId, jobFunctionId, jobIndustryId, jobLocationId, minExp, sortBy, sortType, limitNum, offsetNum, searchVal, lowerDateRange, upperDateRange },
        });           
        const allJobs = camelizeKeys(allSQLJobs);

        // check if already applied
        const rawAllAppliedJobs = await Jobapplication.findAll({ raw: true, nest: true, where: { userId }});           
        const appliedJobIds = [];
        rawAllAppliedJobs.forEach(aj => {
            const { jobId } = aj || {};
            if(jobId) {
                appliedJobIds.push(Number(jobId));
            }
        });

        allJobs.forEach(j => {
            const { jobId } = j || {};
            if(appliedJobIds.includes(Number(jobId))) {
                j.isApplied = true;
            } else {
                j.isApplied = false;
            }
        });      

        const responses = { count: allSQLJobsCount[0].count, jobs: allJobs };                          
        return h.response(responses).code(200);

    } catch (error) {
        console.error(error.stack);
        return h.response({error: true, message: 'Internal Server Error!'}).code(500);
    }
}

const getRecruiterJobs = async (request, h) => {
    try{
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden'}).code(403);
        }
        const { credentials } = request.auth || {};
        const { id: userId } = credentials || {};  
        
        const { Userinfo } = request.getModels('xpaxr');
        
        // Checking user type from jwt
        let luserTypeName = request.auth.artifacts.decoded.userTypeName;   
        if(luserTypeName !== 'employer'){
            return h.response({error:true, message:'You are not authorized!'}).code(403);
        }           
        
        // get the company of the luser recruiter
        const luserRecord = await Userinfo.findOne({ where: { userId }, attributes: { exclude: ['createdAt', 'updatedAt'] }});
        const luserProfileInfo = luserRecord && luserRecord.toJSON();
        const { companyId: recruiterCompanyId } = luserProfileInfo || {};
        
        const { ownJobs, limit, offset, jobTypeId, jobFunctionId, jobLocationId, jobIndustryId, minExp, sort, createDate, search } = request.query;
        const searchVal = `%${search ? search.toLowerCase() : ''}%`;
        const ownJobsVal = ownJobs ? Number(ownJobs) : 0;

        // sort query
        let [sortBy, sortType] = sort ? sort.split(':') : ['created_at', 'DESC'];
        if (!sortType && sortBy !== 'created_at') sortType = 'ASC';
        if (!sortType && sortBy === 'created_at') sortType = 'DESC';
        const validSorts = [ 'created_at', 'job_name'];
        const isSortReqValid = validSorts.includes(sortBy);
        
        const validOwnJobsVal = [ 0, 1 ];
        const isOwnJobsReqValid = validOwnJobsVal.includes(ownJobsVal);

        // pagination query
        const limitNum = limit ? Number(limit) : 10;
        const offsetNum = offset ? Number(offset) : 0;

        // query validation
        if(isNaN(limitNum) || isNaN(offsetNum) || isNaN(ownJobsVal) || !sortBy || !isSortReqValid || !isOwnJobsReqValid) return h.response({error: true, message: 'Invalid query parameters!'}).code(400);        
        if(limitNum>100) return h.response({error: true, message: 'Limit must not exceed 100!'}).code(400);

        // custom date search query
        let lowerDateRange;
        let upperDateRange;
        if(createDate){
            if(!isArray(createDate)) {
                lowerDateRange = new Date(createDate);
                upperDateRange = new Date('2999-12-31');
            } else {
                if(!createDate[0]) lowerDateRange = new Date('2000-01-01');
                if(!createDate[1]) upperDateRange = new Date('2999-12-31');
                
                lowerDateRange = new Date(createDate[0]);
                upperDateRange = new Date(createDate[1]);
            }    
            const isValidDate = !isNaN(Date.parse(lowerDateRange)) && !isNaN(Date.parse(upperDateRange));
            if(!isValidDate) return h.response({error: true, message: 'Unvalid createDate query!'}).code(400);
            const isValidDateRange = lowerDateRange.getTime() < upperDateRange.getTime();
            if(!isValidDateRange) return h.response({error: true, message: 'Unvalid createDate range!'}).code(400);                        
        } else {
            lowerDateRange = new Date('2000-01-01');
            upperDateRange = new Date('2999-12-31');
        }
        
        const db1 = request.getDb('xpaxr');

        // get sql statement for getting jobs or jobs count
        const filters = { ownJobsVal, jobTypeId, jobFunctionId, jobIndustryId, jobLocationId, minExp, search, sortBy, sortType };
        function getSqlStmt(queryType, obj = filters){
            const { ownJobsVal, jobTypeId, jobFunctionId, jobIndustryId, jobLocationId, minExp, search, sortBy, sortType } = obj;
            let sqlStmt;
            const type = queryType && queryType.toLowerCase();
            if(type === 'count'){
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
                    inner join hris.jobhiremember jhm on jhm.job_id=j.job_id 
                where j.active=true 
                    and j.created_at > :lowerDateRange and j.created_at < :upperDateRange
                    and j.company_id=:recruiterCompanyId 
                    and jhm.access_level in ('creator', 'administrator', 'viewer') 
                    and jhm.user_id=:userId`;

            // filters
            if(ownJobsVal === 'true'){
                sqlStmt += ` and j.user_id=:userId`;
            }
            if(jobTypeId){
                sqlStmt += isArray(jobTypeId) ? ` and j.job_type_id in (:jobTypeId)` : ` and j.job_type_id=:jobTypeId`;
            } 
            if(jobFunctionId){
                sqlStmt += isArray(jobFunctionId) ? ` and j.job_function_id in (:jobFunctionId)` : ` and j.job_function_id=:jobFunctionId`;
            } 
            if(jobIndustryId){
                sqlStmt += isArray(jobIndustryId) ? ` and j.job_industry_id in (:jobIndustryId)` : ` and j.job_industry_id=:jobIndustryId`;
            }         
            if(jobLocationId){
                sqlStmt += isArray(jobLocationId) ? ` and j.job_location_id in (:jobLocationId)` : ` and j.job_location_id=:jobLocationId`;
            }
            if(minExp) sqlStmt += ` and j.min_exp=:minExp`;

            // search
            if(search) {
                sqlStmt += ` and (
                    jn.job_name ilike :searchVal
                    or j.job_description ilike :searchVal
                    or jt.job_type_name ilike :searchVal
                    or jf.job_function_name ilike :searchVal
                    or ji.job_industry_name ilike :searchVal
                    or jl.job_location_name ilike :searchVal
                )`;
            };
            
            if(type !== 'count') {
                // sorts
                if(sortBy === 'job_name'){
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
        return h.response({error: true, message: 'Internal Server Error!'}).code(500);
    }
}

const getJobAccessRecords = async (request, h) => {
    try {
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden'}).code(403);
        }
        const { credentials } = request.auth || {};
        const { id: userId } = credentials || {};        
        // Checking user type from jwt
        let luserTypeName = request.auth.artifacts.decoded.userTypeName;
        if(luserTypeName !== 'employer'){
            return h.response({error:true, message:'You are not authorized!'}).code(403);
        }
        const { jobId } = request.params || {};
        const { Jobhiremember } = request.getModels('xpaxr');

        const luserAccessRecord = await Jobhiremember.findOne({ where: {jobId, userId}});
        const luserAccessInfo = luserAccessRecord && luserAccessRecord.toJSON();
        const { accessLevel } = luserAccessInfo || {};
        if(accessLevel !== 'creator') return h.response({error:true, message:'You are not authorized!'}).code(403);

        // find all access records (using SQL to avoid nested ugliness in the response)
        const db1 = request.getDb('xpaxr');
        const sqlStmt = `select ui.first_name, ui.email, jhm.*
              from hris.jobhiremember jhm
                inner join hris.userinfo ui on ui.user_id=jhm.user_id                
              where jhm.job_id=:jobId`;

        const sequelize = db1.sequelize;
      	const allSQLAccessRecords = await sequelize.query(sqlStmt, {
            type: QueryTypes.SELECT,
            replacements: { 
                jobId
            },
        });
        const accessRecords = camelizeKeys(allSQLAccessRecords);

        return h.response({ accessRecords: accessRecords }).code(200);
    }
    catch (error) {
        console.error(error.stack);
        return h.response({error: true, message: 'Bad Request'}).code(400);
    }
}

const shareJob = async (request, h) => {
    try {
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden'}).code(403);
        }
        const { credentials } = request.auth || {};
        const { id: userId } = credentials || {};        
        // Checking user type from jwt
        let luserTypeName = request.auth.artifacts.decoded.userTypeName;
        if(luserTypeName !== 'employer'){
            return h.response({error:true, message:'You are not authorized!'}).code(403);
        }

        const { jobId: rParamsJobId } = request.params || {};
        const { Job, Jobhiremember, Userinfo, Usertype } = request.getModels('xpaxr');

        // get the company of the recruiter
        const userRecord = await Userinfo.findOne({ where: { userId }, attributes: { exclude: ['createdAt', 'updatedAt'] }});
        const userProfileInfo = userRecord && userRecord.toJSON();
        const { companyId: recruiterCompanyId } = userProfileInfo || {};        
        
        const jobRecord = await Job.findOne({where: {jobId: rParamsJobId}});
        const jobRecordInfo = jobRecord && jobRecord.toJSON();
        const { jobId, userId: jobCreatorId, companyId: creatorCompanyId } = jobRecordInfo || {};  
        if(!jobId) return h.response({ error: true, message: 'No job found'}).code(400);

        if(!(userId === jobCreatorId && recruiterCompanyId === creatorCompanyId)){
            return h.response({error: true, message: `You are not authorized`}).code(403);
        }

        // sharing job with fellow recruiter
        const { accessLevel, userId: fellowRecruiterId } = request.payload || {};
        if(!(accessLevel && fellowRecruiterId)) return h.response({ error: true, message: 'Please provide necessary details'}).code(400);

        const validAccessLevel = ['viewer', 'administrator'];
        const isValidAccessLevel = validAccessLevel.includes(accessLevel.toLowerCase());

        if(!isValidAccessLevel) return h.response({ error: true, message: 'Not a valid access level!'}).code(400);
        if(userId === fellowRecruiterId) return h.response({ error: true, message: 'Can not share with oneself!'}).code(400);

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

        if(fuserTypeName !== 'employer') return h.response({error: true, message: 'The fellow user is not a recruiter.'}).code(400);
        if(recruiterCompanyId !== fuserCompanyId) return h.response({error: true, message: 'The fellow recruiter is not from the same company.'}).code(400);
              
        // is already shared with this fellow recruiter
        const alreadySharedRecord = await Jobhiremember.findOne({ where: { jobId, userId: fellowRecruiterId }});
        const alreadySharedInfo = alreadySharedRecord && alreadySharedRecord.toJSON();
        const { jobHireMemberId } = alreadySharedInfo || {};

        if(jobHireMemberId) return h.response({ error: true, message: 'Already shared with this user!'}).code(400);

        const accessRecord = await Jobhiremember.create({ accessLevel, userId: fellowRecruiterId, jobId })
        return h.response(accessRecord).code(201);
    }
    catch (error) {
        console.error(error.stack);
        return h.response({error: true, message: 'Bad Request'}).code(400);
    }
}

const updateSharedJob = async (request, h) => {
    try {
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden'}).code(403);
        }
        const { credentials } = request.auth || {};
        const { id: userId } = credentials || {};        
        // Checking user type from jwt
        let luserTypeName = request.auth.artifacts.decoded.userTypeName;
        if(luserTypeName !== 'employer'){
            return h.response({error:true, message:'You are not authorized!'}).code(403);
        }

        const { jobId: rParamsJobId } = request.params || {};
        const { Job, Jobhiremember, Userinfo, Usertype } = request.getModels('xpaxr');

        // get the company of the recruiter
        const userRecord = await Userinfo.findOne({ where: { userId }, attributes: { exclude: ['createdAt', 'updatedAt'] }});
        const userProfileInfo = userRecord && userRecord.toJSON();
        const { companyId: recruiterCompanyId } = userProfileInfo || {};        

        const { jobId, userId: jobCreatorId, companyId: creatorCompanyId } = await Job.findOne({where: {jobId: rParamsJobId}});
        if(!(userId === jobCreatorId && recruiterCompanyId === creatorCompanyId)) return h.response({error: true, message: `You are not authorized`}).code(403);
        
        const { accessLevel, userId: fellowRecruiterId } = request.payload || {};
        if(!(accessLevel && fellowRecruiterId)) return h.response({ error: true, message: 'Please provide necessary details'}).code(400);
        const validAccessLevel = ['viewer', 'administrator'];
        const isValidAccessLevel = validAccessLevel.includes(accessLevel.toLowerCase());
        
        if(!isValidAccessLevel) return h.response({ error: true, message: 'Not a valid access level!'}).code(400);
        if(userId === fellowRecruiterId) return h.response({ error: true, message: 'Can not share with oneself!'}).code(400);

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

        if(fuserTypeName !== 'employer') return h.response({error: true, message: 'The fellow user is not a recruiter.'}).code(400);

        // is already shared with this fellow recruiter
        const alreadySharedRecord = await Jobhiremember.findOne({ where: { jobId, userId: fellowRecruiterId }});
        const alreadySharedInfo = alreadySharedRecord && alreadySharedRecord.toJSON();
        const { jobHireMemberId } = alreadySharedInfo || {};

        if(!jobHireMemberId) return h.response({ error: true, message: 'Not shared the job with this user yet!'}).code(400);

        // update the shared job          
        await Jobhiremember.update({ accessLevel, userId: fellowRecruiterId, jobId }, { where: { jobId, userId: fellowRecruiterId }});
        await Jobhiremember.update({ accessLevel, userId: fellowRecruiterId, jobId }, { where: { jobId, userId: fellowRecruiterId }});
        const updatedAccessRecord = await Jobhiremember.findOne({ where: { jobId, userId: fellowRecruiterId }});
        return h.response(updatedAccessRecord).code(201);
    }
    catch (error) {
        console.error(error.stack);
        return h.response({error: true, message: 'Bad Request'}).code(400);
    }
}

const deleteJobAccessRecord = async (request, h) => {
    try {
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden'}).code(403);
        }
        const { credentials } = request.auth || {};
        const { id: userId } = credentials || {};        
        // Checking user type from jwt
        let luserTypeName = request.auth.artifacts.decoded.userTypeName;
        if(luserTypeName !== 'employer'){
            return h.response({error:true, message:'You are not authorized!'}).code(403);
        }

        const { jobId: rParamsJobId } = request.params || {};
        const { Job, Jobhiremember, Userinfo } = request.getModels('xpaxr');

        // get the company of the recruiter
        const userRecord = await Userinfo.findOne({ where: { userId }, attributes: { exclude: ['createdAt', 'updatedAt'] }});
        const userProfileInfo = userRecord && userRecord.toJSON();
        const { companyId: recruiterCompanyId } = userProfileInfo || {};        

        const jobRecord = await Job.findOne({where: {jobId: rParamsJobId}});
        const jobRecordInfo = jobRecord && jobRecord.toJSON();
        const { jobId, userId: jobCreatorId, companyId: creatorCompanyId } = jobRecordInfo || {};  
        if(!jobId) return h.response({ error: true, message: 'No job found'}).code(400);

        if(!(userId === jobCreatorId && recruiterCompanyId === creatorCompanyId)) return h.response({error: true, message: `You are not authorized`}).code(403);
        
        const { userId: fellowRecruiterId } = request.payload || {};
        if(!fellowRecruiterId) return h.response({ error: true, message: 'Please provide necessary details'}).code(400);
       
        // is already shared with this fellow recruiter
        const alreadySharedRecord = await Jobhiremember.findOne({ where: { jobId, userId: fellowRecruiterId }});
        const alreadySharedInfo = alreadySharedRecord && alreadySharedRecord.toJSON();
        const { jobHireMemberId, accessLevel } = alreadySharedInfo || {};

        if(!jobHireMemberId) return h.response({ error: true, message: 'Not shared the job with this user yet!'}).code(400);
        if(accessLevel === 'creator') return h.response({ error: true, message: 'This record can not be deleted!'}).code(400);

        // delete the shared job record
        await Jobhiremember.destroy({ where: { jobId, userId: fellowRecruiterId }});        
        return h.response({message: 'Access record deleted'}).code(200);
    }
    catch (error) {
        console.error(error.stack);
        return h.response({error: true, message: 'Bad Request'}).code(400);
    }
}

const updateJob = async (request, h) => {
    try{
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden'}).code(403);
        }
        // Checking user type from jwt
        let luserTypeName = request.auth.artifacts.decoded.userTypeName;   
        if(luserTypeName !== 'employer'){
            return h.response({error:true, message:'You are not authorized!'}).code(403);
        }

        const { credentials } = request.auth || {};
        const { id: userId } = credentials || {};

        const { jobUuid } = request.params || {};
        const { jobName, jobDescription, jobIndustryId, jobFunctionId, jobTypeId, jobLocationId, minExp, isPrivate, duration } = request.payload || {};
        
        const { Job, Jobname, Jobtype, Userinfo } = request.getModels('xpaxr');
        // get the company of the recruiter
        const userRecord = await Userinfo.findOne({ where: { userId }, attributes: { exclude: ['createdAt', 'updatedAt'] }});
        const userProfileInfo = userRecord && userRecord.toJSON();
        const { companyId: recruiterCompanyId } = userProfileInfo || {};        

        const { userId: jobCreatorId, companyId: creatorCompanyId } = await Job.findOne({where: {jobUuid}});

        if(!(userId === jobCreatorId && recruiterCompanyId === creatorCompanyId)){
            return h.response({error: true, message: `You are not authorized to update the job`}).code(403);
        }

        let typeIdOfThisUpdatedJob;
        let durationVal = duration;
        if(!durationVal){
            const jobRecord = await Job.findOne({ where: { jobUuid }});
            const jobInfo = jobRecord && jobRecord.toJSON();
            const { jobTypeId: thisJobTypeId, duration: thisJobDuration } = jobInfo || {};    
            durationVal = thisJobDuration;
        }

        if(jobTypeId){            
            typeIdOfThisUpdatedJob = jobTypeId;
        } else {
            const jobRecord = await Job.findOne({ where: { jobUuid }});
            const jobInfo = jobRecord && jobRecord.toJSON();
            const { jobTypeId: thisJobTypeId } = jobInfo || {};    
            typeIdOfThisUpdatedJob = thisJobTypeId;            
        }

        const jobTypeRecord = await Jobtype.findOne({ where: { jobTypeId: typeIdOfThisUpdatedJob }});
        const jobTypeInfo = jobTypeRecord && jobTypeRecord.toJSON();
        const { jobTypeName } = jobTypeInfo || {};

        const jobsWithDuration = [ 'Internship', 'Full-time Contract', 'Part-time Contract'];
        const isJobWithDuration = jobsWithDuration.includes(jobTypeName);

        if(isJobWithDuration && !durationVal){
            return h.response({ error: true, message: 'Please provide necessary details'}).code(400);
        }
        if(!isJobWithDuration){
            durationVal = null;
        }

        // check if job name already exists

        let jobNameIdToSave;
        if(jobName){
            const jobNameRecord = await Jobname.findOne({ where: { jobNameLower: jobName.toLowerCase() }});
            const jobNameInfo = jobNameRecord && jobNameRecord.toJSON();
            const { jobNameId: oldJobNameId } = jobNameInfo || {};

            if(!oldJobNameId){
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
        
        await Job.update({ jobNameId: jobNameIdToSave, jobDescription, jobIndustryId, jobFunctionId, jobTypeId, jobLocationId, minExp, isPrivate, duration: durationVal }, { where: { jobUuid }});
        
        const record = await Job.findOne({where: {jobUuid}});
        return h.response(record).code(201);
    }
    catch (error) {
        console.error(error.stack);
        return h.response({error: true, message: 'Bad Request'}).code(400);
    }
}

const createJobQuesResponses = async (request, h) => {
    try{
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden'}).code(403);
        }
        const { jobId } = request.params || {};
        const questionResponses= request.payload || {};

        const responses = []
        for (let response of questionResponses) {
            const { questionId, answer } = response;
            const record = { questionId, responseVal: {'answer': answer}, jobId }
            responses.push(record);
        }
        const { Jobsquesresponse } = request.getModels('xpaxr');
        const records = await Jobsquesresponse.bulkCreate(responses, {updateOnDuplicate:["responseVal"]});

        // formatting the questionaire response
        const quesResponses = [];
        for (let response of records) {
          const { questionId, responseVal } = response;
          const res = { questionId, answer:responseVal.answer };
          quesResponses.push(res);
        }

        return h.response({ responses: quesResponses }).code(201);
    }
    catch (error) {
        console.error(error.stack);
        return h.response({error: true, message: 'Bad Request'}).code(400);
    }
}

const getJobQuesResponses = async (request, h) => {
    try{
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden'}).code(403);
        }
        const { jobId } = request.params || {};
        const { Jobsquesresponse } = request.getModels('xpaxr');
        const records = await Jobsquesresponse.findAll({ where: {jobId} });
        const responses = [];
        for (let response of records) {
          const { questionId, responseVal } = response;
          const res = { questionId, answer:responseVal.answer };
          responses.push(res);
        }
        return h.response({ responses }).code(200);
    }
    catch (error) {
        console.error(error.stack);
        return h.response({error: true, message: 'Internal Server Error!'}).code(500);
    }
}

const applyToJob = async (request, h) => {
    try{
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden'}).code(403);
        }
        let luserTypeName = request.auth.artifacts.decoded.userTypeName;  
        if(luserTypeName !== 'candidate'){
            return h.response({error:true, message:'You are not authorized!'}).code(403);
        }

        // Candidate should not be allowed to modify status
        const { jobId } = request.payload || {};
        if(!jobId){
            return h.response({ error: true, message: 'Not a valid request!'}).code(400);
        }
        
        const { credentials } = request.auth || {};
        const { id: userId } = credentials || {};

        const record = { jobId, userId, isApplied: true, isWithdrawn: false, status: "Applied" }
        const { Job, Jobapplication, Applicationhiremember, Applicationauditlog } = request.getModels('xpaxr');
        
        const jobInDB = await Job.findOne({ where: { jobId }});
        const {jobId: jobInDbId} = jobInDB || {};
        if(!jobInDbId) return h.response({error: true, message: 'Bad request! No job found!'}).code(400);
        
        const alreadyAppliedRecord = await Jobapplication.findOne({ where: { jobId, userId, isApplied: true }});
        const {applicationId: alreadyAppliedApplicationId} = alreadyAppliedRecord || {};
        if(alreadyAppliedApplicationId) return h.response({error: true, message: 'Already applied!'}).code(400);
        
        const [recordRes] = await Jobapplication.upsert(record);
        const recordResponse = recordRes && recordRes.toJSON();
        const { applicationId } = recordRes;
        const { userId: employerId } = await Job.findOne({ where: { jobId }})
        
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

        delete recordResponse.createdAt;
        delete recordResponse.updatedAt;
        delete recordResponse.userId;
        return h.response(recordResponse).code(200);
    }
    catch(error) {
        console.error(error.stack);
        return h.response({error: true, message: 'Bad Request'}).code(400);
    }
}

const getAppliedJobs = async (request, h) => {
    try{
        if (!request.auth.isAuthenticated) {
        return h.response({ message: 'Forbidden' }).code(403);
        }
        let luserTypeName = request.auth.artifacts.decoded.userTypeName;  
        if(luserTypeName !== 'candidate'){
            return h.response({error:true, message:'You are not authorized!'}).code(403);
        }

        const { credentials } = request.auth || {};
        const { id: userId } = credentials || {};

        const { limit, offset, sort, search, status, applicationDate } = request.query;
        const searchVal = `%${search ? search.toLowerCase() : ''}%`;

        // Checking if application status is valid
        const validStatus = ['Applied', 'Withdrawn', 'Shortlisted', 'Interview', 'Offer', 'Hired'];
        const isStatusReqValid = (status && isArray(status)) ? (
        status.every( req => validStatus.includes(req))
        ) : validStatus.includes(status);
        if (status && !isStatusReqValid) return h.response({ error: true, message: 'Invalid status query parameter!'}).code(400);

        // sort query
        let [sortBy, sortType] = sort ? sort.split(':') : ['created_at', 'DESC'];
        if (!sortType && sortBy !== 'created_at') sortType = 'ASC';
        if (!sortType && sortBy === 'created_at') sortType = 'DESC';

        const validSorts = ['status', 'created_at', 'job_name'];
        const isSortReqValid = validSorts.includes(sortBy);

        // pagination
        const limitNum = limit ? Number(limit) : 10;
        const offsetNum = offset ? Number(offset) : 0;

        if(isNaN(limitNum) || isNaN(offsetNum) || !sortBy || !isSortReqValid) return h.response({error: true, message: 'Invalid query parameters!'}).code(400);        
        if(limitNum>100) return h.response({error: true, message: 'Limit must not exceed 100!'}).code(400);

        // custom date search query
        let lowerDateRange;
        let upperDateRange;
        if(applicationDate){
            if(!isArray(applicationDate)) {
                lowerDateRange = new Date(applicationDate);
                upperDateRange = new Date('2999-12-31');
            } else {
                if(!applicationDate[0]) lowerDateRange = new Date('2000-01-01');
                if(!applicationDate[1]) upperDateRange = new Date('2999-12-31');
                
                lowerDateRange = new Date(applicationDate[0]);
                upperDateRange = new Date(applicationDate[1]);
            }    
            const isValidDate = !isNaN(Date.parse(lowerDateRange)) && !isNaN(Date.parse(upperDateRange));
            if(!isValidDate) return h.response({error: true, message: 'Unvalid applicationDate query!'}).code(400);
            const isValidDateRange = lowerDateRange.getTime() < upperDateRange.getTime();
            if(!isValidDateRange) return h.response({error: true, message: 'Unvalid applicationDate range!'}).code(400);                        
        } else {
            lowerDateRange = new Date('2000-01-01');
            upperDateRange = new Date('2999-12-31');
        }

        const db1 = request.getDb('xpaxr');

        // get sql statement for getting jobs or jobs count
        const filters = { search, sortBy, sortType, status };
        function getSqlStmt(queryType, obj = filters){
            const { search, sortBy, sortType, status } = obj;
            let sqlStmt;
            const type = queryType && queryType.toLowerCase();
            if(type === 'count'){
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
            where ja.user_id=:userId
                and ja.created_at > :lowerDateRange and ja.created_at < :upperDateRange`;

            // filters
            if(status){
                sqlStmt += isArray(status) ? ` and ja.status in (:status)` : ` and ja.status=:status`;
            } 
            // search
            if(search) {
                sqlStmt += ` and (
                    jn.job_name ilike :searchVal
                    or c.company_name ilike :searchVal
                )`;
            };
            
            if(type !== 'count') {
                // sorts
                if(sortBy === 'job_name'){
                    sqlStmt += ` order by jn.${sortBy} ${sortType}`;
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
        return h.response({error: true, message: 'Internal Server Error!'}).code(500);
    }
}

const withdrawFromAppliedJob = async (request, h) => {
    try{
      if (!request.auth.isAuthenticated) {
        return h.response({ message: 'Forbidden' }).code(403);
      }   
      let luserTypeName = request.auth.artifacts.decoded.userTypeName;  
      if(luserTypeName !== 'candidate'){
        return h.response({error:true, message:'You are not authorized!'}).code(403);
      }

      const { jobId } = request.payload || {};
      if(!jobId){
        return h.response({ error: true, message: 'Not a valid request!' }).code(400);    
      }

      const { credentials } = request.auth || {};
      const { id: luserId } = credentials || {};

      const { Job, Jobname, Jobapplication, Applicationauditlog, Jobtype, Jobindustry, Jobfunction, Joblocation } = request.getModels('xpaxr');            
      const requestedForApplication = await Jobapplication.findOne({ where: { jobId: jobId, userId: luserId }}) || {};
      
      if(Object.keys(requestedForApplication).length === 0){
        return h.response({ error: true, message: 'Bad request! No applied job found!' }).code(400);    
      }
      if(requestedForApplication.isWithdrawn){
        return h.response({ error: true, message: 'Bad request! Already withdrawn!' }).code(400);    
      }
      
      const { applicationId } = requestedForApplication && requestedForApplication.toJSON();
      await Jobapplication.update( { isWithdrawn: true, status: 'Withdrawn' }, { where: { applicationId: applicationId }} );
      await Applicationauditlog.create({ 
            affectedApplicationId: applicationId,
            performerUserId: luserId,
            actionName: 'Withdraw from a Job',
            actionType: 'UPDATE',
            actionDescription: `The user of userId ${luserId} has withdrawn from the job of jobId ${jobId}`
        });

        const db1 = request.getDb('xpaxr');
        const sqlStmt = `select  
                ja.application_id, ja.job_id, ja.user_id as applicant_id, ja.is_applied, ja.is_withdrawn, ja.status,
                jn.job_name, jt.job_type_name, ji.job_industry_name, jf.job_function_name, jl.job_location_name, j.*, j.user_id as creator_id
            from hris.jobapplications ja
                inner join hris.jobs j on j.job_id=ja.job_id
                inner join hris.jobname jn on jn.job_name_id=j.job_name_id
                
                left join hris.jobtype jt on jt.job_type_id=j.job_type_id
                left join hris.jobindustry ji on ji.job_industry_id=j.job_industry_id
                left join hris.jobfunction jf on jf.job_function_id=j.job_function_id
                left join hris.joblocation jl on jl.job_location_id=j.job_location_id
            where ja.application_id=:applicationId`;
        
        const sequelize = db1.sequelize;
        const ares = await sequelize.query(sqlStmt, {
            type: QueryTypes.SELECT,
            replacements: { applicationId },
        });
        const updatedApplicationData = camelizeKeys(ares)[0];
    
        return h.response(updatedApplicationData).code(200);
    }
    catch(error) {
      console.log(error.stack);
      return h.response({ error: true, message: 'Internal Server Error' }).code(500);
    }
}

const getApplicantProfile = async (request, h) => {
    try{
      if (!request.auth.isAuthenticated) {
        return h.response({ message: 'Forbidden' }).code(403);
      }
      // Checking user type from jwt
      let luserTypeName = request.auth.artifacts.decoded.userTypeName;   
      if(luserTypeName !== 'employer'){
        return h.response({error:true, message:'You are not authorized!'}).code(403);
      }

      const { Userinfo, Usertype, Userrole } = request.getModels('xpaxr');
                  
      const { userId } = request.params || {};
      const userRecord = await Userinfo.findOne({ where: { userId }, attributes: { exclude: ['createdAt', 'updatedAt'] }});
      const applicantProfileInfo = userRecord && userRecord.toJSON();
      const { userTypeId, roleId } = applicantProfileInfo || {};
      
      const userTypeRecord = await Usertype.findOne({ where: { userTypeId }});
      const userRoleRecord = await Userrole.findOne({ where: { roleId }});
      const { userTypeName } = userTypeRecord && userTypeRecord.toJSON();
      const { roleName } = userRoleRecord && userRoleRecord.toJSON();
  
      applicantProfileInfo.userTypeName = userTypeName;
      applicantProfileInfo.roleName = roleName;
  
      return h.response(applicantProfileInfo).code(200);
    }
    catch(error) {
      console.error(error.stack);
      return h.response({ error: true, message: 'Bad Request!' }).code(500);
    }
}

const getAllApplicantsSelectiveProfile = async (request, h) => {
    try{
      if (!request.auth.isAuthenticated) {
        return h.response({ message: 'Forbidden' }).code(403);
      }
      const { credentials } = request.auth || {};
      const { id: userId } = credentials || {}; 
      // Checking user type from jwt
      let luserTypeName = request.auth.artifacts.decoded.userTypeName;   
      if(luserTypeName !== 'employer'){
        return h.response({error:true, message:'You are not authorized!'}).code(403);
      }

      const { limit, offset, sort, applicationDate, search, status } = request.query;            
      const searchVal = `%${search ? search.toLowerCase() : ''}%`;

      // Checking if application status is valid
      const validStatus = ['Applied', 'Withdrawn', 'Shortlisted', 'Interview', 'Offer', 'Hired'];
      const isStatusReqValid = (status && isArray(status)) ? (
      status.every( req => validStatus.includes(req))
      ) : validStatus.includes(status);
      if (status && !isStatusReqValid) return h.response({ error: true, message: 'Invalid status query parameter!'}).code(400);
    
      // sort query
      let [sortBy, sortType] = sort ? sort.split(':') : ['application_date', 'DESC'];
      if (!sortType && sortBy !== 'application_date') sortType = 'ASC';
      if (!sortType && sortBy === 'application_date') sortType = 'DESC';      
      const validSorts = ['first_name', 'last_name', 'application_date', 'status'];
      const isSortReqValid = validSorts.includes(sortBy);

      // pagination
      const limitNum = limit ? Number(limit) : 10;
      const offsetNum = offset ? Number(offset) : 0;
       if(isNaN(limitNum) || isNaN(offsetNum) || !isSortReqValid){
        return h.response({error: true, message: 'Invalid query parameters!'}).code(400);
      }       
      if(limitNum>100){
        return h.response({error: true, message: 'Limit must not exceed 100!'}).code(400);
      }

      // custom date search query
      let lowerDateRange;
      let upperDateRange;
      if(applicationDate){
          if(!isArray(applicationDate)) {
              lowerDateRange = new Date(applicationDate);
              upperDateRange = new Date('2999-12-31');
          } else {
              if(!applicationDate[0]) lowerDateRange = new Date('2000-01-01');
              if(!applicationDate[1]) upperDateRange = new Date('2999-12-31');
              
              lowerDateRange = new Date(applicationDate[0]);
              upperDateRange = new Date(applicationDate[1]);
          }    
          const isValidDate = !isNaN(Date.parse(lowerDateRange)) && !isNaN(Date.parse(upperDateRange));
          if(!isValidDate) return h.response({error: true, message: 'Unvalid applicationDate query!'}).code(400);
          const isValidDateRange = lowerDateRange.getTime() < upperDateRange.getTime();
          if(!isValidDateRange) return h.response({error: true, message: 'Unvalid applicationDate range!'}).code(400);                        
      } else {
          lowerDateRange = new Date('2000-01-01');
          upperDateRange = new Date('2999-12-31');
      }

      const { jobId } = request.params || {};      
      const db1 = request.getDb('xpaxr');

        // get sql statement for getting all applications or all applications' count        
        const filters = { status, search, sortBy, sortType }
        function getSqlStmt(queryType, obj = filters){            
            const { status, search, sortBy, sortType } = obj;
            let sqlStmt;
            const type = queryType && queryType.toLowerCase();
            if(type === 'count'){
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
                    and ja.job_id=:jobId and ahm.user_id=:userId
                    and ja.created_at > :lowerDateRange and ja.created_at < :upperDateRange`;
            
            // filters
            if(status){
                sqlStmt += isArray(status) ? ` and ja.status in (:status)` : ` and ja.status=:status`;
            } 
            // search
            if(search) {
                sqlStmt += ` and (
                    ui.first_name ilike :searchVal
                    or ui.last_name ilike :searchVal                    
                )`;
            }

            if(type !== 'count') {
                // sorts
                if(sortBy === 'application_date'){
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
    catch(error) {
      console.error(error.stack);
      return h.response({ error: true, message: 'Bad Request!' }).code(500);
    }
}

const getApplicationAccessRecords = async (request, h) => {
    try {
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden'}).code(403);
        }
        const { credentials } = request.auth || {};
        const { id: userId } = credentials || {};        
        // Checking user type from jwt
        let luserTypeName = request.auth.artifacts.decoded.userTypeName;
        if(luserTypeName !== 'employer'){
            return h.response({error:true, message:'You are not authorized!'}).code(403);
        }
        const { applicationId } = request.params || {};
        const { Applicationhiremember } = request.getModels('xpaxr');

        const luserAccessRecord = await Applicationhiremember.findOne({ where: {applicationId, userId}});
        const luserAccessInfo = luserAccessRecord && luserAccessRecord.toJSON();
        const { accessLevel } = luserAccessInfo || {};
        if(accessLevel !== 'jobcreator') return h.response({error:true, message:'You are not authorized!'}).code(403);

        // find all access records (using SQL to avoid nested ugliness in the response)
        const db1 = request.getDb('xpaxr');
        const sqlStmt = `select ui.first_name, ui.email, ahm.*
            from hris.applicationhiremember ahm
                inner join hris.userinfo ui on ui.user_id=ahm.user_id                
            where ahm.application_id=:applicationId`;

        const sequelize = db1.sequelize;
      	const allSQLAccessRecords = await sequelize.query(sqlStmt, {
            type: QueryTypes.SELECT,
            replacements: { 
                applicationId
            },
        });
        const accessRecords = camelizeKeys(allSQLAccessRecords);
        return h.response({ accessRecords }).code(200);
    }
    catch (error) {
        console.error(error.stack);
        return h.response({error: true, message: 'Bad Request'}).code(400);
    }
}

const shareApplication = async (request, h) => {
    try {
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden'}).code(403);
        }
        const { credentials } = request.auth || {};
        const { id: userId } = credentials || {};        
        // Checking user type from jwt
        let luserTypeName = request.auth.artifacts.decoded.userTypeName;
        if(luserTypeName !== 'employer'){
            return h.response({error:true, message:'You are not authorized!'}).code(403);
        }

        const { applicationId: rParamsApplicationId } = request.params || {};
        const { Job, Jobapplication, Applicationhiremember, Userinfo, Usertype } = request.getModels('xpaxr');

        // get the company of the recruiter
        const userRecord = await Userinfo.findOne({ where: { userId }, attributes: { exclude: ['createdAt', 'updatedAt'] }});
        const userProfileInfo = userRecord && userRecord.toJSON();
        const { companyId: recruiterCompanyId } = userProfileInfo || {};        
                
        const applicationRecord = await Jobapplication.findOne({where: { applicationId: rParamsApplicationId, isWithdrawn: false }});
        const applicationRecordInfo = applicationRecord && applicationRecord.toJSON();
        const { applicationId, jobId } = applicationRecordInfo || {};  
        if(!applicationId) return h.response({ error: true, message: 'No application found'}).code(400);
        
        const { companyId: creatorCompanyId } = await Job.findOne({where: {jobId}});
        if(recruiterCompanyId !== creatorCompanyId){
            return h.response({error: true, message: `You are not authorized`}).code(403);
        }

        // can he share this application?
        const canIshareRecord = await Applicationhiremember.findOne({ where: { applicationId, userId }});
        const canIshareInfo = canIshareRecord && canIshareRecord.toJSON();
        const { accessLevel: luserAccessLevel } = canIshareInfo || {};

        if(luserAccessLevel !== 'jobcreator') return h.response({ error: true, message: 'You are not authorized!'}).code(403);

        // sharing job with fellow recruiter
        const { accessLevel, userId: fellowRecruiterId } = request.payload || {};
        if(!(accessLevel && fellowRecruiterId)) return h.response({ error: true, message: 'Please provide necessary details'}).code(400);

        const validAccessLevel = ['viewer', 'administrator'];
        const isValidAccessLevel = validAccessLevel.includes(accessLevel.toLowerCase());

        if(!isValidAccessLevel) return h.response({ error: true, message: 'Not a valid access level!'}).code(400);
        if(userId === fellowRecruiterId) return h.response({ error: true, message: 'Can not share with oneself!'}).code(400);

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

        if(fuserTypeName !== 'employer') return h.response({error: true, message: 'The fellow user is not a recruiter.'}).code(400);
        if(recruiterCompanyId !== fuserCompanyId) return h.response({error: true, message: 'The fellow recruiter is not from the same company.'}).code(400);
              
        // is already shared with this fellow recruiter
        const alreadySharedRecord = await Applicationhiremember.findOne({ where: { applicationId, userId: fellowRecruiterId }});
        const alreadySharedInfo = alreadySharedRecord && alreadySharedRecord.toJSON();
        const { applicationHireMemberId } = alreadySharedInfo || {};

        if(applicationHireMemberId) return h.response({ error: true, message: 'Already shared with this user!'}).code(400);

        const accessRecord = await Applicationhiremember.create({ accessLevel, userId: fellowRecruiterId, applicationId, })
        return h.response(accessRecord).code(201);
    }
    catch (error) {
        console.error(error.stack);
        return h.response({error: true, message: 'Bad Request'}).code(400);
    }
}

const updateSharedApplication = async (request, h) => {
    try {
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden'}).code(403);
        }
        const { credentials } = request.auth || {};
        const { id: userId } = credentials || {};        
        // Checking user type from jwt
        let luserTypeName = request.auth.artifacts.decoded.userTypeName;
        if(luserTypeName !== 'employer'){
            return h.response({error:true, message:'You are not authorized!'}).code(403);
        }

        const { applicationId: rParamsApplicationId } = request.params || {};
        const { Job, Jobapplication, Applicationhiremember, Userinfo, Usertype } = request.getModels('xpaxr');

        // get the company of the recruiter
        const userRecord = await Userinfo.findOne({ where: { userId }, attributes: { exclude: ['createdAt', 'updatedAt'] }});
        const userProfileInfo = userRecord && userRecord.toJSON();
        const { companyId: recruiterCompanyId } = userProfileInfo || {};        

        const applicationRecord = await Jobapplication.findOne({where: { applicationId: rParamsApplicationId, isWithdrawn: false }});
        const applicationRecordInfo = applicationRecord && applicationRecord.toJSON();
        const { applicationId, jobId } = applicationRecordInfo || {};  
        if(!applicationId) return h.response({ error: true, message: 'No application found'}).code(400);

        const { companyId: creatorCompanyId } = await Job.findOne({where: {jobId}});
        if(recruiterCompanyId !== creatorCompanyId) return h.response({error: true, message: `You are not authorized`}).code(403);
        
        // can he share this application?
        const canIshareRecord = await Applicationhiremember.findOne({ where: { applicationId, userId }});
        const canIshareInfo = canIshareRecord && canIshareRecord.toJSON();
        const { accessLevel: luserAccessLevel } = canIshareInfo || {};

        if(luserAccessLevel !== 'jobcreator') return h.response({ error: true, message: 'You are not authorized!'}).code(403);

        // update the shared application access
        const { accessLevel, userId: fellowRecruiterId } = request.payload || {};
        if(!(accessLevel && fellowRecruiterId)) return h.response({ error: true, message: 'Please provide necessary details'}).code(400);
        const validAccessLevel = ['viewer', 'administrator'];
        const isValidAccessLevel = validAccessLevel.includes(accessLevel.toLowerCase());
        
        if(!isValidAccessLevel) return h.response({ error: true, message: 'Not a valid access level!'}).code(400);
        if(userId === fellowRecruiterId) return h.response({ error: true, message: 'Can not share with oneself!'}).code(400);

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

        if(fuserTypeName !== 'employer') return h.response({error: true, message: 'The fellow user is not a recruiter.'}).code(400);

        // is already shared with this fellow recruiter
        const alreadySharedRecord = await Applicationhiremember.findOne({ where: { applicationId, userId: fellowRecruiterId }});
        const alreadySharedInfo = alreadySharedRecord && alreadySharedRecord.toJSON();
        const { applicationHireMemberId } = alreadySharedInfo || {};

        if(!applicationHireMemberId) return h.response({ error: true, message: 'Not shared the job with this user yet!'}).code(400);

        // update the shared job          
        await Applicationhiremember.update({ accessLevel }, { where: { applicationId, userId: fellowRecruiterId }});
        await Applicationhiremember.update({ accessLevel }, { where: { applicationId, userId: fellowRecruiterId }});
        const updatedAccessRecord = await Applicationhiremember.findOne({ where: { applicationId, userId: fellowRecruiterId }});
        return h.response(updatedAccessRecord).code(201);
    }
    catch (error) {
        console.error(error.stack);
        return h.response({error: true, message: 'Bad Request'}).code(400);
    }
}

const deleteApplicationAccessRecord = async (request, h) => {
    try {
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden'}).code(403);
        }
        const { credentials } = request.auth || {};
        const { id: userId } = credentials || {};        
        // Checking user type from jwt
        let luserTypeName = request.auth.artifacts.decoded.userTypeName;
        if(luserTypeName !== 'employer'){
            return h.response({error:true, message:'You are not authorized!'}).code(403);
        }

        const { applicationId: rParamsApplicationId } = request.params || {};
        const { Job, Jobapplication, Applicationhiremember, Userinfo, Usertype } = request.getModels('xpaxr');

        // get the company of the recruiter
        const userRecord = await Userinfo.findOne({ where: { userId }, attributes: { exclude: ['createdAt', 'updatedAt'] }});
        const userProfileInfo = userRecord && userRecord.toJSON();
        const { companyId: recruiterCompanyId } = userProfileInfo || {};        

        const applicationRecord = await Jobapplication.findOne({where: { applicationId: rParamsApplicationId, isWithdrawn: false }});
        const applicationRecordInfo = applicationRecord && applicationRecord.toJSON();
        const { applicationId, jobId } = applicationRecordInfo || {};  
        if(!applicationId) return h.response({ error: true, message: 'No application found'}).code(400);

        const { companyId: creatorCompanyId } = await Job.findOne({where: {jobId}});
        if(recruiterCompanyId !== creatorCompanyId) return h.response({error: true, message: `You are not authorized`}).code(403);
        
        // can he share this application?
        const canIshareRecord = await Applicationhiremember.findOne({ where: { applicationId, userId }});
        const canIshareInfo = canIshareRecord && canIshareRecord.toJSON();
        const { accessLevel: luserAccessLevel } = canIshareInfo || {};

        if(luserAccessLevel !== 'jobcreator') return h.response({ error: true, message: 'You are not authorized!'}).code(403);
        
        const { userId: fellowRecruiterId } = request.payload || {};
        if(!fellowRecruiterId) return h.response({ error: true, message: 'Please provide necessary details'}).code(400);

        // is already shared with this fellow recruiter
        const alreadySharedRecord = await Applicationhiremember.findOne({ where: { applicationId, userId: fellowRecruiterId }});
        const alreadySharedInfo = alreadySharedRecord && alreadySharedRecord.toJSON();
        const { applicationHireMemberId, accessLevel } = alreadySharedInfo || {};

        if(!applicationHireMemberId) return h.response({ error: true, message: 'Not shared the job with this user yet!'}).code(400);
        if(accessLevel === 'jobcreator' || accessLevel === 'candidate') return h.response({ error: true, message: 'This record can not be deleted!'}).code(400);        

        // delete the shared job record
        await Applicationhiremember.destroy({ where: { applicationId, userId: fellowRecruiterId }});        
        return h.response({message: 'Access record deleted'}).code(200);
    }
    catch (error) {
        console.error(error.stack);
        return h.response({error: true, message: 'Bad Request'}).code(400);
    }
}

const getRecommendedTalents = async (request, h) => {
    try{
      if (!request.auth.isAuthenticated) {
        return h.response({ message: 'Forbidden' }).code(403);
      }
      const { credentials } = request.auth || {};
      const { id: userId } = credentials || {}; 
      // Checking user type from jwt
      let luserTypeName = request.auth.artifacts.decoded.userTypeName;   
      if(luserTypeName !== 'employer') return h.response({error:true, message:'You are not authorized!'}).code(403);
      
      const { jobId } = request.params || {};
      const { Jobhiremember } = request.getModels('xpaxr');
      const accessRecord = await Jobhiremember.findOne({ where: { userId, jobId }});
      const accessInfo = accessRecord && accessRecord.toJSON();
      const { jobHireMemberId } = accessInfo || {};
      if(!jobHireMemberId) return h.response({error:true, message:'You are not authorized!'}).code(403);

        /* UNCOMMENT THESE FOLLOWING LINES when going for staging */
        // let model = request.getModels('xpaxr');
        // if (!await isJobQuestionnaireDone(jobId,model)) return h.response({error:"Questionnaire Not Done"}).code(409)
        // let recommendations = await axios.get(`http://${config.dsServer.host}:${config.dsServer.port}/job/recommendation`,{ params: { job_id: jobId } })
        // recommendations = recommendations.data["recommendation"] //this will be  sorted array of {job_id,score}
        
        // FAKE RECOMMENDED DATA (delete it when going for staging)
        const recommendations = [
            { user_id: '135', score: '5' },
            { user_id: '139', score: '4' },
            { user_id: '137', score: '3' },
            { user_id: '136', score: '2' },
            { user_id: '140', score: '1' },
        ]
    
        // storing all the jobIds in the given order   
        const userIdArray = [];
        recommendations.forEach(item =>{
            userIdArray.push(item.user_id);
        });
      
      const { limit, offset, sort, search } = request.query;            
      const searchVal = `%${search ? search.toLowerCase() : ''}%`;

      // sort query
      let [sortBy, sortType] = sort ? sort.split(':') : ['score', 'ASC'];
      const validSorts = ['score', 'first_name', 'last_name'];
      const isSortReqValid = validSorts.includes(sortBy);

      // pagination
      const limitNum = limit ? Number(limit) : 10;
      const offsetNum = offset ? Number(offset) : 0;
       if(isNaN(limitNum) || isNaN(offsetNum) || !isSortReqValid){
        return h.response({error: true, message: 'Invalid query parameters!'}).code(400);
      }       
      if(limitNum>100){
        return h.response({error: true, message: 'Limit must not exceed 100!'}).code(400);
      }

        const db1 = request.getDb('xpaxr');
        // get sql statement for getting jobs or jobs count
        const filters = { search, sortBy, sortType };
        function getSqlStmt(queryType, obj = filters){
            const { search, sortBy, sortType } = obj;
            let sqlStmt;
            const type = queryType && queryType.toLowerCase();
            if(type === 'count'){
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
            if(search) {
                sqlStmt += ` and (
                    ui.first_name ilike :searchVal
                    or ui.last_name ilike :searchVal                    
                )`;
            }

            if(type !== 'count') {
                // sorts (order)
                if(sortBy === 'score'){
                    sqlStmt += ` order by case`
                    for( let i=0; i<userIdArray.length; i++){
                        sqlStmt += ` WHEN ui.user_id=${ userIdArray[i] } THEN ${ i }`;
                    }
                    sqlStmt += ` end`;
                    if(sortType === 'asc') sqlStmt += ` desc`; //by default, above method keeps them in the order of the Data Science Server in the sense of asc, to reverse it you must use desc
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
    catch(error) {
      console.error(error.stack);
      return h.response({ error: true, message: 'Bad Request!' }).code(500);
    }
}

const isJobQuestionnaireDone = async(jobId,model)=>{
    const { Jobsquesresponse,Questionnaire,Questiontarget } = model
    let questionnaireCount = Questionnaire.count({
      include:[{
          model:Questiontarget,
          as:"questionTarget",
          where:{
            targetName:"empauwer_all"
          },
          required:true
      }],
      where:{
        isActive:true
      },
      required:true
    })
  
    let responsesCount = Jobsquesresponse.count({
        required:true,
        include:[
            {
                model:Questionnaire,
                as:"question",
                where:{
                    isActive:true
                },
                required:true
            }
        ],
      where:{
        jobId
      }
    });
    //   return await questionnaireCount === await responsesCount;
      return await questionnaireCount === await responsesCount;
}

const isUserQuestionnaireDone = async(userId,model)=>{
    const { Userquesresponse,Questionnaire,Questiontarget } = model
    let questionnaireCount = Questionnaire.count({
      include:[{
          model:Questiontarget,
          as:"questionTarget",
          where:{
            targetName:"empauwer_me"
          },
          required:true
      }],
      where:{
        isActive:true
      },
      required:true
    })
  
    let responsesCount = Userquesresponse.count({
        required:true,
        include:[
            {
                model:Questionnaire,
                as:"question",
                where:{
                    isActive:true
                },
                required:true
            }
        ],
      where:{
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
    getJobAccessRecords,
    shareJob,
    updateSharedJob,
    deleteJobAccessRecord,
    updateJob,
    createJobQuesResponses,
    getJobQuesResponses,
    applyToJob,
    getAppliedJobs,
    withdrawFromAppliedJob,
    getApplicantProfile,
    getAllApplicantsSelectiveProfile,
    getApplicationAccessRecords,
    shareApplication, 
    updateSharedApplication,
    deleteApplicationAccessRecord,
    getRecommendedTalents,
}