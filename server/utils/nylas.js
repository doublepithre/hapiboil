'use strict';
const axios = require('axios');
const Nylas = require('nylas');

const config = require('config');

// let config = {};
let nylasConfig = {};
try {
  // config = require(`../../server/config.${process.env.NODE_ENV.trim()}.json`);
  nylasConfig = config.get('nylas') || '';
} catch (err) {
  console.error(err);
}

const {
  NY_API_URL,
  NY_CLIENT_ID,
  NY_CLIENT_SECRET,
  NY_REDIRECT_URI,
} = nylasConfig || {};

// const {
//   nylas: {
//     NY_API_URL,
//     NY_CLIENT_ID,
//     NY_CLIENT_SECRET,
//     NY_REDIRECT_URI,
//   } = {},
// } = config || {};

Nylas.config({
  clientId: NY_CLIENT_ID,
  clientSecret: NY_CLIENT_SECRET,
});

const axiosErrorHandling = (error) => {
  let errMessage = 'Unknown error happened';
  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    console.error(error.response.data);
    console.error(error.response.status);
    if (error.response.data && error.response.data.message) {
      errMessage = error.response.data.message;
    }
  } else if (error.request) {
    console.error(error.request);
  } else {
    console.error('Error', error.message);
    errMessage = error.message;
  }
  return errMessage;
};

const getPrimaryCalendars = (calendarRes) => {
  const calRes = [];
  const primaryCalendars = [];
  const namedCalendars = [];
  if (calendarRes && calendarRes.length > 0) {
    calendarRes.forEach(e => {
      const cal = (e && e.toJSON());
      const {name, is_primary} = cal || {};
      if (!cal.read_only) {
        calRes.push(cal);
        if (is_primary) {
          primaryCalendars.push(cal);
        }
        if (name.toLowerCase() === 'calendar') {
          namedCalendars.push(cal);
        }
      }
    });
  }
  let finalCalendars = [];
  if (primaryCalendars.length > 0) {
    finalCalendars = primaryCalendars;
  } else if (namedCalendars && namedCalendars.length > 0) {
    finalCalendars = namedCalendars;
  } else {
    finalCalendars = calRes;
  }
  return finalCalendars;
};

const requestNyAccessToken = async (input) => {
  try {
    const { code } = input;
    const access_token = await Nylas.exchangeCodeForToken(code);
    if (!access_token) {
      throw 'No access_token received.';
    }
    const nylas = Nylas.with(access_token);
    let res = await nylas.account.get();
    const calendarRes = await nylas.calendars.list();
    if (res) {
      res = (res && res.toJSON && res.toJSON()) || res;
    }
    const finalCalendars = getPrimaryCalendars(calendarRes);
    // {
    //   "id": "awa6ltos76vz5hvphkp8k17nt",
    //   "account_id": "awa6ltos76vz5hvphkp8k17nt",
    //   "object": "account",
    //   "name": "Ben Bitdiddle",
    //   "email_address": "benbitdiddle@gmail.com",
    //   "provider": "gmail",
    //   "organization_unit": "label",
    //   "sync_state": "running",
    //   "linked_at": 1470231381,
    // }
    return {access_token, ...res, calendars: finalCalendars};
  } catch (err) {
    const { message } = err || {};
    console.error('requestNyAccessToken error:', err, err.message);
    if (message) {
      return {
        error: {
          message,
        },
      };
    }
    return err;
  }
};

const listCalendars = async (accessToken) => {
  try {
    const nylas = Nylas.with(accessToken);
    const calArr = await nylas.calendars.list();
    if (calArr && calArr.length > 0) {
      const finalCalendars = getPrimaryCalendars(calArr);
      return {calendars: finalCalendars};
    } else {
      return {calendars: []};
    }
  } catch (err) {
    console.log('LIST CALENDARS ERROR', err);
    return {
      error: {
        message: 'Error occured while listing calendars.',
      },
    };
  }
};

const getSchedulingPageInfo = async (pageId, accessToken) => {
  try {
    const url = `https://schedule.api.nylas.com/manage/pages/${pageId || 0}`;
    const headers = {
      Authorization: `Bearer ${accessToken}`,
    };
    const res = await axios.get(url, {headers});
    return res.data;
  } catch (error) {
    return {
      error: {
        message: axiosErrorHandling(error) || 'Unknown error occured',
      },
    };
  }
};

const getEventInfo = async (eventId, accessToken) => {
  try {
    const nylas = Nylas.with(accessToken);
    const eventInfo = await nylas.events.find(eventId);
    return eventInfo;
  } catch (error) {
    console.error(error);
    return {
      error: {
        message: (error && error.message) || 'Unknown error occured',
      },
    };
  }
};

const updateEventInfo = async (eventId, updatedEventObj, accessToken) => {
  try {
    const url = `https://api.nylas.com/events/${eventId}`;
    const headers = {
      Authorization: `Bearer ${accessToken}`,
    };
    const res = await axios.put(url, updatedEventObj, {headers});
    return res.data;
  } catch (error) {
    return {
      error: {
        message: axiosErrorHandling(error) || 'Unknown error occured',
      },
    };
  }
};

const createNylasCalendarEvent = async (eventObj, accessToken) => {
  try {
    const nylas = Nylas.with(accessToken);
    const {
      eventTitle,
      startTimeInSecs,
      endTimeInSecs,
      calendarId,
      description,
    } = eventObj || {};
    const event = nylas.events.build();
    event.calendarId = calendarId;
    event.when = { start_time: startTimeInSecs, end_time: endTimeInSecs };
    event.title = eventTitle || "Interview";
    // event.location = '';
    event.description = description || '';
    event.save();
  } catch (error) {
    console.error(error);
    return {
      error: {
        message: 'Unable to book event in the calendar',
      },
    };
  }
};

const revokeNylasAccount = async (nylasAccountId) => {
  try {
    // const account = await Nylas.accounts.find(nylasAccountId);
    // console.log('account', nylasAccountId, account);
    // const res = await account.revokeAll();
    // console.log('REVOKE RES:::', res);
    const str = Buffer.from(`${NY_CLIENT_SECRET}:`).toString('base64');
    const headers = {
      Authorization: `Basic ${str}`,
    };
    const url = `https://api.nylas.com/a/${NY_CLIENT_ID}/accounts/${nylasAccountId}/revoke-all`;
    const res = await axios.post(url, {}, {headers});
    console.log('REVOKE RES:::', res.status, res.data);
    // Nylas.accounts.find(nylasAccountId)
    //   .then(account => {
    //     account.downgrade();
    //   })
    //   .catch(err => {
    //     console.error(err);
    //   });
  } catch (error) {
    console.error(error);
    const { message } = error || {};
    console.log('MEMEM', message);
    return {
      error: {
        message: 'Unable to revoke calendar account',
      },
    };
  }
};

module.exports = {
  requestNyAccessToken,
  listCalendars,
  getSchedulingPageInfo,
  getEventInfo,
  revokeNylasAccount,
  updateEventInfo,
  createNylasCalendarEvent,
  NY_API_URL,
  NY_CLIENT_ID,
  NY_CLIENT_SECRET,
  NY_REDIRECT_URI,
};