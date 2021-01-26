import { QueryTypes } from 'sequelize';
import { formatQueryRes } from '../utils/index';
import { createUser, getUser, updateUser, forgotPassword, resetPassword, createProfile,getJobRecommendations,createJob,createJobProfile } from "../controllers/user";

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
      server.route({
        method: 'POST',
        path: '/createJobProfile',
        options: {
          auth: {
            mode: 'try',
          },
          handler: createJobProfile,
        },
      });
      server.route({
        method: 'GET',
        path: '/jobRecommendations',
        options: {
          auth: {
            mode: 'try',
          },
          handler: async(request,h)=>{

            getJobRecommendations(request,h,server.app.jobCache)
          }
        },
      });
      server.route({
        method: 'POST',
        path: '/createJob',
        options: {
          auth: {
            mode: 'try',
          },
          handler:createJob
        },
      });
    } 
    catch(err) {
      console.log(err);
    }
  }
};

export default xuser;
