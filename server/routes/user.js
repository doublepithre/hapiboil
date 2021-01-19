import { QueryTypes } from 'sequelize';
import { formatQueryRes } from '../utils/index';
import { createUser } from "../controllers/user";

const xuser = {
  name: 'xuser',
  version: '0.1.0',
  register: async (server, options) => {
    server.route({
      method: 'POST',
      path: '/',
      options: {
        handler: createUser,
      },
    });
  },
};

export default xuser;
