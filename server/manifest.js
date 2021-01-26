import Sequelize from 'sequelize';
const apiRootPrefix = '/em/api/v1';
const config = require('config');

const sequelizeInstance = new Sequelize('canopus', null, null, {
  replication: config.get('replication'),
  dialect: 'postgres',
  searchPath: 'hris',
});

const manifest = {
  server: {
    port: config.get('port'),
  },
  register: {
    plugins: [
      {
        plugin: require('hapi-sequelizejs'),
        options: [
          {
            name: 'xpaxr',
            models: [__dirname + '/models/definition/*.js'],
            // ignoredModels: [__dirname + '/models/**/*.js'],
            sequelize: sequelizeInstance,
          },
        ],
      },
      {
        plugin: require('./routes/user'),
        routes: {
          prefix: `${apiRootPrefix}/account`,
        },
      },
      {
        plugin: require('./routes/job'),
        routes: {
          prefix: `${apiRootPrefix}/job`,
        },
      }, 
      {
        plugin: require('./routes/login'),
        routes: {
          prefix: `${apiRootPrefix}/login`,
        },
      },
    ],
    options: {},
  },
};

export default manifest;
