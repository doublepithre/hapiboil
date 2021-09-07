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
        plugin: require('./routes/account/user'),
        routes: {
          prefix: `${apiRootPrefix}/account`,
        },
      },
      {
        plugin: require('./routes/account/superadmin'),
        routes: {
          prefix: `${apiRootPrefix}/account/superadmin`,
        },
      },
      {
        plugin: require('./routes/company'),
        routes: {
          prefix: `${apiRootPrefix}/company`,
        },
      },
      {
        plugin: require('./routes/job/job'),
        routes: {
          prefix: `${apiRootPrefix}/job`,
        },
      },
      {
        plugin: require('./routes/job/jobmeta'),
        routes: {
          prefix: `${apiRootPrefix}/job/j`,
        },
      },
      {
        plugin: require('./routes/job/application'),
        routes: {
          prefix: `${apiRootPrefix}/job/application`,
        },
      },
      {
        plugin: require('./routes/job/access'),
        routes: {
          prefix: `${apiRootPrefix}/job/access`,
        },
      },
      {
        plugin: require('./routes/job/onboarding'),
        routes: {
          prefix: `${apiRootPrefix}/job/onboarding`,
        },
      },
      {
        plugin: require('./routes/mentor'),
        routes: {
          prefix: `${apiRootPrefix}/mentor`,
        },
      },
      {
        plugin: require('./routes/email'),
        routes: {
          prefix: `${apiRootPrefix}/email`,
        },
      }, 
      {
        plugin: require('./routes/nylas'),
        routes: {
          prefix: `${apiRootPrefix}/nylas`,
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
      {
        plugin: require('./routes/trainingcourse'),
        routes: {
          prefix: `${apiRootPrefix}/trainingcourse`,
        },
      },
    ],
    options: {},
  },
};

export default manifest;
