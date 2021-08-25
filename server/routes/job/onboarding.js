import {
  updateOnboardingTaskStatus,
  getOnboardingTaskLists,
  getOnboardingLists,
  getOnboardingDetails,
} from "../../controllers/job/onboarding";

const xonboarding = {
  name: 'xonboarding',
  version: '0.1.0',

  register: async (server, options) => {
    try {
      server.route({
        method: 'PATCH',
        path: '/task-status/{onboardingtaskId}',
        options: {
          auth: {
            mode: 'try',
          },
          handler: updateOnboardingTaskStatus,
        },
      });
      server.route({
        method: 'GET',
        path: '/tasks/{onboardingId}',
        options: {
          auth: {
            mode: 'try',
          },
          handler: getOnboardingTaskLists,
        },
      });
      server.route({
        method: 'GET',
        path: '/all',
        options: {
          auth: {
            mode: 'try',
          },
          handler: getOnboardingLists,
        },
      });
      server.route({
        method: 'GET',
        path: '/details/{onboardingId}',
        options: {
          auth: {
            mode: 'try',
          },
          handler: getOnboardingDetails,
        },
      });
    }
    catch (err) {
      console.log(err);
    }
  }
};

export default xonboarding;
