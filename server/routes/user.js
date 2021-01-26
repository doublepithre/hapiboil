import { QueryTypes } from 'sequelize';
import { formatQueryRes } from '../utils/index';
import { 
  createUser, 
  getUser, 
  updateUser, 
  forgotPassword, 
  resetPassword, 
  getProfile,
  createProfile, 
  getQuestionnaire,
  createAJob,
  getAppliedJobs,
 } from "../controllers/user";

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
        method: 'GET',
        path: '/getQuestionnaire',
        options: {
          auth: {
            mode: 'try',
          },
          handler: getQuestionnaire,
        },
      });
      server.route({
        method: 'GET',
        path: '/getProfile',
        options: {
          auth: {
            mode: 'try',
          },
          handler: getProfile,
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
      server.route({
        method: 'POST',
        path: '/createAJob',
        options: {
          auth: {
            mode: 'try',
          },
          handler: createAJob,
        },
      });
      server.route({
        method: 'GET',
        path: '/getAppliedJobs',
        options: {
          auth: {
            mode: 'try',
          },
          handler: getAppliedJobs,
        },
      });
    } 
    catch(err) {
      console.log(err);
    }
  }
};

export default xuser;
