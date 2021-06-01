const { Op, Sequelize, QueryTypes, cast, literal } = require('sequelize');
import { isArray } from 'lodash';
import {camelizeKeys} from '../utils/camelizeKeys'
const axios = require('axios')
const config = require('config');

const getAbout = async (request, h) => {
    try {
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden'}).code(403);
        }
        // Checking user type from jwt
        let userTypeName = request.auth.artifacts.decoded.userTypeName;   
        let userId = request.auth.credentials.id;
        let db = request.getDb('xpaxr');
        const { Report,Questionnaire,Userquesresponse } = request.getModels('xpaxr');
        if (userTypeName === "employer" || userTypeName==="mentor"){
            // check if talent has at applied to at least 1 job posted by employer(userId)
            let sequelize = db.sequelize;
            let {talentId} = request.query;
            if (await checkReportAccess(sequelize,userId,talentId)){//authorized
                //find directly from questions
                let about = await axios.get(`http://${config.dsServer.host}:${config.dsServer.port}/report/about`,{ params: { talent_id: talentId } });
                return h.response(about.data).code(200);  
            }
        }else{
            return h.response({error:true,message:"Not authorized"}).code(401);
        }
    }
    catch (error) {
        console.error(error.stack);
        return h.response({error: true, message: 'Bad Request'}).code(400);
    }
}

const getUserStats = async (request, h) => {
    try {
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden'}).code(403);
        }
        // Checking user type from jwt
        let userTypeName = request.auth.artifacts.decoded.userTypeName;   
        let userId = request.auth.credentials.id;
        let db = request.getDb('xpaxr');
        const { Attributeset } = request.getModels('xpaxr');
        if (userTypeName === "employer" || userTypeName==="mentor"){
            // check if talent has at applied to at least 1 job posted by employer(userId)
            let sequelize = db.sequelize;
            let {talentId} = request.query;
            if (await checkReportAccess(sequelize,userId,talentId)){//authorized
                let talentProfile = await axios.get(`http://${config.dsServer.host}:${config.dsServer.port}/report/stats`,{ params: { talent_id: talentId } });
                return h.response(talentProfile.data).code(200);
            }
        }else{
            return h.response({error:true,message:"Not authorized"}).code(401);
        }
    }
    catch (error) {
        console.error(error.stack);
        return h.response({error: true, message: 'Bad Request'}).code(400);
    }
}

const getCompatibility = async (request, h) => {
    try {
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden'}).code(403);
        }
        // Checking user type from jwt
        let userTypeName = request.auth.artifacts.decoded.userTypeName;   
        let userId = request.auth.credentials.id;
        let db = request.getDb('xpaxr');
        const { Attributeset,Jobhiremember } = request.getModels('xpaxr');
        if (userTypeName === "employer"){
            let {talentId,jobId} = request.query;
            let rec = await Jobhiremember.findOne({where:{jobId,userId},attributes:["accessLevel"]});
            if (!rec || !(rec.accessLevel==="creator" || rec.accessLevel==="viewer")){
                return h.response({error:true,message:"Not authorized"}).code(401);
            }
            // check if talent has at applied to at least 1 job posted by employer(userId)
            let sequelize = db.sequelize;
            if (await checkReportAccess(sequelize,userId,talentId)){//authorized
                let talentCompatibility = await axios.get(`http://${config.dsServer.host}:${config.dsServer.port}/report/compatibility`,{ params: { user_id: talentId,job_id:jobId } }); //user_id here refers to candidate
                return h.response(talentCompatibility.data).code(200);
            }
        }else{
            return h.response({error:true,message:"Not authorized"}).code(401);
        }
    }
    catch (error) {
        console.error(error.stack);
        return h.response({error: true, message: 'Bad Request'}).code(400);
    }
}

const getMentorRecommendations = async (request, h) => {
    try {
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden'}).code(403);
        }
        // Checking user type from jwt
        let userTypeName = request.auth.artifacts.decoded.userTypeName;   
        let userId = request.auth.credentials.id;
        let db = request.getDb('xpaxr');
        if (true){
            let {userId,jobId} = request.query;
            let reportRecommendations = await axios.get(`http://${config.dsServer.host}:${config.dsServer.port}/report/recommendation`,{ params: { user_id: userId,job_id:jobId } });
            return h.response(camelizeKeys(reportRecommendations.data)).code(200);
        }else{
            return h.response({error:true,message:"Not authorized"}).code(401);
        }
    }
    catch (error) {
        console.error(error.stack);
        return h.response({error: true, message: 'Bad Request'}).code(400);
    }
}

/**
 * 
 * @param {Sequelize} sequelize sequelize object
 * @param {Number} userId employer id
 * @param {Number} talentId candidate id
 * @returns employer has access to candidate data
 */
const checkReportAccess = async(sequelize,userId,talentId) =>{
    let sqlStmt = `select * from hris.applicationhiremember ahm 
    join hris.applicationhiremember ahm1 on ahm.application_id = ahm1.application_id
    where ahm.user_id = :userId and ahm.access_level='jobcreator' and ahm1.user_id=:talentId limit 1;`
    let result = await sequelize.query(sqlStmt,{
        type: QueryTypes.SELECT,
        replacements: { 
            userId,                 
            talentId
        },
    });
    return true;
}

const getAnswer = (optionId,options) =>{
    if (isArray(optionId)){
        let arr = [];
        for(let o of options){
            if (optionId.includes(o.optionId)){
                arr.push(o.optionName);
            }
        }
        return arr;
    }else{
        for (let o of options){
            if (optionId === o.optionId){
                return o.optionName;
            }
        }
    }
}

module.exports = {
    getAbout,
    getUserStats,
    getCompatibility,
    getMentorRecommendations
}