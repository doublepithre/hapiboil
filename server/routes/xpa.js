// import { get, list } from '../controllers/xpa';

const xpa = {
  name: 'xpa',
  version: '0.1.0',
  register: async (server, options) => {
    server.route({
      method: 'GET',
      path: '/l',
      options: {
        auth: false,
        handler: async (r, h) => { return {m: 'ok'} },
      },
    });
  },
};

export default xpa;
