import { 
  requestNyToken,
  revokeNyAccount,
  userCalendars,
} from "../controllers/nylas";

const xnylas = {
name: 'xnylas',
version: '0.1.0',

register: async (server, options) => {
  try {
    server.route({
      method: 'POST',
      path: '/n/token',
      options: {
        auth: {
          mode: 'try',
        },
        handler: requestNyToken,
      },
    });
    server.route({
      method: 'POST',
      path: '/revoke-account',
      options: {
        auth: {
          mode: 'try',
        },
        handler: revokeNyAccount,
      },
    });
    server.route({
      method: 'GET',
      path: '/user-calendars',
      options: {
        auth: {
          mode: 'try',
        },
        handler: userCalendars,
      },
    });
    // other routes
    
  } 
  catch(err) {
    console.log(err);
  }
}
};

export default xnylas;
