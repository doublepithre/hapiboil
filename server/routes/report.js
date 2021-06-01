import { 
    getAbout,
    getUserStats,
    getCompatibility,
    getMentorRecommendations
} from "../controllers/report";

const report = {
  name: 'report',
  version: '0.1.0',
  
  register: async (server, options) => {
    try {
      server.route({
        method: 'GET',
        path: '/about',
        options: {
          auth: {
            mode: 'try',
          },
          handler: getAbout
        },
      });   
      server.route({
        method: 'GET',
        path: '/stats',
        options: {
          auth: {
            mode: 'try',
          },
          handler: getUserStats
        },
      });   
      server.route({
        method: 'GET',
        path: '/compatibility',
        options: {
          auth: {
            mode: 'try',
          },
          handler: getCompatibility
        },
      });   
      server.route({
        method: 'GET',
        path: '/mentor/recommendations',
        options: {
          auth: {
            mode: 'try',
          },
          handler: getMentorRecommendations
        },
      });   
    } 
    catch(err) {
      console.log(err);
    }
  }
};

export default report;
