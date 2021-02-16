rm ../../server/models/definition/*
rm models/*
rm convertedModels/*
../../node_modules/.bin/sequelize-auto sequelize-auto -d canopus -h localhost -p 5432 -u postgres -x \$ilven1eaf -e postgres -s hris --cm p --cp c --sg
npx github:gary-x0pa/sequelize-auto2hapi-sequelizejs
cp -R convertedModels/* ../../server/models/definition/