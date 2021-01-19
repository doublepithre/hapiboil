import Sequelize from 'sequelize';
const apiRootPrefix = '/em/api/v1';

const sequelizeInstance = new Sequelize('canopus', null, null, {
  replication: {
    read: [{ host: 'localhost', username: 'postgres', password: '!Qwerty@123' }],
    write: { host: 'localhost', username: 'postgres', password: '!Qwerty@123' },
  },
  dialect: 'postgres',
  searchPath: 'hris',
});

const manifest = {
  server: {
    port: 4585,
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
