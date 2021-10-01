import { 
    getAttributes,
} from "../controllers/info";

const info = {
  name: 'info',
  version: '0.1.0',
  
  register: async (server, options) => {
    try { 
      server.route({
        method: 'GET',
        path: '/attributes',
        options: {
          auth: {
            mode: 'try',
          },
          handler: getAttributes
        },
      });  
    } 
    catch(err) {
      console.log(err);
    }
  }
};

export default info;
