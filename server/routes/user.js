import { QueryTypes } from 'sequelize';
import { formatQueryRes } from '../utils/index';
import { createUser, getUser, updateUser, forgotPassword, resetPassword, createProfile } from "../controllers/user";

const xuser = {
  name: 'xuser',
  version: '0.1.0',
  
  register: async (server, options) => {
    try {
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
      server.route({
        method: 'POST',
        path: '/forgotPassword',
        options: {
          auth: false,
          handler: forgotPassword,
        },
      });
      server.route({
        method: 'PATCH',
        path: '/resetPassword/{requestKey}',
        options: {
          auth: false,
          handler: resetPassword,
        },
      });
      server.route({
        method: 'POST',
        path: '/createProfile',
        options: {
          auth: {
            mode: 'try',
          },
          handler: createProfile,
        },
      });
    } 
    catch(err) {
      console.log(err);
    }
  }
};

export default xuser;
