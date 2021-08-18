import { 
    getRecommendation,
    getAll
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
    } 
    catch(err) {
      console.log(err);
    }
  }
};

export default trainingcourse;
