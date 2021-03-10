const { Op, Sequelize, QueryTypes, cast, literal } = require('sequelize');
const bcrypt = require('bcrypt');
const validator = require('validator');
const { sendEmailAsync } = require('../utils/email');
const randtoken = require('rand-token');
import { formatQueryRes } from '../utils/index';
import { getDomainURL } from '../utils/toolbox';
import {camelizeKeys} from '../utils/camelizeKeys';
const createUser = async (request, h) => {
  try {
    if (request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden' }).code(403);
    }
    const { User, Userinfo, Usertype, Userrole } = request.getModels('xpaxr');
    const { email, password, accountType, } = request.payload || {};

    if ( !(email && password && accountType)) {
      return h.response({ error: true, message: 'Please provide necessary details'}).code(400);
    }

    // Validating Email & Password
    if (!validator.isEmail(email)) {
      return h.response({ error: true, message: 'Please provide a valid Email'}).code(400);
    }
    if (password.length < 8) {
      return h.response({ error: true, message: 'Password must contain atleast 8 characters'}).code(400);
    } else if (password.length > 100) {
      return h.response({ error: true, message: 'Password should be atmost 100 characters'}).code(400);
    }
    // Checking account type
    const validAccountTypes = ['candidate', 'mentor', 'superadmin', 'specialist'];
    if (!validAccountTypes.includes(accountType)) {
      return h.response({ error: true, message: 'Invalid account type'}).code(400);
    }
    
    // Checking if User already Exists
    const userRecord = await User.findOne({ where: { email }});
    const record = userRecord && userRecord.toJSON();
    if (record) { return h.response({ error: true, message: 'Account with this email already exists!'}).code(400); }
    
    const hashedPassword = bcrypt.hashSync(password, 12);   // Hash the password
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
    delete udata.dataValues.password;//remove hasedpassword when returning
    return h.response(udata).code(201);
  } catch (error) {
    console.error(error.stack);
    return h.response({
      error: true, message: 'Bad Request!'
    }).code(400);
  }
};

const createCompanySuperAdmin = async (request, h) => {
  try {
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden' }).code(403);
    }
    // Checking user type from jwt
    let luserTypeName = request.auth.artifacts.decoded.userTypeName;   
    if(luserTypeName !== 'superadmin'){
        return h.response({error:true, message:'You are not authorized!'}).code(403);
    }

    const { User, Userinfo, Usertype, Userrole, Company, Companyinfo } = request.getModels('xpaxr');
    const { email, password, companyName, } = request.payload || {};
    const accountType = 'companysuperadmin';

    if ( !(email && password && companyName)) {
      return h.response({ error: true, message: 'Please provide necessary details'}).code(400);
    }

    // Validating Email & Password
    if (!validator.isEmail(email)) {
      return h.response({ error: true, message: 'Please provide a valid Email'}).code(400);
    }
    if (password.length < 8) {
      return h.response({ error: true, message: 'Password must contain atleast 8 characters'}).code(400);
    } else if (password.length > 100) {
      return h.response({ error: true, message: 'Password should be atmost 100 characters'}).code(400);
    }        
    // Checking if User already Exists
    const userRecord = await User.findOne({ where: { email }});
    const record = userRecord && userRecord.toJSON();
    if (record) { return h.response({ error: true, message: 'Account with this email already exists!'}).code(400); }
    
    // creating company
    const cdata = await Company.create({ companyName, displayName: companyName, active: true });
    const companyRes = cdata && cdata.toJSON();
    const { companyId, companyUuid } = companyRes || {};

    const cidata = await Companyinfo.create({ companyId });

    // creating company superadmin user
    const hashedPassword = bcrypt.hashSync(password, 12);   // Hash the password
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
      companyId,
      companyUuid,
    });
    delete udata.dataValues.password; //remove hasedpassword when returning
    return h.response(udata).code(201);
  } catch (error) {
    console.error(error.stack);
    return h.response({
      error: true, message: 'Bad Request!'
    }).code(400);
  }
};

const createCompanyRecruiter = async (request, h) => {
  try {
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden' }).code(403);
    }
    // Checking user type from jwt
    let luserTypeName = request.auth.artifacts.decoded.userTypeName;   
    if(luserTypeName !== 'companysuperadmin'){
        return h.response({error:true, message:'You are not authorized!'}).code(403);
    }

    const { User, Userinfo, Usertype, Userrole, Company, Companyinfo } = request.getModels('xpaxr');
    const { email, password, companyName, } = request.payload || {};
    const accountType = 'employer';

    if ( !(email && password)) {
      return h.response({ error: true, message: 'Please provide necessary details'}).code(400);
    }

    // Validating Email & Password
    if (!validator.isEmail(email)) {
      return h.response({ error: true, message: 'Please provide a valid Email'}).code(400);
    }
    if (password.length < 8) {
      return h.response({ error: true, message: 'Password must contain atleast 8 characters'}).code(400);
    } else if (password.length > 100) {
      return h.response({ error: true, message: 'Password should be atmost 100 characters'}).code(400);
    }        
    // Checking if User already Exists
    const alreadyExistingUserRecord = await User.findOne({ where: { email }});
    const record = alreadyExistingUserRecord && alreadyExistingUserRecord.toJSON();
    if (record) { return h.response({ error: true, message: 'Account with this email already exists!'}).code(400); }
    
    const { credentials } = request.auth || {};
    const { id: csaUserId } = credentials || {};
    
    // get the company of the companysuperadmin
    const userRecord = await Userinfo.findOne({ where: { userId: csaUserId }, attributes: { exclude: ['createdAt', 'updatedAt'] }});
    const userProfileInfo = userRecord && userRecord.toJSON();
    const { companyId, companyUuid } = userProfileInfo || {};                

    // creating company recruiter
    const hashedPassword = bcrypt.hashSync(password, 12);   // Hash the password
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
      companyId,
      companyUuid,
    });
    delete udata.dataValues.password; //remove hasedpassword when returning
    return h.response(udata).code(201);
  } catch (error) {
    console.error(error.stack);
    return h.response({
      error: true, message: 'Bad Request!'
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

    const userRecord = await Userinfo.findOne({ 
      where: { userId },      
      include: [
        {
          model: Usertype,
          as: "userType",
          required: true,
        },
        {
          model: Userrole,
          as: "role",
          required: true,
        },
      ],
      attributes: { exclude: ['createdAt', 'updatedAt'] },
    });
    const luser = userRecord && userRecord.toJSON();
    const { userTypeName } = luser.userType;
    const { roleName } = luser.role;
    luser.userTypeName = userTypeName;
    luser.roleName = roleName;

    delete luser.userType;
    delete luser.role;
    
    return h.response(luser).code(200);
  }
  catch(error) {
    console.error(error.stack);
    return h.response({ error: true, message: 'Bad Request!' }).code(500);
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
      'roleId'
    ];
    const requestedUpdateOperations = Object.keys(request.payload) || [];
    const isAllReqsValid = requestedUpdateOperations.every( req => validUpdateRequests.includes(req));
    if (!isAllReqsValid) {
      return h.response({ error: true, message: 'Invalid update request(s)'}).code(400);
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
      return h.response({ error: true, message: 'Bad Request!'}).code(400);
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
    console.log(error.stack);
    return h.response({ error: true, message: 'Internal Server Error' }).code(500);
  }
}

const sendVerificationEmail = async (request, h) => {
  try{
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden' }).code(403);
    }
    const { User, Emailtemplate, Userinfo, Companyinfo, Emaillog, Requesttoken } = request.getModels('xpaxr');
    
    const { credentials } = request.auth || {};
    const userId = credentials.id;
    const userRecord = await User.findOne({ where: { userId }, attributes: { exclude: ['createdAt', 'updatedAt'] }});
    const { email } = userRecord && userRecord.toJSON();
   
    if (!validator.isEmail(email)) { 
      return h.response({ error: true, message: 'Invalid Email!'}).code(400);
    }    

    const token = randtoken.generate(16);               // Generating 16 character alpha numeric token.
    const expiresInHrs = 1;                             // Specifying expiry time in hrs
    let expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHrs);

    const reqTokenRecord = await Requesttoken.create({ 
      requestKey: token, 
      userId,
      expiresAt,
      resourceType: 'user', 
      actionType: 'email-verification' 
    });
    const reqToken = reqTokenRecord && reqTokenRecord.toJSON();

    let resetLink = getDomainURL();
    resetLink += `/u/verify-email?token=${token}`;

    const emailData = {
      emails: [email],
      email: email,
      ccEmails: [],
      templateName: 'email-verification',
      resetLink,      
      isX0PATemplate: true,
    };

    const additionalEData = {
      userId,
      Emailtemplate,
      Userinfo,
      Companyinfo,
      Emaillog,
    };
    sendEmailAsync(emailData, additionalEData);
    return h.response(reqToken).code(200);
  }
  catch(error) {
    console.error(error.stack);
    return h.response({ error: true, message: 'Internal Server Error!' }).code(500);
  }
}

const verifyEmail = async (request, h) => {
  try {
    const { requestKey } = request.params || {};
    const { isEmailVerified } = request.payload || {};
    
    if (requestKey.length !== 16) {     // Token length is 16.
      return h.response({ error: true, message: 'Invalid URL!'}).code(400);
    }  
    if (!isEmailVerified) {     
      return h.response({ error: true, message: 'Not a valid request!'}).code(400);
    }  
        
    const { User, Userinfo, Requesttoken } = request.getModels('xpaxr');
    
    const requestTokenRecord = await Requesttoken.findOne({ where: { requestKey }});
    const requestToken = requestTokenRecord && requestTokenRecord.toJSON();
    if (!requestToken) { 
      return h.response({ error: true, message: `Bad Request! URL might've expired!!` }).code(400);
    }

    const { expiresAt } = requestToken || {};
    var now = new Date();
    var utcNow = new Date(now.getTime() + now.getTimezoneOffset() * 60000);       // Checking for token expiration of 1hr
    if (expiresAt - utcNow < 0) {         // Token expired!
      return h.response({ error: true, message: `Bad Request! URL might've expired!!` }).code(400);
    }
    const { userId } = requestToken || {};

    const userRecord = await User.findOne({ where: { userId }});
    const user = userRecord && userRecord.toJSON();
    if (!user) { 
      return h.response({ error: true, message: 'Invalid URL!'}).code(400);
    };
    
    const luserInfo = await Userinfo.findOne( { where: { userId }});
    if (luserInfo.isEmailVerified) { 
      return h.response({ error: true, message: 'Bad request! Email is already verified!'}).code(400);
    };

    await Userinfo.update({ isEmailVerified: isEmailVerified }, { where: { userId }});
    return h.response({message: 'Email Verification successful'}).code(200);
  }
  catch (error) {
    console.error(error.stack);
    return h.response({error: true, message: 'Internal Server Error!'}).code(500);
  }
}

const forgotPassword = async (request, h) => {
  try{
    const { email } = request.payload || {};
    if (!validator.isEmail(email)) { 
      return h.response({ error: true, message: 'Invalid Email!'}).code(400);
    }

    const { User, Emailtemplate, Userinfo, Companyinfo, Emaillog, Requesttoken } = request.getModels('xpaxr');
    const userRecord = await User.findOne({ where: { email }});
    const user = userRecord && userRecord.toJSON();
    if (!user) { 
      return h.response({ error: true, message: 'No account found!'}).code(400);
    }
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

    let resetLink = getDomainURL();
    resetLink += `/reset-password?token=${token}`;

    const emailData = {
      emails: [email],
      email,
      ccEmails: [],
      templateName: 'reset-password',
      resetLink,
      isX0PATemplate: true,
    };

    const additionalEData = {
      userId,
      Emailtemplate,
      Userinfo,
      Companyinfo,
      Emaillog,
    };
    sendEmailAsync(emailData, additionalEData);
    return h.response(reqToken).code(200);
  }
  catch(error) {
    console.error(error.stack);
    return h.response({ error: true, message: 'Internal Server Error!' }).code(500);
  }
}

const resetPassword = async (request, h) => {
  try {
    const { requestKey } = request.params || {};
    const { password1, password2 } = request.payload || {};
    
    if (requestKey.length !== 16) {     // Token length is 16.
      return h.response({ error: true, message: 'Invalid URL!'}).code(400);
    }  
    if (password1 !== password2) { 
      return h.response({ error: true, message: 'Passwords are not matching!'}).code(400);
    }
    
    const { User, Requesttoken } = request.getModels('xpaxr');
    
    const requestTokenRecord = await Requesttoken.findOne({ where: { requestKey }});
    const requestToken = requestTokenRecord && requestTokenRecord.toJSON();
    if (!requestToken) { 
      return h.response({ error: true, message: `Bad Request! URL might've expired!!` }).code(400);
    }

    const { expiresAt } = requestToken || {};
    var now = new Date();
    var utcNow = new Date(now.getTime() + now.getTimezoneOffset() * 60000);       // Checking for token expiration of 1hr
    if (expiresAt - utcNow < 0) {         // Token expired!
      return h.response({ error: true, message: `Bad Request! URL might've expired!!` }).code(400);
    }
    const { userId } = requestToken || {};

    const userRecord = await User.findOne({ where: { userId }});
    const user = userRecord && userRecord.toJSON();
    if (!user) { 
      return h.response({ error: true, message: 'Invalid URL!'}).code(400);
    };
    const hashedPassword = bcrypt.hashSync(password1, 12);        // Setting salt to 12.
    await User.update({ password: hashedPassword }, { where: { userId }});

    return h.response({message: 'Password updation successful'}).code(200);
  }
  catch (error) {
    console.error(error.stack);
    return h.response({error: true, message: 'Internal Server Error!'}).code(500);
  }
}

const getQuestionnaire = async (request, h, targetName) => {
  try{
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden' }).code(403);
    }
    const { Questionnaire,Questiontarget,Questiontype,Questioncategory } = request.getModels('xpaxr');
    let questions = await Questionnaire.findAll({
      raw:true,
      include:[{
        model:Questiontype,
        as:"questionType",
        attributes:[],
        required:true
      },{
        model: Questiontarget,
        as:"questionTarget",
        where:{targetName},
        attributes:[]
      },
      {
        model:Questioncategory,
        as:"questionCategory",
        attributes:[],
        required:true
      }
    ],
    where:{
      isActive:true
    },
    attributes:["questionId","questionUuid","questionName","questionConfig","questionType.question_type_name","questionCategory.question_category_name"]});;
    return h.response(camelizeKeys({ questions })).code(200);
  }
  catch (error) {
    console.error(error.stack);
    return h.response({error: true, message: 'Internal Server Error!'}).code(500);
  }
}

const getProfile = async (request, h) => {
  try {
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden' }).code(403);
    }
    const { credentials } = request.auth || {};
    const { id: userId } = credentials || {};
    const { Userquesresponse } = request.getModels('xpaxr');
    const quesResponses = await Userquesresponse.findAll({ where: { userId }});
    const responses = [];
    for (let response of quesResponses) {
      response = response && response.toJSON();
      const { questionId, responseVal } = response;
      const res = { questionId, answer:responseVal.answer };
      responses.push(res);
    }
    return h.response({ responses }).code(200);
  }
  catch (error) {
    console.error(error.stack);
    return h.response({error: true, message: 'Internal Server Error!'}).code(500);
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
    const { Userquesresponse } = request.getModels('xpaxr');
    // Checking user type from jwt
    const db1 = request.getDb('xpaxr');
    let data = []
    let createProfileResponse;
    let userTypeName = request.auth.artifacts.decoded.userTypeName;
    if (userTypeName === "candidate") {
      for (const response of responses) {
        const { questionId, answer, timeTaken } = response || {};
        const record = { questionId, responseVal:{answer}, userId, timeTaken }
        data.push(record);
      }
      await Userquesresponse.bulkCreate(data, {updateOnDuplicate:["responseVal", "timeTaken"]});
      const quesResponses = await Userquesresponse.findAll({ where: { userId }});      
      const resRecord = [];
      for (let response of quesResponses) {
        response = response && response.toJSON();
        const { questionId, responseVal } = response;
        const res = { questionId, answer:responseVal.answer };
        resRecord.push(res);
      }
      createProfileResponse = { responses: resRecord };

    } else if ( userTypeName === 'employer') {
      // For Employer profile creation
    } else if ( userTypeName  === 'mentor') {
      // For Mentor profile creation
    } else {
      return h.response({ error: true, message: 'Invalid Request!'}).code(400);
    }    
    return h.response(createProfileResponse).code(201);
  }
  catch (error) {
    console.error(error.stack);
    return h.response({error: true, message: 'Internal Server Error!'}).code(500);
  }
}

const getUserMetaData = async (request, h) => {
  try{
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden' }).code(403);
    }
    const { credentials } = request.auth || {};
    const userId = credentials.id;

    const { metaKey } = request.query;
    if(!metaKey){
      return h.response({ error: true, message: 'Bad Request! No metaKey given!' }).code(400);
    }
        
    const { Usermeta } = request.getModels('xpaxr');    
    const userMetaRecord = await Usermeta.findOne({ where: { userId, metaKey }, attributes: { exclude: ['createdAt', 'updatedAt'] }});
    const userMetaData = userMetaRecord && userMetaRecord.toJSON();
    
    const responses = userMetaData || {};
    return h.response(responses).code(200);
  }
  catch(error) {
    console.error(error.stack);
    return h.response({ error: true, message: 'Bad Request!' }).code(500);
  }
}
const updateMetaData = async (request, h) => {
  try{
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden' }).code(403);
    }
    const { credentials } = request.auth || {};
    const userId = credentials.id;
    const { metaKey, metaValue } = request.payload || {};

    if (!(metaKey && metaValue)) {     
      return h.response({ error: true, message: 'Not a valid request!'}).code(400);
    }  

    const { Usermeta } = request.getModels('xpaxr');        

    const userMetaRecord = await Usermeta.findOne({ where: { userId, metaKey }, attributes: { exclude: ['createdAt', 'updatedAt'] }});
    const userMetaData = userMetaRecord && userMetaRecord.toJSON();
    const { umetaId } = userMetaData || {};

    if(!umetaId){      
      await Usermeta.create({ userId, metaKey, metaValue });
    } else {
      await Usermeta.update({ metaKey, metaValue }, { where: { userId: userId, umetaId }} );
    }

    const updatedMetaData = await Usermeta.findOne({
        where:{ userId: userId, metaKey },
        attributes: { exclude: ['createdAt', 'updatedAt']
      }
    });

    return h.response(updatedMetaData).code(200);
  }
  catch(error) {
    console.error(error.stack);
    return h.response({ error: true, message: 'Bad Request!' }).code(500);
  }
}

module.exports = {
  createUser,
  createCompanySuperAdmin,
  createCompanyRecruiter,
  getUser,
  updateUser,
  sendVerificationEmail,
  verifyEmail,
  forgotPassword,
  resetPassword,
  getProfile,
  getUserMetaData,
  updateMetaData,
  createProfile,
  getQuestionnaire,
};

