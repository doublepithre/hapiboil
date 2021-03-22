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
        const { jobName, jobDescription, jobIndustryId, jobLocationId, jobFunctionId, jobTypeId, minExp, } = jobDetails;
        if(!(jobName && jobDescription && jobIndustryId && jobLocationId && jobFunctionId && jobTypeId && minExp)){
            return h.response({ error: true, message: 'Please provide necessary details'}).code(400);
        }

        const { credentials } = request.auth || {};
        const { id: userId } = credentials || {};        
        
        const { Job, Jobhiremember, Userinfo } = request.getModels('xpaxr');
        // get the company of the recruiter
        const userRecord = await Userinfo.findOne({ where: { userId }, attributes: { exclude: ['createdAt', 'updatedAt'] }});
        const userProfileInfo = userRecord && userRecord.toJSON();
        const { companyId } = userProfileInfo || {};

        const resRecord = await Job.create({ ...jobDetails, active: true, userId, companyId });        
        await Jobhiremember.create({ accessLevel: 'owner', userId, jobId: resRecord.jobId, })
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

// getSingleJob (SQL)
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
                j.*, jt.*, jf.*,ji.*,jl.*,c.display_name as company_name,jqr.response_id,jqr.question_id,jqr.response_val`;
            }

            sqlStmt += `
            from hris.jobs j
                left join hris.jobsquesresponses jqr on jqr.job_id=j.job_id
                left join hris.company c on c.company_id=j.company_id
                left join hris.jobtype jt on jt.job_type_id=j.job_type_id                
                left join hris.jobfunction jf on jf.job_function_id=j.job_function_id                
                left join hris.jobindustry ji on ji.job_industry_id=j.job_industry_id
                left join hris.joblocation jl on jl.job_location_id=j.job_location_id
            where j.active=true and j.is_private=false and j.job_uuid=:jobUuid`;

            // if he is an employer
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
// getAllJobs (SQL)
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
            /* UNCOMMENT THESE FOLLOWING LINES when going for staging

            let model = request.getModels('xpaxr');
            if (!await isQuestionnaireDone(userId,model)) return h.response({error:"Questionnaire Not Done"}).code(409)
            recommendations = await axios.get(`http://${config.dsServer.host}:${config.dsServer.port}/recommendation`,{ params: { user_id: userId } })
            recommendations = recommendations.data["recommendation"] //this will be  sorted array of {job_id,score}
            
            */

            // FAKE RECOMMENDED DATA (delete it when going for staging)
            const recommendations = [
                { job_id: '19', score: '5' },
                { job_id: '18', score: '4' },
                { job_id: '45', score: '3' },
                { job_id: '52', score: '2' },
                { job_id: '10', score: '1' },
            ]
        
            // storing all the jobIds in the given order            
            recommendations.forEach(item =>{
                jobIdArray.push(item.job_id);
            });
        }

        const db1 = request.getDb('xpaxr');

        // get sql statement for getting jobs or jobs count
        const filters = { jobIdArray, recommendedVal, jobTypeId, jobFunctionId, jobIndustryId, jobLocationId, minExp, search, sortBy, sortType };
        function getSqlStmt(queryType, obj = filters){
            const { jobIdArray, recommendedVal, jobTypeId, jobFunctionId, jobIndustryId, jobLocationId, minExp, search, sortBy, sortType } = obj;
            let sqlStmt;
            const type = queryType && queryType.toLowerCase();
            if(type === 'count'){
                sqlStmt = `select count(*)`;
            } else {
                sqlStmt = `select
                    j.*, jt.*, jf.*,ji.*,jl.*,c.display_name as company_name`;
            }

            sqlStmt += `
            from hris.jobs j
                left join hris.company c on c.company_id=j.company_id
                left join hris.jobtype jt on jt.job_type_id=j.job_type_id                
                left join hris.jobfunction jf on jf.job_function_id=j.job_function_id                
                left join hris.jobindustry ji on ji.job_industry_id=j.job_industry_id
                left join hris.joblocation jl on jl.job_location_id=j.job_location_id
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
                    j.job_name ilike :searchVal
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
                        sqlStmt += ` order by j.${sortBy} ${sortType}`;
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

// getAllRecruiterJobs (SQL)
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
                j.*, jt.*, jf.*,ji.*,jl.*,c.display_name as company_name`;
            }

            sqlStmt += `                    
                from hris.jobs j
                    left join hris.company c on c.company_id=j.company_id
                    left join hris.jobtype jt on jt.job_type_id=j.job_type_id                
                    left join hris.jobfunction jf on jf.job_function_id=j.job_function_id                
                    left join hris.jobindustry ji on ji.job_industry_id=j.job_industry_id
                    left join hris.joblocation jl on jl.job_location_id=j.job_location_id
                    inner join hris.jobhiremember jhm on jhm.job_id=j.job_id 
                where j.active=true 
                    and j.created_at > :lowerDateRange and j.created_at < :upperDateRange
                    and j.company_id=:recruiterCompanyId 
                    and jhm.access_level in ('owner', 'administrator', 'reader') 
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
                    j.job_name ilike :searchVal
                    or j.job_description ilike :searchVal
                    or jt.job_type_name ilike :searchVal
                    or jf.job_function_name ilike :searchVal
                    or ji.job_industry_name ilike :searchVal
                    or jl.job_location_name ilike :searchVal
                )`;
            };
            
            if(type !== 'count') {
                // sorts
                sqlStmt += ` order by j.${sortBy} ${sortType}`;
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

        const { jobUuid } = request.params || {};
        const { Job, Jobhiremember, Userinfo, Usertype } = request.getModels('xpaxr');

        // get the company of the recruiter
        const userRecord = await Userinfo.findOne({ where: { userId }, attributes: { exclude: ['createdAt', 'updatedAt'] }});
        const userProfileInfo = userRecord && userRecord.toJSON();
        const { companyId: recruiterCompanyId } = userProfileInfo || {};        

        const { jobId, userId: jobCreatorId, companyId: creatorCompanyId } = await Job.findOne({where: {jobUuid}});

        if(!(userId === jobCreatorId && recruiterCompanyId === creatorCompanyId)){
            return h.response({error: true, message: `You are not authorized`}).code(403);
        }

        // sharing job with fellow recruiter
        const { accessLevel, userId: fellowRecruiterId } = request.payload || {};
        if(!(accessLevel && fellowRecruiterId)) return h.response({ error: true, message: 'Please provide necessary details'}).code(400);

        const validAccessLevel = ['reader', 'administrator'];
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

        const { jobUuid } = request.params || {};
        const { Job, Jobhiremember, Userinfo, Usertype } = request.getModels('xpaxr');

        // get the company of the recruiter
        const userRecord = await Userinfo.findOne({ where: { userId }, attributes: { exclude: ['createdAt', 'updatedAt'] }});
        const userProfileInfo = userRecord && userRecord.toJSON();
        const { companyId: recruiterCompanyId } = userProfileInfo || {};        

        const { jobId, userId: jobCreatorId, companyId: creatorCompanyId } = await Job.findOne({where: {jobUuid}});
        if(!(userId === jobCreatorId && recruiterCompanyId === creatorCompanyId)) return h.response({error: true, message: `You are not authorized`}).code(403);
        
        const { accessLevel, userId: fellowRecruiterId } = request.payload || {};
        if(!(accessLevel && fellowRecruiterId)) return h.response({ error: true, message: 'Please provide necessary details'}).code(400);
        const validAccessLevel = ['reader', 'administrator'];
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
        const { jobName, jobDescription, jobIndustryId, jobFunctionId, jobTypeId, jobLocationId, minExp, isPrivate } = request.payload || {};
        
        const { Job, Userinfo } = request.getModels('xpaxr');
        // get the company of the recruiter
        const userRecord = await Userinfo.findOne({ where: { userId }, attributes: { exclude: ['createdAt', 'updatedAt'] }});
        const userProfileInfo = userRecord && userRecord.toJSON();
        const { companyId: recruiterCompanyId } = userProfileInfo || {};        

        const { userId: jobCreatorId, companyId: creatorCompanyId } = await Job.findOne({where: {jobUuid}});

        if(!(userId === jobCreatorId && recruiterCompanyId === creatorCompanyId)){
            return h.response({error: true, message: `You are not authorized to update the job`}).code(403);
        }
        await Job.update({jobName, jobDescription, jobIndustryId, jobFunctionId, jobTypeId, jobLocationId, minExp, isPrivate}, { where: { jobUuid }});
        
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

        const record = { jobId, userId, isApplied: true, isWithdrawn: false, status: "Under Review" }
        const { Job, Jobapplication, Applicationhiremember } = request.getModels('xpaxr');
        
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
            Applicationhiremember.create({ applicationId, userId: employerId, accessLevel: 'employer', })
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

        const { limit, offset, jobTypeId, jobFunctionId, jobLocationId, jobIndustryId, minExp, sort } = request.query;
        let [sortBy, sortType] = sort ? sort.split(':') : ['createdAt', 'DESC'];
        if (!sortType && sortBy !== 'createdAt') sortType = 'ASC';
        if (!sortType && sortBy === 'createdAt') sortType = 'DESC';

        const validSorts = [ 'createdAt', 'jobName'];
        const isSortReqValid = validSorts.includes(sortBy);

        // pagination
        const limitNum = limit ? Number(limit) : 10;
        const offsetNum = offset ? Number(offset) : 0;

        if(isNaN(limitNum) || isNaN(offsetNum) || !sortBy || !isSortReqValid) return h.response({error: true, message: 'Invalid query parameters!'}).code(400);        
        if(limitNum>100) return h.response({error: true, message: 'Limit must not exceed 100!'}).code(400);

        const filters = {}
        if(jobTypeId) filters.jobTypeId = jobTypeId;
        if(jobFunctionId) filters.jobFunctionId = jobFunctionId;
        if(jobIndustryId) filters.jobIndustryId = jobIndustryId;
        if(jobLocationId) filters.jobLocationId = jobLocationId;
        if(minExp) filters.minExp = minExp;

        const { Jobapplication, Job, Jobtype, Jobindustry, Jobfunction, Joblocation } = request.getModels('xpaxr');
        const jobs = await Jobapplication.findAll({ 
            where: { userId },
            include: [{
                model: Job,
                as: "job",
                where: {
                    ...filters,
                },
                order: [
                    [sortBy, sortType]
                ],
                required: true,
                include: [{
                    model: Jobtype,
                    as: "jobType",
                },
                {
                    model: Jobindustry,
                    as: "jobIndustry",
                },
                {
                    model: Jobfunction,
                    as: "jobFunction",
                },
                {
                    model: Joblocation,
                    as: "jobLocation",
                }]
            }],
            offset: offsetNum,
            limit: limitNum,
        });
        const totalAppliedJobs = await Jobapplication.count({ 
            where: { userId },
            include: [{
                model: Job,
                as: "job",
                where: {
                    ...filters,
                },                
                required: true,
            }],
        });
        const paginatedResponse = { count: totalAppliedJobs, appliedJobs: jobs }
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

      const { jobId, userId } = request.payload || {};
      if(!(jobId && userId)){
        return h.response({ error: true, message: 'Not a valid request!' }).code(400);    
      }

      const { credentials } = request.auth || {};
      const { id: luserId } = credentials || {};
      if(luserId !== userId){
        return h.response({ error: true, message: 'Not a valid request!' }).code(400);      
      }

      const { Job, Jobapplication, Jobtype, Jobindustry, Jobfunction, Joblocation } = request.getModels('xpaxr');            
      const requestedForApplication = await Jobapplication.findOne({ where: { jobId: jobId, userId: userId }}) || {};
      
      if(Object.keys(requestedForApplication).length === 0){
        return h.response({ error: true, message: 'Bad request! No applied job found!' }).code(400);    
      }
      if(requestedForApplication.isWithdrawn){
        return h.response({ error: true, message: 'Bad request! Already withdrawn!' }).code(400);    
      }
      
      const { applicationId } = requestedForApplication && requestedForApplication.toJSON();
      await Jobapplication.update( { isWithdrawn: true }, { where: { applicationId: applicationId }} );
      const updatedApplication = await Jobapplication.findOne({
          where:{ applicationId: applicationId },
          include: [{
            model: Job,
            as: "job",                      
            required: true,
            include: [{
                model: Jobtype,
                as: "jobType",
            },
            {
                model: Jobindustry,
                as: "jobIndustry",
            },
            {
                model: Jobfunction,
                as: "jobFunction",
            },
            {
                model: Joblocation,
                as: "jobLocation",
            }]
          }],
          attributes: { exclude: ['createdAt', 'updatedAt', 'userId']
        }
      });
      const updatedApplicationData = updatedApplication && updatedApplication.toJSON();
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

// get all applicants (SQL)
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

      const { limit, offset, sort, createDate, search } = request.query;            
      const searchVal = `%${search ? search.toLowerCase() : ''}%`;

      // pagination
      const limitNum = limit ? Number(limit) : 10;
      const offsetNum = offset ? Number(offset) : 0;
       if(isNaN(limitNum) || isNaN(offsetNum)){
        return h.response({error: true, message: 'Invalid query parameters!'}).code(400);
      }       
      if(limitNum>100){
        return h.response({error: true, message: 'Limit must not exceed 100!'}).code(400);
      }

      const { jobId } = request.params || {};      
      const db1 = request.getDb('xpaxr');

        // get sql statement for getting all applications or all applications' count        
        const filters = { search }
        function getSqlStmt(queryType, obj = filters){            
            const { search } = obj;
            let sqlStmt;
            const type = queryType && queryType.toLowerCase();
            if(type === 'count'){
                sqlStmt = `select count(*)`;
            } else {
                sqlStmt = `select ja.*, ja.created_at as application_created_at, ui.*`;
            }

            sqlStmt += `
                from hris.jobapplications ja
                    inner join hris.applicationhiremember ahm on ahm.application_id=ja.application_id
                    inner join hris.userinfo ui on ui.user_id=ja.user_id                    
                where ja.is_withdrawn=false 
                    and ahm.access_level in ('employer', 'reader', 'administrator')
                    and ja.job_id=:jobId and ahm.user_id=:userId`;
            
            // search
            if(search) {
                sqlStmt += ` and (
                    ui.first_name ilike :searchVal
                    or ui.last_name ilike :searchVal                    
                )`;
            }

            if(type !== 'count') {
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
            },
        });
      	const allSQLApplicationsCount = await sequelize.query(getSqlStmt('count'), {
            type: QueryTypes.SELECT,
            replacements: { 
                jobId, userId,
                limitNum, offsetNum,
                searchVal,
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

        const { applicationId } = request.params || {};
        const { Job, Jobapplication, Applicationhiremember, Userinfo, Usertype } = request.getModels('xpaxr');

        // get the company of the recruiter
        const userRecord = await Userinfo.findOne({ where: { userId }, attributes: { exclude: ['createdAt', 'updatedAt'] }});
        const userProfileInfo = userRecord && userRecord.toJSON();
        const { companyId: recruiterCompanyId } = userProfileInfo || {};        
                
        const { jobId } = await Jobapplication.findOne({where: { applicationId, isWithdrawn: false }});
        const { companyId: creatorCompanyId } = await Job.findOne({where: {jobId}});

        if(recruiterCompanyId !== creatorCompanyId){
            return h.response({error: true, message: `You are not authorized`}).code(403);
        }

        // can he share this application?
        const canIshareRecord = await Applicationhiremember.findOne({ where: { applicationId, userId }});
        const canIshareInfo = canIshareRecord && canIshareRecord.toJSON();
        const { accessLevel: luserAccessLevel } = canIshareInfo || {};

        if(luserAccessLevel !== 'employer') return h.response({ error: true, message: 'You are not authorized!'}).code(403);

        // sharing job with fellow recruiter
        const { accessLevel, userId: fellowRecruiterId } = request.payload || {};
        if(!(accessLevel && fellowRecruiterId)) return h.response({ error: true, message: 'Please provide necessary details'}).code(400);

        const validAccessLevel = ['reader', 'administrator'];
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

        const { applicationId } = request.params || {};
        const { Job, Jobapplication, Applicationhiremember, Userinfo, Usertype } = request.getModels('xpaxr');

        // get the company of the recruiter
        const userRecord = await Userinfo.findOne({ where: { userId }, attributes: { exclude: ['createdAt', 'updatedAt'] }});
        const userProfileInfo = userRecord && userRecord.toJSON();
        const { companyId: recruiterCompanyId } = userProfileInfo || {};        

        const { jobId } = await Jobapplication.findOne({where: { applicationId, isWithdrawn: false }});
        const { companyId: creatorCompanyId } = await Job.findOne({where: {jobId}});
        if(recruiterCompanyId !== creatorCompanyId) return h.response({error: true, message: `You are not authorized`}).code(403);
        
        // can he share this application?
        const canIshareRecord = await Applicationhiremember.findOne({ where: { applicationId, userId }});
        const canIshareInfo = canIshareRecord && canIshareRecord.toJSON();
        const { accessLevel: luserAccessLevel } = canIshareInfo || {};

        if(luserAccessLevel !== 'employer') return h.response({ error: true, message: 'You are not authorized!'}).code(403);

        // update the shared application access
        const { accessLevel, userId: fellowRecruiterId } = request.payload || {};
        if(!(accessLevel && fellowRecruiterId)) return h.response({ error: true, message: 'Please provide necessary details'}).code(400);
        const validAccessLevel = ['reader', 'administrator'];
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

const getRecommendedTalents = async (request, h) => {
    try{
      if (!request.auth.isAuthenticated) {
        return h.response({ message: 'Forbidden' }).code(403);
      }
      // Checking user type from jwt
      let luserTypeName = request.auth.artifacts.decoded.userTypeName;   
      if(luserTypeName !== 'employer'){
          return h.response({error:true, message:'You are not authorized!'}).code(403);
      }
      const { Userinfo } = request.getModels('xpaxr');
      const talents = await Userinfo.findAll({ offset: 0, limit: 20 });      
      const paginatedResponse = { count: talents.length, users: talents }

       return h.response(paginatedResponse).code(200);
    }
    catch(error) {
      console.error(error.stack);
      return h.response({ error: true, message: 'Bad Request!' }).code(500);
    }
}

const getJobRecommendations = async (request,h) => {
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden' }).code(403);
    }
    const { credentials } = request.auth || {};
    const { id: userId } = credentials || {};
    let model = request.getModels('xpaxr');
    if (!await isQuestionnaireDone(userId,model)){
      return h.response({error:"Questionnaire Not Done"}).code(409)
    }
    let recommendations = await axios.get(`http://${config.dsServer.host}:${config.dsServer.port}/recommendation`,{ params: { user_id: userId } })
    recommendations = recommendations.data["recommendation"] //this will be  sorted array of {job_id,score}
    return h.response().code(200);
}

const isQuestionnaireDone = async(userId,model)=>{
    const { Userquesresponse,Questionnaire,Company } = model
    const COMPANY_NAME = "empauwer - x0pa";
    let questionnaireCount = await Questionnaire.count({
      include:[{
          model:Company,
          as:"company",
          where:{
              companyName:COMPANY_NAME
          },
          required:true
      }],
      required:true
    })
  
    let responsesCount = await Userquesresponse.count({
      where:{
        userId
      }});
      return questionnaireCount === responsesCount;
}

module.exports = {
    createJob,
    getJobDetailsOptions,
    getSingleJob,
    getAllJobs,
    getRecruiterJobs,
    shareJob,
    updateSharedJob,
    updateJob,
    createJobQuesResponses,
    getJobQuesResponses,
    applyToJob,
    getAppliedJobs,
    withdrawFromAppliedJob,
    getApplicantProfile,
    getAllApplicantsSelectiveProfile,
    shareApplication, 
    updateSharedApplication,
    getRecommendedTalents,
    getJobRecommendations
}