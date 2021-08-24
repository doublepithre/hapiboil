import {
  createJob,
  getSingleJob,
  getAllJobs,
  getRecruiterJobs,

  updateJob,
  deleteJob,
  getAllDeletedJobs,
  restoreDeletedJob,

  createJobQuesResponses,
  getJobQuesResponses,
} from "../../controllers/job/job";

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
    }
    catch (err) {
      console.log(err);
    }
  }
};

export default xjob;
