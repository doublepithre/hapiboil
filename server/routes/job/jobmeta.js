import {
  getJobDetailsOptions,
  getAutoComplete,

  getTop5EJobWithVisitCount,
  getJobVisitCount,

  getApplicationPieChart,
  getJobApplicationPieChart,

  getRecommendedTalents,
  getTalentsAndApplicants,
  getTalentProfile,
} from "../../controllers/job/jobmeta";

const xjobmeta = {
  name: 'xjobmeta',
  version: '0.1.0',

  register: async (server, options) => {
    try {      
      server.route({
        method: 'GET',
        path: '/options',
        options: {
          auth: {
            mode: 'try',
          },
          handler: getJobDetailsOptions,
        },
      });
      server.route({
        method: 'GET',
        path: '/auto-complete',
        options: {
          auth: {
            mode: 'try',
          },
          handler: getAutoComplete,
        },
      });
      server.route({
        method: 'GET',
        path: '/top-visited',
        options: {
          auth: {
            mode: 'try',
          },
          handler: getTop5EJobWithVisitCount,
        },
      });
      server.route({
        method: 'GET',
        path: '/visit-count/{jobId}',
        options: {
          auth: {
            mode: 'try',
          },
          handler: getJobVisitCount,
        },
      });
      server.route({
        method: 'GET',
        path: '/chart/application',
        options: {
          auth: {
            mode: 'try',
          },
          handler: getApplicationPieChart,
        },
      });
      server.route({
        method: 'GET',
        path: '/chart/job-application',
        options: {
          auth: {
            mode: 'try',
          },
          handler: getJobApplicationPieChart,
        },
      });     
      server.route({
        method: 'GET',
        path: '/talents/{jobId}',
        options: {
          auth: {
            mode: 'try',
          },
          handler: getRecommendedTalents,
        },
      });
      server.route({
        method: 'GET',
        path: '/talents-and-applicants',
        options: {
          auth: {
            mode: 'try',
          },
          handler: getTalentsAndApplicants,
        },
      });
      server.route({
        method: 'GET',
        path: '/talent/{userId}',
        options: {
          auth: {
            mode: 'try',
          },
          handler: getTalentProfile,
        },
      });
    }
    catch (err) {
      console.log(err);
    }
  }
};

export default xjobmeta;
