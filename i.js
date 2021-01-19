const Sequelize = require('sequelize');

// Option 1: Passing parameters separately
const sequelize = new Sequelize('camel', 'postgres', 'postgres', {
  host: 'localhost',
  dialect: 'postgres',
  searchPath: 'hris',
});

// Option 2: Passing a connection URI
// const sequelize = new Sequelize('postgres://user:pass@example.com:5432/dbname');

sequelize
  .authenticate()
  .then(() => {
    console.log('Connection has been established successfully.');
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
  });