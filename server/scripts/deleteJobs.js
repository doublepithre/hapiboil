const envVar = process.env.NODE_ENV;
const config = require(`../../config/${ envVar }.json`);

const { Client } = require('pg');
const { Op, DataTypes, Sequelize } = require('sequelize');
const { sendEmailAsync } = require('../utils/email');
const { getDomainURL } = require('../utils/toolbox');
const axios = require('axios');
const cron = require('node-cron');


// '0 9 * * *' ---->every day at 09:00 am (in London time) this function will run
// cron.schedule('* * * * *', () => {
//   permanentlyDeleteJobsWhichWereDeletedMoreThan2YearsAgo();
// }, {
//   timezone: 'Europe/London'
// });






const testFunc = async ()=> {
  await permanentlyDeleteJobsWhichWereDeletedMoreThan2YearsAgo();
  console.log("**************************yooooooo!")
}
testFunc();

async function permanentlyDeleteJobsWhichWereDeletedMoreThan2YearsAgo(){
  const client = new Client({
      host: config.scriptDB.host, //"localhost",
      user: config.scriptDB.user,
      password: config.scriptDB.password,
      database: config.scriptDB.database,
  });   
  await client.connect();
  
  /* --------------GET deleted JOB IDS--------------- */
  const twoYearsFromNow = new Date(new Date().setFullYear(new Date().getFullYear() + 2));
  const getJobIds = `
    SELECT j.job_id from hris.jobs j
    where j.is_deleted=true and j.deleted_at > '${ twoYearsFromNow.toISOString() }'
  `;  
  const jobIdsRaw = await client.query(getJobIds);
  const jobIds = jobIdsRaw.rows;
  console.log(jobIds) 


  // JOB IDS (to be deleted)
  let jobIdsStr = '';
  jobIds.forEach((item, index)=>{
    if(index !== jobIds.length - 1) jobIdsStr += `${item.job_id},`;
    if(index === jobIds.length - 1) jobIdsStr += `${item.job_id}`;
  });

  console.log(`jobIdsStr: `, jobIdsStr)


  /* --------------GET APPLICATION IDS--------------- */
  let applicationIds = [];
 if(jobIdsStr){
    const getApplicationIds = `
      SELECT ja.application_id from hris.jobapplications ja
      where ja.job_id in(${ jobIdsStr })
    `;  
    const applicationIdsRaw = await client.query(getApplicationIds);
    applicationIds = applicationIdsRaw.rows;
  }
  
  // APPLICATION IDS (to be deleted)
  let applicationIdsStr = '';
  applicationIds.forEach((item, index)=>{
    if(index !== applicationIds.length - 1) applicationIdsStr += `${item.application_id},`;
    if(index === applicationIds.length - 1) applicationIdsStr += `${item.application_id}`;
  });
 
  console.log(`applicationIdsStr: `, applicationIdsStr);

  /* -----------------------------------------
  . DELETE JOBS and everything related to it
  ----------------------------------------- */  
  if(applicationIdsStr){
    const deleteApplicationAuditLogs = `
      DELETE from hris.applicationauditlog alog
      where alog.affected_application_id in(${ applicationIdsStr })
    `;  
    await client.query(deleteApplicationAuditLogs);
  }

  if(jobIdsStr){
    const deleteApplications = `
      DELETE from hris.jobapplications ja
      where ja.job_id in(${ jobIdsStr })
    `;  
    await client.query(deleteApplications);
    
    const deleteJobAuditLogs = `
      DELETE from hris.jobauditlog jlog
      where jlog.affected_job_id in(${ jobIdsStr })
    `;  
    await client.query(deleteJobAuditLogs);
    
    const deleteJobAcessRecords = `
      DELETE from hris.jobhiremember jhm
      where jhm.job_id in(${ jobIdsStr })
    `;  
    await client.query(deleteJobAcessRecords);
    
    const deleteJobs = `
      DELETE from hris.jobs j
      where j.is_deleted=true and j.deleted_at > '${ twoYearsFromNow.toISOString() }'
    `;  
    await client.query(deleteJobs);
  }
  


}





/* -----------------HELPER FUNCTIONS */

// METHOD 1
// save jobs
// save applications
// save all applications access
// delete all


// METHOD 2
// delete using joining



// get all jobs
// for job --- many applications + many access Records //for those jobIDs
// application ---- many application access records //for applicationIDs







