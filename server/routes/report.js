import { 
    getAbout
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
    } 
    catch(err) {
      console.log(err);
    }
  }
};

export default report;
