const { Op, Sequelize, QueryTypes, cast, literal } = require('sequelize');
const fs = require('fs');
const { format } = require("date-fns");
const FileType = require('file-type');

const {
  formatColumnName,
  convertToJSON,
  validateExcelData,
  md5Hash,
  jsonToExcel,
  getExportDirectory,
} = require('../utils/excelHandler');
const { sanitizeString } = require('../utils/sanitizer');
const { sendEmailAsync } = require('../utils/email');
const { validateIsLoggedIn } = require('../utils/authValidations');

// status is made global temporarily, it'll be moved to the db
const leadStatuses = [
  { statusId: 1, statusName: 'Marketing Presentation' },
  { statusId: 2, statusName: 'MAPs/CJR Shared' },
  { statusId: 3, statusName: 'APC Marketing' },
  { statusId: 4, statusName: 'Follow Up' },
  { statusId: 5, statusName: 'On Hold' },
  { statusId: 6, statusName: 'Terms Shared' },
  { statusId: 7, statusName: 'Terms Negotiated' },
  { statusId: 8, statusName: 'Converted To Client' },
  { statusId: 9, statusName: 'Client Lost' },
  { statusId: 10, statusName: 'Client Revived' },
  { statusId: 11, statusName: 'No Contract Position' },
];

const listLeads = async (request, h) => {
  try {
    const authRes = validateIsLoggedIn(request, h);
     if(authRes.error) return h.response(authRes.response).code(authRes.code);
    
    
    const { Leads, Company, Userinfo, Industry, Jobfunction } = request.getModels('xpaxr');
    const { credentials, artifacts } = request.auth || {};
    const { luser } = artifacts || {};
    const userId = credentials.id;
    const { companyId, active } = luser || {};
    let { offset = 0, limit = 10, ind, fn, lm, status, lc, searchStr } = request.query || {};

    if (limit < 1) {
      limit = 10;
    }
    if (offset < 1) {
      offset = 0;
    }
    if (limit > 50) {
      limit = 50;
    }
    let whereObj = {
      companyId: companyId || 0,
    };
    if (ind) {
      whereObj['industryId'] = ind.split(',');
    }
    if (fn) {
      whereObj['functionalId'] = fn.split(',');
    }
    if (lm) {
      whereObj['leadManagedBy'] = lm.split(',');
    }
    if (status) {
      whereObj['statusId'] = status.split(',');
    }
    if (lc) {
      whereObj['leadCompanyId'] = lc.split(',');
    }
    if(searchStr) {
      searchStr = sanitizeString(searchStr);
      const whereOrObj = {
        [Op.or]: [
          literal(`cast(lead_id as VARCHAR) LIKE '%${searchStr}%'`),
          {
            dmName: { [Op.like]: `%${searchStr}%` }
          },
          {
            leadName: { [Op.like]: `%${searchStr}%` }
          }
        ]
      }
      whereObj = { ...whereObj, ...whereOrObj };
    }
    const r = await Leads.findAndCountAll({
      offset: offset || 0,
      limit: limit || 10,
      where: whereObj,
      order: [['leadId', 'DESC']],
      raw: true,
      nest: true,
      include: [
        {
          model: Company,
          as: 'company',
          attributes: ['companyId', 'displayName'],
        },
        {
          model: Userinfo,
          as: 'userinfo',
          attributes: ['firstname', 'lastname', 'userId', 'email'],
        },
        {
          model: Industry,
          as: 'industry',
          attributes: ['industryId', 'industryName'],
        },
        {
          model: Jobfunction,
          as: 'function',
          attributes: ['functionId', 'functionName'],
        },
      ],
    });
    const leadManagersSet = new Set();
    r.rows.forEach(row => leadManagersSet.add(row.leadManagedBy));
    const leadManagerIdsArray = Array.from(leadManagersSet);
    const leadManagers = await Userinfo.findAll({
      where: { userId: leadManagerIdsArray || 0 },
      attributes: ['firstname', 'lastname', 'userId', 'email'],
    });
    return h.response({ ...r, leadManagers }).code(200);
  } catch (error) {
    console.error(error);
    return h.response({ error: true, message: 'Invalid' }).code(400);
  }
};

const getLead = async (request, h) => {
  try {
    const authRes = validateIsLoggedIn(request, h);
     if(authRes.error) return h.response(authRes.response).code(authRes.code);
    
    
    const { artifacts } = request.auth || {};
    const { luser } = artifacts || {};
    const { companyId, active } = luser || {};
    const { Leads, Company, Userinfo, Industry, Jobfunction } = request.getModels('xpaxr');
    const { leaduuid } = request.params;

    const r = await Leads.findOne({
      where: {
        leadUUID: leaduuid || '0',
        companyId: companyId || 0,
      },
      raw: true,
      nest: true,
      include: [
        {
          model: Company,
          as: 'company',
          attributes: ['companyId', 'displayName'],
        },
        {
          model: Userinfo,
          as: 'userinfo',
          attributes: ['firstname', 'lastname', 'userId', 'email'],
        },
        {
          model: Industry,
          as: 'industry',
          attributes: ['industryId', 'industryName'],
        },
        {
          model: Jobfunction,
          as: 'function',
          attributes: ['functionId', 'functionName'],
        },
      ],
    });
    const leadManager = await Userinfo.findOne({
      where: { userId: r.leadManagedBy || 0 },
      raw: true,
      nest: true,
      attributes: ['firstname', 'lastname', 'userId', 'email'],
    });
    return h.response({ ...r, leadManager }).code(200);
  } catch (error) {
    console.error(error);
    return h.response({ error: true, message: 'Invalid' }).code(400);
  }
};

const getFilters = async (request, h) => {
  try {
    const authRes = validateIsLoggedIn(request, h);
     if(authRes.error) return h.response(authRes.response).code(authRes.code);
    
    
    const { artifacts } = request.auth || {};
    const { luser } = artifacts || {};
    const { companyId } = luser || {};
    const { Leads, Company, Userinfo, Industry, Jobfunction } = request.getModels('xpaxr');

    const companiesNested = await Leads.findAll({
      raw: true,
      nest: true,
      where: {
        companyId: companyId || 0,
      },
      attributes: [],
      include: [
        {
          model: Company,
          as: 'company',
          attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('company.company_id')), 'companyId'], 'displayName'],
        },
      ],
    });
    const companies = companiesNested.map(com => {
      const { company } = com || {};
      const { companyId, displayName } = company || {};
      return {
        companyId: companyId,
        displayName: displayName,
      };
    });

    const leadmanagersNested = await Leads.findAll({
      raw: true,
      nest: true,
      where: {
        companyId: companyId || 0,
      },
      attributes: [],
      include: [
        {
          model: Userinfo,
          as: 'userinfo',
          attributes: [
            [Sequelize.fn('DISTINCT', Sequelize.col('user_id')), 'userId'],
            'firstname',
            'lastname',
            'email',
          ],
        },
      ],
    });
    const leadmanagers = leadmanagersNested.map(lm => {
      const { userinfo } = lm || {};
      const { userId, firstname, lastname, email } = userinfo || {};
      return {
        userId: userId,
        firstname: firstname,
        lastname: lastname,
        email: email,
      };
    });

    const industries = await Industry.findAll({
      raw: true,
      nest: true,
      attributes: ['industryId', 'industryName'],
    });
    const functions = await Jobfunction.findAll({
      raw: true,
      nest: true,
      attributes: ['functionId', 'functionName'],
    });
    return h.response({ companies, leadmanagers, industries, functions, leadStatuses }).code(200);
  } catch (error) {
    console.error(error);
    return h.response({ error: true, message: 'Invalid' }).code(400);
  }
};

const createLead = async (request, h) => {
  try {
    const authRes = validateIsLoggedIn(request, h);
     if(authRes.error) return h.response(authRes.response).code(authRes.code);
    
    
    const { artifacts } = request.auth || {};
    const { luser } = artifacts || {};
    const { userId, companyId, active } = luser || {};
    console.log('LUSER', luser);
    console.log('request.body', request.body);
    const { Leads } = request.getModels('xpaxr');
    const {
      dmName,
      leadName,
      designation,
      emailId,
      contactNumber,
      location,
      industryId,
      functionalId,
      statusId,
      leadManagedBy,
      mobileNumber,
      comments,
      leadCompanyId,
      leadUrl,
    } = request.payload || {};
    const leadData = await Leads.create({
      dmName,
      leadName,
      designation,
      emailId,
      contactNumber,
      location,
      industryId,
      functionalId,
      statusId,
      leadManagedBy,
      mobileNumber,
      comments,
      leadCompanyId,
      leadUrl,
      companyId: companyId,
      createdById: userId,
    });
    return h.response(leadData).code(200);
  } catch (error) {
    console.error(error);
    return h.response({ error: true, message: 'Invalid' }).code(400);
  }
};

const patchLead = async (request, h) => {
  try {
    const authRes = validateIsLoggedIn(request, h);
     if(authRes.error) return h.response(authRes.response).code(authRes.code);
    
    
    const { artifacts } = request.auth || {};
    const { luser } = artifacts || {};
    const { userId, companyId, active, firstname, lastname } = luser || {};
    const { Leads, LeadAuditLogs } = request.getModels('xpaxr');
    const leadUUID = request.params.leaduuid;

    const r = await Leads.findOne({
      where: {
        leadUUID: leadUUID,
        companyId: companyId || 0,
      },
    });
    const {
      industryId,
      functionalId,
      statusId,
      leadManagedBy,
      leadUrl,
      dmName,
      leadName,
      designation,
      emailId,
      contactNumber,
      location,
      mobileNumber,
      comments,
    } = request.payload;
    let logText = `${firstname} ${lastname} updated following details::`;
    if (industryId && industryId != r.dataValues.industryId) {
      logText += `updated Industry ID from ${r.dataValues.industryId} to ${industryId}::`;
    }
    if (functionalId && functionalId != r.dataValues.functionalId) {
      logText += `updated Functional ID from ${r.dataValues.functionalId} to ${functionalId}::`;
    }
    if (statusId && statusId != r.dataValues.statusId) {
      logText += `updated Status ID from ${r.dataValues.statusId} to ${statusId}::`;
    }
    if (leadManagedBy && leadManagedBy != r.dataValues.leadManagedBy) {
      logText += `updated LeadManagedBy from ${r.dataValues.leadManagedBy} to ${leadManagedBy}::`;
    }
    if (leadUrl && leadUrl != r.dataValues.leadUrl) {
      logText += `updated Lead URL from ${r.dataValues.leadUrl} to ${leadUrl}::`;
    }
    if (dmName && dmName != r.dataValues.dmName) {
      logText += `updated DM Name from ${r.dataValues.dmName} to ${dmName}::`;
    }
    if (leadName && leadName != r.dataValues.leadName) {
      logText += `updated Lead Name from ${r.dataValues.leadName} to ${leadName}::`;
    }
    if (designation && designation != r.dataValues.designation) {
      logText += `updated Designation from ${r.dataValues.designation} to ${designation}::`;
    }
    if (emailId && emailId != r.dataValues.emailId) {
      logText += `updated Email ID from ${r.dataValues.emailId} to ${emailId}::`;
    }
    if (contactNumber && contactNumber != r.dataValues.contactNumber) {
      logText += `updated Contact Number from ${r.dataValues.contactNumber} to ${contactNumber}::`;
    }
    if (location && location != r.dataValues.location) {
      logText += `updated Location from ${r.dataValues.location} to ${location}::`;
    }
    if (mobileNumber && mobileNumber != r.dataValues.mobileNumber) {
      logText += `updated Mobile Number from ${r.dataValues.mobileNumber} to ${mobileNumber}::`;
    }
    if (comments && comments != r.dataValues.comments) {
      logText += `updated Comments from ${r.dataValues.comments} to ${comments}::`;
    }
    const leadData = await Leads.update(
      {
        ...request.payload,
        updatedAt: new Date(),
      },
      {
        where: {
          leadUUID: leadUUID,
        },
      },
    );
    await LeadAuditLogs.create({
      performedById: userId,
      logDescription: logText,
      performedByCompanyId: companyId,
      actionType: 'PATCH',
      leadUUID: r.dataValues.leadUUID,
    });
    if (!leadData) {
      return h
        .response({
          error: true,
          message: 'Update error',
        })
        .code(200);
    }
    const returnLeadData = await Leads.findOne({ where: { leadUUID } });
    return h.response(returnLeadData).code(200);
  } catch (error) {
    console.error(error);
    return h.response({ error: true, message: 'Invalid' }).code(400);
  }
};

const getLeadAuditLogs = async (request, h) => {
  try {
    const authRes = validateIsLoggedIn(request, h);
     if(authRes.error) return h.response(authRes.response).code(authRes.code);
    
    

    const { artifacts } = request.auth || {};
    const { luser } = artifacts || {};
    const { companyId } = luser || {};
    let { offset = 0, limit = 10 } = request.query || {};
    if (limit < 1) {
      limit = 10;
    }
    if (offset < 1) {
      offset = 0;
    }
    if (limit > 50) {
      limit = 50;
    }

    const { LeadAuditLogs, Company, Userinfo } = request.getModels('xpaxr');
    const r = await LeadAuditLogs.findAll({
      offset: offset || 0,
      limit: limit || 10,
      where: {
        performedByCompanyId: companyId || 0,
        leadUUID: request.params.leaduuid,
      },
      order: [['logId', 'DESC']],
      include: [
        {
          model: Company,
          as: 'company',
          attributes: ['companyId', 'displayName'],
        },
        {
          model: Userinfo,
          as: 'userinfo',
          attributes: ['firstname', 'lastname', 'userId'],
        },
      ],
    });
    return h.response(r).code(200);
  } catch (error) {
    console.error(error);
    return h.response({ error: true, message: 'Invalid' }).code(400);
  }
};

const sendMaps = async (request, h) => {
  try {
    const authRes = validateIsLoggedIn(request, h);
     if(authRes.error) return h.response(authRes.response).code(authRes.code);
    
    

    const { artifacts } = request.auth || {};
    const { luser } = artifacts || {};
    const { userId, companyId, active, firstname, lastname } = luser || {};
    const { Emailtemplate, Userinfo, Companyinfo, Applicationemail } = request.getModels('xpaxr');

    const { profileIds, leadId, toAddresses, ccAddresses } = request.payload;

    const { Userprofilemap } = request.getModels('xpaxr');
    const results = await Userprofilemap.findAll({
      where: {
        profileId: profileIds
      },
      raw: true
    });

    const tableHead = `<table style="width:100%">
      <tr>
        <th>User ID</th>
        <th>Profile ID</th>
        <th>Created At</th>
      </tr>`;
    let tableData = ``;
    const tableEnd = "</table>";

    results.forEach(r => {
      tableData += `<tr><td>${r.userId}</td><td>${r.profileId}</td><td>${r.createdAt}</td></tr>`;
    });

    const emailData = {
      email: "anant@x0pa.com",
      emails: toAddresses,
      ccEmails: ccAddresses,
      templateName: 'test-templates',
      ownerId: 0,
      html: "Send Maps",
      text: `${tableHead} ${tableData} ${tableEnd}`,
      subject: "Send Maps",
      sendRaw: false,
      appId: 0,
      isUserTemplate: false,
      // metaProfileId,
      // isX0PATemplate,
      sendViaNylas: false,
    };
    const additionalEData = {
      userId,
      Emailtemplates: Emailtemplate,
      Userinfo,
      Companyinfo,
      Applicationemail,
    };
    sendEmailAsync(emailData, additionalEData);

    return h.response({ error: false }).code(200);
  } catch(err) {
    console.error(err);
    return h.response({ error: true, message: 'Invalid' }).code(400);
  }
};

const bulkImportLeads = async (request, h) => {
  try {
    const authRes = validateIsLoggedIn(request, h);
     if(authRes.error) return h.response(authRes.response).code(authRes.code);
    
    
    console.log(request.payload);

    const { payload } = request;
    const { bulkLeads } = payload;

    const filetype = await FileType.fromBuffer(bulkLeads._data);
    if (filetype.ext !== 'xlsx' && filetype.ext !== 'xls') {
      return h.response({ message: `File format invalid(${filetype.ext}). Use Microsoft Excel` }).code(400);
    }

    const failedRows = [],
      createdRows = [],
      pendingRows = [],
      existingRows = [];

    const filepathToSave = `/tmp/${new Date().valueOf()}_${payload['bulkLeads'].hapi.filename}`;

    const fd = await fs.openSync(filepathToSave, 'w');
    await fs.writeFileSync(fd, payload['bulkLeads']._data);

    const { Leads, Companymap, Company, Userinfo, Industry, Jobfunction } = request.getModels('xpaxr');
    const JSONdata = convertToJSON(filepathToSave);
    const { artifacts } = request.auth || {};
    const { luser } = artifacts || {};
    const { userId, companyId, active } = luser || {};

    const companiesNested = await Companymap.findAll({
      raw: true,
      nest: true,
      where: {
        parentCompanyId: companyId || 0,
      },
      attributes: [],
      include: [
        {
          model: Company,
          as: 'company',
          attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('company.company_id')), 'companyId'], 'displayName'],
        },
      ],
    });
    const companies = new Map();
    companiesNested.forEach(com => {
      const { company } = com || {};
      const { companyId, displayName } = company || {};
      companies.set(displayName.toLowerCase().trim(), {
        companyId: companyId,
        displayName: displayName,
      });
    });

    const leadmanagersNested = await Userinfo.findAll({
      where: { companyId: companyId },
      attributes: ['userId', 'firstname', 'lastname', 'email'],
    });
    const leadmanagers = new Map();
    leadmanagersNested.forEach(lm => {
      const { dataValues } = lm || {};
      const { userId, firstname, lastname, email } = dataValues || {};
      leadmanagers.set(email.toLowerCase().trim(), {
        userId: userId,
        firstname: firstname,
        lastname: lastname,
        email: email,
      });
    });

    const industriesNested = await Industry.findAll({
      raw: true,
      nest: true,
      attributes: ['industryId', 'industryName'],
    });
    const industries = new Map();
    industriesNested.forEach(ind => {
      const { industryId, industryName } = ind || {};
      industries.set(industryName.toLowerCase().trim(), {
        industryId,
        industryName,
      });
    });

    const functionsNested = await Jobfunction.findAll({
      raw: true,
      nest: true,
      attributes: ['functionId', 'functionName'],
    });
    const functions = new Map();
    functionsNested.forEach(fn => {
      const { functionId, functionName } = fn || {};
      functions.set(functionName.toLowerCase().trim(), {
        functionId,
        functionName,
      });
    });

    const leadUrlArray = [];
    const parsedLeads = [];

    for (const data of JSONdata) {
      const isValidObj = validateExcelData(data, { companies, leadmanagers, industries, functions, leadStatuses });
      const { isValid, formattedData, leadDetails, error } = isValidObj;
      console.log(isValidObj);
      if (isValid) {
        leadUrlArray.push(formattedData.leadUrl);
        parsedLeads.push(isValidObj);
      } else {
        failedRows.push({ ...formattedData, leadDetails, error });
      }
    }

    const leads = await Leads.findAll({
      where: {
        leadUrl: leadUrlArray,
        companyId,
      },
    });
    const leadsMap = new Map();
    leads.forEach(lead => {
      if (!lead) return;
      lead = lead.toJSON();
      leadsMap.set(lead.leadUrl, lead);
    });
    console.log(leadsMap);

    for (const data of parsedLeads) {
      const { isValid, formattedData, leadDetails, error } = data || {};
      const existingLead = leadsMap.get(formattedData.leadUrl);
      if (!existingLead) {
        try {
          const leadData = await Leads.create({
            ...formattedData,
            companyId: companyId,
            createdById: userId,
          });
          const leadDataJson = leadData.toJSON();
          createdRows.push({ ...leadDataJson, leadDetails });
        } catch (err) {
          console.error(err);
          failedRows.push({ ...formattedData, leadDetails });
        }
      } else {
        const { leadUUID, leadId } = existingLead || {};
        existingRows.push({ ...formattedData, leadDetails, leadUUID, leadId });
      }
    }

    // unlink file async
    fs.unlink(filepathToSave, err => {
      if (err) {
        console.error(`Couldn't unlink file: ${filepathToSave} :: Error: ${err}`);
      }
      console.log(`${filepathToSave} unlinked`);
    });

    return h.response({ failedRows, createdRows, existingRows, pendingRows }).code(200);
  } catch (error) {
    console.error(error);
    return h.response({ error: true, message: 'Invalid' }).code(400);
  }
};

const leadsExport = async (request, h) => {
  try {
    const authRes = validateIsLoggedIn(request, h);
     if(authRes.error) return h.response(authRes.response).code(authRes.code);
    
    

    const { artifacts } = request.auth || {};
    const { luser } = artifacts || {};
    const { companyId } = luser || {};

    const { query } = request;
    const queryString = JSON.stringify(query);

    const queryHash = md5Hash(queryString);
    exportLeadsToFile(request, queryHash);

    return h.response({ fileKey: queryHash }).code(200);
  } catch(err) {
    return h.response({ error: true, message: 'Invalid' }).code(400);
  }
};

const exportLeadsToFile = async (request, queryHash) => {
  try {
    const { artifacts } = request.auth || {};
    const { luser } = artifacts || {};
    const { companyId } = luser || {};

    let { offset = 0, limit = 10, ind, fn, lm, status, lc } = request.query || {};
    if (limit < 1) {
      limit = 10;
    }
    if (offset < 1) {
      offset = 0;
    }
    if (limit > 50) {
      limit = 50;
    }
    let whereString = `ld.company_id = ${companyId} AND `;

    if (ind) {
      if(ind[ind.length - 1] === ",") {
        ind = ind.slice(0, -1);
      }
      whereString += `industry_id in (${ind.split(',')}) AND `;
    }
    if (fn) {
      if(fn[fn.length - 1] === ",") {
        fn = fn.slice(0, -1);
      }
      whereString += `functional_id in (${fn.split(',')}) AND `;
    }
    if (lm) {
      if(lm[lm.length - 1] === ",") {
        lm = lm.slice(0, -1);
      }
      whereString += `lead_managed_by in (${lm.split(',')}) AND `;
    }
    if (status) {
      if(status[status.length - 1] === ",") {
        status = status.slice(0, -1);
      }
      whereString += `status_id in (${status.split(',')}) AND `;
    }
    if (lc) {
      if(lc[lc.length - 1] === ",") {
        lc = lc.slice(0, -1);
      }
      whereString += `lead_company_id in (${lc.split(',')}) AND `;
    }

    // remove the last five characters(" AND ");
    whereString = whereString.slice(0, -5);

    const db1 = request.getDb('xpaxr');
    let sqlStmt = `
    select 
    lead_id as "Lead ID",
    lead_name as "Lead Name",
    display_name as "Lead Company Name",
    dm_name as "DM Name",
    designation as "Designation",
    email_id as "Email ID",
    contact_number as "Contact Number",
    location as "Location",
    industry_name as "Industry",
    function_name as "Functional Area",
    status_id as "Status",
    email as "Lead Manager Email",
    mobile_number as "Manager Mobile Number",
    comments as "Comments",
    lead_url as "Lead URL"
    from hris.leads ld
    left join hris.company com on com.company_id = ld.lead_company_id
    left join hris.industry ind on ind.industry_id = ld.industry_id
    left join hris.jobfunction jfn on jfn.function_id = ld.functional_id
    left join hris.userinfo ui on ui.user_id = ld.created_by_id
    where ${whereString}
    LIMIT ${limit} OFFSET ${offset};
    `;
    const sequelize = db1.sequelize;
    const ares = await sequelize.query(sqlStmt, {
      type: QueryTypes.SELECT,
      replacements: { companyId: companyId },
    });
    jsonToExcel(ares, queryHash);
  } catch (err) {
    console.error(err);
  }
};

const downloadLeads = async (request, h) => {
  try {
    const authRes = validateIsLoggedIn(request, h);
     if(authRes.error) return h.response(authRes.response).code(authRes.code);
    
    

    const { artifacts } = request.auth || {};
    const { luser } = artifacts || {};
    const { companyId } = luser || {};

    const { fileKey } = request.params;

    const filePath = getExportDirectory('leadsexport')+`/${fileKey}.xlsx`;
    console.log(filePath);
    if (fs.existsSync(filePath)) {
      return h.file(filePath, {
        confine: false,
        mode: 'attachment',
        filename: `Leads_${fileKey}_${format(new Date(), 'dd-MM-yyyy')}.xlsx`,
      });
    } else {
      return h.response({ error: false, message: "Requested file is not ready yet." });
    }

  } catch(err) {
    return h.response({ error: true, message: 'Invalid' }).code(400);
  }
};

module.exports = {
  list: listLeads,
  lead: getLead,
  createLead,
  patchLead,
  getLeadAuditLogs,
  getFilters,
  sendMaps,
  bulkImportLeads,
  leadsExport,
  downloadLeads,
};
