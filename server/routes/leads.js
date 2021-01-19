import {
  list,
  createLead,
  patchLead,
  lead,
  getLeadAuditLogs,
  getFilters,
  sendMaps,
  bulkImportLeads,
  leadsExport,
  downloadLeads,
} from '../controllers/leads';

const leads = {
  name: 'leads',
  version: '0.1.0',
  register: async (server, options) => {
    try {
      await server.register(require('./xauth'));
      await server.register(require('@hapi/inert'));
      server.route({
        method: 'GET',
        path: '/',
        options: {
          auth: {
            mode: 'try',
          },
          handler: list,
        },
      });

      server.route({
        method: 'GET',
        path: '/{leaduuid}',
        options: {
          auth: {
            mode: 'try',
          },
          handler: lead,
        },
      });

      server.route({
        method: 'GET',
        path: '/logs/{leaduuid}',
        options: {
          auth: {
            mode: 'try',
          },
          handler: getLeadAuditLogs,
        },
      });

      server.route({
        method: 'GET',
        path: '/l/filters',
        options: {
          auth: {
            mode: 'try',
          },
          handler: getFilters,
        },
      });

      server.route({
        method: 'POST',
        path: '/',
        options: {
          auth: {
            mode: 'try',
          },
          handler: createLead,
        },
      });

      server.route({
        method: 'PATCH',
        path: '/{leaduuid}',
        options: {
          auth: {
            mode: 'try',
          },
          plugins: {
            'hapi-auth-cookie': {
              redirectTo: false,
            },
          },
          handler: patchLead,
        },
      });

      server.route({
        method: 'POST',
        path: '/{leaduuid}/send-maps',
        options: {
          auth: {
            mode: 'try',
          },
          handler: sendMaps,
        },
      });

      server.route({
        method: 'POST',
        path: '/l/import',
        options: {
          auth: {
            mode: 'try',
          },
          payload:{
            maxBytes: 52428800,//50 MB
            allow: ['multipart/form-data'],
            multipart: true,
            output:'stream',
            parse: true,
          }, 
          handler: bulkImportLeads,
        },
      });

      server.route({
        method: 'GET',
        path: '/l/export',
        options: {
          auth: {
            mode: 'try',
          },
          handler: leadsExport,
        },
      });

      server.route({
        method: 'GET',
        path: '/l/download/{fileKey}',
        options: {
          auth: {
            mode: 'try',
          },
          handler: downloadLeads,
        },
      });
    } catch(err) {
      console.error(err);
    }
  },
};

export default leads;
