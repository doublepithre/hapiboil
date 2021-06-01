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
    updateApplicationStatus,

    getAllDefaultEmailTemplates,
    getAllCustomEmailTemplates,
    getEmailTemplateInfo,
    maintainCompanyEmailTemplates,

    mentorCandidateLinking,
    getMentorCandidates,
    getAllMentorCandidates,
    replaceMentorForOne,
    replaceMentorForAll,
    deleteMentorCandidateMappingRecord,
     
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
        method: 'GET',
        path: '/email-template/default',
        options: {
          auth: {
            mode: 'try',
          },
          handler: getAllDefaultEmailTemplates,          
        },
      });
      server.route({
        method: 'GET',
        path: '/email-template/custom',
        options: {
          auth: {
            mode: 'try',
          },
          handler: getAllCustomEmailTemplates,          
        },
      });
      server.route({
        method: 'GET',
        path: '/email-template-info/{templateId}',
        options: {
          auth: {
            mode: 'try',
          },
          handler: getEmailTemplateInfo,
        },
      });
      server.route({
        method: 'PATCH',
        path: '/customize-email-template/{templateId}',
        options: {
          auth: {
            mode: 'try',
          },
          handler: maintainCompanyEmailTemplates,
        },
      });
      server.route({
        method: 'POST',
        path: '/mentor-candidate/{applicationId}',
        options: {
          auth: {
            mode: 'try',
          },
          handler: mentorCandidateLinking,
        },
      });
      server.route({
        method: 'GET',
        path: '/mentor-candidates/all',
        options: {
          auth: {
            mode: 'try',
          },
          handler: getAllMentorCandidates,
        },
      });
      server.route({
        method: 'GET',
        path: '/mentor-candidate/me',
        options: {
          auth: {
            mode: 'try',
          },
          handler: getMentorCandidates,
        },
      });
      server.route({
        method: 'DELETE',
        path: '/mentor-candidate/{candidateId}',
        options: {
          auth: {
            mode: 'try',
          },
          handler: deleteMentorCandidateMappingRecord,
        },
      });     
      server.route({
        method: 'PATCH',
        path: '/replace-mentor/one/{candidateId}',
        options: {
          auth: {
            mode: 'try',
          },
          handler: replaceMentorForOne,
        },
      });
      server.route({
        method: 'PATCH',
        path: '/replace-mentor/all/{oldMentorId}',
        options: {
          auth: {
            mode: 'try',
          },
          handler: replaceMentorForAll,
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
        path: '/j/talent/{userId}',
        options: {
          auth: {
            mode: 'try',
          },
          handler: getTalentProfile,
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
