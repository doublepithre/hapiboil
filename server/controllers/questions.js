const getQuestions = async (request,h,company_name)=>{
    try{
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden' }).code(403);
          }
        const sequelize = request.getDb('xpaxr').sequelize;
        const {Questionnaire,Questiontype,Company} = request.getModels('xpaxr');
        let questions =  await Questionnaire.findAll({
            order:sequelize.col('QuestionType.question_type_name'),//enforce order
            include:[{
                model:Questiontype,
                as:"QuestionType",
                attributes:[],
                required:true
            },{
                model:Company,
                as:"Company",
                attributes:[],
                where:{
                    companyName:company_name
                },
                required:true
            }],
            attributes:[["question_id","questionId"],["question_name","questionName"],["question_config","questionConfig"],"QuestionType.question_type_name"],
            required:true,
            raw:true
        })
        // for some reason cannot rename joined column to camel case
        questions = questions.map(question=>{
            question.questionTypeName = question.question_type_name
            delete question.question_type_name
            return question
        })
        return h.response(questions).code(200)
    }catch(err){
        console.error(err.stack)
    }

}
module.exports = {
    getQuestions
}