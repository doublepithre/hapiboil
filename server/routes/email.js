import { 
  getAllDefaultEmailTemplates,
  getAllCustomEmailTemplates,

  getEmailTemplateInfo,

  maintainCompanyEmailTemplates,
  sendEmailFromRecruiterToCandidate,
} from "../controllers/email";

const xemail = {
name: 'xemail',
version: '0.1.0',

register: async (server, options) => {
  try {
    server.route({
      method: 'GET',
      path: '/templates/default',
      options: {
        auth: {
          mode: 'try',
        },
        handler: getAllDefaultEmailTemplates,          
      },
    });
    server.route({
      method: 'GET',
      path: '/templates/custom',
      options: {
        auth: {
          mode: 'try',
        },
        handler: getAllCustomEmailTemplates,          
      },
    });
    server.route({
      method: 'GET',
      path: '/template/{templateId}',
      options: {
        auth: {
          mode: 'try',
        },
        handler: getEmailTemplateInfo,
      },
    });
    server.route({
      method: 'PATCH',
      path: '/template/{templateId}',
      options: {
        auth: {
          mode: 'try',
        },
        handler: maintainCompanyEmailTemplates,
      },
    });
    server.route({
      method: 'POST',
      path: '/send-email',
      options: {
        auth: {
          mode: 'try',
        },
        handler: sendEmailFromRecruiterToCandidate,
      },
    });
  } 
  catch(err) {
    console.log(err);
  }
}
};

export default xemail;
