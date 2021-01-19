const { Op, Sequelize, QueryTypes, cast, literal } = require('sequelize');
const bcrypt = require('bcrypt');
const validator = require('validator');

const createUser = async (request, h) => {
  try {
    if (request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden' }).code(403);
    }
    // console.log('request.payload', request.payload);
    const { User, Userinfo, Usertype, Userrole } = request.getModels('xpaxr');
    const {
      email,
      password,
      accountType,
    } = request.payload || {};

    if ( !(email && password && accountType)) {
      throw new Error('Please provide necessary details');
    }

    if (!validator.isEmail(email)) {
      throw new Error('Please provide a valid Email');
    }
    if (password.length < 8) {
      throw new Error('Password must contain atleast 8 characters');
    } else if (password.length > 25) {
      throw new Error('Password should be atmost 25 characters');
    }
    const validAccountTypes = ['candidate', 'employer', 'mentor'];
    if (!validAccountTypes.includes(accountType)) {
      throw new Error('Please check your account type');
    }
    
    const hashedPassword = bcrypt.hashSync(password, 12);
    const userTypeRecord = await Usertype.findOne({
      where: {
        user_type_name: accountType
      }, 
      attributes: ['userTypeId']
    });
    const userTypeId = userTypeRecord.dataValues.userTypeId;
    const userRoleRecord = await Userrole.findOne({
      where: {
        role_name: accountType
      }
    });
    const roleId = userRoleRecord.dataValues.roleId;
    const udata = await User.create({
      email,
      password: hashedPassword,
    });
    const userRes = udata && udata.toJSON();
    const { userId, userUuid } = userRes || {};
    const uidata = await Userinfo.create({
      userId,
      userUuid,
      email,
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

module.exports = {
  createUser,
};

