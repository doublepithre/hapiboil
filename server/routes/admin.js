import { 
    createQuestions,
    editQuestions
} from "../controllers/admin";

const xadmin = {
  name: 'xadmin',
  version: '0.1.0',
  
  register: async (server, options) => {
    try {
      server.route({
        method: 'POST',
        path: '/questions',
        options: {
          auth: {
            mode: 'try',
          },
          handler: createQuestions,
        },
      });
      server.route({
        method: 'PATCH',
        path: '/questions',
        options: {
          auth: {
            mode: 'try',
          },
          handler: editQuestions,
        },
      });
    } 
    catch(err) {
      console.error(err);
    }
  }
};

export default xadmin;
