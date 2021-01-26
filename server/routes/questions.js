import {getQuestions} from '../controllers/questions'
const xquestions = {
  name: 'xquestions',
  version: '0.1.0',
  
  register: async (server, options) => {
    try {
      server.route({
        method: 'GET',
        path: '/empauwerme',
        options: {
          auth: {
            mode: 'try',
          },
          handler: async(request,h)=>{
            return await getQuestions(request,h,"empauwer - x0pa")
          },
        },
      });
      server.route({
        method: 'GET',
        path: '/empauwerall',
        options: {
          auth: {
            mode: 'try',
          },
          handler: async(request,h)=>{
            return await getQuestions(request,h,"empauwer all - x0pa")
          },
        },
      });
    } 
    catch(err) {
      console.log(err);
    }
  }
};
export default xquestions;
