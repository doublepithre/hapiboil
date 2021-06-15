const envVar = process.env.NODE_ENV;
const config = require(`../../config/${ envVar }.json`);

const { Client } = require('pg');
const cron = require('node-cron');


// '0 9 * * *' ---->every day at 09:00 am (in London time) this function will run
// cron.schedule('* * * * *', () => {
//   permanentlyDeleteJobsWhichWereDeletedMoreThan2YearsAgo();
// }, {
//   timezone: 'Europe/London'
// });






const testFunc = async ()=> {
  console.log("**************************START!")
  await permanentlyDeleteJobsWhichWereDeletedMoreThan2YearsAgo();
  console.log("**************************END!")
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
  const twoYearsBeforeNow = new Date(new Date().setFullYear(new Date().getFullYear() - 2));
  const getJobIds = `
    SELECT j.job_id from hris.jobs j
    where j.is_deleted=true and j.deleted_at < '${ twoYearsBeforeNow.toISOString() }'
    `;  
  const jobIdsRaw = await client.query(getJobIds);
  const jobIdsArray = jobIdsRaw.rows;
  console.log(jobIdsArray) 


  // JOB IDS (to be deleted)
  const jobIdsStr = joinArrayObjectItemsAsString(jobIdsArray, 'job_id');
  console.log(`jobIdsStr: `, jobIdsStr)




  /* --------------GET APPLICATION IDS--------------- */
  let applicationIdsArray = [];
 if(jobIdsStr){
    const getApplicationIds = `
      SELECT ja.application_id from hris.jobapplications ja
      where ja.job_id in(${ jobIdsStr })
    `;  
    const applicationIdsRaw = await client.query(getApplicationIds);
    applicationIdsArray = applicationIdsRaw.rows;
  }
  
  // APPLICATION IDS (to be deleted)
  const applicationIdsStr = joinArrayObjectItemsAsString(applicationIdsArray, 'application_id');
  console.log(`applicationIdsStr: `, applicationIdsStr);




  /* -----------------------------------------
  . DELETE JOBS and everything related to it
  ----------------------------------------- */  
  if(applicationIdsStr){
    await deleteApplicationAuditLogs(client, applicationIdsStr)
  }

  if(jobIdsStr){
    await deleteApplications(client, jobIdsStr);    
    await deleteJobAuditLogs(client, jobIdsStr);    
    await deleteJobAcessRecords(client, jobIdsStr);    
    await deleteJobs(client, twoYearsBeforeNow);      
  }
  await client.end();  
}





/* -----------------HELPER FUNCTIONS */
function joinArrayObjectItemsAsString(array, propertyName){
  let str = '';
  array.forEach((item, index)=>{
    if(index !== array.length - 1) str += `${item[propertyName]},`;
    if(index === array.length - 1) str += `${item[propertyName]}`;
  });

  return str;
}



async function deleteApplicationAuditLogs(client, stringOfApplicationIds){
  const sqlStmt = `
      DELETE from hris.applicationauditlog alog
      where alog.affected_application_id in(${ stringOfApplicationIds })
    `;  
    await client.query(sqlStmt);
}

async function deleteApplications(client, stringOfJobIds){
  const sqlStmt = `
      DELETE from hris.jobapplications ja
      where ja.job_id in(${ stringOfJobIds })
    `;  
    await client.query(sqlStmt);
}

async function deleteJobAuditLogs(client, stringOfJobIds){
  const sqlStmt = `
      DELETE from hris.jobauditlog jlog
      where jlog.affected_job_id in(${ stringOfJobIds })
    `;  
    await client.query(sqlStmt);
}

async function deleteJobAcessRecords(client, stringOfJobIds){
  const sqlStmt = `
      DELETE from hris.jobhiremember jhm
      where jhm.job_id in(${ stringOfJobIds })
    `;  
    await client.query(sqlStmt);
}

async function deleteJobs(client, deleteAfterThisTime){
  const sqlStmt = `
      DELETE from hris.jobs j
      where j.is_deleted=true and j.deleted_at < '${ deleteAfterThisTime.toISOString() }'
    `;  
    await client.query(sqlStmt);
}
