import { env } from 'process';
import XLSX from 'xlsx';
const crypto = require('crypto');
const validator = require('validator');

const formatColumnName = name => {
  let fname = name && (name + '').toLowerCase();
  fname = fname.trim();
  fname = fname.replace(/[.*+\-?^${}()|[\]\\\s]/g, '');
  return fname;
};

const leadStatuses = {
  "1": "Marketing Presentation",
  "2": "MAPs/CJR Shared",
  "3": "APC Marketing",
  "4": "Follow Up",
  "5": "On Hold",
  "6": "Terms Shared",
  "7": "Terms Negotiated",
  "8": "Converted To Client",
  "9": "Client Lost",
  "10": "Client Revived",
  "11": "No Contract Position"
}

const convertToJSON = filepathToSave => {
  const workbook = XLSX.readFile(filepathToSave, { cellData: true });
  const sheetNameList = workbook.SheetNames;
  //get the first sheet since it contains the jobs data
  const firstSheetRef = sheetNameList[0];
  const firstSheetObj = workbook.Sheets[firstSheetRef];

  const range = XLSX.utils.decode_range(firstSheetObj['!ref']);
  const headers = [];
  for (let C = range.s.c; C <= range.e.c; ++C) {
    const addr = XLSX.utils.encode_cell({ r: range.s.r, c: C });
    const cell = firstSheetObj[addr];
    if (!cell) continue;
    headers.push(formatColumnName(cell.v));
  }
  const data = XLSX.utils.sheet_to_json(firstSheetObj, {
    header: headers,
    range: 1,
  });
  return data;
};

const phoneNumberValidation = pNum => {
  if (!pNum) {
    return { isValid: false, number: -1 };
  }
  pNum = pNum.toString();
  const splitter = pNum.includes(' ') ? ' ' : pNum.includes('-') ? '-' : '';
  if (splitter === ' ' || splitter === '-') {
    pNum = pNum.split(splitter)[1];
  }
  const isValid = pNum.length == 10;
  return { isValid, number: pNum };
};

const validateExcelData = (excelData, dbData) => {
  const { companies, leadmanagers, industries, functions, leadStatuses } = dbData || {};
  const {
    slno,
    leadname,
    leadcompany,
    dmname,
    designation,
    email,
    contactnumber,
    location,
    industry,
    functionarea,
    status,
    leadmanageremail,
    managermobilenumber,
    comments,
    leadurl,
  } = excelData || {};
  try {
    console.log(leadmanageremail);
    const companyIndex = companies.get(leadcompany.toLowerCase().trim());
    const leadmanagerIndex =
      validator.isEmail(leadmanageremail) && leadmanagers.get(leadmanageremail.toLowerCase().trim());
    const industryIndex = industries.get(industry.toLowerCase().trim());
    const functionsIndex = functions.get(functionarea.toLowerCase().trim());
    const statusIndex = leadStatuses.find(st => st.statusName.toLowerCase().trim() === status.toLowerCase().trim());
    const isEmailValid = validator.isEmail(email);
    const contact = phoneNumberValidation(contactnumber);
    const mobile = phoneNumberValidation(managermobilenumber);
    const isCommentsValid = comments && comments.toString().length <= 1000;

    let error = '';

    if (!companyIndex) {
      error += `${leadcompany} doesn\'t exist in the database,`;
    }
    if (!leadmanagerIndex) {
      error += `${leadmanageremail} doesn\'t exist in the database,`;
    }
    if (!industryIndex) {
      error += `Invalid industry ${industry},`;
    }
    if (!functionsIndex) {
      error += `Invalid function ${functionarea},`;
    }
    if (!statusIndex) {
      error += `Invalid status ${status},`;
    }
    if (!isEmailValid) {
      error += `Invalid email: ${email}`;
    }
    if (!contact.isValid) {
      error += "Contact number invalid. Make sure it's 10 digits,";
    }
    if (!mobile.isValid) {
      error += "Manager mobile number invalid. Make sure it's 10 digits,";
    }
    if (!isCommentsValid) {
      error += 'Comments is either empty or exceeds 1000 character limit,';
    }

    const isValid =
      companyIndex &&
      leadmanagerIndex &&
      industryIndex &&
      functionsIndex &&
      statusIndex &&
      isEmailValid &&
      contact.isValid &&
      mobile.isValid &&
      isCommentsValid;
    const formattedData = {
      dmName: dmname,
      leadName: leadname,
      designation: designation,
      emailId: email,
      contactNumber: contact.number,
      location: location,
      industryId: industryIndex ? industryIndex.industryId : -1,
      functionalId: functionsIndex ? functionsIndex.functionId : -1,
      statusId: statusIndex ? statusIndex.statusId : -1,
      leadManagedBy: leadmanagerIndex ? leadmanagerIndex.userId : -1,
      mobileNumber: mobile.number,
      comments: comments,
      leadCompanyId: companyIndex ? companyIndex.companyId : -1,
      leadUrl: leadurl,
    };
    const leadDetails = {
      leadCompanyName: companyIndex ? companyIndex.displayName : leadcompany,
      leadManagedByName: leadmanagerIndex ? leadmanagerIndex.email : leadmanageremail,
      industryName: industryIndex ? industryIndex.industryName : industry,
      functionalName: functionsIndex ? functionsIndex.functionName : functionarea,
      statusName: statusIndex ? statusIndex.statusName : status,
    };
    return { isValid, formattedData, leadDetails, error };
  } catch (err) {
    console.error(err);
    return { isValid: false, formattedData: {}, error: `Error while processing row: ${slno}` };
  }
};

const jsonToExcel = (dataArr, filename) => {
  const workbook = XLSX.utils.book_new();
  const headers = Object.keys(dataArr[0]);
  dataArr.forEach(data => data.Status = leadStatuses[data.Status]);
  const xlsxData = XLSX.utils.json_to_sheet(dataArr, { headers, skipHeader: false });

  XLSX.utils.book_append_sheet(workbook, xlsxData, "Leads");

  XLSX.writeFile(workbook, getExportDirectory('leadsexport')+`/${filename}.xlsx`);
};

const getExportDirectory = (key) => {
  const env = process.env.NODE_ENV;

  let baseDir = `/mnt/${key}`
  if(env.trim()=='dev') {
    console.log('ping')
    baseDir = `logs/${key}`;
  }

  return baseDir;
}

const md5Hash = str => {
  return crypto
  .createHash("md5")
  .update(str+'')
  .digest("hex");
};

module.exports = {
  formatColumnName,
  convertToJSON,
  validateExcelData,
  md5Hash,
  jsonToExcel,
  getExportDirectory,
};
