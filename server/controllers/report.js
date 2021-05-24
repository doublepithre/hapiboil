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
                let res = await Userquesresponse.findAll({
                    required:true,
                    raw:true,
                    include:[
                        {
                            model:Questionnaire,
                            as:"question",
                            required:true,
                            include:[
                                {
                                    model:Report,
                                    as:"reports",
                                    required:true,
                                    where:{
                                        questionKey:["work_station","people_interaction","meeting_requirements","hobbies","sensitivity"]
                                    },
                                    attributes:["questionKey"]
                                }
                            ],
                            attributes:["questionConfig"]
                        },

                    ],
                    where:{
                        userId:talentId
                    },
                    attributes:["responseVal"]
                });
                let jobCharacteristics = {};
                let about = {};
                let answer;
                for(let response of res){
                    if (response["question.reports.questionKey"]==="meeting_requirements"){
                        answer = Number(response.responseVal.answer);
                        jobCharacteristics.meeting_requirements = {
                            displayName:response["question.reports.displayName"],
                            displayText:getAnswer(answer,response["question.questionConfig"].options)
                        };
                    }
                    if (response["question.reports.questionKey"]==="work_station"){
                        answer = Number(response.responseVal.answer) ? "Yes":"No";
                        jobCharacteristics.work_station = {
                            displayName:response["question.reports.displayName"],
                            displayText:answer
                        };
                    }
                    if (response["question.reports.questionKey"]==="people_interaction"){
                        answer = response.responseVal.answer;
                        jobCharacteristics.people_interaction = {
                            displayName:response["question.reports.displayName"],
                            displayText:getAnswer(answer,response["question.questionConfig"].options)
                        };
                    }
                    if (response["question.reports.questionKey"]==="hobbies"){
                        answer = response.responseVal.answer;
                        about.hobbies = {
                            displayName:response["question.reports.displayName"],
                            displayText:answer
                        };
                    }
                    if (response["question.reports.questionKey"]==="sensitivity"){
                        answer = response.responseVal.answer;
                        about.sensitivity = {
                            displayName:response["question.reports.displayName"],
                            displayText:getAnswer(answer,response["question.questionConfig"].options)
                        };
                    }
                }
                let talentProfile = await axios.get(`http://${config.dsServer.host}:${config.dsServer.port}/user/profile`,{ params: { user_id: talentId } });
                talentProfile = talentProfile.data;
                jobCharacteristics.sounds = {
                    displayName:"Sounds",
                    displayText:(Number(talentProfile.attributes.Sound)<=0.5) ? "Not Sensitive" : "Sensitive"
                }
                jobCharacteristics.lights = {
                    displayName:"Lights",
                    displayText:(Number(talentProfile.attributes.Lights)<=0.5) ? "Not Sensitive" : "Sensitive"
                }

                //get top3 attributes here ignoring lights and sound
                let attributesArray = []
                for (let [key, value] of Object.entries(talentProfile.attributes)) {
                    if (key==="Lights" || key==="Sound") continue;
                    attributesArray.push({"attributeName":key,"attributeValue":value});
                }
                attributesArray.sort((a,b)=>b.attributeValue-a.attributeValue);
                
                return h.response({jobCharacteristics,about,keyStrengths:attributesArray.slice(0,3)}).code(200);  
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
                let talentProfile = await axios.get(`http://${config.dsServer.host}:${config.dsServer.port}/user/profile`,{ params: { user_id: talentId } });
                talentProfile = talentProfile.data;
                //get top3 attributes here ignoring lights and sound
                let attributesArray = []
                for (let [key, value] of Object.entries(talentProfile.attributes)) {
                    if (key==="Lights" || key==="Sound") continue;
                    attributesArray.push({"attributeName":key,"attributeValue":value});
                }
                attributesArray.sort((a,b)=>b.attributeValue-a.attributeValue);
                
                let attributes = await Attributeset.findAll(); //find all since only small set of attributes
                
                let attr_map = {};
                for (let attr of attributes){
                    attr_map[attr.attributeName] = attr
                }
                
                for(let attr of attributesArray){
                    attr.description = attr_map[attr.attributeName].description;
                    attr.lowText = attr_map[attr.attributeName].lowText;
                    attr.highText = attr_map[attr.attributeName].highText;
                }

                return h.response({userStatistics:attributesArray.slice(0,8).slice(-5)}).code(200);//take last 5 elements of first 8 elements if exists
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
                let talentCompatibility = await axios.get(`http://${config.dsServer.host}:${config.dsServer.port}/job/compatibility`,{ params: { user_id: talentId,job_id:jobId } }); //user_id here refers to candidate
                console.log(talentCompatibility.data);
                let attributesArray = []
                for (let [key, value] of Object.entries(talentCompatibility.data.compatibility)) {
                    if (key==="Lights" || key==="Sound") continue;
                    attributesArray.push({"attributeName":key,"attributeValue":value});
                }
                attributesArray.sort((a,b)=>b.attributeValue-a.attributeValue);

                let attributes = await Attributeset.findAll(); //find all since only small set of attributes
                let attr_map = {};
                for (let attr of attributes){
                    attr_map[attr.attributeName] = attr
                }
                
                for(let attr of attributesArray){
                    attr.description = attr_map[attr.attributeName].description;
                    attr.lowText = attr_map[attr.attributeName].lowText;
                    attr.highText = attr_map[attr.attributeName].highText;
                }
                return h.response({compatibility:attributesArray}).code(200);
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
    return result.length > 0;
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
    getCompatibility
}