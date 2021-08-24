import { 
  extractSkills,
  recommendSkills,
} from "../controllers/nlp";

const nlp = {
  name: 'nlp',
  version: '0.1.0',
  
  register: async (server, options) => {
    try {
      server.route({
        method: 'POST',
        path: '/extract_skills',
        options: {
          auth: {
            mode: 'try',
          },
          handler: extractSkills
        },
      });   
      server.route({
        method: 'POST',
        path: '/job_title_skills',
        options: {
          auth: {
            mode: 'try',
          },
          handler: recommendSkills,
        },
      });   
    } 
    catch(err) {
      console.log(err);
    }
  }
};

export default nlp;
