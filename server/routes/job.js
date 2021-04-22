import { 
    createJob,
    getJobDetailsOptions,
    getAutoComplete,
    getSingleJob,
    getAllJobs,
    getRecruiterJobs,
    getJobAccessRecords,
    shareJob,
    updateSharedJob,
    deleteJobAccessRecord,
    updateJob,
    createJobQuesResponses,
    getJobQuesResponses,
    applyToJob,
    getAppliedJobs,
    withdrawFromAppliedJob,
    getApplicantProfile,
    getAllApplicantsSelectiveProfile,
    getApplicationAccessRecords,
    shareApplication, 
    updateSharedApplication,
    deleteApplicationAccessRecord,
    getRecommendedTalents,
    getTalentsAndApplicants,
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
        method: 'GET',
        path: '/j/share-job/{jobId}',
        options: {
          auth: {
            mode: 'try',
          },
          handler: getJobAccessRecords,
        },
      });
      server.route({
        method: 'POST',
        path: '/j/share-job/{jobId}',
        options: {
          auth: {
            mode: 'try',
          },
          handler: shareJob,
        },
      });
      server.route({
        method: 'PATCH',
        path: '/j/share-job/{jobId}',
        options: {
          auth: {
            mode: 'try',
          },
          handler: updateSharedJob,
        },
      });
      server.route({
        method: 'DELETE',
        path: '/j/share-job/{jobId}',
        options: {
          auth: {
            mode: 'try',
          },
          handler: deleteJobAccessRecord,
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
        method: 'GET',
        path: '/j/auto-complete',
        options: {
          auth: {
            mode: 'try',
          },
          handler: getAutoComplete,
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
        method: 'GET',
        path: '/j/share-application/{applicationId}',
        options: {
          auth: {
            mode: 'try',
          },
          handler: getApplicationAccessRecords,
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
        method: 'DELETE',
        path: '/j/share-application/{applicationId}',
        options: {
          auth: {
            mode: 'try',
          },
          handler: deleteApplicationAccessRecord,
        },
      });
      server.route({
        method: 'GET',
        path: '/j/talents/{jobId}',
        options: {
          auth: {
            mode: 'try',
          },
          handler: getRecommendedTalents,
        },
      });      
      server.route({
        method: 'GET',
        path: '/j/talents-and-applicants',
        options: {
          auth: {
            mode: 'try',
          },
          handler: getTalentsAndApplicants,
        },
      });      
    } 
    catch(err) {
      console.log(err);
    }
  }
};

export default xjob;
