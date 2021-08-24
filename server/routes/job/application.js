import {
  applyToJob,
  getAppliedJobs,
  withdrawFromAppliedJob,

  updateApplicationStatus,

  getAllEmployerApplicantsSelectiveProfile,
  getAllApplicantsSelectiveProfile,
  getApplicantProfile,
} from "../../controllers/job/application";

const xapplication = {
  name: 'xapplication',
  version: '0.1.0',

  register: async (server, options) => {
    try {
      server.route({
        method: 'POST',
        path: '/apply',
        options: {
          auth: {
            mode: 'try',
          },
          handler: applyToJob,
        },
      });
      server.route({
        method: 'GET',
        path: '/applied',
        options: {
          auth: {
            mode: 'try',
          },
          handler: getAppliedJobs,
        },
      });
      server.route({
        method: 'PATCH',
        path: '/withdraw',
        options: {
          auth: {
            mode: 'try',
          },
          handler: withdrawFromAppliedJob,
        },
      });
      server.route({
        method: 'PATCH',
        path: '/status/{applicationId}',
        options: {
          auth: {
            mode: 'try',
          },
          handler: updateApplicationStatus,
        },
      }); 
      server.route({
        method: 'GET',
        path: '/all-jobs',
        options: {
          auth: {
            mode: 'try',
          },
          handler: getAllEmployerApplicantsSelectiveProfile,
        },
      });
      server.route({
        method: 'GET',
        path: '/all/{jobId}',
        options: {
          auth: {
            mode: 'try',
          },
          handler: getAllApplicantsSelectiveProfile,
        },
      });
      server.route({
        method: 'GET',
        path: '/applicant/{jobId}/{userId}',
        options: {
          auth: {
            mode: 'try',
          },
          handler: getApplicantProfile,
        },
      });
    }
    catch (err) {
      console.log(err);
    }
  }
};

export default xapplication;
