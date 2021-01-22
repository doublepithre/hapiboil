'use strict';
const crypto = require('crypto');
const _ = require('lodash');
const moment = require('moment');
const { btoa } = require('b2a');

const DEV_URL = 'http://localhost:4545';
const STAGING_URL = 'https://empstag.x0pa.ai';
const PRODUCTION_URL = 'https://empauwer.x0pa.ai';
const LAMBDA_API_KEY =  '1f31903d-7885-4237-a5d7-fb7228e279d2';
const CRONOFY_API_KEY = '6a1535ff-2dbb-6432-8f61-5dfd714346be';
const DYNAMICS_API_KEY ='XSQlB6I2-A7A3-9CgF-ZWU1-whttzYulqd0Q';
const RESUME_ANALYTICS_KEY ='9c1789dd-A7A3-4237-8f61-whttzYulqd0Q';

const md5Hash = (str) => {
  return crypto.createHash('md5').update(str).digest('hex');
}

const hmacHash = (alg, str, secret) => {
  const hmac = crypto.createHmac(alg, secret);
  return hmac.update(str).digest('hex');
}

const b2aHash = (str) => {
  return btoa(str);
}

/**
 * Converts the key:value pairs of items into array of key:value
 * e.g
 * [
 *  {
 *    a:1,
 *    b:2
 *  },
 *  {
 *    a:3,
 *    b:2
 *  }
 * ], a
 *  =>
 *
 * [1,3]
 *
 * A common use case is where:{inq:[]} data query filter
 * @param { {[prop:string]:any} } [ items ]
 * @param {string} [ prop ]
 */
function keyValueToArray(items, prop) {
  if(items){
    var itemsList = [];
    if (items && !Array.isArray(items)) {
      items = [items];
    }
    items.forEach(element => {
      if(typeof element[prop] === 'function'){
        element = element.toJSON();
        itemsList.push(element[prop]);
      }
      else {
        itemsList.push(element[prop]);
      }
    });
    return itemsList;
  }
  else {
    return [];
  }
}

/**
 * Converts the key:value pairs of items into array of key:value
 * e.g
 * [
 *  {
 *    a:1,
 *    b:2
 *  },
 *  {
 *    a:3,
 *    b:2
 *  }
 * ]
 *  =>
 *
 * [{a:1},{a:3}]
 *
 * A common use case is where:{or:{}} data query filter
 * @param { {[prop:string]:any} } [ items ]
 * @param {string} [ prop ]
 */
function extractKeyValueFromArray(items, prop) {
  var itemsList = [];
  if (items && !Array.isArray(items)) {
    items = [items];
  }
  items.forEach(element => {
    let tmpObj = {};
    tmpObj[prop] = element[prop];
    itemsList.push(tmpObj);
  });
  return itemsList;
}

/**
 * from 'tom,mary,john', 'name'
 * to
 * [
 *  { name: 'tom'},
 *  { name: 'mary'},
 *  { name: 'john'}
 * ]
 * @param {string} [csvString]
 * @param {string} [prop]
 */
function csvToArrayOfKey (csvString, prop) {
  const arr = csvString.split(',');
  const items = [];
  for (let item of arr) {
    items.push({
      [prop]: item,
    });
  }
  return items;
};

/**
 *
 * Converts array of objects into map by key value
 *
 * e.g
 * key = 'a'
 * [
 *  {
 *    a:1,
 *    b:2
 *  },
 *  {
 *    a:3,
 *    b:2
 *  }
 * ]
 *  =>
 *
 * {1 : {a:1,b:2}, 3 : {a:3,b:2}}
 * @param { Array<{ [key:string]:any }> } [arr]
 * @param { string } [key]
 */
function convertArrayToMapByKey (arr, key) {
  const finalMap = {};
  if (arr.length) {
    for (let item of arr) {
      if (item[key] !== 0 || !item[key]) { //make sure the key exists, 0 is consider valid
        finalMap[item[key]] = item;
      }
    }
  }

  return finalMap;
};

function applySortAndPaginationFilters(filter, collection) {
  //eg: sortBy=jobname.nameName|ASC,jobname.jobId|DESC

  if (!collection || !Array.isArray(collection) || !filter)
    return collection;

  if (Array.isArray(collection) && (filter && filter.order)) {
    //apply column sort
    collection = applySortFilters(filter, collection);
  }

  if (!filter.limit) {
    filter.limit = 10;
  } else {
    filter.limit = parseInt(filter.limit, 10);
  }
  if (!filter.skip) {
    filter.skip = 0
  } else {
    filter.skip = parseInt(filter.skip, 10);
  }

  //apply pagination
  collection = applyPaginationFilters(filter.limit, filter.skip, collection);

  return collection;
}

function applySortFilters(filter, collection) {
  //eg: sortBy=jobname.nameName|ASC,jobname.jobId|DESC

  if (!collection || !Array.isArray(collection))
    return;

  if (Array.isArray(collection) && (filter && filter.order)) {

    let listOfColumnSegments = filter.order

    listOfColumnSegments.map((e)=> {
      //eg:  e = jobname.nameName|ASC
      let columnName = e.split(" ")[0];
      let columnFilter = e.split(" ")[1] || "ASC";

      collection = collection.sort(dynamicCompareFunction(columnName, columnFilter));
    });

  }

  return collection;
}

function applyPaginationFilters(limit, skip, collection) {
  if (!collection || !Array.isArray(collection))
    return collection;

  if (Array.isArray(collection)) {

    if(collection.length <= skip) {
      return [];
    }

    collection = collection.slice(skip, Math.min(collection.length, skip+limit));
  }
  return collection;
}

function dynamicCompareFunction(key, order='ASC') {
  return function(a, b) {
    if (a.toJSON) {
      a = a.toJSON();
    }
    if (b.toJSON) {
      b = b.toJSON();
    }
    if(!_.has(a,key) || !_.has(b,key)) {
      // property doesn't exist on either object
        return 0;
    }

    let varA = (typeof _.get(a, key, null) === 'string') ?
    _.get(a, key, null).toUpperCase() : _.get(a, key, null);
    let varB = (typeof _.get(b, key, null) === 'string') ?
    _.get(b, key, null).toUpperCase() : _.get(b, key, null);

    // console.log(key, _.has(a,key), varA, varB );

    let comparison = 0;
    //Checking for floats and integers
    varA = (parseFloat(varA)==varA)?parseFloat(varA):varA;
    varB = (parseFloat(varB)==varB)?parseFloat(varB):varB;
    if (varA > varB) {
      comparison = 1;
    } else if (varA < varB) {
      comparison = -1;
    }

    return (
      (order == 'DESC') ? (comparison * -1) : comparison
    );
  };
}

function applyFiltersToQueryObj(filter, queryCfg, isSupportColumnSorting) {

  //JSON.parse(JSON.stringify is important here to create a clone and not affect main object
  queryCfg = _.assign(JSON.parse(JSON.stringify(filter)), queryCfg);
  //if this API supports column sorting then delete limit, skip & order fields from Query. it will be manually applied later.
  if(isSupportColumnSorting){
    delete queryCfg.limit;
    delete queryCfg.skip;
    delete queryCfg.order;
  }
  return queryCfg;
}

function safeIsNil () {

}

function getDateDiff(fromDateString, toDateString) {
  let fromDate = (new Date(fromDateString)).getTime();
  let toDate = (new Date(toDateString)).getTime();

  return fromDate - toDate;
}

function getAutoCompleteHelper(Model, columnName, search, cb){
  const queryList = [];
  const orQuery = [
    {"like": `${search.toUpperCase()}%`},
    {"like": `${search.toLowerCase()}%`},
    {"like": `${search}%`},
    {"like": `${search[0].toUpperCase() + search.slice(1,search.length)}%`},
  ]
  _.each(orQuery, function(likeQuery){
    let queryObj = {};
    queryObj[columnName] = likeQuery;
    queryList.push(queryObj);
  });
  return queryList;
}

/**
 * Creates an async wrapper to a normal function with callback so that it can be used with await.
 */
async function asyncWrapper(...args) {
  var callingFunction = args[0];
  let fulfilledValue;
  let result = [];

  try {
    result.push(new Promise(function(resolve, reject) {
      let newArgs = args.slice(1);
      newArgs.push((err, res) => {
        if (err)
          reject(err);
        else
          resolve(res);
      });
      callingFunction.apply(null, newArgs);
    }));

    fulfilledValue = await Promise.all(result);
  }
  catch (rejectedValue) {
    fulfilledValue = rejectedValue;
  }
  return fulfilledValue;
}

const filterCandidateGlobalProfiles = async (jobs) => {
  let res = {
    applications: [],
  };
  const filteredJobs = jobs.filter((appl) => {
    const profile = appl.profile();
    return profile.globalTalent;
  });
  res.applications = filteredJobs;
  return res;
}

/* Inserts in to the table if the record doesn't exist */
const insertIfnotExists = async (iModel, where, record) => {
  try {
    const whereQuery = {
      where,
    };
    const rfound = await iModel.findOne(whereQuery);
    if (rfound) {
      console.log('Record Found: ', rfound);
      return rfound;
    } else {
      const createdRecord = await iModel.create(record);
      console.log('Record Created: ', createdRecord);
      return createdRecord;
    }
  } catch (err) {
    console.log('Insert Error:', err)
  }
};

const checkInviteHash = (str = '') => {
  const INVITE_HASH_KEY = '3FGxXjb2YNX0PA)(AiBK';
  const [hash, appId, hashedTimestamp] = str.split('x');
  const hashStr = `${INVITE_HASH_KEY}_${appId}_${hashedTimestamp}`;
  const reqHash = md5Hash(hashStr);
  const daysPassed = moment().diff(moment(Number(hashedTimestamp)), 'days');
  // After 30 days link expires
  if((hash === reqHash) && (daysPassed < 31)) {
    return {
      appId,
      hashedTimestamp,
    };
  }
  return {};
};

const checkDocumentHash = (str = '') => {
  const HASH_KEY = 'BK3FGxXjb2YNX0PA)(Ai';
  const [hash, personDocId, hashedTimestamp] = str.split('x');
  const hashStr = `${HASH_KEY}_${personDocId}_${hashedTimestamp}`;
  const reqHash = md5Hash(hashStr);
  const hoursPassed = moment().diff(moment(Number(hashedTimestamp)), 'hours');
  // After 10 hrs document hash expires
  //  && (hoursPassed < 11) <-- Removed this -<- ELASTIC CACHE
  if((hash === reqHash)) {
    return {
      personDocId,
    };
  }
  return {};
};

const hashPersonDocument = (personDocId = 0) => {
  if(!personDocId) {
    return null;
  }
  const HASH_KEY = 'BK3FGxXjb2YNX0PA)(Ai';
  const hashedTimestamp = Date.now();
  const hashStr = `${HASH_KEY}_${personDocId}_${hashedTimestamp}`;
  const reqHash = md5Hash(hashStr);
  const hashedDocId = `${reqHash}x${personDocId}x${hashedTimestamp}`;
  return hashedDocId;
};

const checkReferenceHash = (str = '') => {
  const HASH_KEY = 'G3FxXjb2YNX0PA)(AiBK';
  const [hash, referrerId, referenceId, hashedTimestamp] = str.split('x');
  const hashStr = `${HASH_KEY}_${referrerId}_${referenceId}_${hashedTimestamp}`;
  const reqHash = md5Hash(hashStr);
  const daysPassed = moment().diff(moment(Number(hashedTimestamp)), 'days');
  // After 30 days hash expires
  if((hash === reqHash) && (daysPassed < 31)) {
    return {
      referenceId,
      referrerId,
    };
  }
  return {};
};

const isProduction = () => {
  const knownEnvironments = ['dev', 'staging', 'production'];
  const env = process.env.NODE_ENV.toLowerCase();
  if(env && knownEnvironments.includes(env) && (env === 'production')) {
    return true;
  } else {
    return false;
  }
};

const getDomainURL = () => {
  const env = process.env.NODE_ENV.toLowerCase();
  let url = DEV_URL;
  switch(env.trim()) {
    case 'dev':
      url = DEV_URL;
      break;
    case 'staging':
      url = STAGING_URL;
      break;
    case 'production':
      url = PRODUCTION_URL;
      break;
    default:
      url = DEV_URL;
  }
  return url;
};

const isValidEmail = (emailId) => {
  const emailRegEx = new RegExp(/\S+@\S+\.\S+/);
  const isEmailValid = emailRegEx.test(emailId);
  if (!emailId || !isEmailValid) {
    return false;
  }
  return true;
}

const roundNumber = (num, ceil=true) => {
  let o = 0;
  if(num && !isNaN(Number(num))) {
    o = Math.ceil(num);
  }
  return o;
};

module.exports = {
  md5Hash,
  safeIsNil,
  convertArrayToMapByKey,
  csvToArrayOfKey,
  extractKeyValueFromArray,
  keyValueToArray,
  applySortAndPaginationFilters,
  applyFiltersToQueryObj,
  insertIfnotExists,
  getAutoCompleteHelper,
  filterCandidateGlobalProfiles,
  asyncWrapper,
  checkInviteHash,
  getDateDiff,
  isProduction,
  getDomainURL,
  isValidEmail,
  checkDocumentHash,
  hashPersonDocument,
  checkReferenceHash,
  LAMBDA_API_KEY,
  CRONOFY_API_KEY,
  DYNAMICS_API_KEY,
  b2aHash,
  applySortFilters,
  hmacHash,
  roundNumber,
};