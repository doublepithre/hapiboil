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
const uploadFile = require('../../utils/uploadFile');


const createCompanySuperAdmin = async (request, h) => {
  try {
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden' }).code(403);
    }
    const { credentials } = request.auth || {};
    const { id: luserId } = credentials || {};

    // Checking user type from jwt
    let luserTypeName = request.auth.artifacts.decoded.userTypeName;
    if (luserTypeName !== 'superadmin') {
      return h.response({ error: true, message: 'You are not authorized!' }).code(403);
    }

    const { User, Userinfo, Usertype, Userrole, Profileauditlog, Companyauditlog, Company, Companyinfo, Workaccommodation, Companyworkaccommodation, Emailtemplate, Emaillog, Requesttoken } = request.getModels('xpaxr');
    const { email, password, companyName, } = request.payload || {};
    const accountType = 'companysuperadmin';

    if (!(email && password && companyName)) {
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
    // Checking if User already Exists
    const userRecord = await User.findOne({ where: { email } });
    const record = userRecord && userRecord.toJSON();
    if (record) { return h.response({ error: true, message: 'Account with this email already exists!' }).code(400); }

    // creating company
    const supervisorRandR = `<p>Role of Supervisor:</p> 
    <ul>
      <li>Understand and align with senior leadership on D&I goals. </li>
      <li>Complete training on D&I and neurodiversity.</li>
      <li>Ensure work buddy completes relevant training.</li>
      <li>Review work processes and familiarise with work accommodation request process.</li>
      <li>Familiarise with support network for neurodiverse talent.</li>
    </ul>`;

    const workbuddyRandR = `<p>Role of Work Buddy:</p>
    <ul>
      <li>Understand and align with senior leadership on D&I goals. </li>
      <li>Complete training on D&I and neurodiversity.</li>
      <li>Familiarise with work accommodation request process.</li>
      <li>Increase role clarity</li>
      <li>Be a clear point of contact</li>
      <li>Include the new hire in company activities</li>
      <li>Help with the new hire’s induction into the company</li>
    </ul>`;
    const cdata = await Company.create({ companyName: companyName.toLowerCase().trim(), displayName: companyName, active: true, supervisorRandR, workbuddyRandR });
    const companyRes = cdata && cdata.toJSON();
    const { companyId, companyUuid } = companyRes || {};

    const cidata = await Companyinfo.create({ companyId });
    await Companyauditlog.create({
      affectedCompanyId: companyId,
      performerUserId: luserId,
      actionName: 'Create a Company',
      actionType: 'CREATE',
      actionDescription: `The user of userId ${luserId} has created the company of companyId ${companyId}`,
    });

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
      active: false,
      firstName: email.split('@')[0],
      companyId,
      companyUuid,
    });
    delete udata.dataValues.password; //remove hasedpassword when returning

    await Profileauditlog.create({
      affectedUserId: userId,
      performerUserId: luserId,
      actionName: 'Create a User',
      actionType: 'CREATE',
      actionDescription: `The user of userId ${luserId} has created the user of userId ${userId}, with the accountType of ${accountType}`
    });

    // creating company work accommodations (copying the fixed x0pa given work accommodations)
    const allWorkAcoomodations = await Workaccommodation.findAll({ attributes: { exclude: ['createdAt', 'updatedAt'] } });
    for (let record of allWorkAcoomodations) {
      const defaultData = record.toJSON();
      Companyworkaccommodation.create({
        workaccommodationId: defaultData.workaccommodationId,
        companyId,
        status: 'not started',
      });
    };

    // creating company custom email templates (copying the default ones)
    const allDefaultTemplatesRecord = await Emailtemplate.findAll({ where: { ownerId: null, companyId: null, isDefaultTemplate: true }, attributes: { exclude: ['id', 'createdAt', 'updatedAt', 'isUserTemplate', 'companyId', 'ownerId', 'isDefaultTemplate'] } });
    for (let record of allDefaultTemplatesRecord) {
      const defaultData = record.toJSON();
      Emailtemplate.create({ ...defaultData, isDefaultTemplate: false, companyId: companyId, templateName: defaultData.templateName, ownerId: userId });
    }

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
      actionType: 'account-creation-reset-password'
    });
    const reqToken = reqTokenRecord && reqTokenRecord.toJSON();

    let resetLink = getDomainURL();
    resetLink += `/reset-password?token=${token}`;

    const emailData = {
      emails: [udata.email],
      email: udata.email,
      password,
      ccEmails: [],
      templateName: 'account-creation-reset-password',
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

const getAllCompanyBySuperadmin = async (request, h) => {
  try {
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden' }).code(403);
    }
    // Checking user type from jwt
    let luserTypeName = request.auth.artifacts.decoded.userTypeName;
    if (luserTypeName !== 'superadmin') return h.response({ error: true, message: 'You are not authorized!' }).code(403);

    const { credentials } = request.auth || {};
    const userId = credentials.id;

    const { limit, offset, sort, search, industryId } = request.query;
    const searchVal = `%${search ? search.toLowerCase() : ''}%`;

    // sort query
    let [sortBy, sortType] = sort ? sort.split(':') : ['created_at', 'desc'];
    if (!sortType && sortBy === 'created_at') sortType = 'desc';
    if (!sortType && sortBy !== 'created_at') sortType = 'asc';

    const validSortTypes = ['asc', 'desc'];
    const sortTypeLower = sortType.toLowerCase();
    const isSortTypeReqValid = validSortTypes.includes(sortTypeLower);

    const validSorts = ['company_name', 'created_at'];
    const isSortReqValid = validSorts.includes(sortBy);

    // pagination
    const limitNum = limit ? Number(limit) : 10;
    const offsetNum = offset ? Number(offset) : 0;

    if (isNaN(limitNum)) return h.response({ error: true, message: 'Invalid limit query parameter! The limit query parameter must be a number!' }).code(400);
    if (isNaN(offsetNum)) return h.response({ error: true, message: 'Invalid offset query parameter! The offset query parameter must be a number!' }).code(400);
    if (!isSortReqValid) return h.response({ error: true, message: 'Invalid sort query parameter!' }).code(400);
    if (!isSortTypeReqValid) return h.response({ error: true, message: 'Invalid sort query parameter! Sort type is invalid, it should be either "asc" or "desc"!' }).code(400);

    if (limitNum < 0) return h.response({ error: true, message: 'Limit must be greater than 0!' }).code(400);
    if (limitNum > 100) return h.response({ error: true, message: 'Limit must not exceed 100!' }).code(400);

    const db1 = request.getDb('xpaxr');

    // get sql statement for getting all users or its count        
    const filters = { search, sortBy, sortType, industryId }
    function getSqlStmt(queryType, obj = filters) {
      const { search, sortBy, sortType, industryId } = obj;
      let sqlStmt;
      const type = queryType && queryType.toLowerCase();
      if (type === 'count') {
        sqlStmt = `select count(*)`;
      } else {
        sqlStmt = `select
                c.display_name as company_name, c.*, ci.company_industry_name, cinfo.email_bg, cinfo.banner, cinfo.logo`;
      }

      sqlStmt += `
              from hris.company c
                left join hris.companyindustry ci on ci.company_industry_id=c.company_industry_id
                inner join hris.companyinfo cinfo on cinfo.company_id=c.company_id
              where c.company_id is not null`;

      // filters
      if (industryId) {
        sqlStmt += isArray(industryId) ? ` and c.company_industry_Id in (:industryId)` : ` and c.company_industry_Id=:industryId`;
      }
      // search
      if (search) {
        sqlStmt += ` and (
                  c.company_name ilike :searchVal
                  or ci.company_industry_name ilike :searchVal                                      
              )`;
      }

      if (type !== 'count') {
        // sorts
        sqlStmt += ` order by c.${sortBy} ${sortType}`
        // limit and offset
        sqlStmt += ` limit :limitNum  offset :offsetNum`
      };

      return sqlStmt;
    }

    const sequelize = db1.sequelize;
    const allSQLCompanies = await sequelize.query(getSqlStmt(), {
      type: QueryTypes.SELECT,
      replacements: {
        industryId,
        limitNum, offsetNum,
        searchVal,
      },
    });
    const allSQLCompaniesCount = await sequelize.query(getSqlStmt('count'), {
      type: QueryTypes.SELECT,
      replacements: {
        industryId,
        limitNum, offsetNum,
        searchVal,
      },
    });
    const allCompanies = camelizeKeys(allSQLCompanies);

    const paginatedResponse = { count: allSQLCompaniesCount[0].count, companies: allCompanies };
    return h.response(paginatedResponse).code(200);
  }
  catch (error) {
    console.error(error.stack);
    return h.response({ error: true, message: 'Bad Request!' }).code(500);
  }
}

const getAllUsersBySuperadmin = async (request, h) => {
  try {
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden' }).code(403);
    }
    // Checking user type from jwt
    let luserTypeName = request.auth.artifacts.decoded.userTypeName;
    if (luserTypeName !== 'superadmin') return h.response({ error: true, message: 'You are not authorized!' }).code(403);

    const { credentials } = request.auth || {};
    const userId = credentials.id;

    const { limit, offset, sort, search, userType, companyId } = request.query;
    const searchVal = `%${search ? search.toLowerCase() : ''}%`;

    // filters
    const userTypeLower = userType ? (isArray(userType) ? userType.map(ut => ut.toLowerCase()) : userType.toLowerCase()) : null;

    // Checking user type
    const validAccountTypes = ['candidate', 'employer', 'supervisor', 'workbuddy', 'companysuperadmin', 'superadmin'];
    const isUserTypeQueryValid = (userTypeLower && isArray(userTypeLower)) ? (
      userTypeLower.every(req => validAccountTypes.includes(req))
    ) : validAccountTypes.includes(userTypeLower);
    if (userTypeLower && !isUserTypeQueryValid) return h.response({ error: true, message: 'Invalid userType query parameter!' }).code(400);

    // sort query
    let [sortBy, sortType] = sort ? sort.split(':') : ['company_name', 'asc'];
    if (!sortType) sortType = 'asc';

    const validSorts = ['company_name', 'first_name', 'last_name'];
    const isSortReqValid = validSorts.includes(sortBy);

    const validSortTypes = ['asc', 'desc'];
    const sortTypeLower = sortType.toLowerCase();
    const isSortTypeReqValid = validSortTypes.includes(sortTypeLower);

    // pagination
    const limitNum = limit ? Number(limit) : 10;
    const offsetNum = offset ? Number(offset) : 0;

    if (isNaN(limitNum)) return h.response({ error: true, message: 'Invalid limit query parameter! The limit query parameter must be a number!' }).code(400);
    if (isNaN(offsetNum)) return h.response({ error: true, message: 'Invalid offset query parameter! The offset query parameter must be a number!' }).code(400);
    if (!isSortReqValid) return h.response({ error: true, message: 'Invalid sort query parameter!' }).code(400);
    if (!isSortTypeReqValid) return h.response({ error: true, message: 'Invalid sort query parameter! Sort type is invalid, it should be either "asc" or "desc"!' }).code(400);

    if (limitNum < 0) return h.response({ error: true, message: 'Limit must be greater than 0!' }).code(400);
    if (limitNum > 100) return h.response({ error: true, message: 'Limit must not exceed 100!' }).code(400);

    const db1 = request.getDb('xpaxr');

    // get sql statement for getting all users or its count        
    const filters = { search, sortBy, sortType, userTypeLower, companyId }
    function getSqlStmt(queryType, obj = filters) {
      const { search, sortBy, sortType, userTypeLower, companyId } = obj;
      let sqlStmt;
      const type = queryType && queryType.toLowerCase();
      if (type === 'count') {
        sqlStmt = `select count(*)`;
      } else {
        sqlStmt = `select
                c.display_name as company_name, ui.*, ur.role_name, ut.user_type_name`;
      }

      sqlStmt += `
              from hris.userinfo ui
                left join hris.company c on c.company_id=ui.company_id
                inner join hris.userrole ur on ur.role_id=ui.role_id
                inner join hris.usertype ut on ut.user_type_id=ui.user_type_id
              where user_id is not null`;

      // filters
      if (userTypeLower) {
        sqlStmt += isArray(userTypeLower) ? ` and ut.user_type_name in (:userTypeLower)` : ` and ut.user_type_name=:userTypeLower`;
      }
      if (companyId) {
        sqlStmt += isArray(companyId) ? ` and ui.company_id in (:companyId)` : ` and ui.company_id=:companyId`;
      }
      // search
      if (search) {
        sqlStmt += ` and (
                  ui.first_name ilike :searchVal
                  or ui.last_name ilike :searchVal                    
                  or ui.email ilike :searchVal                    
              )`;
      }

      if (type !== 'count') {
        // sorts
        sqlStmt += ` order by ${sortBy} ${sortType}`
        // limit and offset
        sqlStmt += ` limit :limitNum  offset :offsetNum`
      };

      return sqlStmt;
    }

    const sequelize = db1.sequelize;
    const allSQLUsers = await sequelize.query(getSqlStmt(), {
      type: QueryTypes.SELECT,
      replacements: {
        userTypeLower,
        companyId,
        limitNum, offsetNum,
        searchVal,
      },
    });
    const allSQLUsersCount = await sequelize.query(getSqlStmt('count'), {
      type: QueryTypes.SELECT,
      replacements: {
        userTypeLower,
        companyId,
        limitNum, offsetNum,
        searchVal,
      },
    });
    const allUsers = camelizeKeys(allSQLUsers);

    const paginatedResponse = { count: allSQLUsersCount[0].count, users: allUsers };
    return h.response(paginatedResponse).code(200);
  }
  catch (error) {
    console.error(error.stack);
    return h.response({ error: true, message: 'Bad Request!' }).code(500);
  }
}

// de/re-activate any Company
const updateCompanyBySuperadmin = async (request, h) => {
  try {
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden' }).code(403);
    }
    const { credentials } = request.auth || {};
    const userId = credentials.id;

    // Checking user type from jwt
    let luserTypeName = request.auth.artifacts.decoded.userTypeName;
    if (luserTypeName !== 'superadmin') return h.response({ error: true, message: 'You are not authorized!' }).code(403);

    const updateDetails = request.payload;
    const validUpdateRequests = [
      'active',
    ];
    const requestedUpdateOperations = Object.keys(updateDetails) || [];
    const isAllReqsValid = requestedUpdateOperations.every(req => validUpdateRequests.includes(req));
    if (!isAllReqsValid || typeof updateDetails.active !== 'boolean') return h.response({ error: true, message: 'Invalid update request(s)' }).code(400);

    const { Company, Companyauditlog } = request.getModels('xpaxr');

    const { companyUuid } = request.params || {};
    const requestedForCompanyRecord = await Company.findOne({ where: { companyUuid } });
    const rcompanyInfo = requestedForCompanyRecord && requestedForCompanyRecord.toJSON();
    const { companyId: rCompanyId, active: oldActive } = rcompanyInfo || {};

    if (!rCompanyId) return h.response({ error: true, message: 'No company found!' }).code(400);
    if (updateDetails.active === oldActive) return h.response({ error: true, message: `The company is already ${updateDetails.active === true ? 'active' : 'deactivated'}!` }).code(400);

    // when deactivating a company
    if (updateDetails.active === false) {
      const db1 = request.getDb('xpaxr');
      const sqlStmt = `DELETE
      from hris.accesstoken ato
      where
        ato.user_id in
      (
        select ui.user_id
        from hris.userinfo ui
        where ui.company_id = :rCompanyId
      )`;

      const sequelize = db1.sequelize;
      const ares = await sequelize.query(sqlStmt, {
        type: QueryTypes.SELECT,
        replacements: { rCompanyId },
      });

      // deactivate them
      const sqlStmt2 = `UPDATE hris.userinfo ui          
        SET active=false
        where ui.company_id= :rCompanyId`;

      const ares2 = await sequelize.query(sqlStmt2, {
        type: QueryTypes.SELECT,
        replacements: { rCompanyId },
      });
    }

    // when reactivating a company
    if (updateDetails.active === true) {
      const db1 = request.getDb('xpaxr');
      // reactivate staff
      const sqlStmt3 = `UPDATE hris.userinfo ui          
        SET active=true
        where ui.company_id= :rCompanyId`;
      const sequelize = db1.sequelize;
      const ares3 = await sequelize.query(sqlStmt3, {
        type: QueryTypes.SELECT,
        replacements: { rCompanyId },
      });
    }

    await Company.update(updateDetails, { where: { companyUuid } });

    await Companyauditlog.create({
      affectedCompanyId: rCompanyId,
      performerUserId: userId,
      actionName: `${updateDetails.active === true ? 'Re-activate' : 'Deactivate'} a Company`,
      actionType: 'UPDATE',
      actionDescription: `The user of userId ${userId} has ${updateDetails.active === true ? 're-activated' : 'Deactivated'} the company of companyId ${rCompanyId}`,
    });

    const updatedCinfo = await Company.findOne({
      where: { companyUuid },
      attributes: {
        exclude: ['createdAt', 'updatedAt']
      }
    });
    const cinfo = updatedCinfo && updatedCinfo.toJSON();
    return h.response(cinfo).code(200);
  }
  catch (error) {
    console.log(error.stack);
    return h.response({ error: true, message: 'Bad Request!' }).code(500);
  }
}

// de/re-activate any User
const updateUserBySuperadmin = async (request, h) => {
  try {
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden' }).code(403);
    }
    const { credentials } = request.auth || {};
    const userId = credentials.id;

    // Checking user type from jwt
    let luserTypeName = request.auth.artifacts.decoded.userTypeName;
    if (luserTypeName !== 'superadmin') return h.response({ error: true, message: 'You are not authorized!' }).code(403);

    const updateDetails = request.payload;
    const validUpdateRequests = [
      'active', 'isAdmin',
    ];
    const requestedUpdateOperations = Object.keys(updateDetails) || [];
    const isAllReqsValid = requestedUpdateOperations.every(req => validUpdateRequests.includes(req));
    if (!isAllReqsValid || (updateDetails.active && typeof updateDetails.active !== 'boolean') || (updateDetails.isAdmin && typeof updateDetails.isAdmin !== 'boolean')) return h.response({ error: true, message: 'Invalid update request(s)' }).code(400);

    const { Userinfo, Profileauditlog } = request.getModels('xpaxr');

    const { userUuid } = request.params || {};
    const requestedForUser = await Userinfo.findOne({ where: { userUuid } });
    const ruserInfo = requestedForUser && requestedForUser.toJSON();
    const { userId: ruserId, active: oldActive } = ruserInfo || {};

    if (!ruserId) return h.response({ error: true, message: 'No user found!' }).code(400);
    if (updateDetails.active === oldActive) return h.response({ error: true, message: `The user is already ${updateDetails.active === true ? 'active' : 'deactivated'}!` }).code(400);

    if (updateDetails.active === false) {
      const db1 = request.getDb('xpaxr');
      const sqlStmt = `DELETE
        from hris.accesstoken ato          
        where ato.user_id= :ruserId`;

      const sequelize = db1.sequelize;
      const ares = await sequelize.query(sqlStmt, {
        type: QueryTypes.SELECT,
        replacements: { ruserId },
      });
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
      affectedUserId: ruserId,
      performerUserId: userId,
      actionName: 'Update a User',
      actionType: 'UPDATE',
      actionDescription: `The user of userId ${userId} has updated the user of userId ${ruserId}`
    });

    return h.response(uinfo).code(200);
  }
  catch (error) {
    console.log(error.stack);
    return h.response({ error: true, message: 'Bad Request!' }).code(500);
  }
}


const resendVerificationEmailBySuperadmin = async (request, h) => {
  try {
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden' }).code(403);
    }
    // Checking user type from jwt
    let luserTypeName = request.auth.artifacts.decoded.userTypeName;
    if (luserTypeName !== 'superadmin') return h.response({ error: true, message: 'You are not authorized!' }).code(403);

    const { Emailtemplate, Userinfo, Companyinfo, Emaillog, Requesttoken } = request.getModels('xpaxr');

    const { credentials } = request.auth || {};
    const luserId = credentials.id;

    const { userId } = request.payload || {};
    if (!userId) return h.response({ error: true, message: 'Please provide a userId!' }).code(400);

    const userRecord = await Userinfo.findOne({ where: { userId }, attributes: { exclude: ['createdAt', 'updatedAt'] } });
    const userInfo = userRecord && userRecord.toJSON();
    const { email, active } = userInfo || {};
    if (!email) return h.response({ error: true, message: 'No user found!' }).code(400);
    if (active) return h.response({ error: true, message: 'Already verified!' }).code(400);

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
    // ----------------end of verification email sending

    return h.response({ message: `We've emailed him/her instructions for verifying his/her account. He/She should receive them shortly. If he/she doesn't receive an email, please make sure he/she checked his/her spam folder.` }).code(200);
  }
  catch (error) {
    console.error(error.stack);
    return h.response({ error: true, message: 'Internal Server Error!' }).code(500);
  }
}

module.exports = {
  // superadmin (Empauwer)
  createCompanySuperAdmin,
  getAllCompanyBySuperadmin,
  getAllUsersBySuperadmin,
  updateCompanyBySuperadmin,
  updateUserBySuperadmin,
  
  // others
  resendVerificationEmailBySuperadmin
};

