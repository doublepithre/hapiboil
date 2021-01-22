import {getQuestions} from '../controllers/questions'
const xquestions = {
  name: 'xquestions',
  version: '0.1.0',
  
  register: async (server, options) => {
    try {
      server.route({
        method: 'GET',
        path: '/',
        options: {
          auth: false,
          handler: getQuestions,
        },
      });
    } 
    catch(err) {
      console.log(err);
    }
  }
};
export default xquestions;
