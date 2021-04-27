import { 
    createQuestions,
    getQuestionCategories,
    getQuestionTypes,
    getAttributes,
    createAttribute,
    deleteAttribute,
    editAttribute,
    deleteQuestions,
    updateIsActive,
    getQuestionById,
    editQuestion,
    createQuestionAttributes,
    getQuestions,
    addQuestionMapping,
    getQuestionMapping,
    deleteQuestionMapping
} from "../controllers/admin";

const xadmin = {
  name: 'xadmin',
  version: '0.1.0',
  
  register: async (server, options) => {
    try {
      server.route({
        method: 'GET',
        path: '/questions/empauwer-me',
        options: {
          auth: {
            mode: 'try',
          },
          handler: async(request,h)=>{
            return await getQuestions(request,h,'empauwer_me')
          },
        },
      });
      server.route({
        method: 'GET',
        path: '/questions/empauwer-all',
        options: {
          auth: {
            mode: 'try',
          },
          handler: async(request,h)=>{
            return await getQuestions(request,h,'empauwer_all')
          },
        },
      });
      server.route({
        method: 'GET',
        path: '/questions/empauwer-us',
        options: {
          auth: {
            mode: 'try',
          },
          handler: async(request,h)=>{
            return await getQuestions(request,h,'empauwer_us')
          },
        },
      });
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
        method: 'DELETE',
        path: '/questions',
        options: {
          auth: {
            mode: 'try',
          },
          handler: deleteQuestions,
        },
      });
      server.route({
        method: 'PATCH',
        path: '/questions/active',
        options: {
          auth: {
            mode: 'try',
          },
          handler: updateIsActive,
        },
      });
      server.route({
        method: 'GET',
        path: '/question/id/{questionId}',
        options: {
          auth: {
            mode: 'try',
          },
          handler: async(request,h)=>{
            return getQuestionById(request,h,request.params.questionId);
          },
        },
      });
      server.route({
        method: 'PATCH',
        path: '/question',
        options: {
          auth: {
            mode: 'try',
          },
          handler: async(request,h)=>{
            return editQuestion(request,h);
          },
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
      server.route({
        method: 'POST',
        path: '/questions/question/attributes',
        options: {
          auth: {
            mode: 'try',
          },
          handler: createQuestionAttributes,
        },
      });
      server.route({
        method: 'POST',
        path: '/questions/mapping',
        options: {
          auth: {
            mode: 'try',
          },
          handler: addQuestionMapping,
        },
      });
      server.route({
        method: 'GET',
        path: '/questions/mapping',
        options: {
          auth: {
            mode: 'try',
          },
          handler: getQuestionMapping,
        },
      });
      server.route({
        method: 'DELETE',
        path: '/questions/mapping',
        options: {
          auth: {
            mode: 'try',
          },
          handler: deleteQuestionMapping,
        },
      });
    } 
    catch(err) {
      console.error(err);
    }
  }
};

export default xadmin;
