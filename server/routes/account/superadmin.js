import {
  createCompanySuperAdmin,

  getAllCompanyBySuperadmin,
  getAllUsersBySuperadmin,

  updateCompanyBySuperadmin,
  updateUserBySuperadmin,

  resendVerificationEmailBySuperadmin, 
} from "../../controllers/account/superadmin";

const xsuperadmin = {
  name: 'xsuperadmin',
  version: '0.1.0',
  
  register: async (server, options) => {
    try {         
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
        path: '/company/{companyUuid}',
        options: {
          auth: {
            mode: 'try',
          },
          handler: updateCompanyBySuperadmin,
        },
      });
      server.route({
        method: 'PATCH',
        path: '/user/{userUuid}',
        options: {
          auth: {
            mode: 'try',
          },
          handler: updateUserBySuperadmin,
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
    } 
    catch(err) {
      console.log(err);
    }
  }
};

export default xsuperadmin;
