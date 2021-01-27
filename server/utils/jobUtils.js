/**
 * Use Cache to get all jobs from database
 */
const getJobInfos = async(jobIds,model,cache) =>{
    let jobInfos = []
    for(let jobId of jobIds){
        let key = {
            segment:"jobCache",
            id:jobId.toString()
        }
        jobInfos.push(await cache.get(key))
    }
    let cacheMiss = []
    for(let i=0;i<jobIds.length;i++){
        if (!jobInfos[i]){
            cacheMiss.push(jobIds[i])
        }
    }
    //populate cache and fill in missing values
    let missedJobInfos = await model.findAll({where:{jobId:cacheMiss}});
    console.log(missedJobInfos);
    //populate cache
    for(let jobInfo of missedJobInfos){
        let key = {
            segment:"jobCache",
            id:jobInfo.jobId.toString()
        }
        cache.set(key,jobInfo)//no need await here
    }
    //fill in job infos to return 
    let j = 0;
    for(let i=0;i<jobIds.length;i++){
        if (!jobInfos[i]){
            jobInfos[i] = missedJobInfos[j];
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
        let key = {
            segment:"jobCache",
            id:jobInfo.jobId.toString()
        }
        promiseArr.push(cache.set(key,jobInfo));
    }
    await Promise.all(promiseArr);
}
module.exports = {
    getJobInfos,
    initJobsCache
}