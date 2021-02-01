const { Op, Sequelize, QueryTypes, cast, literal } = require('sequelize');
const bcrypt = require('bcrypt');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const config = require('config');

const loginUser = async (request, h) => {
  try {
    if (request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden' }).code(403);
    }
    const { User, Userinfo, Accesstoken, Usertype, Userrole } = request.getModels('xpaxr');
    const { email, password } = request.payload || {};

    if ( !(email && password) ) {
      return h.response({ error: true, message: 'Please provide necessary credentials'}).code(400);
    }

    if (!validator.isEmail(email)) {
      return h.response({ error: true, message: 'Please provide a valid Email'}).code(400);
    }
    if (password.length < 8 || password.length > 100) {
      return h.response({ error: true, message: 'Invalid Password'}).code(400);
    }

    const udata = await User.findOne({
        where: {
          email
        },
        attributes: ['email', 'password', 'user_id']
    });
    const user = udata && udata.toJSON();
    if (!user) {
      return h.response({ error: true, message: 'Please check your credentials'}).code(400);
    }
    const {password: passwordStored, user_id} = udata && udata.toJSON();
    const isPasswordMatching = bcrypt.compareSync(password, passwordStored);
    if (!isPasswordMatching) {
      return h.response({ error: true, message: 'Please check your credentials'}).code(400);
    }

    const uidata = await Userinfo.findOne({
        where:{
            email
        },
        attributes: {
            exclude: ['createdAt', 'updatedAt']
        }
    });
    const userInfoRes = uidata && uidata.toJSON();
    const { 
        userUuid, 
        userTypeId, 
        email: userEmail, 
        roleId, 
        active,
        companyId,
        companyUuid,
        firstName,
        lastName,
        isAdmin,
        tzid,
        primaryMobile
    } = userInfoRes || {};
    const token = await jwt.sign({userUuid, userTypeId, email: userEmail, roleId, active, companyId, companyUuid, firstName, lastName, isAdmin, tzid, primaryMobile}, config.get('jwtSecret'), {expiresIn: '24h'});

    const userTypeRecord = await Usertype.findOne({ where: { userTypeId }});
    const userRoleRecord = await Userrole.findOne({ where: { roleId }});
    const { userTypeName } = userTypeRecord && userTypeRecord.toJSON();
    const { roleName } = userRoleRecord && userRoleRecord.toJSON();
    userInfoRes.userTypeName = userTypeName;
    userInfoRes.roleName = roleName;

    const tokendata = await Accesstoken.create({
        token,
        userId: user_id,
        isValid: true
    });

    return h.response({user: userInfoRes, token}).code(200);
  } 
  catch (error) {
    console.error(error.stack);
    return h.response({error: true, message: 'Bad Request'}).code(500);
  }
};

module.exports = {
  loginUser,
};

