const COMPANY_NAME = "empauwer - x0pa"
const getQuestions = async (request,h)=>{
    try{
        const {Questionnaire,Questiontype,Company} = request.getModels('xpaxr');
        let x =  await Questionnaire.findAll({
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
                }
            }],
            attributes:["question_id","question_name","question_config"],
            required:true
        })
        return x
    }catch(err){
        console.log(err.stack)
    }

}
module.exports = {
    getQuestions
}