import os from 'os';
import config from 'config';
import glue from '@hapi/glue';
import manifest from './manifest';

// server.state('data', {
//   ttl: null,
//   isSecure: true,
//   isHttpOnly: true,
// });

const init = async () => {
  try {
    const options = {
      relativeTo: __dirname,
    };
    const server = await glue.compose(manifest, options);
    server.route({
      method: '*',
      path: '/{any*}',
      handler: function(request, h) {
        return h.response({ message: 'Nah!' }).code(404);
      },
    });
    await server.start();
    console.log('Server running');
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

init();
