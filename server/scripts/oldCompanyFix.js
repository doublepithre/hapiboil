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
const CompanyworkaccommodationMF = require('../../tools/sequelizeauto/models/companyworkaccommodation');
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

async function fixEmployerEmailTemplates() {
  const client = new Client({
    host: config.scriptDB.host, //"localhost",
    user: config.scriptDB.user,
    password: config.scriptDB.password,
    database: config.scriptDB.database,
  });
  await client.connect();
  const allETLessCompaniesRecords = await client.query(`
    select
      ui.company_id,
      ui.user_id,
      ur.role_name, ur.role_id
    from hris.userinfo ui
      inner join hris.userrole ur on ur.role_id=ui.role_id and ur.role_name='employer'
      left join hris.emailtemplates et on et.company_id=ui.company_id and et.owner_id=ui.user_id
    where et.company_id is null
    `);
  const allETLessCompanies = allETLessCompaniesRecords.rows;
  console.log(allETLessCompanies);
  const Emailtemplate = EmailtemplateMF(sequelize, DataTypes);

  for (let e of allETLessCompanies) {
    // creating company custom email templates (copying the company level ones)
    const allDefaultTemplatesRecord = await Emailtemplate.findAll({ where: { isDefaultTemplate: false, isCompanyLevel: true, companyId: e.company_id }, attributes: { exclude: ['id', 'createdAt', 'updatedAt', 'isUserTemplate', 'companyId', 'ownerId', 'isDefaultTemplate', 'isCompanyLevel'] } });
    for (let record of allDefaultTemplatesRecord) {
      const defaultData = record.toJSON();
      Emailtemplate.create({ ...defaultData, isDefaultTemplate: false, isCompanyLevel: false, companyId: e.company_id, templateName: defaultData.templateName, ownerId: e.user_id });
    }
    console.log(`${e.display_name} DONE!`);
  }
  await client.end();
  return { msg: 'DONE' }
}

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
      const allDefaultTemplatesRecord = await Emailtemplate.findAll({ where: { ownerId: null, companyId: null, isDefaultTemplate: true }, attributes: { exclude: ['id', 'createdAt', 'updatedAt', 'isUserTemplate', 'companyId', 'ownerId', 'isDefaultTemplate', 'isCompanyLevel'] } });
      for (let record of allDefaultTemplatesRecord) {
        const defaultData = record.toJSON();
        console.log({ templateName: defaultData.templateName })
        Emailtemplate.create({ ...defaultData, isDefaultTemplate: false, isCompanyLevel: true, companyId: c.company_id, templateName: defaultData.templateName, ownerId: csaList[0].user_id });
      }
      console.log(`${c.display_name} DONE!`);
    }
  }
  await client.end();
  return { msg: 'DONE' }
}

async function fixCompanyWorkAccommodations() {
  const client = new Client({
    host: config.scriptDB.host, //"localhost",
    user: config.scriptDB.user,
    password: config.scriptDB.password,
    database: config.scriptDB.database,
  });
  await client.connect();
  const allETLessCompaniesRecords = await client.query(`
    select * from hris.company c
    left join hris.companyworkaccommodations csa on csa.company_id = c.company_id
    where csa.company_id is null
    `);
  const allETLessCompanies = allETLessCompaniesRecords.rows;
  console.log(allETLessCompanies);

  for (let c of allETLessCompanies) {
    const Companyworkaccommodation = CompanyworkaccommodationMF(sequelize, DataTypes);

    // creating company work accommodations (copying the fixed x0pa given work accommodations)
    const allWorkAcoomodations = await Workaccommodation.findAll({ attributes: { exclude: ['createdAt', 'updatedAt'] } });
    for (let record of allWorkAcoomodations) {
      const defaultData = record.toJSON();
      Companyworkaccommodation.create({
        workaccommodationId: defaultData.workaccommodationId,
        companyId: c.company_id,
        status: 'not started',
      });
    };
    console.log(`${c.display_name} DONE!`);

  }
  await client.end();
  return { msg: 'DONE' }
}

fixCompanyWorkAccommodations()
fixCompanyEmailTemplates()
fixEmployerEmailTemplates()