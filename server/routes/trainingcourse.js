import { 
    getRecommendation
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
    } 
    catch(err) {
      console.log(err);
    }
  }
};

export default trainingcourse;
