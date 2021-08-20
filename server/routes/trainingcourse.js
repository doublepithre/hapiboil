import { 
    getRecommendation,
    getAll,
    updateStatus
} from "../controllers/trainingcourse";

const trainingcourse = {
  name: 'trainingcourse',
  version: '0.1.0',
  
  register: async (server, options) => {
    try {
      server.route({
        method: 'GET',
        path: '/recommendation',
        options: {
          auth: {
            mode: 'try',
          },
          handler: getRecommendation
        },
      });   
      server.route({
        method: 'GET',
        path: '/all',
        options: {
          auth: {
            mode: 'try',
          },
          handler: getAll
        },
      });  
      server.route({
        method: 'PATCH',
        path: '/status/{courseId}',
        options: {
          auth: {
            mode: 'try',
          },
          handler: updateStatus,
        },
      });
    } 
    catch(err) {
      console.log(err);
    }
  }
};

export default trainingcourse;
