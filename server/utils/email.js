"use strict";
const AWS = require("aws-sdk");
const Nylas = require("nylas");
// const SES = require('aws-sdk/clients/ses'); // Only load SES
const handlebars = require("handlebars");
const moment = require("moment");
const _ = require("lodash");
// const LoopBackContext = require("loopback-context");
// const app = require("../../server/server");
const { isProduction } = require("./toolbox");
AWS.config.update({
  accessKeyId: "AKIA4EXF3VHUPT2VHP7E",
  secretAccessKey: "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",
  // subregion: 'us-east-1',
});
const ses = new AWS.SES({
  apiVersion: "2010-12-01",
  region: "us-east-1",
});

// let config = {};
// try {
//   config = require(`../../server/config.${process.env.NODE_ENV.trim()}.json`);
// } catch (err) {
//   console.error(err);
// }
// const { nylas: { NY_CLIENT_ID, NY_CLIENT_SECRET } = {} } = config || {};
// Nylas.config({
//   clientId: NY_CLIENT_ID,
//   clientSecret: NY_CLIENT_SECRET,
// });

const capitalizeLetter = (str) => {
  str = (str && (str + "").trim().split(" ")) || [];
  for (var i = 0, x = str.length; i < x; i++) {
    str[i] =
      ((str[i][0] && str[i][0].toUpperCase && str[i][0].toUpperCase()) || "") +
      str[i].substr(1);
  }

  return str.join(" ");
};

const whiteListedPropsForCapitalize = [
  "firstName",
  "lastName",
  "companyName",
  "jobName",
  "candidateFirstName",
  "candidateLastName",
  "recruiterFirstName",
  "recruiterLastName",
  "createdUserFirstName",
  "createdUserLastName",
  "recruiterName",
  "candidateName",
  "referrerName",
  "collaboratorName",
];
// When loading only SES
// const ses = new SES({
//   apiVersion: '2010-12-01',
//   region: 'us-east-1',
//   // credentials: sesConfig,
// });
const emailLogoSection = `
<div style="margin:0;padding:0;{{#if emailBg}}background-color:{{emailBg}};{{else}}background-image: linear-gradient(-225deg, #E3FDF5 0%, #FFE6FA 100%);{{/if}}">
<center style="min-width: 580px; width: 100%">
    <table class="container" style="border-collapse: collapse; border-spacing: 0; margin: 0 auto; padding: 0; text-align: inherit; vertical-align: top; width: 580px">
        <tr style="padding: 0; text-align: center; vertical-align: top" align="center">
            <td class="wrapper last" style="-moz-hyphens: auto; -webkit-hyphens: auto; border-collapse: collapse !important; color: #333333; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; font-weight: normal; hyphens: auto; line-height: 20px; margin: 0; padding: 0 0px 0 0; position: relative; text-align: center; vertical-align: top; word-break: break-word"
                align="center" valign="top">
                <table class="twelve columns" style="border-collapse: collapse; border-spacing: 0; margin: 0 auto; padding: 0; text-align: center; vertical-align: top; width: 540px">
                  <tr style="padding: 0; text-align: center; vertical-align: top" align="center">
                    <td style="-moz-hyphens: auto; -webkit-hyphens: auto; border-collapse: collapse !important; color: #333333; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; font-weight: normal; hyphens: auto; line-height: 20px; margin: 0; padding: 0px 0px 10px; text-align: center; vertical-align: top; word-break: break-word"
                      align="center" valign="top">
                      <div class="mark" style="text-align: center" align="center">
                        <a href="#" style="color: #4183C4; text-decoration: none">
                          <img height="100" class="center logo-wordmark" src="https://emppubassets.blob.core.windows.net/pubassets/empauwer-logo.png"  style="-ms-interpolation-mode: bicubic; border: none; float: none; margin: 0 auto; max-width: 100%; outline: none; padding: 25px 0 17px; text-align: center; text-decoration: none; width: auto" align="none"/>
                        </a>
                      </div>
                    </td>
                    <td class="expander" style="-moz-hyphens: auto; -webkit-hyphens: auto; border-collapse: collapse !important; color: #333333; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; font-weight: normal; hyphens: auto; line-height: 20px; margin: 0; padding: 0; text-align: center; vertical-align: top; visibility: hidden; width: 0px; word-break: break-word"
                      align="center" valign="top"></td>
                  </tr>
                </table>
            </td>
        </tr>
    </table>
</center>`;

const emailBodyStart = `
    <table cellpadding="0" cellspacing="0" border="0" align="center" style="padding-bottom: 80px;">
        <tbody>
            <tr>
                <td style="background:#fff;border:1px solid rgba(0, 0, 0, .125);border-collapse:separate;border-radius:4px">
                <table>
                <tbody>
                    <tr height="75px">
                    </tr>
                    <tr>
                        <td width="60px;"></td>
                        <td width="580" style="font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:14px;line-height:20px;font-weight:300;color:#333333;text-decoration:none;">
                `;

const emailBodyEnd = `</td>
<td width="60px;"></td>
</tr>
<tr height="75px"></tr>
</tbody>
</table>
</td>
</tr>
</tbody>
</table>
</div>`;

const getEmailSubject = (edata) => {
  try {
    capitalizeEmailData(edata);
    const { subject } = edata;
    if (!subject) return "(No Subject)";
    const sSubjecttempl = handlebars.compile(subject);
    const compiledSubject = sSubjecttempl(edata);
    return compiledSubject;
  } catch (error) {
    console.error("Error while getting getEmailSubject", error);
    return "(No Subject)";
  }
};

/*
 * templateData can be object or a string,
 * {templateName: tmplName = '', userId = 0, isUserTemplate = false}
 * OR
 * templateName
 */
const getEmailTemplateDataAsync = async (
  templateData,
  isX0PATemplate = false,
  additionalEData,
  customEmail,
) => {
  try {
    const { userId, Emailtemplate, Userinfo } = additionalEData;
    const { isCustomEmail, customBody } = customEmail;
    let ownerId = 0;
    // const loopbackCtx = LoopBackContext.getCurrentContext();
    let isUserCustomTemplate = false;
    if (typeof templateData == "object" && templateData.userId) {
      ownerId = templateData.userId;
    } else {
      ownerId = userId;
    }
    let templateName = templateData;
    if (typeof templateData == "object") {
      const {
        templateName: tmplName = "",
        userId = 0,
        isUserTemplate = false,
      } = templateData || {};
      templateName = tmplName;
      ownerId = userId;
      isUserCustomTemplate = isUserTemplate;
    }
    const knownEmailTemplates = [      
      "reset-password",      
      "email-verification",
      "account-creation",
      "company-account-creation",
    ];
    if(!knownEmailTemplates.includes(templateName)) {
      isUserCustomTemplate = true;
    }
    if (knownEmailTemplates.includes(templateName) || isUserCustomTemplate) {
      const whereQuery = {
        where: { templateName, status: "active" },
      };
      if (isUserCustomTemplate) {
        // whereQuery.where.ownerId = ownerId || 0;
        whereQuery.where.isUserTemplate = true;
      } else {
        if (!isX0PATemplate) {
          const userInfoRes = await Userinfo.findByPk(ownerId || 0);
          const { companyId, roleId } = userInfoRes || {};
          if (!companyId && roleId != 3) {
            return {
              error: {
                message: "Unable to find the current user",
              },
            };
          }
          whereQuery.where.companyId = companyId;
          if (roleId == 3) {
            whereQuery.where.companyId = null;
          }
        } else {
          whereQuery.where.companyId = null;
          whereQuery.where.ownerId = null;
        }
      }
      const emailTemplateRes = await Emailtemplate.findOne(whereQuery);
      let { displayName, emailBody, emailFooter } = emailTemplateRes || {};
      if (emailBody) {
        if(isCustomEmail && customBody) {
          emailBody = customBody;
        }
        const etJson =
          (emailTemplateRes &&
            emailTemplateRes.toJSON &&
            emailTemplateRes.toJSON()) ||
          {};
        const chtml = `${emailLogoSection}${emailBodyStart}${emailBody}${emailBodyEnd}${emailFooter}`;
        const ed = Object.assign({ displayName }, etJson, { html: chtml }, { ownerId });
        return ed;
      } else {
        const whereQuery = {
          where: {
            templateName,
            ownerId: null,
            companyId: null,
            status: "active",
          },
        };
        if (isUserCustomTemplate) {
          whereQuery.where.isUserTemplate = true;
        }
        if(isCustomEmail && customBody) {
          emailBody = customBody;
        }
        const emres = await Emailtemplate.findOne(whereQuery);
        const { displayName, emailBody, emailFooter } = emres || {};
        const emresJson = (emres && emres.toJSON && emres.toJSON()) || {};
        const chtml = `${emailLogoSection}${emailBodyStart}${emailBody}${emailBodyEnd}${emailFooter}`;
        const ed = Object.assign({ displayName }, emresJson, { html: chtml }, { ownerId });
        return ed;
      }
    } else {
      console.log("Templatename is not in the list");
      return {
        error: {
          message: "Templatename is not in the list",
        },
      };
    }
  } catch (err) {
    console.error("Error: getEmailTemplateDataAsync:::", err);
    return {
      error: {
        message: err,
      },
    };
  }
};

const capitalizeEmailData = (edata) => {
  for (let index in whiteListedPropsForCapitalize) {
    // console.log(
    //   "---- ",
    //   whiteListedPropsForCapitalize[index],
    //   edata[whiteListedPropsForCapitalize[index]]
    // );
    if (
      whiteListedPropsForCapitalize[index] &&
      edata &&
      edata[whiteListedPropsForCapitalize[index]]
    ) {
      edata[whiteListedPropsForCapitalize[index]] = capitalizeLetter(
        edata[whiteListedPropsForCapitalize[index]]
      );
    }
  }
};

/**
 * Takes email template data with vars,
 * infers emailBg, logo and return compiled email html body, text body
 * @param {*} edata
 * {
    html, // required
    text, // required
    ownerId, // optional
    recruiterCompanyId,
    assumedOwnerId,
 * }
 */
const getEmailBodyTemplateAsync = async (etdata, additionalEData, isX0PATemplate = false) => {
  try {
    // const loopbackCtx = LoopBackContext.getCurrentContext();
    const { userId, Userinfo, Companyinfo } = additionalEData;
    // const { Userinfo, Companyinfo } = app.models;
    const edata = _.cloneDeep(etdata);
    const { productName } = edata;
    let ownerId = edata.ownerId || userId;
    const { html, text, recruiterCompanyId } = edata || {};
    if (!html || !text) {
      return false;
    }
    if (!ownerId) {
      const { assumedOwnerId } = edata || {};
      if (assumedOwnerId) {
        ownerId = assumedOwnerId;
      }
    }
    let companyId = 0;
    let useDefaultTemplates = false;
    if (ownerId) {
      const userInfoRes = await Userinfo.findByPk(ownerId);
      if (recruiterCompanyId) {
        companyId = recruiterCompanyId;
      } else {
        companyId = userInfoRes && userInfoRes.companyId;
      }
      if (companyId) {
        let companyInfoRes;
        if (!isX0PATemplate) {
          companyInfoRes = await Companyinfo.findByPk(companyId);
        }
        let { emailBg, logo } = companyInfoRes || {};
        if (!emailBg) {
          emailBg = "#F3F4F5";
        }
        if (!logo) {
          if (edata && edata.productName && edata.productName == "room") {
            logo = "public/x0pa-logo-300.png";
          } else {
            logo = "public/x0pa-logo-300.png";
          }
        }
        edata.emailBg = emailBg;
        edata.logo = logo;
        capitalizeEmailData(edata);
        // console.log("======= edata1 ", edata);
        try {
          const eHtmltempl = handlebars.compile(html);
          const compiledHtmlBody = eHtmltempl(edata);
          const eTexttempl = handlebars.compile(text);
          const compiledTextBody = eTexttempl(edata);
          return {
            compiledHtmlBody,
            compiledTextBody,
          };
        } catch (err) {
          return {
            error: {
              message: err,
            },
          };
        }
      } else {
        useDefaultTemplates = true;
      }
    }
    if (!ownerId || useDefaultTemplates) {
      try {
        if (edata && edata.productName && edata.productName == "room") {
          //edata.logo = "public/room-logo.png";
          edata.logo = "public/x0pa-logo-300.png";
        }
        capitalizeEmailData(edata);
        // console.log("======= edata2 ", edata);
        const eHtmltempl = handlebars.compile(html);
        const compiledHtmlBody = eHtmltempl(edata);
        const eTexttempl = handlebars.compile(text);
        const compiledTextBody = eTexttempl(edata);
        return {
          compiledHtmlBody,
          compiledTextBody,
        };
      } catch (err) {
        return {
          error: {
            message: err,
          },
        };
      }
    }
  } catch (err) {
    console.log("Error:", err);
    return {
      error: {
        message: err,
      },
    };
  }
};

const recordSentEmail = async (recordEmailData, additionalEData) => {
  try {
    const {
      appId,
      templateName,
      ownerId,
      status,
      message,
      toAddresses,
      ccAddresses,
      bccAddresses,
      emailMeta,
      profileId,
      displayName,
    } = recordEmailData || {};
    const applicationEmailModel = additionalEData.Emaillog;
    const recordedEmailRes = await applicationEmailModel.upsert({
      appId: appId || 0,
      templateName: templateName || "unknown",
      createdAt: new Date().toUTCString(),
      ownerId: ownerId || 0,
      status,
      message,
      toAddresses,
      ccAddresses,
      bccAddresses,
      profileId: profileId || null,
      meta: emailMeta || null,
      displayName,
    });
    return recordedEmailRes;
  } catch (err) {
    console.log(err);
    return {
      error: {
        message: (err && err.message) || "Unable to record email data",
      },
    };
  }
};

const isValidEmail = (email, emails, ccEmails) => {
  try {
    let isValid = false;
    if (email || (emails && Array.isArray(emails) && emails.length > 0)) {
      isValid = true;
      if (email && email.includes("@x0padummy.ai")) {
        isValid = false;
      }
      if (
        emails &&
        Array.isArray(emails) &&
        emails.length > 0 &&
        emails[0] &&
        emails[0].includes("@x0padummy.ai")
      ) {
        isValid = false;
      }
    }
    return {
      isValid,
    };
  } catch (error) {
    console.log(error);
    return {
      error: {
        message: "Valid email check error.",
      },
    };
  }
};

// Just removing it from ccAddresses
const removeSenderEmailFromRecipients = (from, toArr, ccArr) => {
  const finalToArr = [];
  const finalCcArr = [];
  const fromLower = (from && from.toLowerCase()) || "";
  if (toArr && Array.isArray(toArr) && toArr.length > 0) {
    toArr.forEach((a) => {
      // if ((a && a.toLowerCase()) != fromLower) {
      finalToArr.push({
        email: a,
      });
      // }
    });
  }
  if (ccArr && Array.isArray(ccArr) && ccArr.length > 0) {
    ccArr.forEach((a) => {
      if ((a && a.toLowerCase()) != fromLower) {
        finalCcArr.push({
          email: a,
        });
      }
    });
  }
  return {
    toArr: finalToArr,
    ccArr: finalCcArr,
  };
};

// const sendEmailViaNylas = async (params, edata) => {
//   try {
//     const userId = eData.userId;
//     const cronofyModel = app.models.Cronofy;
//     const cronofyTokensModel = app.models.Cronofytokens;
//     const userInfoModel = app.models.Userinfo;
//     const { Destination, Message } = params || {};
//     const {
//       BccAddresses: bccAddresses,
//       CcAddresses: ccAddresses,
//       ToAddresses: toAddresses,
//     } = Destination || {};
//     const { Subject, Body } = Message || {};
//     const { Data: subjectData = "No Subject" } = Subject || {};
//     const { Html, Text } = Body || {};
//     const { Data: HtmlData = "No content" } = Html || {};
//     const { Data: TextData = "No content" } = Text || {};
//     const { ownerId } = edata || {};
//     const crres = await cronofyModel.findOne({
//       where: {
//         userId: userId || ownerId || 0,
//       },
//     });
//     const { accountEmail, accountName } = crres || {};
//     let fromName = accountName;
//     if (!accountEmail) {
//       return {
//         message: "No active email user account found",
//       };
//     }
//     if (!accountName) {
//       const userInfoRes = await userInfoModel.findById(userId || 0);
//       const { email, firstName, lastName } = userInfoRes || {};
//       fromName = `${firstName} ${lastName}`;
//       if (!email) {
//         return {
//           message: "No active X0PA user account found",
//         };
//       }
//     }
//     const fromEmail = accountEmail;
//     const cres = await cronofyTokensModel.findOne({
//       where: {
//         userId: userId || 0,
//       },
//       order: "createdAt desc",
//     });
//     const { userId: cUserId, accessToken } = cres || {};
//     // No account connected to send emails
//     if (!accessToken) {
//       console.log("Unable to send email as email account not connected");
//       return {
//         message:
//           "Unable to send email as email account not connected. Please connect it under email templates",
//       };
//     }
//     if (cUserId != userId) {
//       return {
//         message: "User mismatch while sending email",
//       };
//     }
//     const finalAddr = removeSenderEmailFromRecipients(
//       fromEmail,
//       toAddresses,
//       ccAddresses
//     );
//     const { toArr, ccArr } = finalAddr || {};
//     const nylas = Nylas.with(accessToken);
//     const draft = nylas.drafts.build();
//     draft.subject = subjectData;
//     draft.to = toArr;
//     //[{'email': 'bhadra@x0pa.com', name: 'Badra'}];
//     draft.cc = ccArr;
//     // You can also assign draft.cc, draft.bcc, and draft.from_ in the same manner
//     draft.body = HtmlData;
//     // draft.replyTo = [{'email': 'you@example.com', 'name': 'Your Name'}]
//     // Note: changing from to a different email address may cause deliverability issues
//     draft.from = [{ email: fromEmail, name: fromName || "Recruiter" }];
//     const res = await draft.send();
//     const { id, message } = res || {};
//     const emailRes = {
//       MessageId: id,
//       message,
//     };
//     return emailRes;
//   } catch (error) {
//     console.error(error);
//     return {
//       error: {
//         message: "Error occured while sending email via Nylas API",
//       },
//     };
//   }
// };

const addActualEmailsData = (data) => {
  try {
    const {
      compiledHtmlBody,
      email,
      emails,
      ccEmails,
      sendViaNylas,
      templateName,
      ownerId,
    } = data || {};
    const actualEmailsData = `<div style="text-align: center; margin: 0 auto; background: bisque;
    padding: 20px;">
    <pre>
    <code>Template Name: ${templateName} </code>
    <code>Email: ${email}</code>
    <code>Emails: ${JSON.stringify(emails || [])}</code>
    <code>CC Emails: ${JSON.stringify(ccEmails || [])}</code>
    <code>Through Nylas: ${sendViaNylas ? "Yes" : "No"}</code>
    <code>Owner Id: ${ownerId} </code>
    </pre>
    </div>`;
    return `${compiledHtmlBody} ${actualEmailsData}`;
  } catch (error) {
    console.error(error);
    return null;
  }
};

const getValidEmails = (iemails) => {
  try {
    const femails = [];
    if(Array.isArray(iemails) && iemails.length) {
      iemails.forEach(e => {
        let et = e && e.trim();
        et = (et && et.toLowerCase());
        if(et) {
          femails.push(et);
        }
      });
    }
    return femails;
  } catch(err) {
    return iemails;
  }
};

/*
edata = {
  email , // required, fallbacks to sriharsha@x0pa.com
  subject, // required, fallbacks to (No Subject)
  templateObj or name,
  html,
  text,
  sendRaw,
  ccEmails: Array,
  emails: Array,
  appId,
  isUserTemplate,
  metaProfileId,
  isX0PATemplate // X0PA Internal
  sendViaNylas // Should we email via Nylas
}
*/
const sendEmailAsync = async (edata, additionalEData) => {
  try {
    const {
      email = "sriharsha@x0pa.com",
      password,
      emails,
      ccEmails,
      templateName,
      ownerId = 0,
      html,
      text,
      subject,
      sendRaw = false,
      appId = 0,
      isUserTemplate = false,
      metaProfileId,
      isX0PATemplate,
      sendViaNylas = false,
    } = edata;
    console.log("Sending Email Async...", templateName);
    let toAddresses = [];
    let bccAddresses = [];
    let ccAddresses = [];
    const isValidEmailObj = isValidEmail(email, emails, ccEmails);
    const { error: emailError, isValid = false } = isValidEmailObj || {};
    const isProductionEnv = isProduction();
    if (emailError) {
      return {
        message: (emailError && emailError.message) || "Unknown error occured.",
      };
    }
    if (!isValid) {
      return {
        message:
          "No email/invalid email received, please check if the email ends with x0padummy.ai.",
      };
    }
    if (isProductionEnv) {
      console.log("Production email...", email);
      console.log("Production cc emails...", ccEmails);
      if (emails && Array.isArray(emails)) {
        emails.forEach((e) => toAddresses.push(e.toLowerCase()));
      } else {
        toAddresses.push(email.toLowerCase());
      }
      ccAddresses = ccEmails;
    } else {
      if (emails && Array.isArray(emails)) {
        console.log("PROXYING EMAIL:", emails);
        console.log("PROXYING CC EMAILS:", ccEmails);
        toAddresses = [
          "manash@x0pa.com",
          // "ambareesh@x0pa.com"
        ];
      } else {
        console.log("PROXYING EMAIL:", email);
        console.log("PROXYING CC EMAILS:", ccEmails);
        toAddresses.push("bhadra@x0pa.com");
        bccAddresses = [];
      }
      if (Array.isArray(ccEmails) && ccEmails.length > 0) {
        ccAddresses = ccEmails;
        ccAddresses.push("cc@x0pa.ai");
      } else {
        // bccAddresses.push("bcc@x0pa.ai");
      }
    }
    let emailFrom = "EMPAUWER <no-reply@x0pa.com>";
    if (!isProductionEnv) {
      emailFrom = "EMPAUWER Internal <no-reply-internal@x0pa.ai>";
    }
    const fccAddresses = getValidEmails(ccAddresses);
    const ftoAddresses = getValidEmails(toAddresses);
    const params = {
      Destination: {
        BccAddresses: bccAddresses,
        CcAddresses: fccAddresses,
        ToAddresses: ftoAddresses,
      },
      Message: {
        Body: {
          Html: {
            Charset: "UTF-8",
          },
          Text: {
            Charset: "UTF-8",
          },
        },
        Subject: {
          Charset: "UTF-8",
        },
      },
      ReplyToAddresses: [],
      // ReturnPath: '',
      // ReturnPathArn: '',
      Source: emailFrom,
    };
    let templData = {};
    let tdisplayName;
    if (!sendRaw) {
      /* Pass an object with userId */
      let eTemData = ownerId;
      if (eTemData) {
        eTemData = {
          templateName,
          userId: ownerId,
          isUserTemplate,
        };
      } else {
        eTemData = templateName;
      }
      const customEmail = {
        isCustomEmail: true,
        customBody: text,
      }
      templData = await getEmailTemplateDataAsync(eTemData, isX0PATemplate, additionalEData, customEmail);
      console.log(templData)
      const { displayName, error } = templData || {};
      tdisplayName = displayName; 
      if (error) {
        console.error(error);
        return {
          error: {
            message: "Templatename blacklisted",
          },
        };
      }
    } else {
      templData = Object.assign({}, edata, { html, text, subject });
    }
    const totalData = Object.assign({}, edata, templData);
    // if parameters contain value for text or subject, override the db values
    if(subject) {
      totalData.subject = subject;
    }
    const emailBody = await getEmailBodyTemplateAsync(
      totalData,
      additionalEData,
      isX0PATemplate
    );
    let { compiledHtmlBody, compiledTextBody, error: parseError } =
      emailBody || {};
    if (parseError) {
      console.log("Parse email Error:: ", parseError);
      let message = "Error occured while processing.";
      let { message: parseErrorMsg = {} } =
        (parseError && parseError.toJSON && parseError.toJSON()) || parseError;
      parseErrorMsg = (parseErrorMsg && parseErrorMsg.message) || "Parse error";
      message = parseErrorMsg.replace(/\n/g, "");
      if (message && message.includes("error")) {
        const startIndex = message.indexOf("{{");
        const lastIndex = message.substr(startIndex).indexOf("}");
        if (startIndex != -1 && lastIndex != -1) {
          message = message.substr(startIndex, lastIndex + 2);
        } else {
          message = "Incorrectly closed email placeholders";
        }
      } else {
        message = parseErrorMsg;
      }
      return {
        error: {
          message: message,
        },
      };
    }

    if (!compiledHtmlBody || !compiledTextBody) {
      console.log("Email body text is empty", templateName);
      return {
        error: {
          message: "Either html email body or text email body is empty",
        },
      };
    }
    let compiledSubject = getEmailSubject(totalData);
    if (!isProductionEnv) {
      compiledSubject = `X0PA INTERNAL: ${compiledSubject}`;
      try {
        const ebodyWithDebugInfo = addActualEmailsData({
          compiledHtmlBody,
          email,
          emails,
          ccEmails,
          sendViaNylas,
          templateName,
          ownerId,
        });
        if (ebodyWithDebugInfo) {
          compiledHtmlBody = ebodyWithDebugInfo;
        }
      } catch (e) {}
    }
    params.Message.Body.Html.Data = compiledHtmlBody;
    params.Message.Body.Text.Data = compiledTextBody;
    params.Message.Subject.Data = compiledSubject;
    let emailRes = {};
    if (sendViaNylas) {
      emailRes = await sendEmailViaNylas(params, edata);
    } else {
      emailRes = await ses.sendEmail(params).promise();
    }
    const { MessageId, message: errMessage } = emailRes || {};
    const { html: passedHtml, text: passedText, ...restMeta } = edata || {};
    const emailMeta = {
      ...restMeta,
      html: compiledHtmlBody,
      text: compiledTextBody,
    };
    let emailMetaJson = null;
    try {
      emailMetaJson = JSON.stringify(emailMeta);
    } catch (parseErr) {
      console.error(parseErr);
    }
    if (MessageId) {
      await recordSentEmail({
        templateName,
        ownerId,
        appId,
        status: "sent",
        message: MessageId,
        toAddresses: toAddresses.join(","),
        ccAddresses: ccAddresses.join(","),
        bccAddresses: bccAddresses.join(","),
        emailMeta: emailMetaJson || null,
        profileId: metaProfileId || null,
        displayName: tdisplayName,
      }, additionalEData);
    } else {
      await recordSentEmail({
        templateName,
        ownerId,
        appId,
        status: "error",
        message: errMessage,
        toAddresses: toAddresses.join(","),
        ccAddresses: ccAddresses.join(","),
        bccAddresses: bccAddresses.join(","),
        emailMeta: emailMetaJson || null,
        profileId: metaProfileId || null,
        displayName: tdisplayName,
      }, additionalEData);
    }
    return emailRes;
  } catch (err) {
    console.error(err);
    return err;
  }
};

const dummyEmailPlaceholders = {
  companyName: "ACME Inc.",
  firstName: "Jane",
  lastName: "Doe",
  jobName: "Dummy Job Name",
  candidateName: "Jane Doe",
  recruiterName: "Jill Pane",
  recruiterFirstName: "Jill",
  recruiterLastName: "Pane",
  candidateFirstName: "Jane",
  candidateLastName: "Doe",
  email: "dummy@example.com",
  reason: "Laptop was crashed",
  referrerName: "Juliet",
  interviewName: "Dummy Interview Name",
  interviewURL: `<a href="#" style="-webkit-text-size-adjust: none; background: #3d70b2; border-width: 2px; border-color: transparent; color: #ffffff; display: inline-block; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 17px; font-weight: bold; letter-spacing: normal; margin: 0 auto; padding: 12px 44px; text-align: center; text-decoration: none; width: auto !important">Submit your video responses</a>`,
  acceptLink: `<a href="#" style="-webkit-text-size-adjust: none; background: #3d70b2; border-width: 2px; border-color: transparent; color: #ffffff; display: inline-block; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 17px; font-weight: bold; letter-spacing: normal; margin: 0 auto; padding: 12px 44px; text-align: center; text-decoration: none; width: 260px !important; margin-bottom: 20px;">Yes, I'm interested</a>`,
  rejectLink: `<a href="#" style="-webkit-text-size-adjust: none; background: #525C6D; border-width: 2px; border-color: transparent; color: #ffffff; display: inline-block; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 17px; font-weight: bold; letter-spacing: normal; margin: 0 auto; padding: 12px 44px; text-align: center; text-decoration: none; width: 260px !important;">No, I'm not interested</a>`,
  acceptOfferConsent: `<a href="#" style="-webkit-text-size-adjust: none; background: #3d70b2; border-width: 2px; border-color: transparent; color: #ffffff; display: inline-block; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 17px; font-weight: bold; letter-spacing: normal; margin: 0 auto; padding: 12px 44px; text-align: center; text-decoration: none; width: 260px !important; margin-bottom: 20px;">Yes, I'm interested</a>`,
  rejectOfferConsent: `<a href="#" style="-webkit-text-size-adjust: none; background: #525C6D; border-width: 2px; border-color: transparent; color: #ffffff; display: inline-block; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 17px; font-weight: bold; letter-spacing: normal; margin: 0 auto; padding: 12px 44px; text-align: center; text-decoration: none; width: 260px !important;">No, I'm not interested</a>`,
  registerLink: `<a href="#" style="-webkit-text-size-adjust: none; background: #3d70b2; border-width: 2px; border-color: transparent; color: #ffffff; display: inline-block; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 17px; font-weight: bold; letter-spacing: normal; margin: 0 auto; padding: 12px 44px; text-align: center; text-decoration: none; width: auto !important">Accept Invitation</a>`,
  sharedCvLink: `<a href="#" style="-webkit-text-size-adjust: none; background: #3d70b2; border-width: 2px; border-color: transparent; color: #ffffff; display: inline-block; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 17px; font-weight: bold; letter-spacing: normal; margin: 0 auto; padding: 12px 44px; text-align: center; text-decoration: none; width: 100px !important; margin-bottom: 20px;">Open CV</a>`,
  sharedJobLink: `<a href="#" style="-webkit-text-size-adjust: none; background: #3d70b2; border-width: 2px; border-color: transparent; color: #ffffff; display: inline-block; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 17px; font-weight: bold; letter-spacing: normal; margin: 0 auto; padding: 12px 44px; text-align: center; text-decoration: none; width: 150px !important; margin-bottom: 20px;">View Job posting</a>`,
  scheduleInterviewLink: `<a href="#" style="-webkit-text-size-adjust: none; background: #3d70b2; border-width: 2px; border-color: transparent; color: #ffffff; display: inline-block; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 17px; font-weight: bold; letter-spacing: normal; margin: 0 auto; padding: 12px 44px; text-align: center; text-decoration: none; width: auto !important">Schedule an Interview</a>`,
  jobLink: `<a href="#" style="-webkit-text-size-adjust: none; background: #3d70b2; border-width: 2px; border-color: transparent; color: #ffffff; display: inline-block; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 17px; font-weight: bold; letter-spacing: normal; margin: 0 auto; padding: 12px 44px; text-align: center; text-decoration: none; width: 150px !important; margin-bottom: 20px;">View Job posting</a>`,
  requestReferenceLink: `<a href="#" style="-webkit-text-size-adjust: none; background: #3d70b2; border-width: 2px; border-color: transparent; color: #ffffff; display: inline-block; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 17px; font-weight: bold; letter-spacing: normal; margin: 0 auto; padding: 12px 44px; text-align: center; text-decoration: none; width: 150px !important; margin-bottom: 20px;">Add References</a>`,
  message:
    "This is a dummy message which will be replaced by the actual content",
  applicationLink: `<a href="#" style="-webkit-text-size-adjust: none; background: #3d70b2; border-width: 2px; border-color: transparent; color: #ffffff; display: inline-block; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 17px; font-weight: bold; letter-spacing: normal; margin: 0 auto; padding: 12px 44px; text-align: center; text-decoration: none; width: auto !important">View Application</a>`,
  viewApplication: `<a href="#" style="-webkit-text-size-adjust: none; background: #3d70b2; border-width: 2px; border-color: transparent; color: #ffffff; display: inline-block; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 17px; font-weight: bold; letter-spacing: normal; margin: 0 auto; padding: 12px 44px; text-align: center; text-decoration: none; width: auto !important">View Application</a>`,
  joinMeetingBtn: `<a href="#" style="-webkit-text-size-adjust: none; background: #3d70b2; border-width: 2px; border-color: transparent; color: #ffffff; display: inline-block; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 17px; font-weight: bold; letter-spacing: normal; margin: 0 auto; padding: 12px 44px; text-align: center; text-decoration: none; width: auto !important">Join Meeting</a>`,
  startMeetingBtn: `<a href="#" style="-webkit-text-size-adjust: none; background: #3d70b2; border-width: 2px; border-color: transparent; color: #ffffff; display: inline-block; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 17px; font-weight: bold; letter-spacing: normal; margin: 0 auto; padding: 12px 44px; text-align: center; text-decoration: none; width: auto !important">Start Meeting</a>`,
  viewOfferDetails: `<a href="#" style="-webkit-text-size-adjust: none; background: #3d70b2; border-width: 2px; border-color: transparent; color: #ffffff; display: inline-block; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 17px; font-weight: bold; letter-spacing: normal; margin: 0 auto; padding: 12px 44px; text-align: center; text-decoration: none; width: auto !important">View Offer</a>`,
  acceptRequestBtn: `<a href="#" style="-webkit-text-size-adjust: none; background: #3d70b2; border-width: 2px; border-color: transparent; color: #ffffff; display: inline-block; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 17px; font-weight: bold; letter-spacing: normal; margin: 0 auto; padding: 12px 44px; text-align: center; text-decoration: none; width: auto !important">Link to written assessment</a>`,
  viewRequestBtn: `<a href="#" style="-webkit-text-size-adjust: none; background: #3d70b2; border-width: 2px; border-color: transparent; color: #ffffff; display: inline-block; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 17px; font-weight: bold; letter-spacing: normal; margin: 0 auto; padding: 12px 44px; text-align: center; text-decoration: none; width: auto !important">Link to written assessment</a>`,
  workflowName: "Dummy workflow name",
  workflowstages:
    "<ul><li><b>Video Interview</b></li><li><b>Phone Interview</b></li></ul>",
  stageName: "Video interview",
  subStageName: "Feedback",
  roleName: "DummyRole",
  collaboratorName: "Jill Doe",
  interviewDate: moment().format("Do MMM YYYY"),
  startTime: "11.59 PM",
  endTime: "3.00 AM",
  tzid: "Asia/Singapore",
  applicantPhoneNumber: "+65-87654321",
  jobPostingLink: "<a href='https://x0pa.com'>View job posting</a>",
  profileLink: "<a href='https://x0pa.com'>View profile</a>",
};

module.exports = {
  dummyEmailPlaceholders,
  emailLogoSection,
  emailBodyStart,
  emailBodyEnd,
  sendEmailAsync,
};
