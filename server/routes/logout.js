import { logoutUser } from "../controllers/logout";

const xlogout = {
  name: 'xlogout',
  version: '0.1.0',
  register: async (server, options) => {
    try{
      server.route({
        method: 'POST',
        path: '/',
        options: {
          auth: {
            mode: 'try',
          },
          handler: logoutUser
        },
      });
    }
    catch(error) {
      console.log(error);
    }
  },
};

export default xlogout;
