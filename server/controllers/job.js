const { Op, Sequelize, QueryTypes, cast, literal } = require('sequelize');
import jobUtils from '../utils/jobUtils'
import {camelizeKeys} from '../utils/camelizeKeys'
import formatQueryRes from '../utils/index'
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
        const { jobName, jobDescription, jobWebsite } = jobDetails;
        if(!(jobName && jobDescription && jobWebsite)){
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

const getSingleJobs = async (request, h) => {
    try{
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden'}).code(403);
        }
        const { jobUuid } = request.params || {};

        const { credentials } = request.auth || {};
        const { id: userId } = credentials || {};        
        const { Jobsquesresponse, Userinfo, Jobapplication, Job } = request.getModels('xpaxr');
                
        let responses;
        const fres = [];
        let job;

        // Checking user type from jwt
        let luserTypeName = request.auth.artifacts.decoded.userTypeName;            
              
        if (luserTypeName === "employer"){

            // get the company of the recruiter
            const userRecord = await Userinfo.findOne({ where: { userId }, attributes: { exclude: ['createdAt', 'updatedAt'] }});
            const userProfileInfo = userRecord && userRecord.toJSON();
            const { companyId: recruiterCompanyId } = userProfileInfo || {};                
            
            // filtering the jobs that belong to the recruiter's company
            job = await Job.findOne({ where: { jobUuid, companyId: recruiterCompanyId, isPrivate: false }});                
            const jobInDB = await Job.findOne({ where: { jobUuid }});                

            if(jobInDB && !job) return h.response({error: true, message: 'You are not authorized!'}).code(403);
            if(!job && !jobInDB) return h.response({error: true, message: 'No job found!'}).code(400);            

        } else {
            job = await Job.findOne({ raw: true, nest: true, where: { jobUuid, isPrivate: false }, 
                include: [{
                    model: Jobsquesresponse,
                    as: "jobsquesresponses",
                }]
            });
            if(!job) return h.response({error: true, message: 'Bad request! No job found!'}).code(400);            

            const rawAllAppliedJobs = await Jobapplication.findAll({ raw: true, nest: true, where: { userId }});           
            const appliedJobIds = [];
            rawAllAppliedJobs.forEach(aj => {
                const { jobId } = aj || {};
                if(jobId) {
                    appliedJobIds.push(Number(jobId));
                }
            });

            (function (){
                const { jobId } = job || {};
                if(appliedJobIds.includes(Number(jobId))) {
                    job.isApplied = true;
                } else {
                    job.isApplied = false;
                }
            })()

            const jobsMap = {};
            const jobQuesMap = {};

            const { jobId, jobsquesresponses, ...rest } = job;
            jobsMap[jobId] = { jobId, ...rest };
            const { responseId } = jobsquesresponses;
            if(responseId){
                if(jobQuesMap[jobId]) {
                    jobQuesMap[jobId].push(jobsquesresponses);
                    } else {
                    jobQuesMap[jobId] = [jobsquesresponses];
                }
            }

            Object.keys(jobsMap).forEach(jm => {
                const jqrObj = jobsMap[jm] || {};
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
            responses = fres[0];
        }        
        return h.response(responses).code(200);
    }
    catch (error) {
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
        const { Jobsquesresponse, Userinfo, Jobapplication, Job } = request.getModels('xpaxr');
                
        let responses;
        const fres = [];
    
        const { limit, offset, jobTypeId, jobFunctionId, jobLocationId, jobIndustryId, minExp, sort, createDate } = request.query;
        const myDate1 = new Date(createDate[0])
        const myDate2 = new Date(createDate[1])

        const isValidDate = !isNaN(Date.parse(myDate1)) && !isNaN(Date.parse(myDate2));
        const isValidDateRange = myDate1.getTime() < myDate2.getTime();


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

        let totalJobsInTheDatabase;                
        let allJobs;            

        // Checking user type from jwt
        let luserTypeName = request.auth.artifacts.decoded.userTypeName;     

        if (luserTypeName === "employer"){

            // get the company of the recruiter
            const userRecord = await Userinfo.findOne({ where: { userId }, attributes: { exclude: ['createdAt', 'updatedAt'] }});
            const userProfileInfo = userRecord && userRecord.toJSON();
            const { companyId: recruiterCompanyId } = userProfileInfo || {};
            
            // filtering jobs that belong to the recruiter's company
            const rawAllJobs = await Job.findAll({ limit: limitNum, offset: offsetNum, raw: true, nest: true, 
                where: { companyId: recruiterCompanyId, active: true, isPrivate: false, ...filters },
                order: [
                    [sortBy, sortType]
                ],
                include: [{
                    model: Jobsquesresponse,
                    as: "jobsquesresponses",
                }]
            });                
            totalJobsInTheDatabase = await Job.count({ where: { companyId: recruiterCompanyId, active: true, isPrivate: false, ...filters } });
            
            const jobsMap = new Map();
            const jobQuesMap = {};

            if(Array.isArray(rawAllJobs) && rawAllJobs.length) {
                rawAllJobs.forEach(r => {
                    const { jobId, jobsquesresponses, ...rest } = r || {};
                    jobsMap.set(jobId, { jobId, ...rest });
                    const { responseId } = jobsquesresponses;
                    if(responseId){
                        if(jobQuesMap[jobId]) {
                            jobQuesMap[jobId].push(jobsquesresponses);
                            } else {
                            jobQuesMap[jobId] = [jobsquesresponses];
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
            allJobs = fres;  

        } else {            
            totalJobsInTheDatabase = await Job.count({ where: { active: true, isPrivate: false, ...filters }});
            const rawAllJobs = await Job.findAll({
                raw: true,
                nest: true,
                where: {
                    active: true,
                    isPrivate: false,
                    ...filters
                },
                order: [
                    [sortBy, sortType]
                ],
                include: [{
                    model: Jobsquesresponse,
                    as: "jobsquesresponses",
                }],
                limit: limitNum,
                offset: offsetNum,
            });          
            const rawAllAppliedJobs = await Jobapplication.findAll({ raw: true, nest: true, where: { userId }});           
            const appliedJobIds = [];
            rawAllAppliedJobs.forEach(aj => {
                const { jobId } = aj || {};
                if(jobId) {
                    appliedJobIds.push(Number(jobId));
                }
            });

            rawAllJobs.forEach(j => {
                const { jobId } = j || {};
                if(appliedJobIds.includes(Number(jobId))) {
                    j.isApplied = true;
                } else {
                    j.isApplied = false;
                }
            });

            const jobsMap = new Map();
            const jobQuesMap = {};

            if(Array.isArray(rawAllJobs) && rawAllJobs.length) {
                rawAllJobs.forEach(r => {
                    const { jobId, jobsquesresponses, ...rest } = r || {};
                    jobsMap.set(jobId, { jobId, ...rest });

                    const { responseId } = jobsquesresponses;
                    if(responseId){
                        if(jobQuesMap[jobId]) {
                            jobQuesMap[jobId].push(jobsquesresponses);
                            } else {
                            jobQuesMap[jobId] = [jobsquesresponses];
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
            allJobs = fres;      
        }
        responses = { count: totalJobsInTheDatabase, jobs: allJobs };                          
        return h.response(responses).code(200);
    }
    catch (error) {
        console.error(error.stack);
        return h.response({error: true, message: 'Internal Server Error!'}).code(500);
    }
}

const getRecruiterJobs = async(request,h)=>{
    try{
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden'}).code(403);
        }        
        let userId = request.auth.credentials.id;
        // Checking user type from jwt
        let luserTypeName = request.auth.artifacts.decoded.userTypeName;   
        if(luserTypeName !== 'employer'){
            return h.response({error:true, message:'You are not authorized!'}).code(403);
        }

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
        
        const { Job, User, Userinfo } = request.getModels('xpaxr');

        // get the company of the recruiter
        const userRecord = await Userinfo.findOne({ where: { userId }, attributes: { exclude: ['createdAt', 'updatedAt'] }});
        const userProfileInfo = userRecord && userRecord.toJSON();
        const { companyId: recruiterCompanyId } = userProfileInfo || {};        

        let jobs = await Job.findAll({
            where: {
                companyId: recruiterCompanyId,
                userId,
                ...filters
            },
            order: [
                [sortBy, sortType]
            ],
            include:[{
                model:Userinfo,
                as:"user",                
                required: true,
                attributes: { exclude: ["createdAt", "updatedAt"]}
            }],            
            attributes:["jobId","jobUuid","jobName","jobDescription","jobWebsite","userId", "companyId", "active"],
            offset: offsetNum,
            limit: limitNum,
        });
        const totalRecruiterJobs = await Job.count({ where: {  companyId: recruiterCompanyId, userId, ...filters }});
        const paginatedResponse = { count: totalRecruiterJobs, jobs: jobs };
        return h.response(paginatedResponse).code(200);
    }catch(err){
        console.error(err.stack);
        return h.response({error:true,message:'Internal Server Error!'}).code(500);
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
        const { jobName, jobDescription, jobIndustryId, jobFunctionId, jobTypeId, jobLocationId, minExp } = request.payload || {};
        
        const { Job, Userinfo } = request.getModels('xpaxr');
        // get the company of the recruiter
        const userRecord = await Userinfo.findOne({ where: { userId }, attributes: { exclude: ['createdAt', 'updatedAt'] }});
        const userProfileInfo = userRecord && userRecord.toJSON();
        const { companyId: recruiterCompanyId } = userProfileInfo || {};        

        const { userId: jobCreatorId, companyId: creatorCompanyId } = await Job.findOne({where: {jobUuid}});

        if(!(userId === jobCreatorId && recruiterCompanyId === creatorCompanyId)){
            return h.response({error: true, message: `You are not authorized to update the job`}).code(403);
        }
        await Job.update({jobName, jobDescription, jobIndustryId, jobFunctionId, jobTypeId, jobLocationId, minExp}, { where: { jobUuid }});
        
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

        const { Jobapplication, Job } = request.getModels('xpaxr');
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

      const { Job, Jobapplication } = request.getModels('xpaxr');            
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
const getAllApplicantsSelectiveProfile = async (request, h) => {
    try{
      if (!request.auth.isAuthenticated) {
        return h.response({ message: 'Forbidden' }).code(403);
      }
      // Checking user type from jwt
      let luserTypeName = request.auth.artifacts.decoded.userTypeName;   
      if(luserTypeName !== 'employer'){
        return h.response({error:true, message:'You are not authorized!'}).code(403);
      }

      // pagination
      const { limit, offset } = request.query;            
      const limitNum = limit ? Number(limit) : 10;
      const offsetNum = offset ? Number(offset) : 0;
       if(isNaN(limitNum) || isNaN(offsetNum)){
        return h.response({error: true, message: 'Invalid query parameters!'}).code(400);
      }       
      if(limitNum>100){
        return h.response({error: true, message: 'Limit must not exceed 100!'}).code(400);
      }

      const { jobId } = request.params || {};
      const { Jobapplication, Userinfo } = request.getModels('xpaxr');

      const allApplicantions = await Jobapplication.findAll({ 
          where: { jobId }, 
          include: [{
            model: Userinfo,
            as: "applicant",
            required: true,
          }],
          offset: offsetNum,
          limit: limitNum        
      });
      const totalJobApplications = await Jobapplication.count({ where: { jobId }});
      const paginatedResponse = { count: totalJobApplications, applications: allApplicantions };
      
      return h.response(paginatedResponse).code(200);
    }
    catch(error) {
      console.error(error.stack);
      return h.response({ error: true, message: 'Bad Request!' }).code(500);
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

const getJobRecommendations = async (request,h,jobCache) => {
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
    recommendations = recommendations.data["recommendation"]//this will be  sorted array of {job_id,score}
    let jobIds = recommendations.map(x=>{
      return x["jobId"]
    })
    let jobInfo = await jobUtils.getJobInfos(jobIds,model.Job,jobCache);
    return h.response(jobInfo).code(200);
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
    getSingleJobs,
    getAllJobs,
    getRecruiterJobs,
    updateJob,
    createJobQuesResponses,
    getJobQuesResponses,
    applyToJob,
    getAppliedJobs,
    withdrawFromAppliedJob,
    getApplicantProfile,
    getAllApplicantsSelectiveProfile,
    getRecommendedTalents,
    getJobRecommendations
}