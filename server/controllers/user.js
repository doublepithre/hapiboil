const { Op, Sequelize, QueryTypes, cast, literal } = require('sequelize');

const createUser = async (request, h) => {
  try {
    if (request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden' }).code(403);
    }
    console.log('request.payload', request.payload);
    const { User } = request.getModels('xpaxr');
    const {
      email,
      password,
      accountType,
    } = request.payload || {};
    const hashedPassword = password;
    const udata = await User.create({
      email,
      password: hashedPassword,
    });
    return h.response(udata).code(200);
  } catch (error) {
    console.error(error);
    return h.response({
      error: true, message: 'Bad Request'
    }).code(400);
  }
};

module.exports = {
  createUser,
};

