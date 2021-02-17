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
        const jobDetails = request.payload || {};
        const { jobName, jobDescription, jobWebsite } = jobDetails;
        if(!(jobName && jobDescription && jobWebsite)){
            return h.response({ error: true, message: 'Please provide necessary details'}).code(400);
        }

        const { credentials } = request.auth || {};
        const { id: userId } = credentials || {};

        const { Job } = request.getModels('xpaxr');
        const resRecord = await Job.create({ ...jobDetails, active: true, userId });
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
        const { Jobsquesresponse } = request.getModels('xpaxr');

        const db1 = request.getDb('xpaxr');
        const sequelize = db1.sequelize;
        let responses;
        if (noOfJobs === 'one') {            
            const sqlStmt0 = `select * from hris.jobapplications ja
                            where ja.user_id = :userId`;
            const allAppliedJobs = await sequelize.query(sqlStmt0, { type: QueryTypes.SELECT, replacements: { userId } });

            const sqlStmt = `select * from hris.jobs j                                          
                        where j.job_uuid= :jobUuid`;
            const job = await sequelize.query(sqlStmt, { type: QueryTypes.SELECT, replacements: { jobUuid } }); //it'll store our specific job in an array

            // finding all questionaire responses
            const records = await Jobsquesresponse.findAll({ where: { jobId: job[0].job_id } });
            const quesRes = [];
            for (let response of records) {
            const { questionId, responseVal } = response;
            const res = { questionId, answer:responseVal.answer };
                quesRes.push(res);
            }
            job[0].quesRes = quesRes;

            // checking if already applied or not
            if(allAppliedJobs.length){
                for(let i=0; i<allAppliedJobs.length; i++){
                    if(job[0].job_id === allAppliedJobs[i].job_id){
                        job[0].isApplied = true;
                        break;
                    } else {
                        job[0].isApplied = false;
                    }
                }
            } else {
                job[0].isApplied = false;
            }
            responses = job[0];

        } else {    
            const sqlStmt0 = `select * from hris.jobs`;
            const allJobs = await sequelize.query(sqlStmt0, { type: QueryTypes.SELECT, replacements: { userId } });
            
            const sqlStmt = `select * from hris.jobapplications ja
                        where ja.user_id = :userId`;
            const allAppliedJobs = await sequelize.query(sqlStmt, { type: QueryTypes.SELECT, replacements: { userId } });
            
            for(let job of allJobs){
                // finding all questionaire responses
                const records = await Jobsquesresponse.findAll({ where: { jobId: job.job_id } });
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
                        if(job.job_id === allAppliedJobs[i].job_id){
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

            responses = allJobs;
        }                
        return h.response(camelizeKeys(responses)).code(200);
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
        const { Job,User } = request.getModels('xpaxr');
        let jobs = await Job.findAll({
            include:[{
                model:User,
                as:"user",
                required:true,
                where:{
                    userId
                }
                ,
                attributes:[]
            }],
            attributes:["jobId","jobUuid","jobName","jobDescription","jobWebsite","userId"]
        })
        return h.response(jobs).code(200);
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
        const { credentials } = request.auth || {};
        const { id: userId } = credentials || {};

        const { jobUuid } = request.params || {};
        const { jobName, jobDescription, jobWebsite } = request.payload || {};
        
        const { Job } = request.getModels('xpaxr');
        const { userId: jobCreatorId } = await Job.findOne({where: {jobUuid}});

        if(userId !== jobCreatorId ){
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

      const { Jobapplications } = request.getModels('xpaxr');            
      const requestedForApplication = await Jobapplications.findOne({ where: { jobId: jobId, userId: userId }}) || {};
      
      if(Object.keys(requestedForApplication).length === 0){
        return h.response({ error: true, message: 'Bad request! No applied job found.' }).code(400);    
      }
      
      const { applicationId } = requestedForApplication && requestedForApplication.toJSON();
      await Jobapplications.update( { isWithdrawn: true }, { where: { applicationId: applicationId }} );
      const updatedApplication = await Jobapplications.findOne({
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
      const { Userinfo, Usertype, Userrole } = request.getModels('xpaxr');
                  
      const { userId } = request.params || {};
      const userRecord = await Userinfo.findOne({ where: { userId }, attributes: { exclude: ['createdAt', 'updatedAt'] }});
      const applicantProfileInfo = userRecord && userRecord.toJSON();
      const { userTypeId, roleId } = applicantProfileInfo || {};
      
      const userTypeRecord = await Usertype.findOne({ where: { userTypeId }});
      const userRoleRecord = await Userrole.findOne({ where: { roleId }});
      const { userTypeName } = userTypeRecord && userTypeRecord.toJSON();
      const { roleName } = userRoleRecord && userRoleRecord.toJSON();
  
      // deleting duplicated snake_cased properties
      delete applicantProfileInfo.user_id;
      delete applicantProfileInfo.user_uuid;
      delete applicantProfileInfo.user_type_id;
      delete applicantProfileInfo.company_id;
      delete applicantProfileInfo.company_uuid;
  
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
      const { jobId } = request.params || {};
      const { Userinfo } = request.getModels('xpaxr');

      const db1 = request.getDb('xpaxr');
      const sequelize = db1.sequelize;
      
      const sqlStmt = `select * from hris.jobapplications ja    
                    inner join hris.userinfo ui on ja.user_id = ui.user_id                    
                    where ja.job_id = :jobId`;
      const allApplicants = await sequelize.query(sqlStmt, { type: QueryTypes.SELECT, replacements: { jobId } });
      
       return h.response(camelizeKeys(allApplicants)).code(200);

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
    getJobRecommendations
}