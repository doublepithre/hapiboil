import { 
    createJob,
    getJobs,
    updateJob,
    createJobQuesResponses,
    getJobQuesResponses,
    applyToJob,
    getAppliedJobs,
    getJobRecommendations,
    getRecruiterJobs
} from "../controllers/job";

const xjob = {
  name: 'xjob',
  version: '0.1.0',
  
  register: async (server, options) => {
    try {
      server.route({
        method: 'POST',
        path: '/',
        options: {
          auth: {
            mode: 'try',
          },
          handler: createJob,
        },
      });
      server.route({
        method: 'GET',
        path: '/{jobUuid}',
        options: {
          auth: {
            mode: 'try',
          },
          handler: async (request, h) => {
            return await getJobs(request, h, 'one');
          },
        },
      });
      server.route({
        method: 'GET',
        path: '/',
        options: {
          auth: {
            mode: 'try',
          },
          handler: async (request, h) => {
            return await getJobs(request, h, 'all');
          },
        },
      });
      server.route({
        method: 'GET',
        path: '/recruiter-jobs',
        options: {
          auth: {
            mode: 'try',
          },
          handler: async (request, h) => {
            return await getRecruiterJobs(request, h, 'all');
          },
        },
      });
      server.route({
        method: 'PATCH',
        path: '/{jobUuid}',
        options: {
          auth: {
            mode: 'try',
          },
          handler: updateJob,
        },
      });
      server.route({
        method: 'POST',
        path: '/profile',
        options: {
          auth: {
            mode: 'try',
          },
          handler: createJobQuesResponses,
        },
      });
      server.route({
        method: 'GET',
        path: '/profile/{jobId}',
        options: {
          auth: {
            mode: 'try',
          },
          handler: getJobQuesResponses,
        },
      });
      server.route({
        method: 'POST',
        path: '/apply-to-job',
        options: {
          auth: {
            mode: 'try',
          },
          handler: applyToJob,
        },
      });
      server.route({
        method: 'GET',
        path: '/applied-jobs',
        options: {
          auth: {
            mode: 'try',
          },
          handler: getAppliedJobs,
        },
      });
      server.route({
        method: 'GET',
        path: '/recommendations',
        options: {
          auth: {
            mode: 'try',
          },
          handler: async(request,h)=>{
            try{
              return await getJobRecommendations(request,h,server.app.jobCache)
            }catch(err){
              console.error(err.stack)
              return h.response({"message":"Internal Server Error"}).code(500)
            }
            
          }
        },
      });
    } 
    catch(err) {
      console.log(err);
    }
  }
};

export default xjob;
