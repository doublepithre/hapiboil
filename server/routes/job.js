import { 
  createJob,    
  getJobDetailsOptions,
  getAutoComplete,

  getSingleJob,
  getAllJobs,
  getRecruiterJobs,

  updateJob,
  deleteJob,
  getAllDeletedJobs,
  restoreDeletedJob,
  
  getJobAccessRecords,
  shareJob,
  updateSharedJob,
  deleteJobAccessRecord,

  createJobQuesResponses,
  getJobQuesResponses,

  applyToJob,
  getAppliedJobs,
  withdrawFromAppliedJob,

  getAllEmployerApplicantsSelectiveProfile,
  getAllApplicantsSelectiveProfile,
  getApplicantProfile,
  
  getApplicationAccessRecords,
  shareApplication, 
  updateSharedApplication,
  deleteApplicationAccessRecord,
  updateApplicationStatus,

  updateOnboardingTaskStatus,
  getOnboardingTaskLists,
  getOnboardingLists,
  getOnboardingDetails,

  getRecommendedTalents,
  getTalentsAndApplicants,
  getTalentProfile,
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
        method: 'GET',
        path: '/{jobUuid}',
        options: {
          auth: {
            mode: 'try',
          },
          handler: getSingleJob,
        },
      });
      server.route({
        method: 'GET',
        path: '/',
        options: {
          auth: {
            mode: 'try',
          },
          handler: getAllJobs,
        },
      });      
      server.route({
        method: 'GET',
        path: '/j/recruiter',
        options: {
          auth: {
            mode: 'try',
          },
          handler: getRecruiterJobs,
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
        method: 'DELETE',
        path: '/{jobUuid}',
        options: {
          auth: {
            mode: 'try',
          },
          handler: deleteJob,
        },
      });
      server.route({
        method: 'GET',
        path: '/j/deleted',
        options: {
          auth: {
            mode: 'try',
          },
          handler: getAllDeletedJobs,
        },
      });
      server.route({
        method: 'PATCH',
        path: '/j/restore',
        options: {
          auth: {
            mode: 'try',
          },
          handler: restoreDeletedJob,
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
        path: '/j/all-applications',
        options: {
          auth: {
            mode: 'try',
          },
          handler: getAllEmployerApplicantsSelectiveProfile,
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
        path: '/j/application/{jobId}/{userId}',
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
        method: 'PATCH',
        path: '/application-status/{applicationId}',
        options: {
          auth: {
            mode: 'try',
          },
          handler: updateApplicationStatus,
        },
      });    
      server.route({
        method: 'PATCH',
        path: '/onboarding-task-status/{onboardingtaskId}',
        options: {
          auth: {
            mode: 'try',
          },
          handler: updateOnboardingTaskStatus,
        },
      });    
      server.route({
        method: 'GET',
        path: '/onboarding-tasks/{onboardingId}',
        options: {
          auth: {
            mode: 'try',
          },
          handler: getOnboardingTaskLists,
        },
      });
      server.route({
        method: 'GET',
        path: '/onboardings',
        options: {
          auth: {
            mode: 'try',
          },
          handler: getOnboardingLists,
        },
      });
      server.route({
        method: 'GET',
        path: '/onboarding/{onboardingId}',
        options: {
          auth: {
            mode: 'try',
          },
          handler: getOnboardingDetails,
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
      server.route({
        method: 'GET',
        path: '/j/talent/{userId}',
        options: {
          auth: {
            mode: 'try',
          },
          handler: getTalentProfile,
        },
      });
    } 
    catch(err) {
      console.log(err);
    }
  }
};

export default xjob;
