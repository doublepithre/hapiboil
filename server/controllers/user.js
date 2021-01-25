const { Op, Sequelize, QueryTypes, cast, literal } = require('sequelize');
const bcrypt = require('bcrypt');
const validator = require('validator');
const { sendEmailAsync } = require('../utils/email');
const randtoken = require('rand-token');
import request from 'request';
import { formatQueryRes } from '../utils/index';

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

    const token = randtoken.generate(16);               // Generating 16 character alpha numeric token.
    const expiresInHrs = 1;                             // Specifying expiry time in hrs
    let expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHrs);

    const reqTokenRecord = await Requesttoken.create({ 
      requestKey: token, 
      userId,
      expiresAt,
      resourceType: 'user', 
      actionType: 'reset-password'
    });
    const reqToken = reqTokenRecord && reqTokenRecord.toJSON();

    let resetLink = `http://localhost:3000/reset-password?token=${token}`;

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
  try {
    const { requestKey } = request.params || {};
    const { password1, password2 } = request.payload || {};
    
    if (requestKey.length !== 16) { throw new Error('Invalid URL!'); }  // Token length is 16.
    if (password1 !== password2) { throw new Error('Passwords are not matching!'); }
    
    const { User, Requesttoken } = request.getModels('xpaxr');
    
    const requestTokenRecord = await Requesttoken.findOne({ where: { requestKey }});
    const requestToken = requestTokenRecord && requestTokenRecord.toJSON();
    if (!requestToken) { throw new Error('Bad Request!'); }

    const { expiresAt } = requestToken || {};
    var now = new Date();
    var utcNow = new Date(now.getTime() + now.getTimezoneOffset() * 60000);
    if (expiresAt - utcNow < 0) { throw new Error('Bad Request! URL expired'); }   // Token expired!
    const { userId } = requestToken || {};

    const userRecord = await User.findOne({ where: { userId }});
    const user = userRecord && userRecord.toJSON();
    if (!user) { throw new Error('Invalid URL!')};
    const hashedPassword = bcrypt.hashSync(password1, 12);        // Setting salt to 12.
    await User.update({ password: hashedPassword }, { where: { userId }});

    return h.response({message: 'Password updation successful'}).code(200);
  }
  catch (error) {
    // console.log(error);
    return h.response({error: true, message: error.message});
  }
}

const getQuestionnaire = async (request, h) => {
  try{
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden' }).code(403);
    }
    const db1 = request.getDb('xpaxr');
    const sqlStmt = `select * from hris.questionnaire q
                    inner join hris.questiontype qt on q.question_type_id = qt.question_type_id`;
    const sequelize = db1.sequelize;
    const responses = await sequelize.query(sqlStmt, { type: QueryTypes.SELECT });
    const questions = [];
    for (const response of responses) {
      const { question_id, question_name, question_config, question_type_name } = response || {};
      const question = {question_id, question_name, question_config, 'QuestionType': { question_type_name } };
      questions.push(question);
    }
    return h.response(questions).code(200);
  }
  catch (error) {
    // console.log(error);
    return h.response({error: true, message: error.message});
  }
}

const createProfile = async (request, h) => {
  try{
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden' }).code(403);
    }
    const { responses } = request.payload || {};
    const { credentials } = request.auth || {};
    const { id: userId } = credentials || {};
    if (!responses || responses.length == 0) { throw new Error('Please provide responses'); }

    const { Userinfo, Userquesresponse } = request.getModels('xpaxr');
    // Checking user type
    const db1 = request.getDb('xpaxr');
    const sqlStmt = `select * from hris.userinfo ui
                    inner join hris.usertype ut on ui.user_type_id = ut.user_type_id 
                    where ui.user_id= :userId`;
    const sequelize = db1.sequelize;
    const ares = await sequelize.query(sqlStmt, { type: QueryTypes.SELECT, replacements: { userId: userId } });
    const user = formatQueryRes(ares);
    const { userTypeName } = user || {};

    if (userTypeName === 'candidate') {
      for (const response of responses) {
        const { responseVal } = response || {};
        response['responseVal'] = {'answer': responseVal};
        response['userId'] = userId; 
      }
      const resRecord = await Userquesresponse.bulkCreate(responses,{updateOnDuplicate:["responseVal"]});
    } else if ( userTypeName === 'employer') {
      // For Employer profile creation
    } else if ( userTypeName === 'mentor') {
      // For Mentory profile creation
    } else {
      throw new Error('Request from invalid response');
    }

    return h.response(resRecord).code(200);
  }
  catch (error) {
    return h.response({error: true, message: error.message}).code(403);
  }
}

const applyToAJob = async (request, h) => {
  try {
    // Need to check whether we allow to modify once applied to a job.
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden'}).code(403);
    }
    const { responses } = request.payload || {};
    const { credentials } = request.auth || {};
    const { id: userId } = credentials || {};
    if (!responses || responses.length == 0) { throw new Error('No responses received!'); }
    
    let _jobId;
    for (const response of responses) {
      const { responseVal, jobId } = response || {};
      response['responseVal'] = {'answer': responseVal};
      response['jobId'] = jobId;
      _jobId = jobId;
    }

    const { Jobsquesresponse, Jobapplications } = request.getModels('xpaxr');
    // Check if they've already applied for the job.
    const applicationRecord = await Jobapplications.findOne({ where: { userId, jobId: _jobId}});
    const application = applicationRecord && applicationRecord.toJSON();
    if (application) { throw new Error("You've already applied for this job!"); }

    const resRecord = await Jobsquesresponse.bulkCreate(responses, {updateOnDuplicate: ['responseVal']});
    const applicationRes = await Jobapplications.upsert({
      jobId: _jobId,
      userId,
      isApplied: true,
      isWithdrawn: false,
      status: null
    });
    return h.response({resRecord, applicationRes}).code(200);
  }
  catch (error) {
    // console.log(error);
    return h.response({error: true, message: error.message});
  }
}

const getAppliedJobs = async (request, h) => {
  // Check the requirement
    // All applied jobs? withdrawn jobs? status wise?
  try{
    const { credentials } = request.auth || {};
    const { id: userId } = credentials || {};
    
    const { Jobapplications } = request.getModels('xpaxr');
    const applicationRecords = await Jobapplications.findAll( {where: { userId, isWithdrawn: false }});
    return h.response({ appliedJobs: applicationRecords }).code(200);
  }
  catch (error) {
    // console.log(error);
    return h.response({error: true, message: error.message}).code(403);
  }
}

module.exports = {
  createUser,
  getUser,
  updateUser,
  forgotPassword,
  resetPassword,
  createProfile,
  getQuestionnaire,
  applyToAJob,
  getAppliedJobs,
};

