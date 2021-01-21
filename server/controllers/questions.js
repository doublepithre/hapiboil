const COMPANY_NAME = "empauwer - x0pa"
const getQuestions = async (request,h)=>{
    try{
        const {Questionnaire,Questiontype,Company} = request.getModels('xpaxr');
        let x =  await Questionnaire.findAll({
            include:[{
                model:Questiontype,
                as:"QuestionType"
            }]
        })
        return x
    }catch(err){
        console.log(err.stack)
    }

}
module.exports = {
    getQuestions
}