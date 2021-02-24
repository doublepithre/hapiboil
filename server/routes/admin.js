import { 
    createQuestions,
    editQuestions,
    getQuestionCategories,
    getQuestionTypes,
    getAttributes,
    createAttribute,
    deleteAttribute,
    editAttribute
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
      server.route({
        method: 'GET',
        path: '/questions/categories',
        options: {
          auth: {
            mode: 'try',
          },
          handler: getQuestionCategories,
        },
      });
      server.route({
        method: 'GET',
        path: '/questions/types',
        options: {
          auth: {
            mode: 'try',
          },
          handler: getQuestionTypes,
        },
      });
      server.route({
        method: 'GET',
        path: '/questions/attributes',
        options: {
          auth: {
            mode: 'try',
          },
          handler: getAttributes,
        },
      });
      server.route({
        method: 'POST',
        path: '/questions/attributes',
        options: {
          auth: {
            mode: 'try',
          },
          handler: createAttribute,
        },
      });
      server.route({
        method: 'DELETE',
        path: '/questions/attributes',
        options: {
          auth: {
            mode: 'try',
          },
          handler: deleteAttribute,
        },
      });
      server.route({
        method: 'PATCH',
        path: '/questions/attributes',
        options: {
          auth: {
            mode: 'try',
          },
          handler: editAttribute,
        },
      });
    } 
    catch(err) {
      console.error(err);
    }
  }
};

export default xadmin;
