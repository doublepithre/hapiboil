import { 
  getJobAccessRecords,
  shareJob,
  updateSharedJob,
  deleteJobAccessRecord,

  getApplicationAccessRecords,
  shareApplication,
  updateSharedApplication,
  deleteApplicationAccessRecord,
} from "../../controllers/job/access";

const xaccess = {
  name: 'xaccess',
  version: '0.1.0',

  register: async (server, options) => {
    try {     
      server.route({
        method: 'GET',
        path: '/share-job/{jobId}',
        options: {
          auth: {
            mode: 'try',
          },
          handler: getJobAccessRecords,
        },
      });
      server.route({
        method: 'POST',
        path: '/share-job/{jobId}',
        options: {
          auth: {
            mode: 'try',
          },
          handler: shareJob,
        },
      });
      server.route({
        method: 'PATCH',
        path: '/share-job/{jobId}',
        options: {
          auth: {
            mode: 'try',
          },
          handler: updateSharedJob,
        },
      });
      server.route({
        method: 'DELETE',
        path: '/share-job/{jobId}',
        options: {
          auth: {
            mode: 'try',
          },
          handler: deleteJobAccessRecord,
        },
      });
      server.route({
        method: 'GET',
        path: '/share-application/{applicationId}',
        options: {
          auth: {
            mode: 'try',
          },
          handler: getApplicationAccessRecords,
        },
      });
      server.route({
        method: 'POST',
        path: '/share-application/{applicationId}',
        options: {
          auth: {
            mode: 'try',
          },
          handler: shareApplication,
        },
      });
      server.route({
        method: 'PATCH',
        path: '/share-application/{applicationId}',
        options: {
          auth: {
            mode: 'try',
          },
          handler: updateSharedApplication,
        },
      });
      server.route({
        method: 'DELETE',
        path: '/share-application/{applicationId}',
        options: {
          auth: {
            mode: 'try',
          },
          handler: deleteApplicationAccessRecord,
        },
      });
    }
    catch (err) {
      console.log(err);
    }
  }
};

export default xaccess;
