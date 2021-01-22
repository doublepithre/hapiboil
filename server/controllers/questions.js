const COMPANY_NAME = "empauwer - x0pa"
const getQuestions = async (request,h)=>{
    try{
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden' }).code(403);
          }
        const {Questionnaire,Questiontype,Company} = request.getModels('xpaxr');
        let questions =  await Questionnaire.findAll({
            include:[{
                model:Questiontype,
                as:"QuestionType",
                attributes:["question_type_name"],
                required:true
            },{
                model:Company,
                as:"Company",
                attributes:[],
                where:{
                    companyName:COMPANY_NAME
                },
                required:true
            }],
            attributes:["question_id","question_name","question_config"],
            required:true
        })
        return h.response(questions).code(200)
    }catch(err){
        console.error(err.stack)
    }

}
module.exports = {
    getQuestions
}