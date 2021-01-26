import Sequelize from 'sequelize';
const apiRootPrefix = '/em/api/v1';
const config = require('config');
const CatBoxMemory = require("@hapi/catbox-memory")

const sequelizeInstance = new Sequelize('canopus', null, null, {
  replication: config.get('replication'),
  dialect: 'postgres',
  searchPath: 'hris',
});

const manifest = {
  server: {
    port: config.get('port'),
    cache : [{
      name: 'memoryCache',
      provider: {
        constructor: CatBoxMemory,
      }
  }],
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
        plugin: require('./routes/xjwt')
      },
      {
        plugin: require('./routes/user'),
        routes: {
          prefix: `${apiRootPrefix}/account`,
        },
      }, 
      {
        plugin: require('./routes/login'),
        routes: {
          prefix: `${apiRootPrefix}/login`,
        },
      },
      {
        plugin:require('./routes/questions'),
        routes: {
          prefix: `${apiRootPrefix}/questions`,
        },
      }
    ],
    options: {},
  },
};

export default manifest;
