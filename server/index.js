import os from 'os';
import config from 'config';
import glue from '@hapi/glue';
import manifest from './manifest';
import jobUtils from './utils/jobUtils'
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
    // register job cache
    const jobCache = server.cache({ segment: 'jobCache', expiresIn: 1000 * 5 }); //expires in 5 second for now
    const instances = require('hapi-sequelizejs').instances;
    const dbs = instances.dbs;
    await jobUtils.initJobsCache(dbs.xpaxr.models.Job,jobCache)
    server.app.jobCache = jobCache
    console.log('Server running');
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

init();
