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
import { camelizeKeys } from '../utils/camelizeKeys';
import { update } from 'lodash';
const uploadFile = require('../utils/uploadFile');

const getAllCompanyNames = async (request, h) => {
  try {
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden' }).code(403);
    }
    const db1 = request.getDb('xpaxr');

    // get sql statement for getting jobs or jobs count
    const sqlStmt = `
        select 
          c.company_id, c.display_name as company_name
        from hris.company c`;

    const sequelize = db1.sequelize;
    const allCompaniesRAW = await sequelize.query(sqlStmt, {
      type: QueryTypes.SELECT,
    });

    const allCompanies = camelizeKeys(allCompaniesRAW);

    return h.response({ companies: allCompanies }).code(200);
  }
  catch (error) {
    console.error(error.stack);
    return h.response({ error: true, message: 'Internal Server Error!' }).code(500);
  }
}

const getCompanyOptions = async (request, h) => {
  try {
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden' }).code(403);
    }
    const { Companyindustry } = request.getModels('xpaxr');
    const companyIndustries = await Companyindustry.findAll({ attributes: ['companyIndustryId', 'companyIndustryName'] });
    const responses = {
      industry: companyIndustries,
    };
    return h.response(responses).code(200);
  }
  catch (error) {
    console.error(error.stack);
    return h.response({ error: true, message: 'Internal Server Error!' }).code(500);
  }
}

const getOwnCompanyInfo = async (request, h) => {
  try {
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden' }).code(403);
    }
    // Checking user type from jwt
    let luserTypeName = request.auth.artifacts.decoded.userTypeName;
    if (luserTypeName !== 'companysuperadmin') return h.response({ error: true, message: 'You are not authorized!' }).code(403);

    const { credentials } = request.auth || {};
    const { id: userId } = credentials || {};

    const { Userinfo } = request.getModels('xpaxr');

    // get the company of the companysuperadmin
    const userRecord = await Userinfo.findOne({ where: { userId }, attributes: { exclude: ['createdAt', 'updatedAt'] } });
    const userProfileInfo = userRecord && userRecord.toJSON();
    const { companyId: luserCompanyId } = userProfileInfo || {};

    const db1 = request.getDb('xpaxr');

    const sqlStmt = `select 	
        ci.logo, ci.email_bg, ci.banner, c.*
      from hris.company c
        inner join hris.companyinfo ci on c.company_id=ci.company_id
      where c.company_id=:luserCompanyId`;

    const sequelize = db1.sequelize;
    const companyInfoRAW = await sequelize.query(sqlStmt, {
      type: QueryTypes.SELECT,
      replacements: {
        luserCompanyId,
      },
    });
    const companyInfo = camelizeKeys(companyInfoRAW)[0];
    const { companyId: foundCompanyId } = companyInfo || {};
    if (!foundCompanyId) return h.response({ error: true, message: 'No company found!' }).code(400);

    return h.response(companyInfo).code(200);
  }
  catch (error) {
    console.error(error.stack);
    return h.response({ error: true, message: 'Bad Request!' }).code(500);
  }
}

const getAnyCompanyInfo = async (request, h) => {
  try {
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden' }).code(403);
    }
    const { credentials } = request.auth || {};
    const { id: userId } = credentials || {};
    const { companyId } = request.params;

    const { Companyvisit } = request.getModels('xpaxr');
    const db1 = request.getDb('xpaxr');

    const sqlStmt = `select 	
        ci.logo, ci.email_bg, ci.banner, c.*
      from hris.company c
        inner join hris.companyinfo ci on c.company_id=ci.company_id
      where c.company_id=:companyId`;

    const sequelize = db1.sequelize;
    const companyInfoRAW = await sequelize.query(sqlStmt, {
      type: QueryTypes.SELECT,
      replacements: {
        companyId,
      },
    });
    const companyInfo = camelizeKeys(companyInfoRAW)[0];
    const { companyId: foundCompanyId } = companyInfo || {};
    if (!foundCompanyId) return h.response({ error: true, message: 'No company found!' }).code(400);

    // create company visit record
    await Companyvisit.create({ visitorId: userId, companyId: foundCompanyId });

    return h.response(companyInfo).code(200);
  }
  catch (error) {
    console.error(error.stack);
    return h.response({ error: true, message: 'Bad Request!' }).code(500);
  }
}

const getCompanyVisitCount = async (request, h) => {
  try {
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden' }).code(403);
    }
    const { credentials } = request.auth || {};
    const { id: userId } = credentials || {};

    // Checking user type from jwt
    let luserTypeName = request.auth.artifacts.decoded.userTypeName;
    if (luserTypeName !== 'companysuperadmin' && luserTypeName !== 'employer' && luserTypeName !== 'supervisor' && luserTypeName !== 'workbuddy') return h.response({ error: true, message: 'You are not authorized!' }).code(403);

    const { startDate: qStartDate, endDate: qEndDate } = request.query || {};

    const { Userinfo } = request.getModels('xpaxr');

    // get company of luser
    const userRecord = await Userinfo.findOne({ where: { userId } });
    const userInfo = userRecord && userRecord.toJSON();
    const { companyId: luserCompanyId } = userInfo || {};

    // ______QUERY PARAMETERS
    // custom date search query
    let lowerDateRange;
    let upperDateRange;
    let startDate = qStartDate;
    const endDate = qEndDate;
    if (!qStartDate && endDate) return h.response({ error: true, message: `You can't send endDate without startDate!` }).code(400);

    if (!qStartDate) {
      // get latest applications within last 14 days
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 14);
    }
    if (startDate) {
      if (startDate && !endDate) {
        lowerDateRange = new Date(startDate);
        upperDateRange = new Date(); //Now()
      }
      if (startDate && endDate) {
        lowerDateRange = new Date(startDate);
        upperDateRange = new Date(endDate);
      }

      const isValidDate = !isNaN(Date.parse(lowerDateRange)) && !isNaN(Date.parse(upperDateRange));
      if (!isValidDate) return h.response({ error: true, message: 'Invalid startDate or endDate query parameter!' }).code(400);
      const isValidDateRange = lowerDateRange.getTime() < upperDateRange.getTime();
      if (!isValidDateRange) return h.response({ error: true, message: 'endDate must be after startDate!' }).code(400);
    }

    const db1 = request.getDb('xpaxr');

    const sqlStmt = `select *
      from hris.companyvisit cv
      where cv.visited_at >= :lowerDateRange and cv.visited_at <= :upperDateRange
        and cv.company_id=:luserCompanyId
      order by cv.visited_at desc`;

    const sequelize = db1.sequelize;
    const companyVisitRecordsSQL = await sequelize.query(sqlStmt, {
      type: QueryTypes.SELECT,
      replacements: {
        luserCompanyId, lowerDateRange, upperDateRange
      },
    });
    const companyVisitRecords = camelizeKeys(companyVisitRecordsSQL);
    const uniqueVisitorIds = [];
    companyVisitRecords.forEach(item => uniqueVisitorIds.push(Number(item.visitorId)));
    const uniqueVisitRecords = companyVisitRecords.filter((v, i, a) => a.findIndex(t => (t.visitorId === v.visitorId)) === i)

    const uniqueVisits = uniqueVisitRecords.length;

    return h.response({ companyVisitCount: uniqueVisits }).code(200);
  }
  catch (error) {
    console.error(error.stack);
    return h.response({ error: true, message: 'Bad Request!' }).code(500);
  }
}

const getCompanyWorkAccommodations = async (request, h) => {
  try {
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden' }).code(403);
    }
    const { credentials } = request.auth || {};
    const { id: userId } = credentials || {};
    // Checking user type from jwt
    let luserTypeName = request.auth.artifacts.decoded.userTypeName;
    if (luserTypeName !== 'companysuperadmin' && luserTypeName !== 'employer' && luserTypeName !== 'supervisor' && luserTypeName !== 'workbuddy') return h.response({ error: true, message: 'You are not authorized!' }).code(403);

    const { Userinfo } = request.getModels('xpaxr');
    // finding the company of the luser
    const userRecord = await Userinfo.findOne({ where: { userId } });
    const userInfo = userRecord && userRecord.toJSON();
    const { companyId: luserCompanyId } = userInfo || {};

    const db1 = request.getDb('xpaxr');

    const sqlStmt = `select
      wa.workaccommodation_title, wa.workaccommodation_description,
      cwa.company_workaccommodation_id, cwa.company_id, cwa.status
    from hris.companyworkaccommodations cwa
      inner join hris.workaccommodations wa on wa.workaccommodation_id=cwa.workaccommodation_id
    where cwa.company_id=:luserCompanyId`;

    const sequelize = db1.sequelize;
    const cWorkAccommodationsSQL = await sequelize.query(sqlStmt, {
      type: QueryTypes.SELECT,
      replacements: {
        luserCompanyId,
      },
    });
    const workAccommodations = camelizeKeys(cWorkAccommodationsSQL);
    return h.response({ workAccommodations }).code(200);
  }
  catch (error) {
    console.error(error.stack);
    return h.response({ error: true, message: 'Internal Server Error!' }).code(500);
  }
}

const updateCompanyWorkaccommodationStatus = async (request, h) => {
  try {
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden' }).code(403);
    }
    // Checking user type from jwt
    let luserTypeName = request.auth.artifacts.decoded.userTypeName;
    if (luserTypeName !== 'companysuperadmin') return h.response({ error: true, message: 'You are not authorized!' }).code(403);

    const { credentials } = request.auth || {};
    const { id: userId } = credentials || {};

    const { companyWorkaccommodationId } = request.params || {};
    const { status } = request.payload || {};

    const validUpdateRequests = ['status'];
    const requestedUpdateOperations = Object.keys(request.payload) || [];
    const isAllReqsValid = requestedUpdateOperations.every(req => validUpdateRequests.includes(req));
    if (!isAllReqsValid) return h.response({ error: true, message: 'Invalid update request(s)' }).code(400);

    const validStatus = ['complete', 'in progress', 'not applicable'];
    if (!validStatus.includes(status)) return h.response({ error: true, message: 'Invalid status' }).code(400);

    const { Userinfo, Companyworkaccommodation } = request.getModels('xpaxr');

    // get the company of the recruiter
    const userRecord = await Userinfo.findOne({ where: { userId }, attributes: { exclude: ['createdAt', 'updatedAt'] } });
    const userProfileInfo = userRecord && userRecord.toJSON();
    const { companyId: luserCompanyId, firstName: luserFirstName } = userProfileInfo || {};

    const cwaRecord = await Companyworkaccommodation.findOne({ where: { companyWorkaccommodationId } });
    const cwaData = cwaRecord && cwaRecord.toJSON();
    const { companyWorkaccommodationId: existingCwaId, companyId: creatorCompanyId, status: oldStatus } = cwaData || {};

    if (!existingCwaId) return h.response({ error: true, message: `No Work accommodation found!` }).code(400);
    if (luserCompanyId !== creatorCompanyId) return h.response({ error: true, message: `You are not authorized!` }).code(403);

    if (oldStatus === status) return h.response({ error: true, message: 'Already has this status!' }).code(400);

    await Companyworkaccommodation.update({ status }, { where: { companyWorkaccommodationId } });
    const updatedRecord = await Companyworkaccommodation.findOne({ where: { companyWorkaccommodationId } });

    return h.response(updatedRecord).code(200);
  }
  catch (error) {
    console.error(error.stack);
    return h.response({ error: true, message: 'Bad Request' }).code(400);
  }
}

const updateCompanyProfile = async (request, h) => {
  try {
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden' }).code(403);
    }

    // Checking user type from jwt
    let luserTypeName = request.auth.artifacts.decoded.userTypeName;
    if (luserTypeName !== 'companysuperadmin') return h.response({ error: true, message: 'You are not authorized!' }).code(403);

    const updateDetails = request.payload;
    const {
      companyName, website, description,
      companyIndustryId, noOfEmployees, foundedYear,
      emailBg, supervisorRandR, workbuddyRandR,
      isCompanyOnboardingComplete, countryId,
      leadershipMessage,
    } = updateDetails || {};
    const { companyUuid } = request.params || {};
    const { Company, Companyinfo, Country, Companyauditlog, Userinfo } = request.getModels('xpaxr');

    const validUpdateRequests = [
      'companyName', 'website',
      'description', 'companyIndustryId',
      'noOfEmployees', 'foundedYear',
      'logo', 'banner', 'emailBg',
      'supervisorRandR', 'workbuddyRandR',
      'isCompanyOnboardingComplete', 'countryId',
      'leadershipMessage',
    ];
    const requestedUpdateOperations = Object.keys(updateDetails) || [];
    const isAllReqsValid = requestedUpdateOperations.every(req => validUpdateRequests.includes(req));
    if (!isAllReqsValid) return h.response({ error: true, message: 'Invalid update request(s)' }).code(400);

    const { credentials } = request.auth || {};
    const { id: userId } = credentials || {};
    const userRecord = await Userinfo.findOne({ where: { userId } });
    const luser = userRecord && userRecord.toJSON();
    const { userId: luserId, companyId: luserCompanyId } = luser || {};

    const requestedForCompany = await Company.findOne({ where: { companyUuid } });
    const rCompanyInfo = requestedForCompany && requestedForCompany.toJSON();
    const { companyId: rCompanyId } = rCompanyInfo || {};

    if (!rCompanyId) return h.response({ error: true, message: 'No Company found!' }).code(400);
    if (luserCompanyId !== rCompanyId) {    // when request is (not from self-company)
      return h.response({ error: true, message: 'Bad Request! You are not authorized!' }).code(403);
    }

    if (countryId) {
      const countryRecord = await Country.findOne({ where: { countryId } });
      const countryData = countryRecord && countryRecord.toJSON();
      const { countryId: existingCountryId } = countryData || {};
      if (!existingCountryId) return h.response({ error: true, message: 'No country found for this given country id!' }).code(403);
    }

    // upload picture to azure and use that generated link to save on db
    if (updateDetails.logo) {
      const fileItem = updateDetails.logo;
      if (isArray(fileItem)) return h.response({ error: true, message: 'Send only one picture for upload!' }).code(400);
      const uploadRes = await uploadFile(fileItem, rCompanyId, ['png', 'jpg', 'jpeg']);
      if (uploadRes.error) return h.response(uploadRes).code(400);

      updateDetails.logo = uploadRes.vurl;
    }

    if (updateDetails.banner) {
      const fileItem = updateDetails.banner;
      if (isArray(fileItem)) return h.response({ error: true, message: 'Send only one picture for upload!' }).code(400);
      const uploadRes = await uploadFile(fileItem, rCompanyId, ['png', 'jpg', 'jpeg']);
      if (uploadRes.error) return h.response(uploadRes).code(400);

      updateDetails.banner = uploadRes.vurl;
    }

    if (emailBg) {
      const RegEx = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
      const isHexCode = RegEx.test(emailBg);
      if (!isHexCode) return h.response({ error: true, message: 'emailBg is NOT a valid hex code!' }).code(400);
    }

    await Company.update(
      {
        companyName: companyName?.toLowerCase().trim(),
        displayName: companyName,
        website, description, companyIndustryId,
        noOfEmployees, foundedYear, supervisorRandR, workbuddyRandR,
        isCompanyOnboardingComplete,
        countryId, leadershipMessage
      }, { where: { companyId: rCompanyId } }
    );
    const companyInfoUpdateDetails = { logo: updateDetails.logo, banner: updateDetails.banner, emailBg };
    await Companyinfo.update(companyInfoUpdateDetails, { where: { companyId: rCompanyId } });

    await Companyauditlog.create({
      affectedCompanyId: rCompanyId,
      performerUserId: userId,
      actionName: 'Update a Company',
      actionType: 'UPDATE',
      actionDescription: `The user of userId ${userId} has updated the company of companyId ${rCompanyId}`,
    });

    // find all company info (using SQL to avoid nested ugliness in the response)
    const db1 = request.getDb('xpaxr');
    const sqlStmt = `select * from hris.company c
        inner join hris.companyinfo ci on ci.company_id=c.company_id
        where c.company_id=:rCompanyId`;

    const sequelize = db1.sequelize;
    const SQLcompanyInfo = await sequelize.query(sqlStmt, {
      type: QueryTypes.SELECT,
      replacements: {
        rCompanyId
      },
    });
    const responses = camelizeKeys(SQLcompanyInfo)[0];
    delete responses.companyName;
    delete responses.active;

    return h.response(responses).code(200);
  } catch (error) {
    console.error(error.stack);
    return h.response({
      error: true, message: 'Bad Request!'
    }).code(400);
  }
};

const createCompanyStaff = async (request, h) => {
  try {
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden' }).code(403);
    }

    // Checking user type from jwt
    let luserTypeName = request.auth.artifacts.decoded.userTypeName;
    if (luserTypeName !== 'companysuperadmin') {
      return h.response({ error: true, message: 'You are not authorized!' }).code(403);
    }

    const { User, Userinfo, Usertype, Userrole, Profileauditlog, Emailtemplate, Companyinfo, Emaillog, Requesttoken } = request.getModels('xpaxr');
    const { email, password, accountType } = request.payload || {};

    if (!(email && password && accountType)) {
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
    const validAccountTypes = ['employer', 'supervisor', 'workbuddy', 'companysuperadmin', 'supportstaff', 'leadership'];
    if (!validAccountTypes.includes(accountType)) {
      return h.response({ error: true, message: 'Invalid account type' }).code(400);
    }

    // Checking if User already Exists
    const alreadyExistingUserRecord = await User.findOne({ where: { email } });
    const record = alreadyExistingUserRecord && alreadyExistingUserRecord.toJSON();
    if (record) { return h.response({ error: true, message: 'Account with this email already exists!' }).code(400); }

    const { credentials } = request.auth || {};
    const { id: csaUserId } = credentials || {};

    // get the company of the companysuperadmin
    const userRecord = await Userinfo.findOne({ where: { userId: csaUserId }, attributes: { exclude: ['createdAt', 'updatedAt'] } });
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

    const isDormantType = accountType === 'leadership' || accountType === 'supportstaff';
    const uidata = await Userinfo.create({
      userId,
      userUuid,
      email: emailLower,
      roleId,
      userTypeId,
      active: isDormantType ? true : false,
      firstName: email.split('@')[0],
      companyId,
      companyUuid,
    });
    delete udata.dataValues.password; //remove hasedpassword when returning

    await Profileauditlog.create({
      affectedUserId: userId,
      performerUserId: csaUserId,
      actionName: 'Create a User',
      actionType: 'CREATE',
      actionDescription: `The user of userId ${csaUserId} has created the user of userId ${userId}, with the accountType of ${accountType}`
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
      templateName: 'company-account-creation',
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

const updateCompanyStaff = async (request, h) => {
  try {
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden' }).code(403);
    }
    const { credentials } = request.auth || {};
    const userId = credentials.id;

    // Checking user type from jwt
    let luserTypeName = request.auth.artifacts.decoded.userTypeName;
    if (luserTypeName !== 'companysuperadmin') return h.response({ error: true, message: 'You are not authorized!' }).code(403);

    const updateDetails = request.payload;
    const { userType } = updateDetails || {};
    const validUpdateRequests = [
      'active', 'userType', 'email', 'password', 'firstName', 'lastName',
    ];
    if (
      (updateDetails.email && !updateDetails.password) ||
      (!updateDetails.email && updateDetails.password)
    ) return h.response({ error: true, message: 'Please provide both email and password!' }).code(400);

    const requestedUpdateOperations = Object.keys(request.payload) || [];
    const isAllReqsValid = requestedUpdateOperations.every(req => validUpdateRequests.includes(req));
    if (!isAllReqsValid || (updateDetails.active && typeof updateDetails.active !== 'boolean')) return h.response({ error: true, message: 'Invalid update request(s)' }).code(400);

    // Checking account type
    const validAccountTypes = ['employer', 'supervisor', 'workbuddy', 'companysuperadmin'];
    if (userType && !validAccountTypes.includes(userType)) return h.response({ error: true, message: 'Invalid account type' }).code(400);

    const { User, Userinfo, Usertype, Profileauditlog, Userrole, Requesttoken, Emailtemplate, Companyinfo, Emaillog } = request.getModels('xpaxr');

    if (userType) {
      const userTypeRecord = await Usertype.findOne({ where: { userTypeName: userType } });
      const userTypeInfo = userTypeRecord && userTypeRecord.toJSON();
      const { userTypeId: nUserTypeId } = userTypeInfo || {};

      const userRoleRecord = await Userrole.findOne({ where: { roleName: userType } });
      const userRoleInfo = userRoleRecord && userRoleRecord.toJSON();
      const { roleId: nRoleId } = userRoleInfo || {};

      updateDetails.userTypeId = nUserTypeId;
      updateDetails.roleId = nRoleId
    }

    const userRecord = await Userinfo.findOne({ where: { userId } });
    const luser = userRecord && userRecord.toJSON();
    const { userId: luserId, isAdmin, companyId: luserCompanyId } = luser || {};

    const { userUuid } = request.params || {};
    const requestedForUser = await Userinfo.findOne({ where: { userUuid } });;
    const requestedForUserInfo = requestedForUser && requestedForUser.toJSON();
    const { userId: staffUserId, companyId: ruserCompanyId } = requestedForUserInfo || {};


    if (!staffUserId) return h.response({ error: true, message: `No user found!` }).code(400);
    if (luserCompanyId !== ruserCompanyId) {
      return h.response({ error: true, message: 'Bad Request! You are not authorized.' }).code(403);
    }
    
    if (updateDetails.active === false) {
      const db1 = request.getDb('xpaxr');
      const sqlStmt = `DELETE
        from hris.accesstoken ato          
        where ato.user_id= :staffUserId`;

      const sequelize = db1.sequelize;
      const ares = await sequelize.query(sqlStmt, {
        type: QueryTypes.SELECT,
        replacements: { staffUserId },
      });
    }

    await Userinfo.update(updateDetails, { where: { userUuid: userUuid } });
    if (updateDetails.email) {
      const hashedPassword = bcrypt.hashSync(updateDetails.password, 12);   // Hash the password
      const emailLower = updateDetails.email.toLowerCase().trim();
      await User.update({ email: emailLower, password: hashedPassword }, { where: { userUuid } });

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
        emails: [emailLower],
        email: emailLower,
        password: updateDetails.password,
        ccEmails: [],
        templateName: 'company-account-creation',
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
    }
    const updatedUinfo = await Userinfo.findOne({
      where: { userUuid: userUuid },
      attributes: {
        exclude: ['createdAt', 'updatedAt']
      }
    });
    const uinfo = updatedUinfo && updatedUinfo.toJSON();

    await Profileauditlog.create({
      affectedUserId: staffUserId,
      performerUserId: userId,
      actionName: 'Update a User',
      actionType: 'UPDATE',
      actionDescription: `The user of userId ${userId} has updated the user of userId ${staffUserId}`
    });

    return h.response(uinfo).code(200);
  }
  catch (error) {
    console.log(error.stack);
    return h.response({ error: true, message: 'Internal Server Error' }).code(500);
  }
}

const getCompanyStaff = async (request, h) => {
  try {
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden' }).code(403);
    }
    // Checking user type from jwt
    let luserTypeName = request.auth.artifacts.decoded.userTypeName;
    if (luserTypeName !== 'companysuperadmin') return h.response({ error: true, message: 'You are not authorized!' }).code(403);

    const { credentials } = request.auth || {};
    const userId = credentials.id;

    const { Userinfo } = request.getModels('xpaxr');
    // get the company of the recruiter
    const userRecord = await Userinfo.findOne({ where: { userId }, attributes: { exclude: ['createdAt', 'updatedAt'] } });
    const userProfileInfo = userRecord && userRecord.toJSON();
    const { companyId } = userProfileInfo || {};

    const { limit, offset, sort, search, userType, excludeUserType } = request.query;
    const searchVal = `%${search ? search.toLowerCase() : ''}%`;

    // Checking user type
    const validAccountTypes = ['employer', 'supervisor', 'workbuddy', 'companysuperadmin', 'leadership', 'supportstaff'];
    const isUserTypeQueryValid = (userType && isArray(userType)) ? (
      userType.every(req => validAccountTypes.includes(req))
    ) : validAccountTypes.includes(userType);
    if (userType && !isUserTypeQueryValid) return h.response({ error: true, message: 'Invalid userType query parameter!' }).code(400);

    const isExcludeQueryValid = (excludeUserType && isArray(excludeUserType)) ? (
      excludeUserType.every(req => validAccountTypes.includes(req))
    ) : validAccountTypes.includes(excludeUserType);

    if (excludeUserType && !isExcludeQueryValid) return h.response({ error: true, message: 'Invalid exclude query parameter!' }).code(400);

    // sort query
    let [sortBy, sortType] = sort ? sort.split(':') : ['first_name', 'asc'];
    if (!sortType) sortType = 'asc';
    const validSorts = ['first_name', 'last_name'];
    const isSortReqValid = validSorts.includes(sortBy);

    const sortTypeLower = sortType.toLowerCase();
    const validSortTypes = ['asc', 'desc'];
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

    // get sql statement for getting all company staff or its count        
    const filters = { search, sortBy, sortType, userType, excludeUserType }
    function getSqlStmt(queryType, obj = filters) {
      const { search, sortBy, sortType, userType, excludeUserType } = obj;
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
                inner join hris.company c on c.company_id=ui.company_id
                inner join hris.userrole ur on ur.role_id=ui.role_id
                inner join hris.usertype ut on ut.user_type_id=ui.user_type_id
              where ui.company_id=:companyId`;

      // filters
      if (excludeUserType) {
        sqlStmt += isArray(excludeUserType) ? ` and not ut.user_type_name in (:excludeUserType)` : ` and not ut.user_type_name=:excludeUserType`;
      }
      if (userType) {
        sqlStmt += isArray(userType) ? ` and ut.user_type_name in (:userType)` : ` and ut.user_type_name=:userType`;
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
    const allSQLCompanyStaff = await sequelize.query(getSqlStmt(), {
      type: QueryTypes.SELECT,
      replacements: {
        companyId,
        userType, excludeUserType,
        limitNum, offsetNum,
        searchVal,
      },
    });
    const allSQLCompanyStaffCount = await sequelize.query(getSqlStmt('count'), {
      type: QueryTypes.SELECT,
      replacements: {
        companyId,
        userType, excludeUserType,
        limitNum, offsetNum,
        searchVal,
      },
    });
    const allCompanyStaff = camelizeKeys(allSQLCompanyStaff);

    const paginatedResponse = { count: allSQLCompanyStaffCount[0].count, staff: allCompanyStaff };
    return h.response(paginatedResponse).code(200);
  }
  catch (error) {
    console.error(error.stack);
    return h.response({ error: true, message: 'Bad Request!' }).code(500);
  }
}

const getFellowCompanyStaff = async (request, h) => {
  try {
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden' }).code(403);
    }
    // Checking user type from jwt
    let luserTypeName = request.auth.artifacts.decoded.userTypeName;
    if (luserTypeName !== 'employer' && luserTypeName !== 'supervisor' && luserTypeName !== 'workbuddy' && luserTypeName !== 'companysuperadmin') return h.response({ error: true, message: 'You are not authorized!' }).code(403);

    const { credentials } = request.auth || {};
    const userId = credentials.id;

    const { Userinfo } = request.getModels('xpaxr');
    // get the company of the recruiter
    const userRecord = await Userinfo.findOne({ where: { userId }, attributes: { exclude: ['createdAt', 'updatedAt'] } });
    const userProfileInfo = userRecord && userRecord.toJSON();
    const { companyId } = userProfileInfo || {};

    const { sort, search, userType, exclude } = request.query;
    const searchVal = `%${search ? search.toLowerCase() : ''}%`;

    // sort query
    let [sortBy, sortType] = sort ? sort.split(':') : ['first_name', 'asc'];
    if (!sortType) sortType = 'asc';
    const validSorts = ['first_name', 'last_name'];
    const isSortReqValid = validSorts.includes(sortBy);

    const sortTypeLower = sortType.toLowerCase();
    const validSortTypes = ['asc', 'desc'];
    const isSortTypeReqValid = validSortTypes.includes(sortTypeLower);

    if (!isSortReqValid || !isSortTypeReqValid) return h.response({ error: true, message: 'Invalid sort query parameter!' }).code(400);

    const validAccountTypes = ['employer', 'supervisor', 'workbuddy'];
    const isUserTypeQueryValid = (userType && isArray(userType)) ? (
      userType.every(req => validAccountTypes.includes(req))
    ) : validAccountTypes.includes(userType);

    if (userType && !isUserTypeQueryValid) return h.response({ error: true, message: 'Invalid userType query parameter!' }).code(400);

    const db1 = request.getDb('xpaxr');
    // get sql statement for getting all company staff or its count        
    const filters = { search, sortBy, sortType, userType, exclude }
    function getSqlStmt(queryType, obj = filters) {
      const { search, sortBy, sortType, userType, exclude } = obj;
      let sqlStmt;
      const type = queryType && queryType.toLowerCase();
      if (type === 'count') {
        sqlStmt = `select count(*)`;
      } else {
        sqlStmt = `select
                ui.first_name, ui.last_name, ui.email, ui.user_id, ur.role_name, ut.user_type_name`;
      }

      sqlStmt += `
              from hris.userinfo ui
                inner join hris.userrole ur on ur.role_id=ui.role_id
                inner join hris.usertype ut on ut.user_type_id=ui.user_type_id
              where ui.company_id=:companyId and not ui.user_id=:userId and ui.active=true`;

      // filters
      if (exclude) {
        sqlStmt += isArray(exclude) ? ` and not ui.user_id in (:exclude)` : ` and not ui.user_id=:exclude`;
      }
      if (userType) {
        sqlStmt += isArray(userType) ? ` and ut.user_type_name in (:userType)` : ` and ut.user_type_name=:userType`;
      } else {
        sqlStmt += ` and ut.user_type_name in ('employer', 'supervisor', 'workbuddy')`;
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
      };

      return sqlStmt;
    }

    const sequelize = db1.sequelize;
    const allSQLCompanyStaff = await sequelize.query(getSqlStmt(), {
      type: QueryTypes.SELECT,
      replacements: {
        userId,
        companyId,
        userType,
        searchVal,
        exclude,
      },
    });
    const allCompanyStaff = camelizeKeys(allSQLCompanyStaff);

    const responses = { staff: allCompanyStaff };
    return h.response(responses).code(200);
  }
  catch (error) {
    console.error(error.stack);
    return h.response({ error: true, message: 'Bad Request!' }).code(500);
  }
}

const resendCompanyVerificationEmail = async (request, h) => {
  try {
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden' }).code(403);
    }
    // Checking user type from jwt
    let luserTypeName = request.auth.artifacts.decoded.userTypeName;
    if (luserTypeName !== 'companysuperadmin') return h.response({ error: true, message: 'You are not authorized!' }).code(403);

    const { User, Emailtemplate, Userinfo, Companyinfo, Emaillog, Requesttoken } = request.getModels('xpaxr');

    const { credentials } = request.auth || {};
    const luserId = credentials.id;

    const luserRecord = await Userinfo.findOne({ where: { userId: luserId }, attributes: { exclude: ['createdAt', 'updatedAt'] } });
    const { companyId } = luserRecord && luserRecord.toJSON();

    const { userId } = request.payload || {};
    if (!userId) return h.response({ error: true, message: 'Please provide a userId!' }).code(400);

    const userRecord = await Userinfo.findOne({ where: { userId, companyId }, attributes: { exclude: ['createdAt', 'updatedAt'] } });
    const userInfo = userRecord && userRecord.toJSON();
    const { email, active } = userInfo || {};
    if (!email) return h.response({ error: true, message: 'No staff found!' }).code(400);
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
      actionType: 'reset-password'
    });
    const reqToken = reqTokenRecord && reqTokenRecord.toJSON();

    let resetLink = getDomainURL();
    resetLink += `/reset-password?token=${token}`;

    const emailData = {
      emails: [email],
      email: email,
      ccEmails: [],
      templateName: 'company-account-creation',
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

const getAllJobsForAParticularCompany = async (request, h) => {
  try {
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden' }).code(403);
    }
    const { credentials } = request.auth || {};
    const { id: userId } = credentials || {};

    const { Company, Jobapplication } = request.getModels('xpaxr');

    // Checking user type from jwt
    let luserTypeName = request.auth.artifacts.decoded.userTypeName;
    const { companyId } = request.params;

    const companyRecord = await Company.findOne({ where: { companyId } });
    const companyInfo = companyRecord && companyRecord.toJSON();
    const { companyId: existingCompanyId } = companyInfo || {};

    if (!existingCompanyId) return h.response({ error: true, message: 'No company found for this companyId!' }).code(400);

    const { limit, offset, jobTypeId, jobFunctionId, jobLocationId, jobIndustryId, minExp, sort, startDate, endDate, search } = request.query;
    const searchVal = `%${search ? search.toLowerCase() : ''}%`;

    // sort query
    let [sortBy, sortType] = sort ? sort.split(':') : ['created_at', 'desc'];
    if (!sortType && sortBy !== 'created_at') sortType = 'asc';
    if (!sortType && sortBy === 'created_at') sortType = 'desc';

    const validSorts = ['created_at', 'job_name'];
    const isSortReqValid = validSorts.includes(sortBy);
    const validSortTypes = ['asc', 'desc'];
    const isSortTypeReqValid = validSortTypes.includes(sortType.toLowerCase());

    // pagination query
    const limitNum = limit ? Number(limit) : 10;
    const offsetNum = offset ? Number(offset) : 0;

    // query validation
    if (isNaN(limitNum)) return h.response({ error: true, message: 'Invalid limit query parameter! The limit query parameter must be a number!' }).code(400);
    if (isNaN(offsetNum)) return h.response({ error: true, message: 'Invalid offset query parameter! The offset query parameter must be a number!' }).code(400);

    if (!sortBy || !isSortReqValid) return h.response({ error: true, message: 'Invalid sort query parameter!' }).code(400);
    if (!isSortTypeReqValid) return h.response({ error: true, message: 'Invalid sort query parameter! Sort type is invalid, it should be either "asc" or "desc"!' }).code(400);

    if (limitNum < 0) return h.response({ error: true, message: 'Limit must be greater than 0!' }).code(400);
    if (limitNum > 100) return h.response({ error: true, message: 'Limit must not exceed 100!' }).code(400);

    // custom date search query
    let lowerDateRange;
    let upperDateRange;
    if (!startDate && endDate) return h.response({ error: true, message: `You can't send endDate without startDate!` }).code(400);

    if (startDate) {
      if (startDate && !endDate) {
        lowerDateRange = new Date(startDate);
        upperDateRange = new Date(); //Now()
      }
      if (startDate && endDate) {
        lowerDateRange = new Date(startDate);
        upperDateRange = new Date(endDate);
      }

      const isValidDate = !isNaN(Date.parse(lowerDateRange)) && !isNaN(Date.parse(upperDateRange));
      if (!isValidDate) return h.response({ error: true, message: 'Invalid startDate or endDate query parameter!' }).code(400);
      const isValidDateRange = lowerDateRange.getTime() < upperDateRange.getTime();
      if (!isValidDateRange) return h.response({ error: true, message: 'endDate must be after startDate!' }).code(400);
    }

    const db1 = request.getDb('xpaxr');
    const filters = { jobTypeId, jobFunctionId, jobIndustryId, jobLocationId, minExp, search, sortBy, sortType, startDate };

    // get sql statement for getting jobs or jobs count      
    const timeNow = new Date();
    function getSqlStmt(queryType, obj = filters) {
      const { jobTypeId, jobFunctionId, jobIndustryId, jobLocationId, minExp, search, sortBy, sortType, startDate } = obj;
      let sqlStmt;
      const type = queryType && queryType.toLowerCase();
      if (type === 'count') {
        sqlStmt = `select count(*)`;
      } else {
        sqlStmt = `select
                  jn.job_name, j.*, jt.*, jf.*,ji.*,jl.*,c.display_name as company_name`;
      }

      sqlStmt += `
          from hris.jobs j
              inner join hris.jobname jn on jn.job_name_id=j.job_name_id
              inner join hris.company c on c.company_id=j.company_id
              inner join hris.jobtype jt on jt.job_type_id=j.job_type_id                
              inner join hris.jobfunction jf on jf.job_function_id=j.job_function_id                
              inner join hris.jobindustry ji on ji.job_industry_id=j.job_industry_id
              inner join hris.joblocation jl on jl.job_location_id=j.job_location_id
          where j.active=true and j.is_deleted=false 
              and j.is_private=false and j.company_id=:companyId and j.close_date > :timeNow`;

      if (startDate) sqlStmt += ` and j.created_at >= :lowerDateRange and j.created_at <= :upperDateRange`;
      // filters
      if (jobTypeId) {
        sqlStmt += isArray(jobTypeId) ? ` and j.job_type_id in (:jobTypeId)` : ` and j.job_type_id=:jobTypeId`;
      }
      if (jobFunctionId) {
        sqlStmt += isArray(jobFunctionId) ? ` and j.job_function_id in (:jobFunctionId)` : ` and j.job_function_id=:jobFunctionId`;
      }
      if (jobIndustryId) {
        sqlStmt += isArray(jobIndustryId) ? ` and j.job_industry_id in (:jobIndustryId)` : ` and j.job_industry_id=:jobIndustryId`;
      }
      if (jobLocationId) {
        sqlStmt += isArray(jobLocationId) ? ` and j.job_location_id in (:jobLocationId)` : ` and j.job_location_id=:jobLocationId`;
      }
      if (minExp) sqlStmt += ` and j.min_exp=:minExp`;

      // search
      if (search) {
        sqlStmt += ` and (
                  jn.job_name ilike :searchVal
                  or jt.job_type_name ilike :searchVal
                  or jf.job_function_name ilike :searchVal
                  or ji.job_industry_name ilike :searchVal
                  or jl.job_location_name ilike :searchVal
                  or j.job_description ilike :searchVal
              )`;
      }

      if (type !== 'count') {
        // sorts (order)            
        if (sortBy === 'job_name') {
          sqlStmt += ` order by jn.${sortBy} ${sortType}`;
        } else {
          sqlStmt += ` order by j.${sortBy} ${sortType}`;
        }
        // limit and offset
        sqlStmt += ` limit :limitNum  offset :offsetNum`
      };

      return sqlStmt;
    };

    const sequelize = db1.sequelize;
    const allSQLJobs = await sequelize.query(getSqlStmt(), {
      type: QueryTypes.SELECT,
      replacements: { timeNow, companyId, jobTypeId, jobFunctionId, jobIndustryId, jobLocationId, minExp, sortBy, sortType, limitNum, offsetNum, searchVal, lowerDateRange, upperDateRange },
    });
    const allSQLJobsCount = await sequelize.query(getSqlStmt('count'), {
      type: QueryTypes.SELECT,
      replacements: { timeNow, companyId, jobTypeId, jobFunctionId, jobIndustryId, jobLocationId, minExp, sortBy, sortType, limitNum, offsetNum, searchVal, lowerDateRange, upperDateRange },
    });
    const allJobs = camelizeKeys(allSQLJobs);

    // check if already applied
    if (luserTypeName === 'candidate') {
      const rawAllAppliedJobs = await Jobapplication.findAll({ raw: true, nest: true, where: { userId } });
      const appliedJobIds = [];
      rawAllAppliedJobs.forEach(aj => {
        const { jobId } = aj || {};
        if (jobId) {
          appliedJobIds.push(Number(jobId));
        }
      });

      allJobs.forEach(j => {
        const { jobId } = j || {};
        if (appliedJobIds.includes(Number(jobId))) {
          j.isApplied = true;
        } else {
          j.isApplied = false;
        }
      });

    }
    const responses = { count: allSQLJobsCount[0].count, jobs: allJobs };
    return h.response(responses).code(200);

  } catch (error) {
    console.error(error.stack);
    return h.response({ error: true, message: 'Internal Server Error!' }).code(500);
  }
}

const getCompanyJobDetails = async (request, h) => {
  try {
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden' }).code(403);
    }
    const { credentials } = request.auth || {};
    const { id: userId } = credentials || {};
    const { jobUuid } = request.params || {};

    // Checking user type from jwt
    let luserTypeName = request.auth.artifacts.decoded.userTypeName;

    const { Jobvisit, Jobskill, Jobapplication, Userinfo } = request.getModels('xpaxr');

    // get the company of the luser (using it only if he is a recruiter)
    const luserRecord = await Userinfo.findOne({ where: { userId }, attributes: { exclude: ['createdAt', 'updatedAt'] } });
    const luserProfileInfo = luserRecord && luserRecord.toJSON();
    const { companyId: recruiterCompanyId } = luserProfileInfo || {};

    const db1 = request.getDb('xpaxr');

    // get sql statement for getting jobs or jobs count
    const isCandidateView = luserTypeName === 'candidate';
    function getSqlStmt(queryType) {
      let sqlStmt;
      const type = queryType && queryType.toLowerCase();
      if (type === 'count') {
        sqlStmt = `select count(*)`;
      } else {
        sqlStmt = `select
              jn.job_name, j.*, jt.*, jf.*,ji.*,jl.*,c.display_name as company_name`;
        if (isCandidateView) sqlStmt += `,jqr.response_id,jqr.question_id,jqr.response_val`;
      }

      sqlStmt += `
          from hris.jobs j
              inner join hris.jobname jn on jn.job_name_id=j.job_name_id
              left join hris.jobsquesresponses jqr on jqr.job_id=j.job_id
              inner join hris.company c on c.company_id=j.company_id
              inner join hris.jobtype jt on jt.job_type_id=j.job_type_id                
              inner join hris.jobfunction jf on jf.job_function_id=j.job_function_id                
              inner join hris.jobindustry ji on ji.job_industry_id=j.job_industry_id
              inner join hris.joblocation jl on jl.job_location_id=j.job_location_id`;

      // if he is an employer
      sqlStmt += ` where j.active=true and j.is_deleted=false and j.job_uuid=:jobUuid and j.is_private=false`;

      return sqlStmt;
    };

    const sequelize = db1.sequelize;
    const sqlJobArray = await sequelize.query(getSqlStmt(), {
      type: QueryTypes.SELECT,
      replacements: { jobUuid, recruiterCompanyId, userId },
    });
    const rawJobArray = camelizeKeys(sqlJobArray);
    const jobRecord = rawJobArray[0] || {};
    const { jobId: foundJobId } = jobRecord;

    if (!foundJobId) return h.response({ error: true, message: 'No job found!' }).code(400);

    let responseJob = jobRecord;
    // check if already applied
    if (luserTypeName === 'candidate') {
      const rawAllAppliedJobs = await Jobapplication.findAll({ raw: true, nest: true, where: { userId } });
      const appliedJobIds = [];
      rawAllAppliedJobs.forEach(aj => {
        const { jobId } = aj || {};
        if (jobId) {
          appliedJobIds.push(Number(jobId));
        }
      });

      rawJobArray.forEach(j => {
        const { jobId } = j || {};
        if (appliedJobIds.includes(Number(jobId))) {
          j.isApplied = true;
        } else {
          j.isApplied = false;
        }
      });

      const jobsMap = new Map();
      const jobQuesMap = {};
      const fres = [];

      // attaching jobQuestionResponses
      if (Array.isArray(rawJobArray) && rawJobArray.length) {
        rawJobArray.forEach(r => {
          const { jobId, questionId, responseId, responseVal, ...rest } = r || {};
          jobsMap.set(jobId, { jobId, ...rest });

          if (responseId) {
            if (jobQuesMap[jobId]) {
              jobQuesMap[jobId].push({ questionId, responseId, responseVal });
            } else {
              jobQuesMap[jobId] = [{ questionId, responseId, responseVal }];
            }
          }
        });
        jobsMap.forEach((jqrObj, jm) => {
          const records = jobQuesMap[jm] || [];

          const questions = [];
          for (let response of records) {
            const { questionId, responseVal } = response;
            const res = { questionId, answer: responseVal.answer };
            questions.push(res);
          }
          jqrObj.jobQuestionResponses = questions;
          fres.push(jqrObj);
        });
      }
      responseJob = fres[0];
    }

    // attaching skills
    const { jobskillIds } = responseJob;
    const jobskillRecords = await Jobskill.findAll({ where: { jobskillId: jobskillIds }, attributes: ['jobskillName'] });
    // const jobskillData = jobskillRecords && jobskillRecords.toJSON();
    const jobSkills = [];

    for (let item of jobskillRecords) {
      const { jobskillName } = item;
      if (jobskillName) jobSkills.push(jobskillName);
    }
    responseJob.jobSkills = jobSkills;

    // create job visit record
    await Jobvisit.create({ visitorId: userId, jobId: foundJobId });

    return h.response(responseJob).code(200);

  } catch (error) {
    console.error(error.stack);
    return h.response({ error: true, message: 'Internal Server Error!' }).code(500);
  }
}


module.exports = {

  getAllCompanyNames,
  getCompanyOptions,

  getOwnCompanyInfo,
  getAnyCompanyInfo,
  getCompanyVisitCount,

  getCompanyWorkAccommodations,
  updateCompanyWorkaccommodationStatus,

  updateCompanyProfile,

  createCompanyStaff,
  updateCompanyStaff,
  getCompanyStaff,
  getFellowCompanyStaff,

  resendCompanyVerificationEmail,

  getAllJobsForAParticularCompany,
  getCompanyJobDetails,

};

