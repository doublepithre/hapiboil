const { Op, Sequelize, QueryTypes, cast, literal } = require('sequelize');
const bcrypt = require('bcrypt');
const moment = require('moment');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const config = require('config');
import { camelizeKeys } from '../utils/camelizeKeys';

const loginUser = async (request, h) => {
  try {
    if (request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden' }).code(401);
    }
    const { User, Usermeta, Userinfo, Accesstoken, Usertype, Userrole } = request.getModels('xpaxr');
    const { email: rEmail, password, rememberMe, captcha } = request.payload || {};
    const email = rEmail?.toLowerCase();

    if (!(email && password && captcha)) {
      return h.response({ error: true, message: 'Please provide necessary credentials' }).code(400);
    }

    if (!validator.isEmail(email)) {
      return h.response({ error: true, message: 'Please provide a valid Email' }).code(400);
    }
    if (password.length < 8 || password.length > 100) {
      return h.response({ error: true, message: 'Invalid Password' }).code(400);
    }

    const udata = await User.findOne({
      where: {
        email
      },
      attributes: ['email', 'password', 'user_id']
    });
    const user = udata && udata.toJSON();
    if (!user) {
      return h.response({ error: true, message: 'Wrong Email or Password!' }).code(400);
    }
    const { password: passwordStored, user_id } = udata && udata.toJSON();
    const isPasswordMatching = bcrypt.compareSync(password, passwordStored);
    if (!isPasswordMatching) {
      return h.response({ error: true, message: 'Wrong Email or Password!' }).code(400);
    }

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
     where ui.email=:email`;

    const sequelize = db1.sequelize;
    const userRecordSQL = await sequelize.query(sqlStmt, {
      type: QueryTypes.SELECT,
      replacements: { email }
    });
    const userInfoRes = camelizeKeys(userRecordSQL)[0];

    const {
      userId,
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
      primaryMobile,

      userTypeName,
      roleName,
    } = userInfoRes || {};
    const token = await jwt.sign({ userUuid, userTypeId, email: userEmail, roleId, active, companyId, companyUuid, firstName, lastName, isAdmin, tzid, primaryMobile, userTypeName, roleName }, config.get('jwtSecret'), { expiresIn: '24h' });
    
    const expirationHrs = rememberMe ? 7 * 24 : 12;
    const expiresAt = moment().add(expirationHrs, 'hours').format();
    await Accesstoken.create({
      token,
      userId: user_id,
      isValid: true,
      expiresAt,
    });

    if (userTypeName === 'supervisor' || userTypeName === 'workbuddy') {
      const userMetaRecord = await Usermeta.findOne({ where: { userId, metaKey: 'is_onboarding_complete' }, attributes: { exclude: ['createdAt', 'updatedAt'] } });
      const userMetaData = userMetaRecord && userMetaRecord.toJSON();
      const { umetaId, metaValue } = userMetaData || {};

      userInfoRes.isOnboardingComplete = umetaId ? metaValue : "no";
    }
    if (userTypeName !== 'supervisor' && userTypeName !== 'workbuddy') {
      delete userInfoRes.leadershipMessage;
    }
    if (userTypeName !== 'companysuperadmin') {
      delete userInfoRes.isCompanyOnboardingComplete;
    }
    return h.response({ user: userInfoRes, token }).code(200);
  }
  catch (error) {
    console.error(error.stack);
    return h.response({ error: true, message: 'Bad Request' }).code(500);
  }
};

module.exports = {
  loginUser,
};

