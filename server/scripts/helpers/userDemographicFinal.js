const envVar = process.env.NODE_ENV;
const config = require(`../../../config/${envVar}.json`);
const { Client } = require('pg');
const { DataTypes, Sequelize } = require('sequelize');
const fs = require('fs');

// DB models
const sequelize = new Sequelize(
  config.scriptDB.database, config.scriptDB.user, config.scriptDB.password,
  {
    host: config.scriptDB.host,
    dialect: 'postgres'
  }
);

async function collectUserDemographicAnalysisData() {
  const client = new Client({
    host: config.scriptDB.host, //"localhost",
    user: config.scriptDB.user,
    password: config.scriptDB.password,
    database: config.scriptDB.database,
  });
  await client.connect();



  const userDemographicQuesFile = './collectData/UserDemographicQuesFile.json';



  const shouldWork = ["scale10", "scale5", "yes_no", "single_choice"];
  const shouldNOTWork = ["multiple_choice"];

  const pureQuesMap = {} // { questionId: [{ topAnswer, count }] }
  const mcQuesMap = {} // { questionId: [{ topAnswer, count, topCombo: [{ topAnswer, count }] }] }

  const cols = [
    'is_autism', 'person_location', 'age', 'gender',
    'highest_education', 'is_employed',
    'preferred_job_location', 'preferred_job_type',
    'preferred_job_function', 'preferred_job_industry'
  ]

  let userDemographicData = { total: cols.length, userDemographicQuesMap: {} };
  for (let colName of cols) {
    const groupedData = await client.query(`
      select ud.${colName}, count(*) from hris.userdemographic ud
      group by ${colName}
      order by count desc
    `);
    const groups = groupedData.rows.slice(0,3);

    console.log(groups);

    for (item of groups) {
      if (!userDemographicData.userDemographicQuesMap[colName]) userDemographicData.userDemographicQuesMap[colName] = [];
      userDemographicData.userDemographicQuesMap[colName].push({ count: item.count, answer: item[colName] })
    }
  }


  fs.writeFileSync(userDemographicQuesFile, JSON.stringify(userDemographicData));

  console.log(`QUES MAP******************************`)
  console.log({ userDemographicMap: cols.length })
  // console.log(`QUES MAP******************************`)


  await client.end();
  return { msg: 'DONE' }
}



module.exports = collectUserDemographicAnalysisData;