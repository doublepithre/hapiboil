import { QueryTypes } from 'sequelize';
import { formatQueryRes } from '../utils/index';
import { 
    createJob,
    getQuestions,
} from "../controllers/job";

const xjob = {
  name: 'xjob',
  version: '0.1.0',
  
  register: async (server, options) => {
    try {
      server.route({
        method: 'POST',
        path: '/createJob',
        options: {
          auth: {
            mode: 'try',
          },
          handler: createJob,
        },
      });
    } 
    catch(err) {
      console.log(err);
    }
  }
};

export default xjob;
