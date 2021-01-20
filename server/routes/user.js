import { QueryTypes } from 'sequelize';
import { formatQueryRes } from '../utils/index';
import { createUser, getUser, updateUser } from "../controllers/user";

const xuser = {
  name: 'xuser',
  version: '0.1.0',
  
  register: async (server, options) => {
    try {
      await server.register(require('./xjwt'));
      server.route({
        method: 'POST',
        path: '/',
        options: {
          auth: false,
          handler: createUser,
        },
      });
      server.route({
        method: 'GET',
        path: '/me',
        options: {
          auth: {
            mode: 'try',
          },
          handler: getUser,
        },
      });
      server.route({
        method: 'PATCH',
        path: '/{userUuid}',
        options: {
          auth: {
            mode: 'try',
          },
          handler: updateUser,
        },
      });
    } 
    catch(err) {
      console.log(err);
    }
  }
};

export default xuser;
