const envVar = process.env.NODE_ENV;
const config = require(`../../config/${ envVar }.json`);

const { Client } = require('pg');
const { DataTypes, Sequelize } = require('sequelize');
const { sendEmailAsync } = require('../utils/email');
const { getDomainURL } = require('../utils/toolbox');
const axios = require('axios');
const cron = require('node-cron');

// DB models
const Emailtemplate = require('../../tools/sequelizeauto/models/emailtemplate');
const Userinfo = require('../../tools/sequelizeauto/models/userinfo');
const Companyinfo = require('../../tools/sequelizeauto/models/companyinfo');
const Emaillog = require('../../tools/sequelizeauto/models/emaillog');

const sequelize = new Sequelize(
  config.scriptDB.database, config.scriptDB.user, config.scriptDB.password, 
    { 
      host: config.scriptDB.host, 
      dialect: 'postgres'
    }
);

// '0 9 * * mon' ---->every monday at 09:00 am (in London time) this function will run
cron.schedule('0 9 * * mon', () => {
  sendJobAlertEmailsToAllCandidates();
}, {
  timezone: 'Europe/London'
});

async function sendJobAlertEmailsToAllCandidates(){
    const client = new Client({
        host: config.scriptDB.host, //"localhost",
        user: config.scriptDB.user,
        password: config.scriptDB.password,
        database: config.scriptDB.database,
    });
    await client.connect();
    const allCandidatesRes = await client.query(`
      SELECT ui.email, ui.user_id 
      from hris.userinfo ui 
      where ui.user_type_id=1 and ui.user_id in (160, 161, 162, 163, 164, 165, 166, 167)
    `);
    const allCandidates = allCandidatesRes.rows;
    console.log(allCandidates)

    for(let user of allCandidates){      
      const recommendationRes = await axios.get(`http://${config.dsServer.host}:${config.dsServer.port}/user/recommendation`,{ params: { userId: user.user_id, limit: 5 } })

      const recommendations = recommendationRes?.data?.recommendation //this will be  sorted array of {job_id,score}
      let rJobIdStr = '';
      recommendations.forEach((item, index)=>{
        if(index !== recommendations.length - 1) rJobIdStr += `${item.job_id},`;
        if(index === recommendations.length - 1) rJobIdStr += `${item.job_id}`;
      });      

      const rJobUuidsRes = await client.query(`
        SELECT j.job_uuid, jn.job_name 
        from hris.jobs j
          inner join hris.jobname jn on jn.job_name_id=j.job_name_id
        where j.job_id in(${rJobIdStr})
      `);
      const rJobUuids = rJobUuidsRes.rows
      console.log(user.user_id, rJobUuids);

      let allJobsLinks = '';
      for(let item of rJobUuids){
        const jobLink = `${ getDomainURL() }/job/${item.job_uuid}`
        allJobsLinks += `
        <li><a href="${ jobLink }">
          ${ item.job_name }
        </a></li>`
      }      
        
      // ----------------start of sending emails
      const emailData = {
        emails: [user.email],
        email: user.email,
        ccEmails: [],
        templateName: 'job-alert-email',
        allJobsLinks,
        isX0PATemplate: true,
      };

      const additionalEData = {
        userId: user.user_id,
        Emailtemplate: Emailtemplate(sequelize, DataTypes),
        Userinfo: Userinfo(sequelize, DataTypes),
        Companyinfo: Companyinfo(sequelize, DataTypes),
        Emaillog: Emaillog(sequelize, DataTypes),
      };
      sendEmailAsync(emailData, additionalEData);
      // ----------------end of sending emails      

      // break; //for testing purpose send to only one candidate;
    }    
    await client.end();  
}
