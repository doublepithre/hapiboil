const axios = require('axios')
const config = require('config');
const { Sequelize, QueryTypes } = require('sequelize');
import { camelizeKeys } from '../utils/camelizeKeys'


const getAbout = async (request, h) => {
    try {
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden', code: "xemp-1" }).code(401);
        }
        let userTypeName = request.auth.artifacts.decoded.userTypeName;
        let userId = request.auth.credentials.id;
        let db = request.getDb('xpaxr');
        const { Userinfo } = request.getModels('xpaxr');
        let sequelize = db.sequelize;
        let { talentId } = request.query;
        const userRecord = await Userinfo.findOne({ where: { userId: talentId }, attributes: { exclude: ['createdAt', 'updatedAt'] } });
        const { inTalentPool } = userRecord || {};
        if (inTalentPool || await checkReportAccess(sequelize, userId, talentId, userTypeName) || userId === talentId) {
            // check if talent has at applied to at least 1 job posted by employer(userId)
            let about = await axios.get(`http://${config.dsServer.host}:${config.dsServer.port}/report/about`, { params: { talent_id: talentId } });
            return h.response(camelizeKeys(about.data)).code(200);

        } else {
            return h.response({ error: true, message: "Not authorized" }).code(401);
        }
    }
    catch (error) {
        console.error(error.stack);
        if (error.response && error.response.data && error.response.status){
            return h.response(camelizeKeys(error.response.data)).code(error.response.status);
        }
        return h.response({ error: true, message: 'Bad Request' }).code(400);
    }
}

const getUserStats = async (request, h) => {
    try {
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden', code: "xemp-1" }).code(401);
        }
        let userTypeName = request.auth.artifacts.decoded.userTypeName;
        let userId = request.auth.credentials.id;
        let db = request.getDb('xpaxr');
        let sequelize = db.sequelize;
        let { talentId, limit } = request.query;
        if (await checkReportAccess(sequelize, userId, talentId, userTypeName) || userId === talentId) {
            // check if talent has at applied to at least 1 job posted by employer(userId)
            let talentProfile = await axios.get(`http://${config.dsServer.host}:${config.dsServer.port}/report/stats`, { params: { talent_id: talentId, limit } });
            return h.response(camelizeKeys(talentProfile.data)).code(200);
        } else {
            return h.response({ error: true, message: "Not authorized" }).code(401);
        }
    }
    catch (error) {
        console.error(error.stack);
        if (error.response && error.response.data && error.response.status){
            return h.response(camelizeKeys(error.response.data)).code(error.response.status);
        }
        return h.response({ error: true, message: 'Bad Request' }).code(400);
    }
}

const getMentorStats = async (request, h) => {
    try {
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden', code: "xemp-1" }).code(401);
        }
        let userTypeName = request.auth.artifacts.decoded.userTypeName;
        let userId = request.auth.credentials.id;
        let db = request.getDb('xpaxr');
        if ((userTypeName === "supervisor") || (userTypeName === "workbuddy")) {
            let { limit } = request.query;
            let talentProfile = await axios.get(`http://${config.dsServer.host}:${config.dsServer.port}/report/mentor/stats`, { params: { mentor_id: userId, limit } });
            return h.response(camelizeKeys(talentProfile.data)).code(200);
        } else {
            return h.response({ error: true, message: "Not authorized" }).code(401);
        }
    }
    catch (error) {
        console.error(error.stack);
        if (error.response && error.response.data && error.response.status){
            return h.response(camelizeKeys(error.response.data)).code(error.response.status);
        }
        return h.response({ error: true, message: 'Bad Request' }).code(400);
    }
}

const getCompatibility = async (request, h) => {
    try {
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden', code: "xemp-1" }).code(401);
        }
        let userTypeName = request.auth.artifacts.decoded.userTypeName;
        let userId = request.auth.credentials.id;
        let db = request.getDb('xpaxr');
        let sequelize = db.sequelize;
        let { talentId, jobId } = request.query;
        if (await checkReportAccess(sequelize, userId, talentId, userTypeName)) {
            let talentCompatibility = await axios.get(`http://${config.dsServer.host}:${config.dsServer.port}/report/compatibility`, { params: { talent_id: talentId, job_id: jobId } }); //user_id here refers to candidate
            return h.response(camelizeKeys(talentCompatibility.data)).code(200);
        } else {
            return h.response({ error: true, message: "Not authorized" }).code(401);
        }
    }
    catch (error) {
        console.error(error.stack);
        if (error.response && error.response.data && error.response.status){
            return h.response(camelizeKeys(error.response.data)).code(error.response.status);
        }
        return h.response({ error: true, message: 'Bad Request' }).code(400);
    }
}

const getMentorRecommendations = async (request, h) => {
    try {
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden', code: "xemp-1" }).code(401);
        }
        let userTypeName = request.auth.artifacts.decoded.userTypeName;
        let userId = request.auth.credentials.id;
        let { talentId } = request.query;
        let db = request.getDb('xpaxr');
        let sequelize = db.sequelize;
        if (await checkReportAccess(sequelize, userId, talentId, userTypeName)) {
            let reportRecommendations = await axios.get(`http://${config.dsServer.host}:${config.dsServer.port}/report/mentor/recommendations`, { params: { talent_id: talentId, mentor_id: userId } });
            return h.response(camelizeKeys(reportRecommendations.data)).code(200);
        } else {
            return h.response({ error: true, message: "Not authorized" }).code(401);
        }
    }
    catch (error) {
        console.error(error.stack);
        if (error.response && error.response.data && error.response.status){
            return h.response(camelizeKeys(error.response.data)).code(error.response.status);
        }
        return h.response({ error: true, message: 'Bad Request' }).code(400);
    }
}

/**
 * 
 * @param {Sequelize} sequelize sequelize object
 * @param {Number} userId employer id
 * @param {Number} talentId candidate id
 * @returns employer has access to candidate data
 */
const checkReportAccess = async (sequelize, userId, talentId, userTypeName) => {
    if (userTypeName === "employer") {
        let sqlStmt = `select * from hris.applicationhiremember ahm 
        join hris.applicationhiremember ahm1 on ahm.application_id = ahm1.application_id
        where ahm.user_id = :userId and ahm.access_level='jobcreator' and ahm1.user_id=:talentId limit 1;`
        let result = await sequelize.query(sqlStmt, {
            type: QueryTypes.SELECT,
            replacements: {
                userId,
                talentId
            },
        });
        return result.length > 0;
    } else if ((userTypeName === "supervisor") || (userTypeName === "workbuddy")) {
        let sqlStmt = "select * from hris.mentorcandidatemapping where mentor_id = :userId and candidate_id = :talentId limit 1;"
        let result = await sequelize.query(sqlStmt, {
            type: QueryTypes.SELECT,
            replacements: {
                userId,
                talentId
            },
        });
        return result.length > 0;
    } else {
        return false;
    }

}

module.exports = {
    getAbout,
    getUserStats,
    getCompatibility,
    getMentorRecommendations,
    getMentorStats
}