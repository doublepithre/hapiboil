const { Op, Sequelize, QueryTypes, cast, literal } = require('sequelize');
const bcrypt = require('bcrypt');
const validator = require('validator');
const { sendEmailAsync } = require('../utils/email');
const randtoken = require('rand-token');
const config = require('config');
const axios = require('axios')
import jobInfo from '../utils/jobUtils'

const createUser = async (request, h) => {
  try {
    if (request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden' }).code(403);
    }
    const { User, Userinfo, Usertype, Userrole } = request.getModels('xpaxr');
    const { email, password, accountType, } = request.payload || {};

    if ( !(email && password && accountType)) {
      throw new Error('Please provide necessary details');
    }

    if (!validator.isEmail(email)) {
      throw new Error('Please provide a valid Email');
    }
    if (password.length < 8) {
      throw new Error('Password must contain atleast 8 characters');
    } else if (password.length > 100) {
      throw new Error('Password should be atmost 100 characters');
    }
    const validAccountTypes = ['candidate', 'employer', 'mentor'];
    if (!validAccountTypes.includes(accountType)) {
      throw new Error('Invalid account type');
    }

    const userRecord = await User.findOne({ where: { email }});
    const record = userRecord && userRecord.toJSON();
    if (record) {
      throw new Error('Account with this email already exists!');
    }
    
    const hashedPassword = bcrypt.hashSync(password, 12);
    const userTypeRecord = await Usertype.findOne({
      where: {
        user_type_name: accountType
      }, 
      attributes: ['userTypeId']
    });
    const { userTypeId } = userTypeRecord && userTypeRecord.toJSON();
    const userRoleRecord = await Userrole.findOne({
      where: {
        role_name: accountType
      }
    });
    const { roleId } = userRoleRecord && userRoleRecord.toJSON();
    const emailLower = email.toLowerCase().trim();
    const udata = await User.create({ email: emailLower, password: hashedPassword, });
    const userRes = udata && udata.toJSON();
    const { userId, userUuid } = userRes || {};
    const uidata = await Userinfo.create({
      userId,
      userUuid,
      email: emailLower,
      roleId,
      userTypeId,
      active: true,
      firstName: email.split('@')[0],
      companyUuid: null
    });
    return h.response(udata).code(200);
  } catch (error) {
    // console.error(error);
    return h.response({
      error: true, message: error.message
    }).code(400);
  }
};

const getUser = async (request, h) => {
  try{
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden' }).code(403);
    }
    const { Userinfo, Usertype, Userrole } = request.getModels('xpaxr');
    
    const { credentials } = request.auth || {};
    const userId = credentials.id;
    const userRecord = await Userinfo.findOne({ where: { userId }, attributes: { exclude: ['createdAt', 'updatedAt'] }});
    const luser = userRecord && userRecord.toJSON();
    const { userTypeId, roleId } = luser || {};
    
    const userTypeRecord = await Usertype.findOne({ where: { userTypeId }});
    const userRoleRecord = await Userrole.findOne({ where: { roleId }});
    const { userTypeName } = userTypeRecord && userTypeRecord.toJSON();
    const { roleName } = userRoleRecord && userRoleRecord.toJSON();

    luser.userTypeName = userTypeName;
    luser.roleName = roleName;

    return h.response(luser).code(200);
  }
  catch(error) {
    return h.response({
      error: true, message: error.message
    }).code(400);
  }
}

const updateUser = async (request, h) => {
  try{
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden' }).code(403);
    }
    const validUpdateRequests = [
      'active',      'firstName',
      'lastName',    'isAdmin',
      'tzid',        'primaryMobile',
      'roleId',      'isAdmin'
    ];
    const requestedUpdateOperations = Object.keys(request.payload) || [];
    const isAllReqsValid = requestedUpdateOperations.every( req => validUpdateRequests.includes(req));
    if (!isAllReqsValid) {
      throw new Error('Invalid update requests');
    }

    const { Userinfo } = request.getModels('xpaxr');
    
    const { credentials } = request.auth || {};
    const userId = credentials.id;
    const userRecord = await Userinfo.findOne({ where: { userId } });
    const luser = userRecord && userRecord.toJSON();
    const { userId: luserId, isAdmin } = luser || {};
    
    const { userUuid } = request.params || {};
    const requestedForUser = await Userinfo.findOne({ where: { userUuid }}) || {};
    const { userId: rForUserId } = requestedForUser && requestedForUser.toJSON();

    if (luserId !== rForUserId && !isAdmin) {    // when request is (not from self) and (if other -> not admin)
      throw new Error('Not the right person to update!');
    }
    
    await Userinfo.update( request.payload, { where: { userUuid: userUuid }} );
    const updatedUinfo = await Userinfo.findOne({
        where:{ userUuid: userUuid },
        attributes: { exclude: ['createdAt', 'updatedAt']
      }
    });
    const uinfo = updatedUinfo && updatedUinfo.toJSON();
    return h.response(uinfo).code(200);
  }
  catch(error) {
    return h.response({ error: true, message: error.message }).code(400);
  }
}

const forgotPassword = async (request, h) => {
  try{
    const { email } = request.payload || {};
    if (!validator.isEmail(email)) { throw new Error('Invalid Email!'); }

    const { User, Emailtemplates, Userinfo, Companyinfo, Emaillogs, Requesttoken } = request.getModels('xpaxr');
    const userRecord = await User.findOne({ where: { email }});
    const user = userRecord && userRecord.toJSON();
    if (!user) { throw new Error('No account found!'); }
    const { userId } = user || {};

    const token = randtoken.generate(16);
    const reqTokenRecord = await Requesttoken.create({ 
      requestKey: token, 
      userId, 
      resourceType: 'user', 
      actionType: 'reset-password'
    });
    const reqToken = reqTokenRecord && reqTokenRecord.toJSON();

    let resetLink = config.get('resetLink');
    resetLink += `/${token}`;

    const emailData = {
      email,
      emails: [email],
      ccEmails: [],
      templateName: 'reset-password',
      resetLink,
      subject: "Password Reset Request for {{email}}",
      isX0PATemplate: true,
    };

    const additionalEData = {
      userId,
      Emailtemplates,
      Userinfo,
      Companyinfo,
      Emaillogs,
    };
    sendEmailAsync(emailData, additionalEData);
    return h.response(reqToken).code(200);
  }
  catch(error) {
    return h.response({ error: true, message: error.message }).code(400);
  }
}

const resetPassword = async (request, h) => {
  // Tasks remaining
    // Before resetting, need to check expiry of requestKey once that column added in table.
  try {
    const { requestKey } = request.params || {};
    const { password1, password2 } = request.payload || {};
    
    if (requestKey.length !== 16) { throw new Error('Invalid URL!'); }  // Token length is 16.
    if (password1 !== password2) { throw new Error('Passwords are not matching!'); }
    
    const { User, Requesttoken } = request.getModels('xpaxr');
    
    const requestTokenRecord = await Requesttoken.findOne({ where: { requestKey }});
    const requestToken = requestTokenRecord && requestTokenRecord.toJSON();
    if (!requestToken) { throw new Error('Bad Request! URL might be expired'); }
    const { userId } = requestToken || {};

    const userRecord = await User.findOne({ where: { userId }});
    const user = userRecord && userRecord.toJSON();
    if (!user) { throw new Error('Invalid URL!')};
    const hashedPassword = bcrypt.hashSync(password1, 12);
    await User.update({ password: hashedPassword }, { where: { userId }});

    return h.response({message: 'Password updation successful'}).code(200);
  }
  catch (error) {
    console.log(error);
    return h.response({error: true, message: error.message});
  }
}

const createProfile = async (request, h) => {
  // Tasks remaining
    // Need to change code acc. to format of response received
  try{
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden' }).code(403);
    }
    let userTypeId = request.auth.artifacts.decoded.userTypeId
    if (userTypeId!==1){
      return h.response({message:"Not an candidate"}).code(403)
    }
    const { responses } = request.payload || {};
    const { credentials } = request.auth || {};
    const { id: userId } = credentials || {};
    //Ensure to overwrite userid with userid from jwt
    for(let respond of responses){
      respond.userId = userId
    }
    const { Userquesresponse } = request.getModels('xpaxr');
    const resRecord = await Userquesresponse.bulkCreate(responses,{updateOnDuplicate:["responseVal"]});

    return h.response(resRecord).code(200);
  }
  catch (error) {
    return h.response({error: true, message: error.message}).code(403);
  }
}

const createJobProfile = async (request, h) => {
  try{
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden' }).code(403);
    }
    let userTypeId = request.auth.artifacts.decoded.userTypeId
    if (userTypeId!==2){
      return h.response({message:"Not an employer"}).code(403)
    }
    const { responses,jobId } = request.payload || {};
    for(let response of responses){
      response.jobId = jobId;
    }
    const { credentials } = request.auth || {};
    const { id: userId } = credentials || {};
    //Ensure to overwrite userid with userid from jwt

    let {Jobsquesresponse} = request.getModels('xpaxr');
    const resRecord = await Jobsquesresponse.bulkCreate(responses,{updateOnDuplicate:["responseVal"]});

    return h.response(resRecord).code(200);
  }
  catch (error) {
    return h.response({error: true, message: error.message}).code(403);
  }
}

//No need to pass in userid as we can get the id form the jwt
const getJobRecommendations = async (request,h) => {
  try{
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden' }).code(403);
    }
    const { credentials } = request.auth || {};
    const { id: userId } = credentials || {};
    let model = request.getModels('xpaxr');
    if (!await isQuestionnaireDone(userId,model)){
      return h.response({error:"Questionnaire Not Done"}).code(403)
    }
    let recommendations = await axios.get(`${config.dsServer.host}:${config.dsServer.port}/recommendation`,{ params: { user_id: userId } })
    recommendations = recommendations["recommendations"]//this will be  sorted array of {job_id,score}
    let jobIds = recommendations.map(x=>x["job_id"])
    let jobInfo = jobUtils.getJobInfo(jobIds)
    return h.response(recommendations).code(200);
  }
  catch (error) {
    return h.response({error: true, message: error.message}).code(403);
  }
}

const createJob = async (request, h) => {
  try{
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden' }).code(403);
    }
    // check if userid is of employer datatype
    let userTypeId = request.auth.artifacts.decoded.userTypeId
    if (userTypeId!==2){
      return h.response({message:"Not an employer"}).code(403)
    }
    const jobsInfo = request.payload || {};
    const { credentials } = request.auth || {};
    const { id: userId } = credentials || {};
    const { Job } = request.getModels('xpaxr');
    const [record, created] = await Job.upsert(jobsInfo,{ returning: true } );

    return h.response(record).code(200);
  }
  catch (error) {
    return h.response({error: true, message: error.message}).code(403);
  }
}

const isQuestionnaireDone = async(userId,model)=>{
  const { Userquesresponse,Questionnaire,Company } = model
  const COMPANY_NAME = "empauwer - x0pa";
  let questionnaireCount = await Questionnaire.count({
    include:[{
        model:Company,
        as:"Company",
        where:{
            companyName:COMPANY_NAME
        },
        required:true
    }],
    required:true
  })

  let responsesCount = await Userquesresponse.count({
    where:{
      userId
    }});
    return questionnaireCount === responsesCount;
}

module.exports = {
  createUser,
  getUser,
  updateUser,
  forgotPassword,
  resetPassword,
  createProfile,
  getJobRecommendations,
  createJob,
  createJobProfile
};

