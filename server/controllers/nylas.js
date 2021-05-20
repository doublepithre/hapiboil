const { Op, Sequelize, QueryTypes, cast, literal } = require('sequelize');

import { requestNyAccessToken } from '../utils/nylas'
import { saveAccessToken } from '../utils/nylasHelpers'

const DEMOrequestNyToken = async (request, h) => {
    try{
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden'}).code(403);
        }
        console.log(process.env.NODE_ENV)  
        const responses = { msg: "Hi!", env: process.env.NODE_ENV, body: request.payload }
        return h.response(responses).code(200);
    }
    catch (error) {
        console.error(error.stack);
        return h.response({error: true, message: 'Internal Server Error!'}).code(500);
    }
}

const requestNyToken = async (request, h) => { //tokenRecord, userId
  try {
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden' }).code(403);
    }   
    const { credentials } = request.auth || {};
    const { id: userId } = credentials || {};
    const { token: code } = request.payload || {}; //this is data
    const { Cronofy, Userinfo } = request.getModels('xpaxr');
    
    const requestToken = {
      code
    };
    const tokenRes = await requestNyAccessToken(requestToken);
    const {id, account_id, email_address, name, calendars} = tokenRes || {};

    const ctokensRes = await saveAccessToken(request, tokenRes, userId);
    const {accessToken, error: saveTokenErr} = ctokensRes || {};
    if (saveTokenErr) {
      let {
        message: saveTokenErrMsg = "Unknown error occured while saving token"
      } = saveTokenErr || {};
      return {
        error: {
          message: saveTokenErrMsg,
        },
      };
    }

    if (!accessToken) {
      return {
        error: {
          message: 'Invalid tokens received from the provider',
        },
      };
    }

    const userRecord = await Userinfo.findOne({ where: { userId }});
    const userInfo = userRecord && userRecord.toJSON();
    const { tzid = "Etc/UTC" } = userInfo || {};
    const createdAt = new Date().toISOString();
    const calendarsString = JSON.stringify(calendars);
    const cronofyData = {
      userId,
      accountId: account_id,
      sub: id,
      linkingProfile: null,
      createdAt,
      calendar: calendarsString,
      accountName: name,
      accountEmail: email_address,
      defaultTzid: tzid
    };
    const res = await Cronofy.upsert(
      cronofyData,
      { 
        where: {
          userId: userId || 0,
          accountEmail: email_address,
        },
      }
    );
    await userInfo.update({ allowSendEmail: true }, { where: { userId: userId || 0 }});
    return res;
  } catch (err) {
    console.error(err);
    return { error: err };
  }
};

module.exports = {
  requestNyToken,
}