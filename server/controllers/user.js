const { Op, Sequelize, QueryTypes, cast, literal } = require('sequelize');
const bcrypt = require('bcrypt');
const validator = require('validator');
const { sendEmailAsync } = require('../utils/email');
const { first } = require('lodash');

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
    if (!validator.isEmail(email)) {
      throw new Error('Invalid Email!');
    }
    const { User, Emailtemplates, Userinfo, Companyinfo, Emaillogs } = request.getModels('xpaxr');
    const userRecord = await User.findOne({ where: { email }});
    const user = userRecord && userRecord.toJSON();
    if (!user) { throw new Error('No account found!'); }
    const { userId } = user || {};

    const emailData = {
      email,
      emails: [email],
      ccEmails: [],
      templateName: 'reset-password',
      resetLink: 'www.x0pa.com',
      // ownerId: 0,
      // html: 0,
      // text: 0,
      // status: "active",
      subject: "Password Reset Request for {{email}}",
      // sendRaw: false,
      // appId: 0,
      // isUserTemplate: false,
      // metaProfileId,
      isX0PATemplate: true,
      // sendViaNylas: false,
    };

    const additionalEData = {
      userId,
      Emailtemplates,
      Userinfo,
      Companyinfo,
      Emaillogs,
    };

    sendEmailAsync(emailData, additionalEData);

    return h.response(emailData).code(200);
  }
  catch(error) {
    // console.log(error);
    return h.response({ error: true, message: error.message }).code(400);
  }
}

module.exports = {
  createUser,
  getUser,
  updateUser,
  forgotPassword,
};

