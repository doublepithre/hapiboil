const { Op, Sequelize, QueryTypes, cast, literal } = require('sequelize');
const bcrypt = require('bcrypt');
const validator = require('validator');
const axios = require('axios');
const config = require('config');
const { sendEmailAsync } = require('../../utils/email');
const randtoken = require('rand-token');
import { isArray } from 'lodash';
import { formatQueryRes } from '../../utils/index';
import { getDomainURL } from '../../utils/toolbox';
import { camelizeKeys } from '../../utils/camelizeKeys';
import { update } from 'lodash';
import { getDemographicQuestionnaire, demoQuestionId2Column, updateDemographicAnswers, demoRow2Answers } from './demographic';
const uploadFile = require('../../utils/uploadFile');

const createUser = async (request, h) => {
  try {
    if (request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden' }).code(401);
    }
    const { User, Userinfo, Usertype, Userrole, Profileauditlog, Emailtemplate, Companyinfo, Emaillog, Requesttoken } = request.getModels('xpaxr');
    const { email, password, accountType, tandc, privacyClause } = request.payload || {};

    if (!(email && password && accountType && privacyClause && tandc)) {
      return h.response({ error: true, message: 'Please provide necessary details' }).code(400);
    }

    // Validating Email & Password
    if (!validator.isEmail(email)) {
      return h.response({ error: true, message: 'Please provide a valid Email' }).code(400);
    }
    if (password.length < 8) {
      return h.response({ error: true, message: 'Password must contain atleast 8 characters' }).code(400);
    } else if (password.length > 100) {
      return h.response({ error: true, message: 'Password should be atmost 100 characters' }).code(400);
    }
    // Checking account type
    const validAccountTypes = ['candidate'];
    if (!validAccountTypes.includes(accountType)) {
      return h.response({ error: true, message: 'Invalid account type' }).code(400);
    }

    // Checking if User already Exists
    const userRecord = await User.findOne({ where: { email } });
    const record = userRecord && userRecord.toJSON();
    if (record) { return h.response({ error: true, message: 'Account with this email already exists!' }).code(400); }

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
      active: false,
      firstName: email.split('@')[0],
      companyUuid: null,
      privacyClause,
      tandc
    });
    delete udata.dataValues.password;//remove hasedpassword when returning

    await Profileauditlog.create({
      affectedUserId: userId,
      performerUserId: userId,
      actionName: 'Create a User',
      actionType: 'CREATE',
      actionDescription: `The user of userId ${userId} has created himself`
    });

    // SENDING THE VERIFICATION EMAIL (confirmation email)
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
    resetLink += `/verify-email?token=${token}`;

    const emailData = {
      emails: [udata.email],
      email: udata.email,
      ccEmails: [],
      templateName: 'account-creation-verify-email',
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
    // ----------------end of verification email sending

    return h.response(udata).code(200);
  } catch (error) {
    console.error(error.stack);
    return h.response({
      error: true, message: 'Bad Request!'
    }).code(400);
  }
};

const getUser = async (request, h) => {
  try {
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden', code: "xemp-1" }).code(401);
    }
    const { credentials } = request.auth || {};
    const userId = credentials.id;
    // Checking user type from jwt
    let luserTypeName = request.auth.artifacts.decoded.userTypeName;

    const { Usermeta } = request.getModels('xpaxr');

    // get user record info
    const db1 = request.getDb('xpaxr');
    const sqlStmt = `select 
      c.is_company_onboarding_complete,
      c.leadership_message,
      ur.role_name, ut.user_type_name, ui.*
    from hris.userinfo ui
      inner join hris.userrole ur on ur.role_id=ui.role_id
      inner join hris.usertype ut on ut.user_type_id=ui.user_type_id
      left join hris.company c on c.company_id=ui.company_id
    where ui.user_id=:userId`;

    const sequelize = db1.sequelize;
    const userRecordSQL = await sequelize.query(sqlStmt, {
      type: QueryTypes.SELECT,
      replacements: { userId }
    });
    const userRecord = camelizeKeys(userRecordSQL)[0];

    if (luserTypeName === 'supervisor' || luserTypeName === 'workbuddy') {
      const userMetaRecord = await Usermeta.findOne({ where: { userId, metaKey: 'is_onboarding_complete' }, attributes: { exclude: ['createdAt', 'updatedAt'] } });
      const userMetaData = userMetaRecord && userMetaRecord.toJSON();
      const { umetaId, metaValue } = userMetaData || {};

      userRecord.isOnboardingComplete = umetaId ? metaValue : "no";
    }
    if (luserTypeName !== 'supervisor' && luserTypeName !== 'workbuddy') {
      delete userRecord.leadershipMessage;
    }
    if (luserTypeName !== 'companysuperadmin') {
      delete userRecord.isCompanyOnboardingComplete;
    }

    return h.response(userRecord).code(200);
  }
  catch (error) {
    console.error(error.stack);
    return h.response({ error: true, message: 'Bad Request!' }).code(500);
  }
}

const getUserFirstName = async (request, h) => {
  try {
    if (request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden' }).code(401);
    }
    const { userUuid } = request.params || {};

    // get user record info
    const db1 = request.getDb('xpaxr');
    const sqlStmt = `select ui.first_name
    from hris.userinfo ui
    where ui.user_uuid=:userUuid`;

    const sequelize = db1.sequelize;
    const userRecordSQL = await sequelize.query(sqlStmt, {
      type: QueryTypes.SELECT,
      replacements: { userUuid }
    });
    const userRecord = camelizeKeys(userRecordSQL)[0];

    return h.response(userRecord).code(200);
  }
  catch (error) {
    console.error(error.stack);
    return h.response({ error: true, message: 'Bad Request!' }).code(500);
  }
}

const updateUser = async (request, h) => {
  try {
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden', code: "xemp-1" }).code(401);
    }
    const updateDetails = request.payload;
    const validUpdateRequests = [
      // 'active',
      'firstName',
      'lastName', 'isAdmin',
      'tzid', 'primaryMobile',
      'roleId', 'privacyClause',
      'tandc', 'picture',
      'inTalentPool', 'allowSendEmail',
    ];
    const requestedUpdateOperations = Object.keys(updateDetails) || [];
    const isAllReqsValid = requestedUpdateOperations.every(req => validUpdateRequests.includes(req));
    if (!isAllReqsValid) {
      return h.response({ error: true, message: 'Invalid update request(s)' }).code(400);
    }

    const { Userinfo, Profileauditlog } = request.getModels('xpaxr');

    const { credentials } = request.auth || {};
    const userId = credentials.id;
    const userRecord = await Userinfo.findOne({ where: { userId } });
    const luser = userRecord && userRecord.toJSON();
    const { userId: luserId } = luser || {};

    const { userUuid } = request.params || {};
    const requestedForUser = await Userinfo.findOne({ where: { userUuid } }) || {};
    const { userId: rForUserId } = requestedForUser && requestedForUser.toJSON();

    if (luserId !== rForUserId) {    // when request is (not from self)
      return h.response({ error: true, message: 'Bad Request! You are not authorized!' }).code(403);
    }

    // upload picture to azure and use that generated link to save on db
    if (updateDetails.picture) {
      const fileItem = updateDetails.picture;
      if (isArray(fileItem)) return h.response({ error: true, message: 'Send only one picture for upload!' }).code(400);
      const uploadRes = await uploadFile(fileItem, luserId, ['png', 'jpg', 'jpeg']);
      if (uploadRes.error) return h.response(uploadRes).code(400);

      updateDetails.picture = uploadRes.vurl;
    }

    await Userinfo.update(updateDetails, { where: { userUuid: userUuid } });
    const updatedUinfo = await Userinfo.findOne({
      where: { userUuid: userUuid },
      attributes: {
        exclude: ['createdAt', 'updatedAt']
      }
    });
    const uinfo = updatedUinfo && updatedUinfo.toJSON();

    await Profileauditlog.create({
      affectedUserId: rForUserId,
      performerUserId: luserId,
      actionName: 'Update a User',
      actionType: 'UPDATE',
      actionDescription: `The user of userId ${luserId} has updated his own info`
    });

    return h.response(uinfo).code(200);
  }
  catch (error) {
    console.log(error.stack);
    return h.response({ error: true, message: 'Internal Server Error' }).code(500);
  }
}

const updatePassword = async (request, h) => {
  try {
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden', code: "xemp-1" }).code(401);
    }
    const { credentials } = request.auth || {};
    const userId = credentials.id;
    const { oldPassword, password } = request.payload || {};
    const { User, Profileauditlog } = request.getModels('xpaxr');

    const userRecord = await User.findOne({ where: { userId } });
    const luser = userRecord && userRecord.toJSON();
    const { userId: luserId, userUuid, password: oldDBPassword } = luser || {};
    if (!luserId) h.response({ error: true, message: 'No user found!' }).code(400);

    if (password.length < 8) {
      return h.response({ error: true, message: 'Password must contain atleast 8 characters' }).code(400);
    } else if (password.length > 100) {
      return h.response({ error: true, message: 'Password should be atmost 100 characters' }).code(400);
    }

    const isPasswordMatching = bcrypt.compareSync(oldPassword, oldDBPassword);
    if (!isPasswordMatching) return h.response({ error: true, message: 'Old password did not match!' }).code(400);

    const hashedPassword = bcrypt.hashSync(password, 12);   // Hash the password
    await User.update({ password: hashedPassword }, { where: { userId } });
    const updatedUser = await User.findOne({
      where: { userUuid: userUuid },
      attributes: {
        exclude: ['createdAt', 'updatedAt']
      }
    });

    await Profileauditlog.create({
      affectedUserId: luserId,
      performerUserId: luserId,
      actionName: 'Update Password',
      actionType: 'UPDATE',
      actionDescription: `The user of userId ${luserId} has updated his own password`
    });

    return h.response({ message: 'Password updation successful' }).code(200);
  }
  catch (error) {
    console.log(error.stack);
    return h.response({ error: true, message: 'Internal Server Error' }).code(500);
  }
}

const forgotPassword = async (request, h) => {
  try {
    const { email: rawEmail } = request.payload || {};
    if (!rawEmail) return h.response({ error: true, message: 'Please provide an email!' }).code(400);

    const email = rawEmail.toLowerCase();
    if (!validator.isEmail(email)) {
      return h.response({ error: true, message: 'Invalid Email!' }).code(400);
    }

    const { User, Emailtemplate, Userinfo, Companyinfo, Emaillog, Requesttoken } = request.getModels('xpaxr');
    const userRecord = await User.findOne({ where: { email } });
    const user = userRecord && userRecord.toJSON();
    if (!user) {
      return h.response({ error: true, message: 'No account found!' }).code(400);
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
    return h.response({ message: `We've emailed you instructions for resetting your password, if an account exists with the email you entered. You should receive them shortly. If you don't receive an email, please make sure you've entered the address you registered with, and check your spam folder.` }).code(200);
  }
  catch (error) {
    console.error(error.stack);
    return h.response({ error: true, message: 'Internal Server Error!' }).code(500);
  }
}

const resetPassword = async (request, h) => {
  try {
    const { requestKey } = request.params || {};
    const { password1, password2 } = request.payload || {};

    if (requestKey.length !== 16) {     // Token length is 16.
      return h.response({ error: true, message: 'Invalid URL!' }).code(400);
    }
    if (password1 !== password2) {
      return h.response({ error: true, message: 'Passwords are not matching!' }).code(400);
    }

    const { User, Userinfo, Profileauditlog, Requesttoken } = request.getModels('xpaxr');

    const requestTokenRecord = await Requesttoken.findOne({ where: { requestKey } });
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
    const { userId, actionType } = requestToken || {};

    const userRecord = await User.findOne({ where: { userId } });
    const user = userRecord && userRecord.toJSON();
    if (!user) {
      return h.response({ error: true, message: 'Invalid URL!' }).code(400);
    };
    const hashedPassword = bcrypt.hashSync(password1, 12);        // Setting salt to 12.
    await User.update({ password: hashedPassword }, { where: { userId } });

    if (actionType === 'account-creation-reset-password') {
      await Userinfo.update({ active: true }, { where: { userId } });
    }

    await Profileauditlog.create({
      affectedUserId: userId,
      performerUserId: userId,
      actionName: 'Reset Password',
      actionType: 'UPDATE',
      actionDescription: `The user of userId ${userId} has reset his password`
    });

    return h.response({ message: 'Password updation successful' }).code(200);
  }
  catch (error) {
    console.error(error.stack);
    return h.response({ error: true, message: 'Internal Server Error!' }).code(500);
  }
}

const verifyEmail = async (request, h) => {
  try {
    const { requestKey } = request.params || {};
    const { active } = request.payload || {};

    if (requestKey.length !== 16) {     // Token length is 16.
      return h.response({ error: true, message: 'Invalid URL!' }).code(400);
    }
    if (active !== true) {
      return h.response({ error: true, message: 'Not a valid request!' }).code(400);
    }

    const { User, Userinfo, Profileauditlog, Requesttoken } = request.getModels('xpaxr');

    const requestTokenRecord = await Requesttoken.findOne({ where: { requestKey } });
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

    const userRecord = await User.findOne({ where: { userId } });
    const user = userRecord && userRecord.toJSON();
    if (!user) {
      return h.response({ error: true, message: 'Invalid URL!' }).code(400);
    };

    const luserInfo = await Userinfo.findOne({ where: { userId } });
    if (luserInfo.active) {
      return h.response({ error: true, message: 'Bad request! Email is already verified!' }).code(400);
    };

    await Userinfo.update({ active }, { where: { userId } });
    await Profileauditlog.create({
      affectedUserId: userId,
      performerUserId: userId,
      actionName: 'Verify Email',
      actionType: 'UPDATE',
      actionDescription: `The user of userId ${userId} has verified his email`
    });

    return h.response({ message: 'Email Verification successful' }).code(200);
  }
  catch (error) {
    console.error(error.stack);
    return h.response({ error: true, message: 'Internal Server Error!' }).code(500);
  }
}

const createProfile = async (request, h) => {
  try {
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden', code: "xemp-1" }).code(401);
    }
    // Checking user type from jwt
    let userTypeName = request.auth.artifacts.decoded.userTypeName;
    if (userTypeName !== 'candidate' && userTypeName !== 'companysuperadmin' && userTypeName !== 'supervisor' && userTypeName !== 'workbuddy') return h.response({ error: true, message: 'You are not authorized!' }).code(403);

    const { credentials } = request.auth || {};
    const { id: userId } = credentials || {};

    const { responses } = request.payload || {};

    const { Userinfo, Userquesresponse, Mentorquesresponse, Companyquesresponse, Userdemographic } = request.getModels('xpaxr');
    const db1 = request.getDb('xpaxr');
    const sequelize = db1.sequelize;

    let data = []
    let createProfileResponse;
    let isComplete = [];
    let demographicData = [];

    if (userTypeName === "candidate") {
      // create profile for a candidate
      for (const response of responses) {
        const { questionId, answer, timeTaken } = response || {};
        const record = { questionId, responseVal: { answer }, userId, timeTaken }
        if (Number(questionId) in demoQuestionId2Column) {
          demographicData.push(record);
        } else {
          data.push(record);
        }
      }
      let { isComplete: demoIsComplete, responses: demoResponses } = await updateDemographicAnswers(demographicData, Userdemographic);
      if (demoIsComplete) {
        isComplete.push(0);
      }
      await Userquesresponse.bulkCreate(data, { updateOnDuplicate: ["responseVal", "timeTaken"] });
      const quesResponses = await Userquesresponse.findAll({ where: { userId }, raw: true });
      const resRecord = [];
      quesResponses.push(...demoResponses);
      for (let response of quesResponses) {
        const { questionId, responseVal, timeTaken } = response;
        const res = { questionId, answer: responseVal.answer, timeTaken };
        resRecord.push(res);
      }

      createProfileResponse = resRecord;
      // attaching isComplete 
      const sqlStmtForUserQuesCount = `select count(*), q.part
        from hris.questionnaire q
          inner join hris.questiontarget qt on qt.target_id=q.question_target_id
        where qt.target_id=1
        group by q.part`;

      const allSQLUserQuesCount = await sequelize.query(sqlStmtForUserQuesCount, {
        type: QueryTypes.SELECT,
        replacements: {},
      });
      const userQuesCount = camelizeKeys(allSQLUserQuesCount);

      const sqlStmtForUserResCount = `select count(*), q.part
        from hris.userquesresponses uqr
          inner join hris.questionnaire q on q.question_id=uqr.question_id
        where uqr.user_id=:userId
        group by q.part`;

      const allSQLUserResCount = await sequelize.query(sqlStmtForUserResCount, {
        type: QueryTypes.SELECT,
        replacements: {
          userId,
        },
      });
      const userResCount = camelizeKeys(allSQLUserResCount);

      // user(Ques/Res)count---------- [{count: 5, part: 1}]
      const quesCountmap = new Map(); // { part: count }
      for (let item of userQuesCount) {
        const mapItem = quesCountmap.get(item.part);
        if (mapItem === undefined) quesCountmap.set(item.part, item.count);
      };

      for (let item of userResCount) {
        const mapItem = quesCountmap.get(item.part);
        if (item.count === mapItem && item.part) isComplete.push(item.part);
      }
      isComplete.sort((a, b) => a - b);

    } else if (userTypeName === 'supervisor' || userTypeName === 'workbuddy') {
      // create profile for a mentor
      for (const response of responses) {
        const { questionId, answer, timeTaken } = response || {};
        const record = { questionId, responseVal: { answer }, userId, timeTaken }
        data.push(record);
      }
      await Mentorquesresponse.bulkCreate(data, { updateOnDuplicate: ["responseVal", "timeTaken"] });
      const quesResponses = await Mentorquesresponse.findAll({ where: { userId } });
      const resRecord = [];
      for (let response of quesResponses) {
        response = response && response.toJSON();
        const { questionId, responseVal, timeTaken } = response;
        const res = { questionId, answer: responseVal.answer, timeTaken };
        resRecord.push(res);
      }
      createProfileResponse = resRecord;

      // attaching isComplete
      const sqlStmtForUserQuesCount = `select count(*) from hris.questionnaire q
      inner join hris.questiontarget qt on qt.target_id=q.question_target_id
      where qt.target_id=3`;

      const allSQLUserQuesCount = await sequelize.query(sqlStmtForUserQuesCount, {
        type: QueryTypes.SELECT,
        replacements: {},
      });
      const userQuesCount = allSQLUserQuesCount[0].count;

      const sqlStmtForUserResCount = `select count(*) 
      from hris.mentorquesresponses mqr
        inner join hris.questionnaire q on q.question_id=mqr.question_id and q.question_target_id=3
      where mqr.user_id=:userId`;

      const allSQLUserResCount = await sequelize.query(sqlStmtForUserResCount, {
        type: QueryTypes.SELECT,
        replacements: {
          userId,
        },
      });
      const userResCount = allSQLUserResCount[0].count;

      isComplete = userQuesCount === userResCount;

    } else if (userTypeName === 'companysuperadmin') {
      // create profile for a company superadmin
      const userRecord = await Userinfo.findOne({ where: { userId } });
      const userData = userRecord && userRecord.toJSON();
      const { companyId } = userData || {};

      for (const response of responses) {
        const { questionId, answer, timeTaken } = response || {};
        const record = { questionId, responseVal: { answer }, userId, companyId, timeTaken }
        data.push(record);
      }
      await Companyquesresponse.bulkCreate(data, { updateOnDuplicate: ["responseVal", "timeTaken"] });
      const quesResponses = await Companyquesresponse.findAll({ where: { userId } });
      const resRecord = [];
      for (let response of quesResponses) {
        response = response && response.toJSON();
        const { questionId, responseVal, timeTaken } = response;
        const res = { questionId, answer: responseVal.answer, timeTaken };
        resRecord.push(res);
      }
      createProfileResponse = resRecord;

      // attaching isComplete
      const sqlStmtForUserQuesCount = `select count(*) from hris.questionnaire q
      inner join hris.questiontarget qt on qt.target_id=q.question_target_id
      where qt.target_id=4`;

      const allSQLUserQuesCount = await sequelize.query(sqlStmtForUserQuesCount, {
        type: QueryTypes.SELECT,
        replacements: {},
      });
      const userQuesCount = allSQLUserQuesCount[0].count;

      const sqlStmtForUserResCount = `select count(*) 
      from hris.companyquesresponses cqr
      inner join hris.questionnaire q on q.question_id=cqr.question_id and q.question_target_id=4
      where cqr.user_id=:userId`;

      const allSQLUserResCount = await sequelize.query(sqlStmtForUserResCount, {
        type: QueryTypes.SELECT,
        replacements: {
          userId,
        },
      });
      const userResCount = allSQLUserResCount[0].count;

      isComplete = userQuesCount === userResCount;
    }

    return h.response({ isComplete, responses: createProfileResponse }).code(200);
  }
  catch (error) {
    console.error(error.stack);
    return h.response({ error: true, message: 'Internal Server Error!' }).code(500);
  }
}

const getProfile = async (request, h) => {
  try {
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden', code: "xemp-1" }).code(401);
    }
    let userType = request.auth.artifacts.decoded.userTypeName;

    const { credentials } = request.auth || {};
    const { id: userId } = credentials || {};
    const { Userquesresponse, Companyquesresponse, Mentorquesresponse, Userdemographic } = request.getModels('xpaxr');

    const db1 = request.getDb('xpaxr');
    const sequelize = db1.sequelize;

    let quesResponses = [];
    let isComplete = [];

    if (userType === 'candidate') {
      quesResponses = await Userquesresponse.findAll({ where: { userId }, raw: true });
      let { isComplete: demoIsComplete, responses: demoResponses } = await demoRow2Answers(userId, Userdemographic);
      if (demoIsComplete) {
        isComplete.push(0);
      }
      quesResponses.push(...demoResponses);
      // attaching isComplete 
      const sqlStmtForUserQuesCount = `select count(*), q.part
        from hris.questionnaire q
          inner join hris.questiontarget qt on qt.target_id=q.question_target_id
        where qt.target_id=1
        group by q.part`;

      const allSQLUserQuesCount = await sequelize.query(sqlStmtForUserQuesCount, {
        type: QueryTypes.SELECT,
        replacements: {},
      });
      const userQuesCount = camelizeKeys(allSQLUserQuesCount);

      const sqlStmtForUserResCount = `select count(*), q.part
        from hris.userquesresponses uqr
          inner join hris.questionnaire q on q.question_id=uqr.question_id
        where uqr.user_id=:userId
        group by q.part`;

      const allSQLUserResCount = await sequelize.query(sqlStmtForUserResCount, {
        type: QueryTypes.SELECT,
        replacements: {
          userId,
        },
      });
      const userResCount = camelizeKeys(allSQLUserResCount);

      // user(Ques/Res)count---------- [{count: 5, part: 1}]
      const quesCountmap = new Map(); // { part: count }
      for (let item of userQuesCount) {
        const mapItem = quesCountmap.get(item.part);
        if (mapItem === undefined) quesCountmap.set(item.part, item.count);
      };

      for (let item of userResCount) {
        const mapItem = quesCountmap.get(item.part);
        if (item.count === mapItem && item.part) isComplete.push(item.part);
      }
      isComplete.sort((a, b) => a - b);
    }
    if (userType === 'supervisor' || userType === 'workbuddy') {
      quesResponses = await Mentorquesresponse.findAll({ where: { userId }, raw: true });

      // attaching isComplete
      const sqlStmtForUserQuesCount = `select count(*) from hris.questionnaire q
      inner join hris.questiontarget qt on qt.target_id=q.question_target_id
      where qt.target_id=3`;

      const allSQLUserQuesCount = await sequelize.query(sqlStmtForUserQuesCount, {
        type: QueryTypes.SELECT,
        replacements: {},
      });
      const userQuesCount = allSQLUserQuesCount[0].count;

      const sqlStmtForUserResCount = `select count(*) 
      from hris.mentorquesresponses mqr
        inner join hris.questionnaire q on q.question_id=mqr.question_id and q.question_target_id=3
      where mqr.user_id=:userId`;

      const allSQLUserResCount = await sequelize.query(sqlStmtForUserResCount, {
        type: QueryTypes.SELECT,
        replacements: {
          userId,
        },
      });
      const userResCount = allSQLUserResCount[0].count;

      isComplete = userQuesCount === userResCount;
    }
    if (userType === 'companysuperadmin') {
      quesResponses = await Companyquesresponse.findAll({ where: { userId }, raw: true });

      // attaching isComplete
      const sqlStmtForUserQuesCount = `select count(*) from hris.questionnaire q
        inner join hris.questiontarget qt on qt.target_id=q.question_target_id
      where qt.target_id=4`;

      const allSQLUserQuesCount = await sequelize.query(sqlStmtForUserQuesCount, {
        type: QueryTypes.SELECT,
        replacements: {},
      });
      const userQuesCount = allSQLUserQuesCount[0].count;

      const sqlStmtForUserResCount = `select count(*) 
      from hris.companyquesresponses cqr
        inner join hris.questionnaire q on q.question_id=cqr.question_id and q.question_target_id=4
      where cqr.user_id=:userId`;

      const allSQLUserResCount = await sequelize.query(sqlStmtForUserResCount, {
        type: QueryTypes.SELECT,
        replacements: {
          userId,
        },
      });
      const userResCount = allSQLUserResCount[0].count;

      isComplete = userQuesCount === userResCount;
    }

    const responses = [];
    for (let responseInfo of quesResponses) {
      const { questionId, responseVal, timeTaken } = responseInfo || {};
      const res = { questionId, answer: responseVal.answer, timeTaken };
      responses.push(res);
    }

    return h.response({ isComplete, responses }).code(200);
  }
  catch (error) {
    console.error(error.stack);
    return h.response({ error: true, message: 'Internal Server Error!' }).code(500);
  }
}

const getUserMetaData = async (request, h) => {
  try {
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden', code: "xemp-1" }).code(401);
    }
    const { credentials } = request.auth || {};
    const userId = credentials.id;

    const { metaKey } = request.query;
    if (!metaKey) {
      return h.response({ error: true, message: 'Bad Request! No metaKey given!' }).code(400);
    }

    const { Usermeta } = request.getModels('xpaxr');
    const userMetaRecord = await Usermeta.findOne({ where: { userId, metaKey }, attributes: { exclude: ['createdAt', 'updatedAt'] } });
    const userMetaData = userMetaRecord && userMetaRecord.toJSON();

    const responses = userMetaData || {};
    return h.response(responses).code(200);
  }
  catch (error) {
    console.error(error.stack);
    return h.response({ error: true, message: 'Bad Request!' }).code(500);
  }
}

const updateMetaData = async (request, h) => {
  try {
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden', code: "xemp-1" }).code(401);
    }
    const { credentials } = request.auth || {};
    const userId = credentials.id;
    const metaDataItems = isArray(request.payload) ? request.payload : [request.payload];

    const { Usermeta, Profileauditlog } = request.getModels('xpaxr');

    for (let metaDataItem of metaDataItems) {
      const { metaKey, metaValue } = metaDataItem;

      const userMetaRecord = await Usermeta.findOne({ where: { userId, metaKey }, attributes: { exclude: ['createdAt', 'updatedAt'] } });
      const userMetaData = userMetaRecord && userMetaRecord.toJSON();
      const { umetaId, metaValue: oldMetaValue } = userMetaData || {};

      if (!umetaId) {
        await Usermeta.create({ userId, metaKey, metaValue });
        await Profileauditlog.create({
          affectedUserId: userId,
          performerUserId: userId,
          actionName: 'Create User metadata',
          actionType: 'CREATE',
          actionDescription: `The user of userId ${userId} has created the metadata of metaKey ${metaKey} with the value of ${metaValue}`
        });
      } else {
        if (metaValue === oldMetaValue) return h.response({ error: true, message: `This "${metaKey}" metaKey already has this "${metaValue}" metaValue!` }).code(400);
        await Usermeta.update({ metaKey, metaValue }, { where: { userId: userId, umetaId } });
        await Profileauditlog.create({
          affectedUserId: userId,
          performerUserId: userId,
          actionName: 'Update User metadata',
          actionType: 'UPDATE',
          actionDescription: `The user of userId ${userId} has updated the metadata of metaKey ${metaKey}. Previous value was ${oldMetaValue}, Current value is ${metaValue}`
        });
      }
    }
    const updatedUserMetaRecords = await Usermeta.findAll({ where: { userId } });

    const metaObj = {};
    for (let item of updatedUserMetaRecords) {
      metaObj[item.metaKey] = item.metaValue;
    }

    return h.response(metaObj).code(200);
  }
  catch (error) {
    console.error(error.stack);
    return h.response({ error: true, message: 'Bad Request!' }).code(500);
  }
}

const getAllUserMetaData = async (request, h) => {
  try {
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden', code: "xemp-1" }).code(401);
    }
    const { credentials } = request.auth || {};
    const userId = credentials.id;

    const { exclude } = request.query;

    const excludeMetaKeys = isArray(exclude) ? exclude : [exclude];
    const { Usermeta } = request.getModels('xpaxr');
    const userMetaRecord = await Usermeta.findAll({ where: { userId, [Op.not]: [{ metaKey: [...excludeMetaKeys] }] }, attributes: ['metaKey', 'metaValue'] });

    const metaObj = {};
    for (let item of userMetaRecord) {
      metaObj[item.metaKey] = item.metaValue;
    }

    return h.response(metaObj).code(200);
  }
  catch (error) {
    console.error(error.stack);
    return h.response({ error: true, message: 'Bad Request!' }).code(500);
  }
}

const getResources = async (request, h) => {
  try {
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden', code: "xemp-1" }).code(401);
    }
    const { credentials } = request.auth || {};
    const userId = credentials.id;
    let userTypeName = request.auth.artifacts.decoded.userTypeName;

    const { Userinfo, Usertype, Company, Country, Resource, Mentorcandidatemapping } = request.getModels('xpaxr');

    // get userTypeId and companyId
    const userRecord = await Userinfo.findOne({
      where: { userId },
      include: [{
        model: Company,
        as: 'company'
      }]
    });
    const userInfo = userRecord && userRecord.toJSON();
    const { userTypeId, company } = userInfo || {};
    const { countryId: luserCountryId } = company || {};

    let countryId = luserCountryId;
    if (userTypeName === 'candidate') { //if user is candidate find companyId of the mentor
      const mentorRecord = await Mentorcandidatemapping.findOne({
        where: {
          candidateId: userId,
        },
        include: [{
          model: Userinfo,
          as: 'mentor',
          required: true,
          include: [{
            model: Company,
            as: 'company',
          }]
        }]
      });
      const mentorInfo = mentorRecord && mentorRecord.toJSON();
      const { company: mCompany } = mentorInfo || {};
      const { countryId: mentorCountryId } = mCompany || {};
      countryId = mentorCountryId;
    }

    const anyCountryRecord = await Country.findOne({ where: { countryShort: '<ANY>' } });
    const anyCountryData = anyCountryRecord && anyCountryRecord.toJSON();
    const { countryId: anyCountryId } = anyCountryData || {};

    // get resource records
    const db1 = request.getDb('xpaxr');
    const sequelize = db1.sequelize;

    const sqlStmtForResources = `SELECT * FROM hris.resources r
    WHERE(case when position(':userTypeId' in array_to_string(usertype,',')) > 0 then true else false end) and country_id in(:countryId)`;

    const allSQLResources = await sequelize.query(sqlStmtForResources, {
      type: QueryTypes.SELECT,
      replacements: {
        userTypeId, countryId: [anyCountryId, countryId],
      },
    });
    const resources = camelizeKeys(allSQLResources);

    return h.response({ resources }).code(200);
  }
  catch (error) {
    console.error(error.stack);
    return h.response({ error: true, message: 'Bad Request!' }).code(500);
  }
}

const saveUserFeedback = async (request, h) => {
  try {
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden', code: "xemp-1" }).code(401);
    }
    const { credentials } = request.auth || {};
    const userId = credentials.id;

    const { positiveFeedback, negativeFeedback } = request.payload || {};

    const { Userinfo, Userfeedback } = request.getModels('xpaxr');
    const userRecord = await Userinfo.findOne({ where: { userId } });
    const userInfo = await userRecord && userRecord.toJSON();
    const { companyId } = userInfo || {};

    const createdFeedback = await Userfeedback.create({ userId, positiveFeedback, negativeFeedback, companyId });
    const newFeedbackRecord = createdFeedback && createdFeedback.toJSON();

    const responses = newFeedbackRecord || {};
    return h.response({ message: 'Feedback successfully saved!' }).code(200);
  }
  catch (error) {
    console.error(error.stack);
    return h.response({ error: true, message: 'Bad Request!' }).code(500);
  }
}

const getQuestionnaire = async (request, h, targetName) => {
  try {
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden', code: "xemp-1" }).code(401);
    }
    const { part } = request.query || {};

    const validPartQuery = [0, 1, 2, 3];
    const isPartQueryValid = (part && isArray(part)) ? (
      part.every(item => validPartQuery.includes(Number(item)))
    ) : validPartQuery.includes(Number(part));
    if (part && !isPartQueryValid) return h.response({ error: true, message: 'Invalid part query parameter!' }).code(400);


    let emeWhere = {};
    if (targetName === 'empauwer_me' && part) {
      emeWhere = {
        part: part
      }
    }

    const models = request.getModels('xpaxr');
    const { Questionnaire, Questiontarget, Questiontype, Questioncategory } = models;

    let questions = await Questionnaire.findAll({
      raw: true,
      include: [{
        model: Questiontype,
        as: "questionType",
        attributes: [],
        required: true
      }, {
        model: Questiontarget,
        as: "questionTarget",
        where: { targetName },
        attributes: []
      },
      {
        model: Questioncategory,
        as: "questionCategory",
        attributes: [],
        required: true
      }
      ],
      where: {
        isActive: true,
        ...emeWhere,
      },
      attributes: ["questionId", "questionUuid", "questionName", "part", "questionConfig", "questionType.question_type_name", "questionCategory.question_category_name"]
    });
    if (targetName === 'empauwer_me' && ((isArray(part) && part.includes('0')) || Number(part) === 0 || part === undefined)) {
      // This part corresponds to demographic questions which uses a different schema from normal questions
      let demographicQuestions = await getDemographicQuestionnaire(models);
      questions.push(...demographicQuestions);
    }
    return h.response(camelizeKeys({ questions })).code(200);
  }
  catch (error) {
    console.error(error.stack);
    return h.response({ error: true, message: 'Internal Server Error!' }).code(500);
  }
}

const getWebchatToken = async (request, h) => {
  try {
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden', code: "xemp-1" }).code(401);
    }
    let luserTypeName = request.auth.artifacts.decoded.userTypeName;
    const { credentials } = request.auth || {};

    let endpoint;
    let secret;

    if (["supervisor", "workbuddy"].includes(luserTypeName)) {
      endpoint = config.webchat.empauwerUs.endpoint;
      secret = config.webchat.empauwerUs.secret;
    } else if (luserTypeName === "candidate") {
      endpoint = config.webchat.empauwerMe.endpoint;
      secret = config.webchat.empauwerMe.secret;
    } else {
      h.response({ "error": true, "message": "Only candidate or mentor can access chat bot" }).code(400)
    }
    let res = await axios.post(endpoint, {},
      {
        "headers": { "Authorization": `Bearer ${secret}` }
      }
    )
    return h.response(res.data).code(200);
  }
  catch (error) {
    console.error(error.stack);
    return h.response({ error: true, message: 'Bad Request!' }).code(500);
  }
}

module.exports = {
  createUser,
  getUser,
  getUserFirstName,
  updateUser,
  updatePassword,

  forgotPassword,
  resetPassword,
  verifyEmail,

  createProfile,
  getProfile,

  getUserMetaData,
  updateMetaData,
  getAllUserMetaData,
  getResources,

  saveUserFeedback,
  getQuestionnaire,
  getWebchatToken
};

