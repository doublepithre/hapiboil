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
    } = request.payload || {};
    const leadData = await User.create({
      email,
    });
    return h.response(leadData).code(200);
  } catch (error) {
    console.error(error);
    return h.response({ error: true, message: 'Invalid' }).code(400);
  }
};

module.exports = {
  createUser,
};

