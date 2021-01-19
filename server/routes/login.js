import { QueryTypes } from 'sequelize';
import { formatQueryRes } from '../utils/index';
import { loginUser } from "../controllers/login";

const xlogin = {
  name: 'xlogin',
  version: '0.1.0',
  register: async (server, options) => {
    server.route({
      method: 'POST',
      path: '/',
      options: {
        handler: loginUser
      },
    });
  },
};

export default xlogin;
