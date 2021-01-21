const COMPANY_NAME = "empauwer - x0pa"
const getQuestions = async (request,h)=>{
    const {Questionnaire,Questiontype,Company} = request.getModels('xpaxr');
    let x =  await Questionnaire.findAll({
        // include:[{
        //     model:Questiontype
        // }]
    })
    return x
}
module.exports = {
    getQuestions
}