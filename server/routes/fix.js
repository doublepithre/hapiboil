import { 
  createCWorkAccommodationRecordsForPreviousCompanies,
} from "../controllers/fix";

const xfix = {
name: 'xfix',
version: '0.1.0',

register: async (server, options) => {
  try {    
    server.route({
      method: 'POST',
      path: '/create-cwa',
      options: {
        auth: {
          mode: 'try',
        },
        handler: createCWorkAccommodationRecordsForPreviousCompanies,
      },
    });  } 
  catch(err) {
    console.log(err);
  }
}
};

export default xfix;
