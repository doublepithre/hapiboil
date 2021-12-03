rm ../../server/models/definition/*
rm models/*
rm convertedModels/*
../../node_modules/.bin/sequelize-auto sequelize-auto -d DATABASE_NAME -h localhost -p 5432 -u DATABASE_USER -x DATABASE_PASSWORD -e postgres -s hris --cm p --cp c --sg
npx github:gary-x0pa/sequelize-auto2hapi-sequelizejs
node rename.js
cp -R convertedModels/* ../../server/models/definition/