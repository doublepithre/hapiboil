import { loginUser } from "../controllers/login";

const xlogin = {
  name: 'xlogin',
  version: '0.1.0',
  register: async (server, options) => {
    try{
      server.route({
        method: 'POST',
        path: '/',
        options: {
          auth: false,
          handler: loginUser
        },
      });
    }
    catch(error) {
      console.log(error);
    }
  },
};

export default xlogin;
