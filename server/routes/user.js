import {
  createUser,
  createCompanySuperAdmin,

  getAllCompanyBySuperadmin,
  getAllUsersBySuperadmin,
  updateCompanyBySuperadmin,
  updateUserBySuperadmin,
    
  getUser, 
  updateUser, 
  updatePassword,
  forgotPassword, 
  resetPassword, 
  resendVerificationEmailBySuperadmin,
  verifyEmail,
  
  createProfile,
  getProfile, 
  getUserMetaData,
  updateMetaData,

  saveUserFeedback,
  getQuestionnaire,
  getWebchatToken
} from "../controllers/user";

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
        method: 'POST',
        path: '/company-superadmin',
        options: {
          auth: {
            mode: 'try',
          },
          handler: createCompanySuperAdmin,
        },
      });      
      server.route({
        method: 'GET',
        path: '/companies',
        options: {
          auth: {
            mode: 'try',
          },
          handler: getAllCompanyBySuperadmin,
        },
      });
      server.route({
        method: 'GET',
        path: '/users',
        options: {
          auth: {
            mode: 'try',
          },
          handler: getAllUsersBySuperadmin,
        },
      });
      server.route({
        method: 'PATCH',
        path: '/companies/{companyUuid}',
        options: {
          auth: {
            mode: 'try',
          },
          handler: updateCompanyBySuperadmin,
        },
      });      
      server.route({
        method: 'PATCH',
        path: '/users/{userUuid}',
        options: {
          auth: {
            mode: 'try',
          },
          handler: updateUserBySuperadmin,
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
          payload: {
            maxBytes: 3000000,
            output: 'stream',
            parse: true,
            multipart: true,
          },
          handler: updateUser,
        },
      });
      server.route({
        method: 'PATCH',
        path: '/update-password',
        options: {
          auth: {
            mode: 'try',
          },
          handler: updatePassword,
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
        method: 'POST',
        path: '/resend-verify',
        options: {
          auth: {
            mode: 'try',
          },
          handler: resendVerificationEmailBySuperadmin,
        },
      });
      server.route({
        method: 'PATCH',
        path: '/verify/{requestKey}',
        options: {
          auth: false,
          handler: verifyEmail,
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
        method: 'GET',
        path: '/me/meta',
        options: {
          auth: {
            mode: 'try',
          },
          handler: getUserMetaData,
        },
      });
      server.route({
        method: 'PATCH',
        path: '/me/meta',
        options: {
          auth: {
            mode: 'try',
          },
          handler: updateMetaData,
        },
      });
      server.route({
        method: 'POST',
        path: '/feedback',
        options: {
          auth: {
            mode: 'try',
          },
          handler: saveUserFeedback,
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
        path: '/empauwer-us',
        options: {
          auth: {
            mode: 'try',
          },
          handler: async (request, h) => {
            return await getQuestionnaire(request, h, 'empauwer_us')
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
        method: 'get',
        path: '/webchat/token',
        options: {
          auth: {
            mode: 'try',
          },
          handler: getWebchatToken,
        },
      });
    } 
    catch(err) {
      console.log(err);
    }
  }
};

export default xuser;
