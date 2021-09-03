const { Op, Sequelize, QueryTypes, cast, literal } = require('sequelize');
const bcrypt = require('bcrypt');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const config = require('config');

const logoutUser = async (request, h) => {
  try {
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden', code: "xemp-1" }).code(401);
    }
    const { credentials } = request.auth || {};
    const { id: userId } = credentials || {};
    const { token }= credentials || {};

    const db1 = request.getDb('xpaxr');
    const sqlStmt = `DELETE
      from hris.accesstoken ato          
      where ato.user_id= :userId and ato.token= :token`;
    
    const sequelize = db1.sequelize;
    const ares = await sequelize.query(sqlStmt, {
      type: QueryTypes.SELECT,
      replacements: { userId, token },
    });
    return h.response({ message: 'Log out successful!' }).code(200);
  } 
  catch (error) {
    console.error(error.stack);
    return h.response({error: true, message: 'Bad Request'}).code(500);
  }
};

module.exports = {
  logoutUser,
};

