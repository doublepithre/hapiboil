/**
 * Use Cache to get all jobs from database
 */
const getJobInfos = async(jobIds,model,cache) =>{
    jobinfos = jobIds.map(jobid=>{
        return cache.get(jobid);
    });
    jobInfos = await Promise.alls(jobInfos)
    let cacheMiss = []
    for(let i=0;i<jobIds.length;i++){
        if (!jobInfos[i]){
            cacheMiss.push(jobIds[i])
        }
    }
    //populate cache and fill in missing values
    let missedJobInfos = await model.findAll({where:{jobId:cacheMiss}});
    //populate cache
    for(let jobInfo in missedJobInfos){
        cache.set(jobInfo.jobId,jobInfo)//no need await here
    }
    //fill in job infos to return 
    let j = 0;
    for(let i=0;i<jobIds.length;i++){
        if (!jobInfos[i]){
            jobInfos[i] = missedJobInfo[j];
            j++;
        }
    }
    return jobInfos;
}

/**
 * To run when the server start stores all jobs in jobsCache
 */
const initJobsCache = async(model,cache)=>{
    let jobInfos = await model.findAll();
    let promiseArr = []
    for(let jobInfo of jobInfos){
        promiseArr.push(cache.set(jobInfo.jobId,jobInfo));
    }
    await Promise.all(promiseArr);
}
module.exports = {
    getJobInfos,
    initJobsCache
}