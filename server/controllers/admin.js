const request = require("request");
import { camelizeKeys } from '../utils/camelizeKeys';
// note potential json injection when passing directly 
// from request.payload into sequelize fn but okay as this is for admin only

const getQuestions = async (request, h, targetName) => {
    try {
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden' }).code(403);
        }
        let userTypeName = request.auth.artifacts.decoded.userTypeName;
        let userId = request.auth.credentials.id;
        if (userTypeName !== 'superadmin') {
            return h.response({ message: 'Not authorized' }).code(403);
        }
        const { Questionnaire, Questiontarget, Questiontype,Questioncategory } = request.getModels('xpaxr');
        let questions = await Questionnaire.findAll({
            raw: true,
            include: [{
                model: Questiontype,
                as: "questionType",
                attributes: [],
                required: true
            }, {
                model: Questiontarget,
                as: "questionTarget",
                where: { targetName },
                attributes: []
            },
            {
                model:Questioncategory,
                as:'questionCategory',
                required:true
            }
            ],
            order: [["isActive", "DESC"]],
            attributes: ["questionId", "questionUuid", "questionName", "questionConfig","questionCategory.question_category_name","questionType.question_type_name", "isActive"],
        })
        return h.response(camelizeKeys(questions)).code(200);
    }
    catch (error) {
        console.error(error.stack);
        return h.response({ error: true, message: 'Internal Server Error!' }).code(500);
    }
}


const createQuestions = async (request, h) => {
    if (!request.auth.isAuthenticated) {
        return h.response({ message: 'Not authenticated' }).code(401);
    }
    let userTypeName = request.auth.artifacts.decoded.userTypeName;
    let userId = request.auth.credentials.id;
    if (userTypeName !== 'superadmin') {
        return h.response({ message: 'Not authorized' }).code(403);
    } else {
        const { Questionnaire, Questioncategory, Questiontype, Questiontarget, Questionnaireanswer } = request.getModels('xpaxr');
        const sequelize = request.getDb('xpaxr').sequelize;
        let transaction = await sequelize.transaction();//need to use transaction here because there are two inserts if insertion fails both inserts should fail
        let questions = request.payload;
        try {
            let [questionCategories, questionTypes, questionTargets] = await Promise.all([Questioncategory.findAll({ attributes: ['questionCategoryId', 'questionCategoryName'] }),
                Questiontype.findAll({ attributes: ["questionTypeId", "questionTypeName"] }),
                Questiontarget.findAll({ attributes: ["targetId", "targetName"] })]);
            //since there are only a few categories/types its okay to find all here

            let questionCategoryMap = questionCategories.reduce((map, obj) => (map[obj.questionCategoryName] = obj.questionCategoryId, map), {});
            let questionTypeMap = questionTypes.reduce((map, obj) => (map[obj.questionTypeName] = obj.questionTypeId, map), {});
            let questionTargetMap = questionTargets.reduce((map, obj) => (map[obj.targetName] = obj.targetId, map), {});

            let quesArr = [] // Use array here as might add bulk add option in the future
            if (Array.isArray(questions) && questions.length > 0) {
                for (let ques of questions) {
                    if (ques.questionName && ques.questionTypeName && ques.target) {
                        let questionName = ques.questionName;
                        let createdBy = userId;
                        let questionCategoryId = questionCategoryMap[ques.category];
                        let questionTypeId = questionTypeMap[ques.questionTypeName];
                        let questionTargetId = questionTargetMap[ques.target];
                        let isActive = ques.isActive !== undefined ? ques.isActive : true; //default active is true
                        let questionConfig = ques.questionConfig || {};
                        let weight = ques.weight || 1.0;                        

                        if (questionTypeId == null) {
                            throw new incorrectQuestionFormatException(`Question type ${ques.questionTypeName} is not in database please add question type first`);
                        }
                        else if(questionCategoryId==null){
                            throw new incorrectQuestionFormatException(`Question category ${ques.questionCategory} is not in database please add question category first`);
                        }
                        if (ques.questionTypeName == 'scale5') {
                            if (questionConfig.desc == null) {
                                throw new incorrectQuestionFormatException('desc expected when questiontype is scale');
                            }
                        }
                        if (ques.questionTypeName === 'single_choice' || ques.questionTypeName === 'multiple_choice') {
                            if (questionConfig.options && Array.isArray(questionConfig.options) && questionConfig.options.length > 0) {
                                for (let opt of questionConfig.options) {
                                    if (opt.optionName == null || opt.optionId == null) {
                                        throw new incorrectQuestionFormatException("Options object requires optionName and optionId");
                                    }
                                }
                            } else {
                                throw new incorrectQuestionFormatException("single choice and multiple choice questions require and options array of non zero length in questionconfig");
                            }
                        }
                        quesArr.push({ questionTypeId, questionName, questionCategoryId, createdBy, questionTargetId, questionConfig, isActive, weight });
                    } else {
                        throw new incorrectQuestionFormatException("Some fields are missing");
                    }
                }
                let questionArray = await Questionnaire.bulkCreate(quesArr);
                let qaArray = [];//answerId,questionId,optionId
                let typeQuestionMap = swap(questionTypeMap);

                for (let ques of questionArray) {
                    let questionId = ques.questionId;
                    let questionType = typeQuestionMap[ques.questionTypeId];
                    if (questionType === 'single_choice' || questionType === 'multiple_choice') {
                        for (let option of ques.questionConfig.options) {
                            qaArray.push({ questionId, optionId: option.optionId })
                        }
                    } else if (questionType === "scale5") {
                        for (let i = 1; i <= 5; i++) {
                            qaArray.push({ questionId, optionId: i })
                        }
                    } else {
                        qaArray.push({ questionId, optionId: 0 })
                    }
                }
                await Questionnaireanswer.bulkCreate(qaArray);
                await transaction.commit();
                return h.response(questionArray).code(201);
            } else {
                throw new incorrectQuestionFormatException("Array of non zero length expected");
            }
        } catch (err) {
            await transaction.rollback();
            if (err.name === 'Incorrect Question Format') {
                return h.response({ message: err.message }).code(422);
            }
            console.error(err.stack);
            return h.response({ error: true, message: "Internal Server Error" }), code(503)
        }
    }
}

const getQuestionById = async (request, h, questionId) => {
    if (!request.auth.isAuthenticated) {
        return h.response({ message: 'Not authenticated' }).code(401);
    }
    let userTypeName = request.auth.artifacts.decoded.userTypeName;
    let userId = request.auth.credentials.id;
    if (userTypeName !== 'superadmin') {
        return h.response({ message: 'Not authorized' }).code(403);
    } else {
        const { Questionnaire, Questiontype, Questiontarget, Questioncategory,Questionnaireanswer, Qaattribute, Attributeset } = request.getModels('xpaxr');
        try {
            let res = await Questionnaire.findOne({
                include: [{
                    model: Questiontype,
                    as: "questionType",
                    attributes: ["questionTypeName"],
                    required: true
                },
                {
                    model:Questiontarget,
                    as:"questionTarget",
                    attributes:["targetName"],
                    required:true
                },
                {
                    model:Questioncategory,
                    as:"questionCategory",
                    attributes:["questionCategoryName"],
                    required:true
                },
                {
                    model: Questionnaireanswer,
                    as: "questionnaireanswers",
                    attributes: ["answerId", "optionId"],
                    required: true,
                    include: [
                        {
                            model: Qaattribute,
                            as: "qaattributes",
                            attributes: ["attributeValue"],
                            required: false,
                            include: [
                                {
                                    model: Attributeset,
                                    as: "attribute",
                                    attributes: ["attributeId", "attributeName"],
                                    required: true
                                }
                            ]
                        }
                    ]
                }],
                where: {
                    questionId
                },
                attributes: ["questionId", "questionConfig", "questionName","weight"]
            });
            return h.response(res).code(200);
        } catch (err) {
            console.error(err.stack)
            return h.response({ error: true, message: 'Internal Server Error!' }).code(500);
        }

    }
}

const editQuestion = async (request, h) => {
    if (!request.auth.isAuthenticated) {
        return h.response({ message: 'Not authenticated' }).code(401);
    }
    let userTypeName = request.auth.artifacts.decoded.userTypeName;
    let userId = request.auth.credentials.id;
    if (userTypeName !== 'superadmin') {
        return h.response({ message: 'Not authorized' }).code(403);
    } else {
        try {
            const { Questionnaire,Questioncategory,Questiontype,Questiontarget } = request.getModels('xpaxr');

            let [questionCategories, questionTypes, questionTargets] = await Promise.all([Questioncategory.findAll({ attributes: ['questionCategoryId', 'questionCategoryName'] }),
            Questiontype.findAll({ attributes: ["questionTypeId", "questionTypeName"] }),
            Questiontarget.findAll({ attributes: ["targetId", "targetName"] })]);

            let questionCategoryMap = questionCategories.reduce((map, obj) => (map[obj.questionCategoryName] = obj.questionCategoryId, map), {});
            let questionTypeMap = questionTypes.reduce((map, obj) => (map[obj.questionTypeName] = obj.questionTypeId, map), {});
            let questionTargetMap = questionTargets.reduce((map, obj) => (map[obj.targetName] = obj.targetId, map), {});
            console.log(questionCategoryMap);
            console.log(questionTypeMap);
            console.log(questionTargetMap);
            console.log(request.payload);
            
            let questionPayload = request.payload;

            let res = await Questionnaire.update({
                questionName:questionPayload.questionName,
                questionConfig:questionPayload.questionConfig,
                questionTypeId:questionTypeMap[questionPayload.questionTypeName],
                questionCategoryId:questionCategoryMap[questionPayload.category],
                questionTargetMap:questionTargetMap[questionPayload.target]
            },{
                where:{
                    questionId:questionPayload.questionId
                }
            });

            return h.response(res).code(200);
        } catch (err) {
            console.error(err.stack);
            return h.response({ error: true, message: 'Internal Server Error!' }).code(500);
        }

    }
}

const updateIsActive = async (request, h) => {
    if (!request.auth.isAuthenticated) {
        return h.response({ message: 'Not authenticated' }).code(401);
    }
    let userTypeName = request.auth.artifacts.decoded.userTypeName;
    let userId = request.auth.credentials.id;
    if (userTypeName !== 'superadmin') {
        return h.response({ message: 'Not authorized' }).code(403);
    } else {
        const { Questionnaire } = request.getModels('xpaxr');
        let res = await Questionnaire.update({ isActive: request.payload.isActive }, {
            where: {
                questionId: request.payload.questionId
            }
        });
        return h.response(res).code(200);
    }
}

const deleteQuestions = async (request, h) => {
    if (!request.auth.isAuthenticated) {
        return h.response({ message: 'Not authenticated' }).code(401);
    }
    let userTypeName = request.auth.artifacts.decoded.userTypeName;
    let userId = request.auth.credentials.id;
    if (userTypeName !== 'superadmin') {
        return h.response({ message: 'Not authorized' }).code(403);
    } else {
        const { Questionnaire } = request.getModels('xpaxr');
        let res = await Questionnaire.destroy({
            where: {
                questionId: request.payload.questionId
            }
        });
        console.log("DELETE")
        console.log(request.payload);
        return h.response(res).code(200);
    }
}

const getQuestionCategories = async (request, h) => {
    if (!request.auth.isAuthenticated) {
        return h.response({ message: 'Not authenticated' }).code(401);
    }
    let userTypeName = request.auth.artifacts.decoded.userTypeName;
    let userId = request.auth.credentials.id;
    if (userTypeName !== 'superadmin') {
        return h.response({ message: 'Not authorized' }).code(403);
    } else {
        let { Questioncategory } = request.getModels('xpaxr');
        let questionCategories = await Questioncategory.findAll({ attributes: ["questionCategoryName"] });
        return h.response(questionCategories.map(x => x.questionCategoryName)).code(200);
    }
}

const getQuestionTypes = async (request, h) => {
    if (!request.auth.isAuthenticated) {
        return h.response({ message: 'Not authenticated' }).code(401);
    }
    let userTypeName = request.auth.artifacts.decoded.userTypeName;
    let userId = request.auth.credentials.id;
    if (userTypeName !== 'superadmin') {
        return h.response({ message: 'Not authorized' }).code(403);
    } else {
        let { Questiontype } = request.getModels('xpaxr');
        let questionTypes = await Questiontype.findAll({ attributes: ["questionTypeName"] });
        return h.response(questionTypes.map(x => x.questionTypeName)).code(200);
    }
}

const getAttributes = async (request, h) => {
    if (!request.auth.isAuthenticated) {
        return h.response({ message: 'Not authenticated' }).code(401);
    }
    let userTypeName = request.auth.artifacts.decoded.userTypeName;
    let userId = request.auth.credentials.id;
    if (userTypeName !== 'superadmin') {
        return h.response({ message: 'Not authorized' }).code(403);
    } else {
        let { Attributeset } = request.getModels('xpaxr');
        let attributes = await Attributeset.findAll();
        return h.response(attributes).code(200);
    }
}

const createAttribute = async (request, h) => {
    if (!request.auth.isAuthenticated) {
        return h.response({ message: 'Not authenticated' }).code(401);
    }
    let userTypeName = request.auth.artifacts.decoded.userTypeName;
    let userId = request.auth.credentials.id;
    if (userTypeName !== 'superadmin') {
        return h.response({ message: 'Not authorized' }).code(403);
    } else {
        let { Attributeset } = request.getModels('xpaxr');
        let res = await Attributeset.create(request.payload);
        return h.response(res).code(201);
    }
}

const deleteAttribute = async (request, h) => {
    if (!request.auth.isAuthenticated) {
        return h.response({ message: 'Not authenticated' }).code(401);
    }
    let userTypeName = request.auth.artifacts.decoded.userTypeName;
    let userId = request.auth.credentials.id;
    if (userTypeName !== 'superadmin') {
        return h.response({ message: 'Not authorized' }).code(403);
    } else {
        let { Attributeset } = request.getModels('xpaxr');
        let res = await Attributeset.destroy({
            where: {
                attributeId: request.payload.attributeId
            }
        });
        return h.response(res).code(200);
    }
}

const editAttribute = async (request, h) => {
    if (!request.auth.isAuthenticated) {
        return h.response({ message: 'Not authenticated' }).code(401);
    }
    let userTypeName = request.auth.artifacts.decoded.userTypeName;
    let userId = request.auth.credentials.id;
    let attribute = JSON.parse(JSON.stringify(request.payload));
    delete attribute.attributeId;
    if (userTypeName !== 'superadmin') {
        return h.response({ message: 'Not authorized' }).code(403);
    } else {
        let { Attributeset } = request.getModels('xpaxr');
        let res = await Attributeset.update(attribute, {
            where: {
                attributeId: request.payload.attributeId
            }
        });
        return h.response(res).code(200);
    }
}

const createQuestionAttributes = async (request, h) => {
    if (!request.auth.isAuthenticated) {
        return h.response({ message: 'Not authenticated' }).code(401);
    }
    let userTypeName = request.auth.artifacts.decoded.userTypeName;
    let userId = request.auth.credentials.id;
    if (userTypeName !== 'superadmin') {
        return h.response({ message: 'Not authorized' }).code(403);
    } else {
        let { Qaattribute,Questionnaireanswer } = request.getModels('xpaxr');
        const sequelize = request.getDb('xpaxr').sequelize;
        let transaction = await sequelize.transaction();
        try {
            let rows = await Questionnaireanswer.findAll({
                attributes:["answerId"],
                where:{
                    questionId:request.payload.questionId
            }})
            let answerIdArr = [];
            for (let ans of rows){
                answerIdArr.push(ans.answerId);
            }
            await Qaattribute.destroy({
                where: {
                    answerId: answerIdArr
                }
            })
            let res;
            if (request.payload.questionAnswerAttributes.length>0){
                res = await Qaattribute.bulkCreate(request.payload.questionAnswerAttributes);
            }else{
                res = {message:"Successfuly deleted all question attributes"};
            }
            await transaction.commit();
            return h.response(res).code(200);
        } catch (err) {
            await transaction.rollback();
            console.error(err.stack);
            return h.response({ error: true }).code(503);
        }

    }
}

const addQuestionMapping = async (request, h) => {
    if (!request.auth.isAuthenticated) {
        return h.response({ message: 'Not authenticated' }).code(401);
    }
    let userTypeName = request.auth.artifacts.decoded.userTypeName;
    let userId = request.auth.credentials.id;
    if (userTypeName !== 'superadmin') {
        return h.response({ message: 'Not authorized' }).code(403);
    } else {
        let { Questionmapping } = request.getModels('xpaxr');
        try {
            let res = await Questionmapping.create(request.payload);
            return h.response(res).code(200);
        } catch (err) {
            console.error(err.stack);
            return h.response({ error: true }).code(503);
        }
    }
}

const getQuestionMapping = async (request, h) => {
    if (!request.auth.isAuthenticated) {
        return h.response({ message: 'Not authenticated' }).code(401);
    }
    let userTypeName = request.auth.artifacts.decoded.userTypeName;
    let userId = request.auth.credentials.id;
    if (userTypeName !== 'superadmin') {
        return h.response({ message: 'Not authorized' }).code(403);
    } else {
        let { Questionmapping, Questionnaire, Questiontarget, Questiontype } = request.getModels('xpaxr');
        try {
            let res = await Questionmapping.findAll({
                include: [
                    {
                        model: Questionnaire,
                        as: "empauwerAllQ",
                        include: [
                            {
                                model:Questiontype,
                                as:"questionType",
                                attributes:["questionTypeName"],
                            },
                            {
                                model:Questiontarget,
                                as:"questionTarget",
                                attributes:["targetName"]
                            }
                        ],
                        attributes: ["questionId", "questionUuid", "questionName", "questionConfig","isActive"]
                    },
                    {
                        model: Questionnaire,
                        as: "empauwerMeQ",
                        include: [
                            {
                                model:Questiontype,
                                as:"questionType",
                                attributes:["questionTypeName"],
                            },
                            {
                                model:Questiontarget,
                                as:"questionTarget",
                                attributes:["targetName"]
                            }
                        ],
                        attributes: ["questionId", "questionUuid", "questionName", "questionConfig","isActive"]
                    },
                ],
                attributes: { exclude: ["createdAt", "updatedAt"] }
            });
            res = JSON.parse(JSON.stringify(res)); // need to do this to unnest attributes
            for (let row of res){
                row.empauwerMeQ["questionTypeName"] = row.empauwerMeQ.questionType.questionTypeName;
                row.empauwerAllQ["questionTypeName"] = row.empauwerAllQ.questionType.questionTypeName;
            }
            return h.response(res).code(200);
        } catch (err) {
            console.error(err.stack);
            return h.response({ error: true }).code(503);
        }
    }
}

const deleteQuestionMapping = async (request,h)=>{
    if (!request.auth.isAuthenticated) {
        return h.response({ message: 'Not authenticated' }).code(401);
    }
    let userTypeName = request.auth.artifacts.decoded.userTypeName;
    let userId = request.auth.credentials.id;
    if (userTypeName !== 'superadmin') {
        return h.response({ message: 'Not authorized' }).code(403);
    } else {
        let { Questionmapping } = request.getModels('xpaxr');
        try {
            let res = await Questionmapping.destroy({
                where:{
                    empauwerAllQid:request.payload.empauwerAllQid,
                    empauwerMeQid:request.payload.empauwerMeQid,
                }
            });
            return h.response(res).code(200);
        } catch (err) {
            console.error(err.stack);
            return h.response({ error: true }).code(503);
        }
    }
}


function swap(json) {
    var ret = {};
    for (var key in json) {
        ret[json[key]] = key;
    }
    return ret;
}

function incorrectQuestionFormatException(message) {
    this.message = message;
    this.name = "Incorrect Question Format"
}

module.exports = {
    getQuestions,
    createQuestions,
    deleteQuestions,
    updateIsActive,
    getQuestionById,
    editQuestion,
    getQuestionCategories,
    getQuestionTypes,
    getAttributes,
    createAttribute,
    deleteAttribute,
    editAttribute,
    createQuestionAttributes,
    addQuestionMapping,
    getQuestionMapping,
    deleteQuestionMapping
}