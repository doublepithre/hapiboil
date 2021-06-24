const { Op, Sequelize, QueryTypes, cast, literal } = require('sequelize');
const bcrypt = require('bcrypt');
const validator = require('validator');
const axios = require('axios');
const config = require('config');
const { sendEmailAsync } = require('../utils/email');
const randtoken = require('rand-token');
import { isArray } from 'lodash';
import { formatQueryRes } from '../utils/index';
import { getDomainURL } from '../utils/toolbox';
import {camelizeKeys} from '../utils/camelizeKeys';
import { update } from 'lodash';
const uploadFile = require('../utils/uploadFile');

const createUser = async (request, h) => {
  try {
    if (request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden' }).code(403);
    }    
    const { User, Userinfo, Usertype, Userrole, Profileauditlog, Emailtemplate, Companyinfo, Emaillog, Requesttoken } = request.getModels('xpaxr');
    const { email, password, accountType, tandc, privacyClause } = request.payload || {};

    if ( !(email && password && accountType && privacyClause && tandc)) {
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
    const validAccountTypes = ['candidate'];
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

const createCompanySuperAdmin = async (request, h) => {
  try {
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden' }).code(403);
    }
    const { credentials } = request.auth || {};
    const { id: luserId } = credentials || {}; 

    // Checking user type from jwt
    let luserTypeName = request.auth.artifacts.decoded.userTypeName;   
    if(luserTypeName !== 'superadmin'){
        return h.response({error:true, message:'You are not authorized!'}).code(403);
    }

    const { User, Userinfo, Usertype, Userrole, Profileauditlog, Companyauditlog, Company, Companyinfo, Emailtemplate, Emaillog, Requesttoken } = request.getModels('xpaxr');
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
    const cdata = await Company.create({ companyName: companyName.toLowerCase().trim(), displayName: companyName, active: true });
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

    // creating company custom email templates (copying the default ones)
    const allDefaultTemplatesRecord = await Emailtemplate.findAll({ where: { ownerId: null, companyId: null, isDefaultTemplate: true }, attributes: { exclude: ['id', 'createdAt', 'updatedAt', 'isUserTemplate', 'companyId', 'ownerId', 'isDefaultTemplate'] }});  
    for(let record of allDefaultTemplatesRecord){
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
  try{
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden' }).code(403);
    }
    // Checking user type from jwt
    let luserTypeName = request.auth.artifacts.decoded.userTypeName;   
    if(luserTypeName !== 'superadmin') return h.response({error:true, message:'You are not authorized!'}).code(403);
        
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

      if(isNaN(limitNum)) return h.response({error: true, message: 'Invalid limit query parameter! The limit query parameter must be a number!'}).code(400);
      if(isNaN(offsetNum)) return h.response({error: true, message: 'Invalid offset query parameter! The offset query parameter must be a number!'}).code(400);
      if(!isSortReqValid) return h.response({error: true, message: 'Invalid sort query parameter!'}).code(400);
      if(!isSortTypeReqValid) return h.response({error: true, message: 'Invalid sort query parameter! Sort type is invalid, it should be either "asc" or "desc"!'}).code(400);
                          
      if(limitNum<0) return h.response({error: true, message: 'Limit must be greater than 0!'}).code(400);
      if(limitNum>100) return h.response({error: true, message: 'Limit must not exceed 100!'}).code(400);
      
      const db1 = request.getDb('xpaxr');

      // get sql statement for getting all users or its count        
      const filters = { search, sortBy, sortType, industryId }
      function getSqlStmt(queryType, obj = filters){            
          const { search, sortBy, sortType, industryId } = obj;
          let sqlStmt;
          const type = queryType && queryType.toLowerCase();
          if(type === 'count'){
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
          if(industryId){
            sqlStmt += isArray(industryId) ? ` and c.company_industry_Id in (:industryId)` : ` and c.company_industry_Id=:industryId`;
          }
          // search
          if(search) {
              sqlStmt += ` and (
                  c.company_name ilike :searchVal
                  or ci.company_industry_name ilike :searchVal                                      
              )`;
          }

          if(type !== 'count') {
              // sorts
              sqlStmt += ` order by c.${ sortBy } ${ sortType}`
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
  catch(error) {
    console.error(error.stack);
    return h.response({ error: true, message: 'Bad Request!' }).code(500);
  }
}

const getAllUsersBySuperadmin = async (request, h) => {
  try{
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden' }).code(403);
    }
    // Checking user type from jwt
    let luserTypeName = request.auth.artifacts.decoded.userTypeName;   
    if(luserTypeName !== 'superadmin') return h.response({error:true, message:'You are not authorized!'}).code(403);
        
    const { credentials } = request.auth || {};
    const userId = credentials.id;

    const { limit, offset, sort, search, userType, companyId } = request.query;            
    const searchVal = `%${search ? search.toLowerCase() : ''}%`;

    // filters
    const userTypeLower = userType ? (isArray(userType) ? userType.map(ut => ut.toLowerCase()) : userType.toLowerCase()) : null;    

    // Checking user type
    const validAccountTypes = ['candidate', 'employer', 'mentor', 'companysuperadmin', 'superadmin'];
    const isUserTypeQueryValid = (userTypeLower && isArray(userTypeLower)) ? (
      userTypeLower.every( req => validAccountTypes.includes(req))
    ) : validAccountTypes.includes(userTypeLower);
    if (userTypeLower && !isUserTypeQueryValid) return h.response({ error: true, message: 'Invalid userType query parameter!'}).code(400);
    
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
      
      if(isNaN(limitNum)) return h.response({error: true, message: 'Invalid limit query parameter! The limit query parameter must be a number!'}).code(400);
      if(isNaN(offsetNum)) return h.response({error: true, message: 'Invalid offset query parameter! The offset query parameter must be a number!'}).code(400);
      if(!isSortReqValid) return h.response({error: true, message: 'Invalid sort query parameter!'}).code(400);
      if(!isSortTypeReqValid) return h.response({error: true, message: 'Invalid sort query parameter! Sort type is invalid, it should be either "asc" or "desc"!'}).code(400);
                          
      if(limitNum<0) return h.response({error: true, message: 'Limit must be greater than 0!'}).code(400);
      if(limitNum>100) return h.response({error: true, message: 'Limit must not exceed 100!'}).code(400);
      
      const db1 = request.getDb('xpaxr');

      // get sql statement for getting all users or its count        
      const filters = { search, sortBy, sortType, userTypeLower, companyId }
      function getSqlStmt(queryType, obj = filters){            
          const { search, sortBy, sortType, userTypeLower, companyId } = obj;
          let sqlStmt;
          const type = queryType && queryType.toLowerCase();
          if(type === 'count'){
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
          if(userTypeLower){
            sqlStmt += isArray(userTypeLower) ? ` and ut.user_type_name in (:userTypeLower)` : ` and ut.user_type_name=:userTypeLower`;
          }          
          if(companyId){
            sqlStmt += isArray(companyId) ? ` and ui.company_id in (:companyId)` : ` and ui.company_id=:companyId`;
          }
          // search
          if(search) {
              sqlStmt += ` and (
                  ui.first_name ilike :searchVal
                  or ui.last_name ilike :searchVal                    
                  or ui.email ilike :searchVal                    
              )`;
          }

          if(type !== 'count') {
              // sorts
              sqlStmt += ` order by ${ sortBy } ${ sortType}`
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
  catch(error) {
    console.error(error.stack);
    return h.response({ error: true, message: 'Bad Request!' }).code(500);
  }
}

// de/re-activate any Company
const updateCompanyBySuperadmin = async (request, h) => {
  try{
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden' }).code(403);
    }
    const { credentials } = request.auth || {};
    const userId = credentials.id;

    // Checking user type from jwt
    let luserTypeName = request.auth.artifacts.decoded.userTypeName;   
    if(luserTypeName !== 'superadmin') return h.response({error:true, message:'You are not authorized!'}).code(403);
    
    const updateDetails = request.payload;    
    const validUpdateRequests = [
      'active',
    ];
    const requestedUpdateOperations = Object.keys(updateDetails) || [];
    const isAllReqsValid = requestedUpdateOperations.every( req => validUpdateRequests.includes(req));
    if (!isAllReqsValid || typeof updateDetails.active !== 'boolean') return h.response({ error: true, message: 'Invalid update request(s)'}).code(400);
    
    const { Company, Companyauditlog } = request.getModels('xpaxr');

    const { companyUuid } = request.params || {};
    const requestedForCompanyRecord = await Company.findOne({ where: { companyUuid }});
    const rcompanyInfo = requestedForCompanyRecord && requestedForCompanyRecord.toJSON();
    const { companyId: rCompanyId, active: oldActive } = rcompanyInfo || {};

    if(!rCompanyId)  return h.response({ error: true, message: 'No company found!'}).code(400);
    if(updateDetails.active === oldActive)  return h.response({ error: true, message: `The company is already ${ updateDetails.active === true ? 'active' : 'deactivated'}!`}).code(400);

    // when deactivating a company
    if(updateDetails.active === false){      
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
    if(updateDetails.active === true){      
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
    
    await Company.update(updateDetails, { where: { companyUuid }} );

    await Companyauditlog.create({ 
      affectedCompanyId: rCompanyId,
      performerUserId: userId,
      actionName: `${ updateDetails.active === true ? 'Re-activate' : 'Deactivate' } a Company`,
      actionType: 'UPDATE',
      actionDescription: `The user of userId ${userId} has ${ updateDetails.active === true ? 're-activated' : 'Deactivated' } the company of companyId ${rCompanyId}`,
    });

    const updatedCinfo = await Company.findOne({
        where:{ companyUuid },
        attributes: { exclude: ['createdAt', 'updatedAt']
      }
    });
    const cinfo = updatedCinfo && updatedCinfo.toJSON();    
    return h.response(cinfo).code(200);
  }
  catch(error) {
    console.log(error.stack);
    return h.response({ error: true, message: 'Bad Request!' }).code(500);
  }
}

// de/re-activate any User
const updateUserBySuperadmin = async (request, h) => {
  try{
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden' }).code(403);
    }
    const { credentials } = request.auth || {};
    const userId = credentials.id;

    // Checking user type from jwt
    let luserTypeName = request.auth.artifacts.decoded.userTypeName;   
    if(luserTypeName !== 'superadmin') return h.response({error:true, message:'You are not authorized!'}).code(403);
    
    const updateDetails = request.payload;    
    const validUpdateRequests = [
      'active',     'isAdmin',
    ];
    const requestedUpdateOperations = Object.keys(updateDetails) || [];
    const isAllReqsValid = requestedUpdateOperations.every( req => validUpdateRequests.includes(req));
    if (!isAllReqsValid || (updateDetails.active && typeof updateDetails.active !== 'boolean') || (updateDetails.isAdmin && typeof updateDetails.isAdmin !== 'boolean')) return h.response({ error: true, message: 'Invalid update request(s)'}).code(400);
    
    const { Userinfo, Profileauditlog } = request.getModels('xpaxr');

    const { userUuid } = request.params || {};
    const requestedForUser = await Userinfo.findOne({ where: { userUuid }});
    const ruserInfo = requestedForUser && requestedForUser.toJSON();
    const { userId: ruserId, active: oldActive } = ruserInfo || {};

    if(!ruserId)  return h.response({ error: true, message: 'No user found!'}).code(400);
    if(updateDetails.active === oldActive)  return h.response({ error: true, message: `The user is already ${ updateDetails.active === true ? 'active' : 'deactivated'}!`}).code(400);

    if(updateDetails.active === false){      
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
    
    await Userinfo.update(updateDetails, { where: { userUuid: userUuid }} );

    const updatedUinfo = await Userinfo.findOne({
        where:{ userUuid: userUuid },
        attributes: { exclude: ['createdAt', 'updatedAt']
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
  catch(error) {
    console.log(error.stack);
    return h.response({ error: true, message: 'Bad Request!' }).code(500);
  }
}

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
    const updateDetails = request.payload;
    const validUpdateRequests = [
      'active',      'firstName',
      'lastName',    'isAdmin',
      'tzid',        'primaryMobile',
      'roleId',      'privacyClause',
      'tandc',       'picture',
      'inTalentPool','allowSendEmail',
    ];
    const requestedUpdateOperations = Object.keys(updateDetails) || [];
    const isAllReqsValid = requestedUpdateOperations.every( req => validUpdateRequests.includes(req));
    if (!isAllReqsValid) {
      return h.response({ error: true, message: 'Invalid update request(s)'}).code(400);
    }

    const { Userinfo, Profileauditlog } = request.getModels('xpaxr');
    
    const { credentials } = request.auth || {};
    const userId = credentials.id;
    const userRecord = await Userinfo.findOne({ where: { userId } });
    const luser = userRecord && userRecord.toJSON();
    const { userId: luserId } = luser || {};
    
    const { userUuid } = request.params || {};
    const requestedForUser = await Userinfo.findOne({ where: { userUuid }}) || {};
    const { userId: rForUserId } = requestedForUser && requestedForUser.toJSON();

    if (luserId !== rForUserId) {    // when request is (not from self)
      return h.response({ error: true, message: 'Bad Request! You are not authorized!'}).code(403);
    }
    
    // upload picture to azure and use that generated link to save on db
    if(updateDetails.picture){
      const fileItem = updateDetails.picture;
      if(isArray(fileItem)) return h.response({ error: true, message: 'Send only one picture for upload!'}).code(400);
      const uploadRes = await uploadFile(fileItem, luserId, ['png', 'jpg', 'jpeg']);
      if(uploadRes.error) return h.response(uploadRes).code(400);
      
      updateDetails.picture = uploadRes.vurl;
    }
    
    await Userinfo.update( updateDetails, { where: { userUuid: userUuid }} );
    const updatedUinfo = await Userinfo.findOne({
        where:{ userUuid: userUuid },
        attributes: { exclude: ['createdAt', 'updatedAt']
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
  catch(error) {
    console.log(error.stack);
    return h.response({ error: true, message: 'Internal Server Error' }).code(500);
  }
}

const updatePassword = async (request, h) => {
  try{
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden' }).code(403);
    }
    const { credentials } = request.auth || {};
    const userId = credentials.id;
    const { oldPassword, password } = request.payload || {};
    const { User, Profileauditlog } = request.getModels('xpaxr');
    
    const userRecord = await User.findOne({ where: { userId } });
    const luser = userRecord && userRecord.toJSON();
    const { userId: luserId, userUuid, password: oldDBPassword } = luser || {};
    if(!luserId) h.response({ error: true, message: 'No user found!'}).code(400);

    if (password.length < 8) {
      return h.response({ error: true, message: 'Password must contain atleast 8 characters'}).code(400);
    } else if (password.length > 100) {
      return h.response({ error: true, message: 'Password should be atmost 100 characters'}).code(400);
    }

    const isPasswordMatching = bcrypt.compareSync(oldPassword, oldDBPassword);
    if (!isPasswordMatching) return h.response({ error: true, message: 'Old password did not match!'}).code(400);

    const hashedPassword = bcrypt.hashSync(password, 12);   // Hash the password
    await User.update({ password: hashedPassword }, { where: { userId }} );
    const updatedUser = await User.findOne({
        where:{ userUuid: userUuid },
        attributes: { exclude: ['createdAt', 'updatedAt']
      }
    });
    
    await Profileauditlog.create({ 
      affectedUserId: luserId,
      performerUserId: luserId,
      actionName: 'Update Password',
      actionType: 'UPDATE',
      actionDescription: `The user of userId ${luserId} has updated his own password`
    });

    return h.response({message: 'Password updation successful'}).code(200);
  }
  catch(error) {
    console.log(error.stack);
    return h.response({ error: true, message: 'Internal Server Error' }).code(500);
  }
}

const forgotPassword = async (request, h) => {
  try{
    const { email: rawEmail } = request.payload || {};
    if(!rawEmail) return h.response({error:true, message:'Please provide an email!'}).code(400);
    
    const email = rawEmail.toLowerCase();
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
    
    const { User, Userinfo, Profileauditlog, Requesttoken } = request.getModels('xpaxr');
    
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
    const { userId, actionType } = requestToken || {};

    const userRecord = await User.findOne({ where: { userId }});
    const user = userRecord && userRecord.toJSON();
    if (!user) { 
      return h.response({ error: true, message: 'Invalid URL!'}).code(400);
    };
    const hashedPassword = bcrypt.hashSync(password1, 12);        // Setting salt to 12.
    await User.update({ password: hashedPassword }, { where: { userId }});

    if( actionType === 'account-creation-reset-password') {
      await Userinfo.update({ active: true }, { where: { userId }});
    }

    await Profileauditlog.create({ 
      affectedUserId: userId,
      performerUserId: userId,
      actionName: 'Reset Password',
      actionType: 'UPDATE',
      actionDescription: `The user of userId ${userId} has reset his password`
    });

    return h.response({message: 'Password updation successful'}).code(200);
  }
  catch (error) {
    console.error(error.stack);
    return h.response({error: true, message: 'Internal Server Error!'}).code(500);
  }
}

const resendVerificationEmailBySuperadmin = async (request, h) => {
  try{
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden' }).code(403);
    }
    // Checking user type from jwt
    let luserTypeName = request.auth.artifacts.decoded.userTypeName;   
    if(luserTypeName !== 'superadmin') return h.response({error:true, message:'You are not authorized!'}).code(403);
    
    const { Emailtemplate, Userinfo, Companyinfo, Emaillog, Requesttoken } = request.getModels('xpaxr');
    
    const { credentials } = request.auth || {};
    const luserId = credentials.id;
    
    const { userId } = request.payload || {};
    if(!userId) return h.response({error:true, message:'Please provide a userId!'}).code(400);

    const userRecord = await Userinfo.findOne({ where: { userId }, attributes: { exclude: ['createdAt', 'updatedAt'] }});
    const userInfo = userRecord && userRecord.toJSON();
    const { email, active } = userInfo || {};
    if(!email) return h.response({error:true, message:'No user found!'}).code(400);
    if(active) return h.response({error:true, message:'Already verified!'}).code(400);

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
    const { active } = request.payload || {};
    
    if (requestKey.length !== 16) {     // Token length is 16.
      return h.response({ error: true, message: 'Invalid URL!'}).code(400);
    }  
    if (active !== true) {     
      return h.response({ error: true, message: 'Not a valid request!'}).code(400);
    }  
        
    const { User, Userinfo, Profileauditlog, Requesttoken } = request.getModels('xpaxr');
    
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
    if (luserInfo.active) { 
      return h.response({ error: true, message: 'Bad request! Email is already verified!'}).code(400);
    };

    await Userinfo.update({ active }, { where: { userId }});
    await Profileauditlog.create({ 
      affectedUserId: userId,
      performerUserId: userId,
      actionName: 'Verify Email',
      actionType: 'UPDATE',
      actionDescription: `The user of userId ${userId} has verified his email`
    });

    return h.response({message: 'Email Verification successful'}).code(200);
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
    // Checking user type from jwt
    let userTypeName = request.auth.artifacts.decoded.userTypeName;
    if(userTypeName !== 'candidate' && userTypeName !== 'mentor')   return h.response({error: true, message: 'You are not authorized!'}).code(403);

    const { credentials } = request.auth || {};
    const { id: userId } = credentials || {};

    const { responses } = request.payload || {};
    
    const { Userquesresponse, Mentorquesresponse } = request.getModels('xpaxr');
    const db1 = request.getDb('xpaxr');
    const sequelize = db1.sequelize;
    let data = []
    let createProfileResponse;
    let targetId;
    
    if (userTypeName === "candidate") {      
      // create profile for a candidate
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
        const { questionId, responseVal, timeTaken } = response;
        const res = { questionId, answer:responseVal.answer, timeTaken };
        resRecord.push(res);
      }
      
      createProfileResponse = resRecord;
      targetId = 1;      

    } else if (userTypeName  === 'mentor') {
      // create profile for a mentor
      for (const response of responses) {
        const { questionId, answer, timeTaken } = response || {};
        const record = { questionId, responseVal:{answer}, userId, timeTaken }
        data.push(record);
      }
      await Mentorquesresponse.bulkCreate(data, {updateOnDuplicate:["responseVal", "timeTaken"]});
      const quesResponses = await Mentorquesresponse.findAll({ where: { userId }});      
      const resRecord = [];
      for (let response of quesResponses) {
        response = response && response.toJSON();
        const { questionId, responseVal, timeTaken } = response;
        const res = { questionId, answer:responseVal.answer, timeTaken };
        resRecord.push(res);
      }
      createProfileResponse = resRecord;
      targetId = 3;      
    }
    
    // attaching isComplete property
    const sqlStmtForUserQues = `select count(*) from hris.questionnaire q
    inner join hris.questiontarget qt on qt.target_id=q.question_target_id
    where qt.target_id=:targetId`;  

    const allSQLUserQuesCount = await sequelize.query(sqlStmtForUserQues, {
        type: QueryTypes.SELECT,
        replacements: { 
          targetId,
        },
    });
    const userQuesCount = allSQLUserQuesCount[0].count;
    
    const sqlStmtForUserRes = `select count(*) 
      from hris.userquesresponses uqr
      where uqr.user_id=:userId`;        

    const allSQLUserResCount = await sequelize.query(sqlStmtForUserRes, {
        type: QueryTypes.SELECT,
        replacements: { 
          userId,            
        },
    });
    const userResCount = allSQLUserResCount[0].count;

    const isComplete = userQuesCount === userResCount;
    return h.response({ isComplete, responses: createProfileResponse }).code(200);
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
    let userType = request.auth.artifacts.decoded.userTypeName; 
    
    const { credentials } = request.auth || {};
    const { id: userId } = credentials || {};
    const { Userquesresponse, Mentorquesresponse } = request.getModels('xpaxr');
    
    let quesResponses = [];
    let targetId = 1;
    let answerTable = 'userquesresponses';
    
    if(userType === 'candidate') {
      quesResponses = await Userquesresponse.findAll({ where: { userId }});
      targetId = 1;
      answerTable = 'userquesresponses';
    }    
    if(userType === 'mentor') {
      quesResponses = await Mentorquesresponse.findAll({ where: { userId }});
      targetId = 3;
      answerTable = 'mentorquesresponses';
    } 

    const responses = [];
    for (let response of quesResponses) {
      const responseInfo = response && response.toJSON();
      const { questionId, responseVal, timeTaken } = responseInfo || {};
      const res = { questionId, answer:responseVal.answer, timeTaken };
      responses.push(res);
    }

    // attaching isComplete property
    const db1 = request.getDb('xpaxr');
    const sequelize = db1.sequelize;    

    const sqlStmtForUserQuesCount = `select count(*) from hris.questionnaire q
    inner join hris.questiontarget qt on qt.target_id=q.question_target_id
    where qt.target_id=:targetId`;  

    const allSQLUserQuesCount = await sequelize.query(sqlStmtForUserQuesCount, {
        type: QueryTypes.SELECT,
        replacements: { 
          targetId,
        },
    });
    const userQuesCount = allSQLUserQuesCount[0].count;
    
    const sqlStmtForUserResCount = `select count(*) 
      from hris.${ answerTable } uqr
      where uqr.user_id=:userId`;        

    const allSQLUserResCount = await sequelize.query(sqlStmtForUserResCount, {
        type: QueryTypes.SELECT,
        replacements: { 
          userId, 
        },
    });
    const userResCount = allSQLUserResCount[0].count;

    let isComplete = userQuesCount === userResCount;

    if(userType !== 'mentor' && userType !== 'candidate') isComplete = true;
    return h.response({ isComplete, responses }).code(200);
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
      return h.response({ error: true, message: 'Please provide the necessary details!'}).code(400);
    }  

    const { Usermeta, Profileauditlog } = request.getModels('xpaxr');        

    const userMetaRecord = await Usermeta.findOne({ where: { userId, metaKey }, attributes: { exclude: ['createdAt', 'updatedAt'] }});
    const userMetaData = userMetaRecord && userMetaRecord.toJSON();
    const { umetaId, metaValue: oldMetaValue } = userMetaData || {};

    if(!umetaId){      
      await Usermeta.create({ userId, metaKey, metaValue });
      await Profileauditlog.create({ 
        affectedUserId: userId,
        performerUserId: userId,
        actionName: 'Create User metadata',
        actionType: 'CREATE',
        actionDescription: `The user of userId ${userId} has created the metadata of metaKey ${metaKey} with the value of ${metaValue}`
      });
    } else {
      if(metaValue === oldMetaValue) h.response({ error: true, message: 'This metaKey already has this metaValue!' }).code(400);
      await Usermeta.update({ metaKey, metaValue }, { where: { userId: userId, umetaId }} );
      await Profileauditlog.create({ 
        affectedUserId: userId,
        performerUserId: userId,
        actionName: 'Update User metadata',
        actionType: 'UPDATE',
        actionDescription: `The user of userId ${userId} has updated the metadata of metaKey ${metaKey}. Previous value was ${oldMetaValue}, Current value is ${metaValue}`
      });
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

const getWebchatToken = async (request, h) => {
  try{
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden' }).code(403);
    }
    let luserTypeName = request.auth.artifacts.decoded.userTypeName;   
    const { credentials } = request.auth || {};
    
    let endpoint;
    let secret;

    if (luserTypeName === "mentor"){
      endpoint = config.webchat.empauwerUs.endpoint;
      secret = config.webchat.empauwerUs.secret;
    }else if (luserTypeName === "candidate"){
      endpoint = config.webchat.empauwerMe.endpoint;
      secret = config.webchat.empauwerMe.secret;
    }else{
      h.response({"error":true,"message":"Only candidate or mentor can access chat bot"}).code(400)
    }
    let res = await axios.post(endpoint,{},
      {
        "headers":{"Authorization":`Bearer ${secret}`}
      }
    )
    return h.response(res.data).code(200);
  }
  catch(error) {
    console.error(error.stack);
    return h.response({ error: true, message: 'Bad Request!' }).code(500);
  }
}

module.exports = {
  createUser,
  createCompanySuperAdmin,

  getAllCompanyBySuperadmin,
  getAllUsersBySuperadmin,
  updateCompanyBySuperadmin,
  updateUserBySuperadmin,
    
  getUser, 
  updateUser, 
  updatePassword,
  forgotPassword, 
  resetPassword, 
  resendVerificationEmailBySuperadmin,
  verifyEmail,
  
  createProfile,
  getProfile, 
  getUserMetaData,
  updateMetaData,

  getQuestionnaire,
  getWebchatToken
};

