const { Op, Sequelize, QueryTypes, cast, literal } = require('sequelize');
const bcrypt = require('bcrypt');
const validator = require('validator');
const { sendEmailAsync } = require('../utils/email');
const randtoken = require('rand-token');
import request from 'request';
import { formatQueryRes } from '../utils/index';

const createJob = async (request, h) => {
    try {
        // Need to check whether we allow to modify once applied to a job.
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden'}).code(403);
        }
        const { jobDetails, questionResponses } = request.payload || {};
        const { credentials } = request.auth || {};
        const { id: userId } = credentials || {};

        const { Job, Jobsquesresponse } = request.getModels('xpaxr');
        const resRecord = await Job.create({ ...jobDetails, active: true, creatorId: userId });
        const job = resRecord && resRecord.toJSON();
        const { jobId } = job || {};
        
        const responses = []
        for (let response of questionResponses) {
            const { questionId, answer } = response;
            const record = { questionId, responseVal: {'answer': answer}, jobId }
            responses.push(record);
        }
        const records = await Jobsquesresponse.bulkCreate(responses, {updateOnDuplicate:["questionId","responseVal"]});
        return h.response({job, records}).code(200);
    }
    catch (error) {
        // console.log(error);
        return h.response({error: true, message: error.message}).code(403);
    }
}

const applyToJob = async (request, h) => {
    try{
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden'}).code(403);
        }
        const { jobId, isApplied, isWithdrawn, status } = request.payload || {};
        const { credentials } = request.auth || {};
        const { id: userId } = credentials || {};

        const record = { jobId, userId, isApplied, isWithdrawn, status }
        const { Jobapplications } = request.getModels('xpaxr');
        const recordRes = await Jobapplications.upsert(record);
        return h.response(recordRes).code(200);
    }
    catch(error) {
        // console.error(error);
        return h.response({error: true, message: error.message}).code(403);
    }
}

const getAppliedJobs = async (request, h) => {
    // Check the requirement
        // All applied jobs? withdrawn jobs? status wise?
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
        return h.response(jobs).code(200);
    }
    catch (error) {
        // console.log(error);
        return h.response({error: true, message: error.message}).code(403);
    }
}

module.exports = {
    createJob,
    applyToJob,
    getAppliedJobs,
}