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
        if (userTypeName === "employer"){
            // check if talent has at applied to at least 1 job posted by employer(userId)
            let sequelize = db.sequelize;
            let {talentId} = request.query;
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
            if (result.length>0){//authorized
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
                        about.people_interaction = {
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
                return h.response({jobCharacteristics,about}).code(201);  
            }

        }else{
            return h.response({error:true,message:"Not authorized"}).code(401);
        }

        return h.response({}).code(201);        
    }
    catch (error) {
        console.error(error.stack);
        return h.response({error: true, message: 'Bad Request'}).code(400);
    }
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
    getAbout
}