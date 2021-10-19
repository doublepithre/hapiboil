const envVar = process.env.NODE_ENV;
const config = require(`../../config/${envVar}.json`);

const { Client } = require('pg');
const { DataTypes, Sequelize } = require('sequelize');
const fs = require('fs');

// DB models
const { Questionnaire } = require('../../tools/sequelizeauto/models/init-models');
const mcqFinal = require('./helpers/mcqFinal');
const sequelize = new Sequelize(
  config.scriptDB.database, config.scriptDB.user, config.scriptDB.password,
  {
    host: config.scriptDB.host,
    dialect: 'postgres'
  }
);

async function collectQuesAnalysisData() {
  const client = new Client({
    host: config.scriptDB.host, //"localhost",
    user: config.scriptDB.user,
    password: config.scriptDB.password,
    database: config.scriptDB.database,
  });
  await client.connect();




  const pureQuesFile = './collectData/PureQuesFile.json';
  const mcQuesRawFile = './collectData/MCQuesRawFile.json';
  const mcQuesFinalFile = './collectData/MCQuesFile.json';
  const userDemographicQuesFile = './collectData/UserDemographicQuesFile.json';



  const allQIdsRAW = await client.query(`
    select 
      q.question_id, qtp.question_type_name
    from hris.questionnaire q
      inner join hris.questiontype qtp on qtp.question_type_id=q.question_type_id
      inner join hris.questiontarget qt on qt.target_id=q.question_target_id and qt.target_name='empauwer_me'
    where q.is_active=true
    order by q.question_id asc
  `);
  const allQIds = allQIdsRAW.rows;
  // console.log({allQIds})

  // Should work: ["scale10", "scale5", "yes_no", "single_choice"]
  // Should NOT work: ["multiple_choice"]
  // Ignore: ["subjective", "integer"]

  const shouldWork = ["scale10", "scale5", "yes_no", "single_choice"];
  const shouldNOTWork = ["multiple_choice"];

  const pureQuesMap = {} // { questionId: [{ topAnswer, count }] }
  const mcQuesMap = {} // { questionId: [{ topAnswer, count, topCombo: [{ topAnswer, count }] }] }

  for (let item of allQIds) {
    if (shouldWork.includes(item.question_type_name)) {

      const allAnswerGroupsRaw = await client.query(`
        select 
          count(*), response_val
        from hris.userquesresponses uqr
        where uqr.question_id=${item.question_id} and created_at > '2021-09-19T18:30:00.000Z' and created_at < '2021-10-07T18:30:00.000Z'
        group by uqr.response_val
        order by count desc
      `);
      const allAnswerGroups = allAnswerGroupsRaw.rows;

      pureQuesMap[item.question_id] = {
        question_type_name: item.question_type_name,
        answersArray: []
      };

      for (let i = 0; i < 3; i++) {
        const ansItem = allAnswerGroups[i];

        if (ansItem) {
          pureQuesMap[item.question_id].answersArray.push({
            count: ansItem.count,
            answer: ansItem.response_val.answer,
          })
        }
      }
      // break;

    } else if (shouldNOTWork.includes(item.question_type_name)) {

      const allAnswerGroupsRaw = await client.query(`
      select 
        count(*), response_val
      from hris.userquesresponses uqr
      where uqr.question_id=${item.question_id} and created_at > '2021-09-19T18:30:00.000Z' and created_at < '2021-10-07T18:30:00.000Z'
      group by uqr.response_val
      order by count desc
    `);
      const allAnswerGroups = allAnswerGroupsRaw.rows;

      mcQuesMap[item.question_id] = {
        question_type_name: item.question_type_name,
        answersArray: []
      };

      for (let i = 0; i < 3; i++) {
        const ansItem = allAnswerGroups[i];

        if (ansItem) {
          mcQuesMap[item.question_id].answersArray.push({
            count: ansItem.count,
            answer: ansItem.response_val.answer,
          })
        }
      }
      // break;

    } else {
      console.log(`NONE OF THEM WORKS******************************************`)
      console.log(item.question_type_name);
      console.log(`NONE OF THEM WORKS******************************************`)
      // break;
    }


  }

  console.log(`QUES MAP******************************`)
  console.log({ pureQuesMap: Object.keys(pureQuesMap).length})
  console.log({ mcQuesMap: Object.keys(mcQuesMap).length})
  console.log(`QUES MAP******************************`)


  const pureQuesData = { total: Object.keys(pureQuesMap).length, pureQuesMap }
  const mcQuesRawData = { total: Object.keys(mcQuesMap).length, mcQuesMap }
  fs.writeFileSync(pureQuesFile, JSON.stringify(pureQuesData));
  fs.writeFileSync(mcQuesRawFile, JSON.stringify(mcQuesRawData));
  
  const mcqFinalData = mcqFinal(mcQuesRawData);
  fs.writeFileSync(mcQuesFinalFile, JSON.stringify(mcqFinalData));

  await client.end();
  return { msg: 'DONE' }
}





collectQuesAnalysisData()