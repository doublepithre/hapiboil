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
            return h.response({error:true, message:'You are not authorized to see this!'}).code(403);
        }

        const jobDetails = request.payload || {};
        const { jobName, jobDescription, jobWebsite } = jobDetails;
        if(!(jobName && jobDescription && jobWebsite)){
            return h.response({ error: true, message: 'Please provide necessary details'}).code(400);
        }

        const { credentials } = request.auth || {};
        const { id: userId } = credentials || {};        
        
        const { Job, Userinfo } = request.getModels('xpaxr');
        // get the company of the recruiter
        const userRecord = await Userinfo.findOne({ where: { userId }, attributes: { exclude: ['createdAt', 'updatedAt'] }});
        const userProfileInfo = userRecord && userRecord.toJSON();
        const { companyId } = userProfileInfo || {};        

        const resRecord = await Job.create({ ...jobDetails, active: true, userId, companyId });
        return h.response(resRecord).code(201);        
    }
    catch (error) {
        console.error(error.stack);
        return h.response({error: true, message: 'Bad Request'}).code(400);
    }
}

const getJobs = async (request, h, noOfJobs) => {
    try{
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden'}).code(403);
        }
        const { jobUuid } = request.params || {};

        const { credentials } = request.auth || {};
        const { id: userId } = credentials || {};        
        const { Jobsquesresponse, Userinfo, Jobapplication, Job } = request.getModels('xpaxr');
                
        let responses;
        if (noOfJobs === 'one') {
            let job;
            // Checking user type from jwt
            let luserTypeName = request.auth.artifacts.decoded.userTypeName;            
            if (luserTypeName === "employer"){
                // get the company of the recruiter
                const userRecord = await Userinfo.findOne({ where: { userId }, attributes: { exclude: ['createdAt', 'updatedAt'] }});
                const userProfileInfo = userRecord && userRecord.toJSON();
                const { companyId: recruiterCompanyId } = userProfileInfo || {};                
                
                // filtering the jobs that belong to the recruiter's company
                job = await Job.findOne({ where: { jobUuid, companyId: recruiterCompanyId }});                
                const jobInDB = await Job.findOne({ where: { jobUuid }});                
                if(jobInDB && !job){
                    return h.response({error: true, message: 'You are not authorized to see this!'}).code(403);
                } else if(!job && !jobInDB) {
                    return h.response({error: true, message: 'No job found!'}).code(400);
                }
            } else {
                job = await Job.findOne({ where: { jobUuid }});
                if(!job){
                    return h.response({error: true, message: 'Bad request! No job found!'}).code(400);
                }
            }
            const allAppliedJobs = await Jobapplication.findAll({ where: { userId }});

            // finding all questionaire responses
            const records = await Jobsquesresponse.findAll({ where: { jobId: job.jobId } });
            const quesRes = [];
            for (let response of records) {
            const { questionId, responseVal } = response;
            const res = { questionId, answer:responseVal.answer };
                quesRes.push(res);
            }
            job.quesRes = quesRes;

            // checking if already applied or not
            if(allAppliedJobs.length){
                for(let i=0; i<allAppliedJobs.length; i++){
                    if(job.jobId === allAppliedJobs[i].jobId){
                        job.isApplied = true;
                        break;
                    } else {
                        job.isApplied = false;
                    }
                }
            } else {
                job.isApplied = false;
            }
            responses = job;            
        } else {
            const { limit, offset } = request.query;            
            const limitNum = limit ? Number(limit) : 10;
            const offsetNum = offset ? Number(offset) : 0;

            if(isNaN(limitNum) || isNaN(offsetNum)){
                return h.response({error: true, message: 'Invalid query parameters!'}).code(400);
            }       
            if(limitNum>100){
                return h.response({error: true, message: 'Limit must not exceed 100!'}).code(400);
            }

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
                allJobs = await Job.findAll({ limit: limitNum, offset: offsetNum, companyId: recruiterCompanyId });                
                totalJobsInTheDatabase = await allJobs.length;
            } else {
                totalJobsInTheDatabase = await Job.count();
                allJobs = await Job.findAll({ limit: limitNum, offset: offsetNum });                
                const allAppliedJobs = await Jobapplication.findAll({ where: { userId }});
           
                for(let job of allJobs){
                    // finding all questionaire responses
                    const records = await Jobsquesresponse.findAll({ where: { jobId: job.jobId } });
                    const quesRes = [];
                    for (let response of records) {
                    const { questionId, responseVal } = response;
                    const res = { questionId, answer:responseVal.answer };
                        quesRes.push(res);
                    }
                    job.quesRes = quesRes;
    
                    // checking if already applied or not
                    if(allAppliedJobs.length){
                        for(let i=0; i<allAppliedJobs.length; i++){
                            if(job.jobId === allAppliedJobs[i].jobId){
                                job.isApplied = true;
                                break;
                            } else {
                                job.isApplied = false;
                            }
                        }
                    } else {
                        job.isApplied = false;
                    }
                }                           
            }

            responses = { count: totalJobsInTheDatabase, jobs: allJobs };
        }                
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
            return h.response({error:true, message:'You are not authorized to see this!'}).code(403);
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
        
        const { Job, User, Userinfo } = request.getModels('xpaxr');

        // get the company of the recruiter
        const userRecord = await Userinfo.findOne({ where: { userId }, attributes: { exclude: ['createdAt', 'updatedAt'] }});
        const userProfileInfo = userRecord && userRecord.toJSON();
        const { companyId: recruiterCompanyId } = userProfileInfo || {};        

        let jobs = await Job.findAll({
            where: {
                companyId: recruiterCompanyId,
                userId
            },
            include:[{
                model:Userinfo,
                as:"user",                
                required: true,
            }],            
            attributes:["jobId","jobUuid","jobName","jobDescription","jobWebsite","userId", "companyId"],
            offset: offsetNum,
            limit: limitNum,
        });
        const totalRecruiterJobs = await Job.count({ where: {  companyId: recruiterCompanyId, userId }});
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
            return h.response({error:true, message:'You are not authorized to see this!'}).code(403);
        }

        const { credentials } = request.auth || {};
        const { id: userId } = credentials || {};

        const { jobUuid } = request.params || {};
        const { jobName, jobDescription, jobWebsite } = request.payload || {};
        
        const { Job, Userinfo } = request.getModels('xpaxr');
        // get the company of the recruiter
        const userRecord = await Userinfo.findOne({ where: { userId }, attributes: { exclude: ['createdAt', 'updatedAt'] }});
        const userProfileInfo = userRecord && userRecord.toJSON();
        const { companyId: recruiterCompanyId } = userProfileInfo || {};        

        const { userId: jobCreatorId, companyId: creatorCompanyId } = await Job.findOne({where: {jobUuid}});

        if(!(userId === jobCreatorId && recruiterCompanyId === creatorCompanyId)){
            return h.response({error: true, message: `You are not authorized to update the job`}).code(403);
        }
        await Job.update({jobName, jobDescription, jobWebsite}, { where: { jobUuid }});
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
        return h.response(records).code(201);
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
        return h.response(responses).code(200);
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
        // Candidate should not be allowed to modify status
        const { jobId } = request.payload || {};
        if(!jobId){
            return h.response({ error: true, message: 'Not a valid request!'}).code(400);
        }
        
        const { credentials } = request.auth || {};
        const { id: userId } = credentials || {};

        const record = { jobId, userId, isApplied: true, isWithdrawn: false, status: "Under Review" }
        const { Jobapplication } = request.getModels('xpaxr');
        const recordRes = await Jobapplication.upsert(record);
        return h.response(recordRes[0]).code(200);
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
        const { credentials } = request.auth || {};
        const { id: userId } = credentials || {};

        const db1 = request.getDb('xpaxr');
        const sqlStmt = `select * from hris.jobapplications ja
                        inner join hris.jobs j on ja.job_id = j.job_id
                        where ja.user_id= :userId`;
        const sequelize = db1.sequelize;
        const jobs = await sequelize.query(sqlStmt, { type: QueryTypes.SELECT, replacements: { userId } });
        return h.response(camelizeKeys(jobs)).code(200);
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
      const { jobId, userId } = request.payload || {};
      if(!(jobId && userId)){
        return h.response({ error: true, message: 'Not a valid request!' }).code(400);    
      }

      const { credentials } = request.auth || {};
      const { id: luserId } = credentials || {};
      if(luserId !== userId){
        return h.response({ error: true, message: 'Not a valid request!' }).code(400);      
      }

      const { Jobapplication } = request.getModels('xpaxr');            
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
          attributes: { exclude: ['createdAt', 'updatedAt']
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
        return h.response({error:true, message:'You are not authorized to see this!'}).code(403);
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
        return h.response({error:true, message:'You are not authorized to see this!'}).code(403);
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
          return h.response({error:true, message:'You are not authorized to see this!'}).code(403);
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
          as:"Company",
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
    getJobs,
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