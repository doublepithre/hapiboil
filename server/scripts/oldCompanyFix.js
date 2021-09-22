const envVar = process.env.NODE_ENV;
const config = require(`../../config/${envVar}.json`);

const { Client } = require('pg');
const { DataTypes, Sequelize } = require('sequelize');
const { sendEmailAsync } = require('../utils/email');
const { getDomainURL } = require('../utils/toolbox');
const axios = require('axios');
const cron = require('node-cron');

// DB models
const EmailtemplateMF = require('../../tools/sequelizeauto/models/emailtemplate');
// const Userinfo = require('../../tools/sequelizeauto/models/userinfo');
// const Companyinfo = require('../../tools/sequelizeauto/models/companyinfo');
// const Emaillog = require('../../tools/sequelizeauto/models/emaillog');

const sequelize = new Sequelize(
  config.scriptDB.database, config.scriptDB.user, config.scriptDB.password,
  {
    host: config.scriptDB.host,
    dialect: 'postgres'
  }
);

async function fixCompanyEmailTemplates() {
  const client = new Client({
    host: config.scriptDB.host, //"localhost",
    user: config.scriptDB.user,
    password: config.scriptDB.password,
    database: config.scriptDB.database,
  });
  await client.connect();
  const allETLessCompaniesRecords = await client.query(`
    select c.company_id, c.display_name from hris.company c
    left join hris.emailtemplates et on et.company_id=c.company_id
    where et.company_id is null
    `);
  const allETLessCompanies = allETLessCompaniesRecords.rows;
  console.log(allETLessCompanies);

  for (let c of allETLessCompanies) {
    const csaListRaw = await client.query(`
    select ui.user_id, ui.email from hris.userinfo ui
    where ui.role_id = 6 and ui.company_id=${c.company_id}
    order by ui.created_at desc
      `);
    const csaList = csaListRaw.rows;
    console.log(csaList);

    console.log({ csa: csaList[0] })

    if (csaList[0]) {
      // creating company custom email templates (copying the default ones)
      const Emailtemplate = EmailtemplateMF(sequelize, DataTypes);
      const allDefaultTemplatesRecord = await Emailtemplate.findAll({ where: { ownerId: null, companyId: null, isDefaultTemplate: true }, attributes: { exclude: ['id', 'createdAt', 'updatedAt', 'isUserTemplate', 'companyId', 'ownerId', 'isDefaultTemplate'] } });
      for (let record of allDefaultTemplatesRecord) {
        const defaultData = record.toJSON();
        console.log({ templateName: defaultData.templateName })
        Emailtemplate.create({ ...defaultData, isDefaultTemplate: false, companyId: c.company_id, templateName: defaultData.templateName, ownerId: csaList[0].user_id });
      }
      console.log(`${c.display_name} DONE!`);  
    }
  }
  await client.end();
}

fixCompanyEmailTemplates()
