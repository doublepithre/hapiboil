import { 
  createUser, 
  getUser, 
  updateUser, 
  forgotPassword, 
  resetPassword, 
  createProfile,
  getProfile, 
  getQuestionnaire } from "../controllers/user";

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
        path: '/forgot-password',
        options: {
          auth: false,
          handler: forgotPassword,
        },
      });
      server.route({
        method: 'PATCH',
        path: '/reset-password/{requestKey}',
        options: {
          auth: false,
          handler: resetPassword,
        },
      });
      server.route({
        method: 'GET',
        path: '/empauwer-me',
        options: {
          auth: {
            mode: 'try',
          },
          handler: async (request, h) => {
            return await getQuestionnaire(request, h, 'empauwer_me')
          },
        },
      });
      server.route({
        method: 'GET',
        path: '/empauwer-all',
        options: {
          auth: {
            mode: 'try',
          },
          handler: async (request, h) => {
            return await getQuestionnaire(request, h, 'empauwer_all')
          },
        },
      });
      server.route({
        method: 'GET',
        path: '/profile',
        options: {
          auth: {
            mode: 'try',
          },
          handler: getProfile,
        },
      });
      server.route({
        method: 'POST',
        path: '/profile',
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
