

// From here starts the cron logic to send email weekly to all candidates
// const cron = require('node-cron');

// '0 9 * * mon' DATE CONFIRMED
// cron.schedule('47 3 * * *', () => {
//   console.log('running a task every minute');
// }, {
//   timezone: 'Europe/London'
// });


const { Client } = require('pg');
const { sendEmailAsync } = require('../utils/email');
const { getDomainURL } = require('../utils/toolbox');
const axios = require('axios')
const config = require('config');


const Emailtemplate = require('../../tools/sequelizeauto/models/emailtemplate');
const Userinfo = require('../../tools/sequelizeauto/models/userinfo');
const Companyinfo = require('../../tools/sequelizeauto/models/companyinfo');
const Emaillog = require('../../tools/sequelizeauto/models/emaillog');

const { DataTypes, Sequelize } = require('sequelize');

const sequelize = new Sequelize(
    'canopus', 'postgres', '$ilven1eaf', 
    { 
      host: 'localhost', 
      dialect: 'postgres'
    }
);

// (async ()=>{
//   let Emaillogger = Userinfo(sequelize, DataTypes);
//   const record = await Emaillogger.findOne({ where: { userId: 167 } });
//   const response = record && record.toJSON();
//   console.log(response);
// })()



(async()=>{
    const client = new Client({
        host: "localhost",
        user: "postgres",
        password: "$ilven1eaf",
        database: "canopus",
    });
    await client.connect();
    const allCandidatesRes = await client.query(`
      SELECT ui.email, ui.user_id 
      from hris.userinfo ui 
      where ui.user_type_id=1 and ui.user_id in (160, 161, 162, 163, 164, 165, 166, 167)
    `);
    // console.log(allCandidatesRes.rows)    
    // await client.end();
    const allCandidates = allCandidatesRes.rows;
    console.log(allCandidates)

    for(let user of allCandidates){      
      const recommendationRes = await axios.get(`http://localhost:8000/user/recommendation`,{ params: { userId: user.user_id, limit: 5 } })
      
      // // const recommendationRes = await axios.get(`http://${config.dsServer.host}:${config.dsServer.port}/user/recommendation`,{ params: { user_id: user.user_id } })
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
      // style="-webkit-text-size-adjust: none; background: #3d70b2; border-width: 2px; border-color: transparent; color: #ffffff; display: inline-block; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 17px; font-weight: bold; letter-spacing: normal; margin: 0 auto; padding: 12px 44px; text-align: center; text-decoration: none; width: auto !important"
        
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
      break;

    }
    
    await client.end();  


})()
