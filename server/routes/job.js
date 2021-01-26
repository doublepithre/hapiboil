import { QueryTypes } from 'sequelize';
import { formatQueryRes } from '../utils/index';
import { 
    createJob,
    applyToJob,
    getAppliedJobs,
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
      server.route({
        method: 'POST',
        path: '/applyToJob',
        options: {
          auth: {
            mode: 'try',
          },
          handler: applyToJob,
        },
      });
      server.route({
        method: 'GET',
        path: '/getAppliedJobs',
        options: {
          auth: {
            mode: 'try',
          },
          handler: getAppliedJobs,
        },
      });
    } 
    catch(err) {
      console.log(err);
    }
  }
};

export default xjob;
