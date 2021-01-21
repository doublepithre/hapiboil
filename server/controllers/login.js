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
    // console.log('request.payload', request.payload);
    const { User, Userinfo, Accesstoken } = request.getModels('xpaxr');
    const { email, password } = request.payload || {};

    if ( !(email && password) ) {
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

    const udata = await User.findAll({
        where: {
            email
        },
        attributes: ['email', 'password', 'user_id']
    });
    if (udata.length == 0) {
        throw new Error('Please check your credentials');
    } else if (udata.length > 1) {
        throw new Error('Multiple accounts detected!');
    }
    const user = udata[0] && udata[0].toJSON();
    const isPasswordMatching = bcrypt.compareSync(password, user.password);
    if (!isPasswordMatching) {
        throw new Error('Please check your credentials');
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

    const tokendata = await Accesstoken.create({
        token,
        userId: Number(user.user_id),
        isValid: true
    });

    const payload = await jwt.verify(token, config.get('jwtSecret'));
    return h.response({user: userInfoRes, token});
  } 
  catch (error) {
    // console.error(error);
    return h.response({
      error: true, message: error.message
    }).code(400);
  }
};

module.exports = {
  loginUser,
};

