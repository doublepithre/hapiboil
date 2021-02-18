const createQuestions = async (request, h) => {
    if (!request.auth.isAuthenticated) {
        return h.response({ message: 'Not authenticated'}).code(401);
    }
    let userTypeName = request.auth.artifacts.decoded.userTypeName;
    let userId = request.auth.credentials.id;
    if (userTypeName !== 'admin_x0pa'){
        return h.response({message:'Not authorized'}).code(403);
    }else{
        const {Questionnaire,Questioncategory,Questiontype,Questiontarget,Questionnaireanswer} = request.getModels('xpaxr');
        const sequelize = request.getDb('xpaxr').sequelize;
        let transaction = await sequelize.transaction();
        let questions = request.payload;
        try{
            let [questionCategories,questionTypes,questionTargets] = await Promise.all([Questioncategory.findAll({attributes:['questionCategoryId','questionCategoryName']}),
                Questiontype.findAll({attributes:["questionTypeId","questionTypeName"]}),
                Questiontarget.findAll({attributes:["targetId","targetName"]})]);
                //since there are only a few categories/types its okay to find all here

            let questionCategoryMap = questionCategories.reduce((map,obj)=>(map[obj.questionCategoryName] = obj.questionCategoryId, map),{});
            let questionTypeMap = questionTypes.reduce((map,obj)=>(map[obj.questionTypeName]=obj.questionTypeId,map),{});
            let questionTargetMap = questionTargets.reduce((map,obj)=>(map[obj.targetName]=obj.targetId,map),{});

            let quesArr = []
            if(Array.isArray(questions) && questions.length>0){
                for(let ques of questions){
                    if (ques.questionName && ques.questionCategory && ques.questionType && ques.target){
                        let questionName = ques.questionName;
                        let createdBy = userId;
                        let questionCategoryId = questionCategoryMap[ques.questionCategory];
                        let questionTypeId = questionTypeMap[ques.questionType];
                        let questionTargetId = questionTargetMap[ques.target];
                        let isActive = ques.isActive!==undefined ? ques.isActive : true; //default active is true
                        let questionConfig = ques.questionConfig || {};
                        if (questionTypeId==null){
                            throw new incorrectQuestionFormatException(`Question type ${ques.questionType} is not in database please add question type first`);
                        }else if(questionCategoryId==null){
                            throw new incorrectQuestionFormatException(`Question category ${ques.questionCategory} is not in database please add question category first`);
                        }
                        if (ques.questionType=='scale5'){
                            if (questionConfig.desc==null){
                                throw new incorrectQuestionFormatException('desc expected when questiontype is scale');
                            }else if (!questionConfig.desc.includes("\n")){
                                throw new incorrectQuestionFormatException("desc for scale question requires new line character")
                            }
                        }
                        if (ques.questionType === 'single_choice'||ques.questionType === 'multiple_choice'){
                            if (questionConfig.options && Array.isArray(questionConfig.options) && questionConfig.options.length>0){
                                for (let opt of questionConfig.options){
                                    if (opt.optionName==null || opt.optionId==null){
                                        throw new incorrectQuestionFormatException("Options object requires optionName and optionId");
                                    }
                                }
                            }else{
                                throw new incorrectQuestionFormatException("single choice and multiple choice questions require and options array of non zero length in questionconfig");
                            }
                        }
                        quesArr.push({questionTypeId,questionName,questionCategoryId,createdBy,questionTargetId,questionConfig,isActive});
                    }else{
                        throw new incorrectQuestionFormatException("Some fields are missing");
                    }
                }
                let questionArray = await Questionnaire.bulkCreate(quesArr);
                let qaArray = [];//answerId,questionId,answerVal,optionId
                let typeQuestionMap = swap(questionTypeMap);
                
                for(let ques of questionArray){
                    let questionId = ques.questionId;
                    let questionType = typeQuestionMap[ques.questionTypeId];
                    if (questionType==='single_choice' || questionType==='multiple_choice'){
                        for (let option of ques.questionConfig.options){
                            qaArray.push({questionId,answerVal:option.optionName,optionId:option.optionId})
                        }
                    }else if (questionType==="scale5"){
                        qaArray.push({questionId,answerVal:ques.questionConfig.desc,optionId:0})
                    }else{
                        qaArray.push({questionId,answerVal:"None",optionId:0})
                    }
                }
                await Questionnaireanswer.bulkCreate(qaArray);
                await transaction.commit();
                return h.response(questionArray).code(200);
            }else{
                throw new incorrectQuestionFormatException("Array of non zero length expected");
            }
        }catch(err){
            await transaction.rollback();
            if (err.name === 'Incorrect Question Format'){
                return h.response(err.message).code(422);
            }
            console.error(err.stack);
            return h.response({error:true,message:"Internal Server Error"}),code(503)
        }
    }
}

const editQuestions = (request,h)=>{
    if (!request.auth.isAuthenticated) {
        return h.response({ message: 'Not authenticated'}).code(401);
    }
    let userTypeName = request.auth.artifacts.decoded.userTypeName;
    let userId = request.auth.credentials.id;
    if (userTypeName !== 'admin_x0pa'){
        return h.response({message:'Not authorized'}).code(403);
    }else{
    }
}

const getQuestionCategories = async(request,h)=>{
    if (!request.auth.isAuthenticated) {
        return h.response({ message: 'Not authenticated'}).code(401);
    }
    let userTypeName = request.auth.artifacts.decoded.userTypeName;
    let userId = request.auth.credentials.id;
    if (userTypeName !== 'admin_x0pa'){
        return h.response({message:'Not authorized'}).code(403);
    }else{
       let {Questioncategory} = request.getModels('xpaxr');
       let questionCategories = await Questioncategory.findAll({attributes:["questionCategoryName"]});
       return h.response(questionCategories.map(x=>x.questionCategoryName)).code(200);
    }
}

const getQuestionTypes = async(request,h)=>{
    if (!request.auth.isAuthenticated) {
        return h.response({ message: 'Not authenticated'}).code(401);
    }
    let userTypeName = request.auth.artifacts.decoded.userTypeName;
    let userId = request.auth.credentials.id;
    if (userTypeName !== 'admin_x0pa'){
        return h.response({message:'Not authorized'}).code(403);
    }else{
        let {Questiontype} = request.getModels('xpaxr');
        let questionTypes = await Questiontype.findAll({attributes:["questionTypeName"]});
        return h.response(questionTypes.map(x=>x.questionTypeName)).code(200);
    }
}

function swap(json){
    var ret = {};
    for(var key in json){
      ret[json[key]] = key;
    }
    return ret;
  }

function incorrectQuestionFormatException(message){
    this.message = message;
    this.name = "Incorrect Question Format"
}

module.exports = {
    createQuestions,
    editQuestions,
    getQuestionCategories,
    getQuestionTypes
}