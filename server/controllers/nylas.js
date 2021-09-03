const { Op, Sequelize, QueryTypes, cast, literal } = require('sequelize');
const moment = require("moment");

import { isArray } from 'lodash';

import { requestNyAccessToken, revokeNylasAccount, listCalendars } from '../utils/nylas'
import { saveAccessToken, getAccessToken } from '../utils/nylasHelpers'

const requestNyToken = async (request, h) => { //tokenRecord, userId
  try {
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden', code: "xemp-1" }).code(401);
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
      return h.response({ message: 'Forbidden', code: "xemp-1" }).code(401);
    }   
    const { credentials } = request.auth || {};
    const { id: userId } = credentials || {};
    const { Cronofy, Cronofytoken, Userinfo } = request.getModels('xpaxr');
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
    await Cronofytoken.destroy({ 
      where: {
        userId: userId || 0,
        accountId: accountId || 0,
      }
    });
    await Cronofy.destroy({ where: { id }});
    const usdata = {
      allowSendEmail: false,
      updatedAt: moment().format(),
    };
    await Userinfo.update(usdata, { where: { userId }});
    return h.response({ message:'Successfully revoked account!'}).code(200);
  } catch (error) {
    console.error(error);
    return h.response({error:true, message:'Unable to revoke account!'}).code(400);
    
  }
};

const userCalendars = async (request, h) => {
  try {
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden', code: "xemp-1" }).code(401);
    }   
    const { credentials } = request.auth || {};
    const { id: userId } = credentials || {};
    const { Cronofy } = request.getModels('xpaxr');
      
    const res = await Cronofy.findAll({
      where: { userId },
      order: [['id', 'DESC']],
      limit: 1
    });

    const calendarsArray = [];
    if(isArray(res) && res.length) {
      for(let record of res){
        const info = record.toJSON();
        const { calendar } = info || {};
        info.calendar = JSON.parse(calendar);
        calendarsArray.push(info);
      }
    }

    const fres =  {
      calendars: calendarsArray || [],
    };

    return h.response(fres).code(200);
  } catch (error) {
    console.error(error);
    return h.response({error:true, message:'Server error!'}).code(500);
    
  }
};

const refreshUserCalendars = async (request, h) => {
  try {
    if (!request.auth.isAuthenticated) {
      return h.response({ message: 'Forbidden', code: "xemp-1" }).code(401);
    }   
    const { credentials } = request.auth || {};
    const { id: userId } = credentials || {};
    const { Cronofy } = request.getModels('xpaxr');
      
    const cronofyRecord = await Cronofy.findOne({ where: { userId: userId }});
    const cronofyInfo = cronofyRecord && cronofyRecord.toJSON();
    const { accountEmail } = cronofyInfo || {};

    const accessToken = await getAccessToken(request, userId);
    const calendarsRes = await listCalendars(accessToken);
    const {calendars, error} = calendarsRes || {};
    if (error) {
      return error;
    }
    
    const upsertResponse = await Cronofy.upsert({
      userId: userId,
      accountEmail: accountEmail,
    }, {
      calendar: calendars,
    });

    const record = upsertResponse[0] || {};
    const info = record && record.toJSON();
    const { calendar } = info || {};
    info.calendar = JSON.parse(calendar);

    return h.response(info).code(200);
  } catch (error) {
    console.error(error);
    return h.response({error:true, message:'Unable to get calendar details!'}).code(400);
    
  }
};


module.exports = {
  requestNyToken,
  revokeNyAccount,
  userCalendars,
  refreshUserCalendars,
}