import Sequelize from 'sequelize';
const apiRootPrefix = '/em/api/v1';
const config = require('config');
const CatBoxMemory = require("@hapi/catbox-memory")

const sequelizeInstance = new Sequelize('canopus', null, null, {
  replication: config.get('replication'),
  dialect: 'postgres',
  searchPath: 'hris',
  logging:true
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
        plugin: require('./routes/xjwt')
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
      {
        plugin: require('./routes/logout'),
        routes: {
          prefix: `${apiRootPrefix}/logout`,
        },
      },
      {
        plugin: require('./routes/admin'),
        routes: {
          prefix: `${apiRootPrefix}/admin`,
        },
      },
      {
        plugin: require('./routes/report'),
        routes: {
          prefix: `${apiRootPrefix}/report`,
        },
      },
      {
        plugin: require('./routes/nlp'),
        routes: {
          prefix: `${apiRootPrefix}/nlp`,
        },
      },
    ],
    options: {},
  },
};

export default manifest;
