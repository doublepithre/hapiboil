const { Op, Sequelize, QueryTypes, cast, literal } = require('sequelize');
const moment = require("moment");

import { requestNyAccessToken, revokeNylasAccount } from '../utils/nylas'
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
      return h.response({error:true, message: saveTokenErrMsg }).code(400);      
    }

    if (!accessToken) {
      return h.response({error:true, message: 'Invalid tokens received from the provider' }).code(400);           
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
    await Userinfo.update({ allowSendEmail: true }, { where: { userId: userId || 0 }});
    const record = res[0];
    return h.response(record).code(200);    
  } catch (err) {
    console.error(err);
    return h.response({error:true, message: err.message || `Unable to request nylas token!` }).code(400);    
  }
};

const revokeNyAccount = async (request, h) => {
  try {
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden' }).code(403);
    }   
    const { credentials } = request.auth || {};
    const { id: userId } = credentials || {};
    const { token: code } = request.payload || {}; //this is data
    const { Cronofy, Cronofytokens } = request.getModels('xpaxr');
    const { accountId } = request.payload || {};
    if(!accountId) return h.response({error:true, message:'Please provide an accountId!'}).code(400);
      
    const nyRes = await Cronofy.findOne({
      where: {
        userId: userId || 0,
        accountId: accountId || 0,
      },
    });
    const nyInfo = nyRes && nyRes.toJSON();
    const {id, accountId: nylasAccountId} = nyInfo || {};
    if (!nylasAccountId) return h.response({error:true, message:'No connected calendar account found for this user!'}).code(400);            
    
    await revokeNylasAccount(nylasAccountId || 0);
    await Cronofytokens.destroy({ 
      where: {
        userId: userId || 0,
        accountId: accountId || 0,
      }
    });
    const res = await Cronofy.destroy({ where: { id }});
    const usdata = {
      allowSendEmail: false,
      updatedAt: moment().format(),
    };
    await Userinfo.update(usdata, { where: { userId }});
    return res;
  } catch (error) {
    console.error(error);
    return h.response({error:true, message:'Unable to revoke account!'}).code(400);
    
  }
};

module.exports = {
  requestNyToken,
  revokeNyAccount,
}