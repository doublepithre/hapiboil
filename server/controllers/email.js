const { Op, Sequelize, QueryTypes, cast, literal } = require('sequelize');
const validator = require('validator');
import { camelizeKeys } from '../utils/camelizeKeys'
import { sendEmailAsync } from '../utils/email'
import formatQueryRes from '../utils/index'
import { isArray } from 'lodash';
const axios = require('axios')
const config = require('config');

const getAllCustomEmailTemplates = async (request, h) => {
    try {
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden', code: "xemp-1" }).code(401);
        }
        const { credentials } = request.auth || {};
        const { id: userId } = credentials || {};
        // Checking user type from jwt
        let luserTypeName = request.auth.artifacts.decoded.userTypeName;
        if (luserTypeName !== 'employer' && luserTypeName !== 'companysuperadmin') return h.response({ error: true, message: 'You are not authorized!' }).code(403);

        const { Emailtemplate, Userinfo } = request.getModels('xpaxr');

        // get the company of the luser
        const userRecord = await Userinfo.findOne({ where: { userId }, attributes: { exclude: ['createdAt', 'updatedAt'] } });
        const userProfileInfo = userRecord && userRecord.toJSON();
        const { companyId: luserCompanyId } = userProfileInfo || {};

        const allCustomTemplates = await Emailtemplate.findAll({ where: { isDefaultTemplate: false, companyId: luserCompanyId, status: 'active' } });
        return h.response({ emailTemplates: allCustomTemplates }).code(200);
    }
    catch (error) {
        console.error(error.stack);
        return h.response({ error: true, message: 'Internal Server Error!' }).code(500);
    }
}

const getAllDefaultEmailTemplates = async (request, h) => {
    try {
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden', code: "xemp-1" }).code(401);
        }
        const { credentials } = request.auth || {};
        const { id: userId } = credentials || {};
        // Checking user type from jwt
        let luserTypeName = request.auth.artifacts.decoded.userTypeName;
        if (luserTypeName !== 'employer' && luserTypeName !== 'companysuperadmin') return h.response({ error: true, message: 'You are not authorized!' }).code(403);

        const { Emailtemplate } = request.getModels('xpaxr');
        const allDefaultTemplates = await Emailtemplate.findAll({ where: { isDefaultTemplate: true, companyId: null, ownerId: null, status: 'active' } });

        return h.response({ emailTemplates: allDefaultTemplates }).code(200);
    }
    catch (error) {
        console.error(error.stack);
        return h.response({ error: true, message: 'Internal Server Error!' }).code(500);
    }
}

const getEmailTemplateInfo = async (request, h) => {
    try {
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden', code: "xemp-1" }).code(401);
        }
        const { credentials } = request.auth || {};
        const { id: userId } = credentials || {};
        // Checking user type from jwt
        let luserTypeName = request.auth.artifacts.decoded.userTypeName;
        if (luserTypeName !== 'employer' && luserTypeName !== 'companysuperadmin') return h.response({ error: true, message: 'You are not authorized!' }).code(403);

        const { Emailtemplate, Userinfo } = request.getModels('xpaxr');

        // get the company of the luser
        const userRecord = await Userinfo.findOne({ where: { userId }, attributes: { exclude: ['createdAt', 'updatedAt'] } });
        const userProfileInfo = userRecord && userRecord.toJSON();
        const { companyId: luserCompanyId } = userProfileInfo || {};

        const { templateId } = request.params;

        const emailRecord = await Emailtemplate.findOne({ where: { id: templateId } });
        const emailInfo = emailRecord && emailRecord.toJSON();
        const { id: existingEmailTemplateId, companyId: templateCompanyId, isDefaultTemplate } = emailInfo || {};

        if (!existingEmailTemplateId) return h.response({ error: true, message: 'No email template found!' }).code(400);
        if (isDefaultTemplate === false && templateCompanyId && templateCompanyId !== luserCompanyId) return h.response({ error: true, message: 'You are not authorized!' }).code(403);
        if (isDefaultTemplate === null) return h.response({ error: true, message: 'You are not authorized!' }).code(403);

        return h.response(emailInfo).code(200);
    }
    catch (error) {
        console.error(error.stack);
        return h.response({ error: true, message: 'Internal Server Error!' }).code(500);
    }
}

const maintainCompanyEmailTemplates = async (request, h) => {
    try {
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden', code: "xemp-1" }).code(401);
        }
        // Checking user type from jwt
        let luserTypeName = request.auth.artifacts.decoded.userTypeName;
        if (luserTypeName !== 'companysuperadmin' && luserTypeName !== 'employer') return h.response({ error: true, message: 'You are not authorized!' }).code(403);

        const { credentials } = request.auth || {};
        const { id: userId } = credentials || {};

        const { templateId } = request.params || {};
        const customizedData = request.payload || {};

        const validUpdateRequests = ['status', 'subject', 'desc', 'displayName', 'emailBody', 'emailFooter', 'productName'];
        const requestedUpdateOperations = Object.keys(customizedData) || [];
        const isAllReqsValid = requestedUpdateOperations.every(req => validUpdateRequests.includes(req));
        if (!isAllReqsValid) return h.response({ error: true, message: 'Invalid update request(s)' }).code(400);

        // is status req valid
        const { status } = customizedData;
        const validStatus = ['active', 'inactive'];
        const isStatusReqValid = validStatus.includes(status);

        if (status && !isStatusReqValid) return h.response({ error: true, message: 'Invalid status request!' }).code(400);

        const { Userinfo, Emailtemplate } = request.getModels('xpaxr');
        // get the company of the luser
        const luserRecord = await Userinfo.findOne({ where: { userId }, attributes: { exclude: ['createdAt', 'updatedAt'] } });
        const luserProfileInfo = luserRecord && luserRecord.toJSON();
        const { companyId: luserCompanyId } = luserProfileInfo || {};

        // find if this company already has the customized template
        const existingCustomizedTemplateRecord = await Emailtemplate.findOne({ where: { id: templateId } });
        const existingCustomizedTemplateInfo = existingCustomizedTemplateRecord && existingCustomizedTemplateRecord.toJSON();
        const { id: existingCustomizedTemplateId, companyId: etCompanyId } = existingCustomizedTemplateInfo || {};

        if (!existingCustomizedTemplateId) return h.response({ error: true, message: 'No email template found!' }).code(400);
        if (luserCompanyId !== etCompanyId) return h.response({ error: true, message: 'You are not authorized!' }).code(403);

        await Emailtemplate.update(customizedData, { where: { id: templateId } });
        const updatedRecord = await Emailtemplate.findOne({ where: { id: templateId } });
        return h.response(updatedRecord).code(200);
    }
    catch (error) {
        console.error(error.stack);
        return h.response({ error: true, message: 'Bad Request' }).code(400);
    }
}

const sendEmailFromRecruiterToCandidate = async (request, h) => {
    try {
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden', code: "xemp-1" }).code(401);
        }
        // Checking user type from jwt
        let luserTypeName = request.auth.artifacts.decoded.userTypeName;
        if (luserTypeName !== 'employer') return h.response({ error: true, message: 'You are not authorized!' }).code(403);

        const { credentials } = request.auth || {};
        const { id: userId } = credentials || {};

        // const { templateId } = request.params || {};
        const { subject, emailBody, email: rawEmail } = request.payload || {};
        const { Emailtemplate, Userinfo, Companyinfo, Emaillog, Cronofy, Cronofytoken } = request.getModels('xpaxr');

        if (!(subject && emailBody && rawEmail)) return h.response({ error: true, message: 'Please provide the necessary details!' }).code(400);
        const email = rawEmail.toLowerCase().trim();
        // Validating Email & Password
        if (!validator.isEmail(email)) {
            return h.response({ error: true, message: 'Please provide a valid Email' }).code(400);
        }

        // ----------------start of sending emails        
        const userRecord = await Userinfo.findOne({ where: { userId } });
        const userInfo = userRecord && userRecord.toJSON();
        const { allowSendEmail } = userInfo || {};

        const sendViaNylas = allowSendEmail;

        const emailData = {
            emails: [email],
            email: email,
            ccEmails: [],

            sendViaNylas,
            sendRaw: true,
            subject: subject,
            html: emailBody,
            text: emailBody
        };

        const additionalEData = {
            userId,
            Emailtemplate,
            Userinfo,
            Companyinfo,
            Emaillog,

            Cronofy,
            Cronofytoken,
        };
        const sentEmailRes = await sendEmailAsync(emailData, additionalEData);
        console.log(sentEmailRes);
        // ----------------end of sending emails     

        return h.response({ message: `Email successfully sent!` }).code(200);
    }
    catch (error) {
        console.error(error.stack);
        return h.response({ error: true, message: 'Bad Request' }).code(400);
    }
}

module.exports = {
    getAllDefaultEmailTemplates,
    getAllCustomEmailTemplates,

    getEmailTemplateInfo,

    maintainCompanyEmailTemplates,
    sendEmailFromRecruiterToCandidate,
}