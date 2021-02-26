const request = require("request");

const createQuestions = async (request, h) => {
    if (!request.auth.isAuthenticated) {
        return h.response({ message: 'Not authenticated' }).code(401);
    }
    let userTypeName = request.auth.artifacts.decoded.userTypeName;
    let userId = request.auth.credentials.id;
    if (userTypeName !== 'admin_x0pa') {
        return h.response({ message: 'Not authorized' }).code(403);
    } else {
        const { Questionnaire, Questioncategory, Questiontype, Questiontarget, Questionnaireanswer } = request.getModels('xpaxr');
        const sequelize = request.getDb('xpaxr').sequelize;
        let transaction = await sequelize.transaction();//need to use transaction here because there are two inserts if insertion fails both inserts should fail
        let questions = request.payload;
        console.log(questions);
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
                        let questionCategoryId = questionCategoryMap[ques.questionCategory];
                        let questionTypeId = questionTypeMap[ques.questionTypeName];
                        let questionTargetId = questionTargetMap[ques.target];
                        let isActive = ques.isActive !== undefined ? ques.isActive : true; //default active is true
                        let questionConfig = ques.questionConfig || {};
                        let isCaseStudy = ques.isCaseStudy;
                        if (questionTypeId == null) {
                            throw new incorrectQuestionFormatException(`Question type ${ques.questionTypeName} is not in database please add question type first`);
                        }
                        // allow null questionCategory for now
                        // else if(questionCategoryId==null){
                        //     throw new incorrectQuestionFormatException(`Question category ${ques.questionCategory} is not in database please add question category first`);
                        // }
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
                        quesArr.push({ questionTypeId, questionName, questionCategoryId, createdBy, questionTargetId, questionConfig, isActive, isCaseStudy });
                    } else {
                        throw new incorrectQuestionFormatException("Some fields are missing");
                    }
                }
                let questionArray = await Questionnaire.bulkCreate(quesArr);
                let qaArray = [];//answerId,questionId,answerVal,optionId
                let typeQuestionMap = swap(questionTypeMap);

                for (let ques of questionArray) {
                    let questionId = ques.questionId;
                    let questionType = typeQuestionMap[ques.questionTypeId];
                    if (questionType === 'single_choice' || questionType === 'multiple_choice') {
                        for (let option of ques.questionConfig.options) {
                            qaArray.push({ questionId, answerVal: option.optionName, optionId: option.optionId })
                        }
                    } else if (questionType === "scale5") {
                        for (let i = 1; i <= 5; i++) {
                            qaArray.push({ questionId, answerVal: ques.questionConfig.desc, optionId: i })
                        }
                    } else {
                        qaArray.push({ questionId, answerVal: "None", optionId: 0 })
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
    if (userTypeName !== 'admin_x0pa') {
        return h.response({ message: 'Not authorized' }).code(403);
    } else {
        const { Questionnaire, Questiontype,Questionnaireanswer,Qaattribute } = request.getModels('xpaxr');
        try{
            let res = await Questionnaire.findOne({
                include: [{
                    model: Questiontype,
                    as: "questionType",
                    attributes: ["questionTypeName"],
                    required: true
                },
                {
                    model:Questionnaireanswer,
                    as:"questionnaireanswers",
                    attributes:["answerId","optionId","answerVal"],
                    required:true,
                    include:[
                        {
                            model:Qaattribute,
                            as:"qaattributes",
                            attributes:["attributeValue"],
                            required:false,
                            include:[
                            
                            ]
                        }
                    ]
                }],
                where: {
                    questionId
                },
                attributes:["questionId","questionConfig","questionName"]
            });
        return h.response(res).code(200);
        }catch(err){
            console.error(err.stack)
        }
        
    }
}

const deleteQuestions = async (request, h) => {
    if (!request.auth.isAuthenticated) {
        return h.response({ message: 'Not authenticated' }).code(401);
    }
    let userTypeName = request.auth.artifacts.decoded.userTypeName;
    let userId = request.auth.credentials.id;
    if (userTypeName !== 'admin_x0pa') {
        return h.response({ message: 'Not authorized' }).code(403);
    } else {
        const { Questionnaire } = request.getModels('xpaxr');
        let res = await Questionnaire.destroy({
            where: {
                questionId: request.payload.questionId
            }
        });
        return h.response(res).code(200);
    }
}


const editQuestions = (request, h) => {
    if (!request.auth.isAuthenticated) {
        return h.response({ message: 'Not authenticated' }).code(401);
    }
    let userTypeName = request.auth.artifacts.decoded.userTypeName;
    let userId = request.auth.credentials.id;
    if (userTypeName !== 'admin_x0pa') {
        return h.response({ message: 'Not authorized' }).code(403);
    } else {
    }
}

const getQuestionCategories = async (request, h) => {
    if (!request.auth.isAuthenticated) {
        return h.response({ message: 'Not authenticated' }).code(401);
    }
    let userTypeName = request.auth.artifacts.decoded.userTypeName;
    let userId = request.auth.credentials.id;
    if (userTypeName !== 'admin_x0pa') {
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
    if (userTypeName !== 'admin_x0pa') {
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
    if (userTypeName !== 'admin_x0pa') {
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
    if (userTypeName !== 'admin_x0pa') {
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
    if (userTypeName !== 'admin_x0pa') {
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
    if (userTypeName !== 'admin_x0pa') {
        return h.response({ message: 'Not authorized' }).code(403);
    } else {
        let { Attributeset } = request.getModels('xpaxr');
        let res = await Attributeset.update({ attributeName: request.payload.attributeName }, {
            where: {
                attributeId: request.payload.attributeId
            }
        });
        return h.response(res).code(200);
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
    createQuestions,
    editQuestions,
    deleteQuestions,
    getQuestionById,
    getQuestionCategories,
    getQuestionTypes,
    getAttributes,
    createAttribute,
    deleteAttribute,
    editAttribute
}