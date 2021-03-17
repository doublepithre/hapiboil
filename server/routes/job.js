import { 
    createJob,
    getJobDetailsOptions,
    getSingleJob,
    getAllJobs,
    getRecruiterJobs,
    shareJob,
    updateSharedJob,
    updateJob,
    createJobQuesResponses,
    getJobQuesResponses,
    applyToJob,
    getAppliedJobs,
    withdrawFromAppliedJob,
    getApplicantProfile,
    getAllApplicantsSelectiveProfile,
    shareApplication, 
    updateSharedApplication,
    getRecommendedTalents,
    getJobRecommendations,
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
            return await getSingleJob(request, h);
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
            return await getAllJobs(request, h);
          },
        },
      });      
      server.route({
        method: 'GET',
        path: '/j/recruiter',
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
        path: '/j/share-job/{jobUuid}',
        options: {
          auth: {
            mode: 'try',
          },
          handler: shareJob,
        },
      });
      server.route({
        method: 'PATCH',
        path: '/j/share-job/{jobUuid}',
        options: {
          auth: {
            mode: 'try',
          },
          handler: updateSharedJob,
        },
      });
      server.route({
        method: 'GET',
        path: '/j/job-details-options',
        options: {
          auth: {
            mode: 'try',
          },
          handler: getJobDetailsOptions,
        },
      });
      server.route({
        method: 'POST',
        path: '/profile/{jobId}',
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
        path: '/j/apply',
        options: {
          auth: {
            mode: 'try',
          },
          handler: applyToJob,
        },
      });
      server.route({
        method: 'GET',
        path: '/j/applied',
        options: {
          auth: {
            mode: 'try',
          },
          handler: getAppliedJobs,
        },
      });
      server.route({
        method: 'PATCH',
        path: '/j/withdraw',
        options: {
          auth: {
            mode: 'try',
          },
          handler: withdrawFromAppliedJob,
        },
      });
      server.route({
        method: 'GET',
        path: '/j/applications/{jobId}',
        options: {
          auth: {
            mode: 'try',
          },
          handler: getAllApplicantsSelectiveProfile,
        },
      });
      server.route({
        method: 'GET',
        path: '/j/application/{userId}',
        options: {
          auth: {
            mode: 'try',
          },
          handler: getApplicantProfile,
        },
      });
      server.route({
        method: 'POST',
        path: '/j/share-application/{applicationId}',
        options: {
          auth: {
            mode: 'try',
          },
          handler: shareApplication,
        },
      });
      server.route({
        method: 'PATCH',
        path: '/j/share-application/{applicationId}',
        options: {
          auth: {
            mode: 'try',
          },
          handler: updateSharedApplication,
        },
      });
      server.route({
        method: 'GET',
        path: '/j/recommended-talents',
        options: {
          auth: {
            mode: 'try',
          },
          handler: getRecommendedTalents,
        },
      });
      server.route({
        method: 'GET',
        path: '/j/recommendations',
        options: {
          auth: {
            mode: 'try',
          },
          handler: async(request,h)=>{
            try{
              return await getJobRecommendations(request,h)
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
