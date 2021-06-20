import {
  getAllCompanyNames,
  getCompanyOptions,

  getOwnCompanyInfo,
  getAnyCompanyInfo,

  updateCompanyProfile,
  
  createCompanyStaff,
  updateCompanyStaff,
  getCompanyStaff,  
  getFellowCompanyStaff,
   
  resendCompanyVerificationEmail,

  getCompanyJobDetails,
  getAllJobsForAParticularCompany,
  
} from "../controllers/company";

const xcompany = {
  name: 'xcompany',
  version: '0.1.0',
  
  register: async (server, options) => {
    try {
      server.route({
        method: 'GET',
        path: '/c/names',
        options: {
          auth: {
            mode: 'try',
          },
          handler: getAllCompanyNames,
        },
      });
      server.route({
        method: 'GET',
        path: '/c/options',
        options: {
          auth: {
            mode: 'try',
          },
          handler: getCompanyOptions,
        },
      });
      server.route({
        method: 'GET',
        path: '/c/profile',
        options: {
          auth: {
            mode: 'try',
          },
          handler: getOwnCompanyInfo,
        },
      });
      server.route({
        method: 'GET',
        path: '/{companyId}',
        options: {
          auth: {
            mode: 'try',
          },
          handler: getAnyCompanyInfo,
        },
      });
      server.route({
        method: 'PATCH',
        path: '/{companyUuid}',
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
          handler: updateCompanyProfile,
        },
      });
      server.route({
        method: 'POST',
        path: '/c/staff',
        options: {
          auth: {
            mode: 'try',
          },
          handler: createCompanyStaff,
        },
      });
      server.route({
        method: 'PATCH',
        path: '/c/staff/{userUuid}',
        options: {
          auth: {
            mode: 'try',
          },
          handler: updateCompanyStaff,
        },
      });
      server.route({
        method: 'GET',
        path: '/c/staff',
        options: {
          auth: {
            mode: 'try',
          },
          handler: getCompanyStaff,
        },
      });
      server.route({
        method: 'GET',
        path: '/c/fellow-staff',
        options: {
          auth: {
            mode: 'try',
          },
          handler: getFellowCompanyStaff,
        },
      });
      server.route({
        method: 'POST',
        path: '/c/resend-verify',
        options: {
          auth: {
            mode: 'try',
          },
          handler: resendCompanyVerificationEmail,
        },
      });
      server.route({
        method: 'GET',
        path: '/jobs/{companyId}',
        options: {
          auth: {
            mode: 'try',
          },
          handler: getAllJobsForAParticularCompany,
        },
      });
      server.route({
        method: 'GET',
        path: '/job/{jobUuid}',
        options: {
          auth: {
            mode: 'try',
          },
          handler: getCompanyJobDetails,
        },
      });
    } 
    catch(err) {
      console.log(err);
    }
  }
};

export default xcompany;
