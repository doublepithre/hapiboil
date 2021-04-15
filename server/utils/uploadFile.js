const moment = require('moment');
const os = require('os');
const fs = require('fs');
const FileType = require('file-type');
const AzureStorage = require('./azstorage');

/* ----------------------------------

  .               This function uploads a file on the local, then uploads it to azure and then 
  .               returns that azure url (to be saved on the db) also deletes the local file
  
  FUNCTION:
  uploadFile(fileItem: BufferStreamOfFileItem, blobContainerName: string, allowedFileTypes: [], keyPrefix)

  REQUIRED PARAMS: 
  fileItem, blobContainerName

  blobContainerName: {
    if(candidate) blobContainerName = `${userId}`
    if(companyStaff) blobContainerName = `${userCompany.companyName}-${userCompany.companyId}`
  }

  RESPONSE = uploadFile()
    { error: false, vurl: azRes.vurl }
    { error: true, message: "Unable to upload the document" }

  MORE INFO:
  Before using it, configure the payload of the Hapi's API route to allow form-data and stream output. DEMO...
  server.route({
    method: 'POST',
    path: '/upload',
    options: {
      auth: {
        mode: 'try',
      },          
      payload: {
        maxBytes: 3000000,
        output: 'stream',
        parse: true,
        multipart: true,
      },
      handler: uploadFile,
    },
  });

---------------------------------- */


const defaultAllowedFileTypes = ['jpg', 'jpeg', 'png', 'docx', 'odt', 'pdf', 'doc'];
const uploadFile = async (fileItem, blobContainerName, allowedFileTypes = defaultAllowedFileTypes, kf) => {
  const keyPrefix = kf ? kf : 'default';
  const filetype = await FileType.fromBuffer(fileItem._data);
  if (!allowedFileTypes.includes(filetype.ext)) return { error: true, message: `File format invalid(${filetype.ext}). Use one of the following: ${ allowedFileTypes.join(' ') }` }
  
  /* -----------------------------------
  .   UPLOAD TO THIS (LOCAL) SERVER
  ----------------------------------- */ 
  // use os module to check if windows or not
  const currentOSPlatform = os.platform();
  const isWindows = currentOSPlatform === "win32" || currentOSPlatform === "win64";

  let filepathToSave = `tmp/${new Date().valueOf()}_${fileItem.hapi.filename}`;
  if(!isWindows){
    filepathToSave = `/tmp/${new Date().valueOf()}_${fileItem.hapi.filename}`;
  }

  const fd = await fs.openSync(filepathToSave, 'w');
  fs.writeFileSync(fd, fileItem._data);
  
  /* -----------------------------------
  .   UPLOAD TO THE AZURE SERVER
  ----------------------------------- */ 
  const docname = fileItem.hapi.filename;
  const nameData = {
    blobContainerName,    
    docname: docname,
    docPrefix: `${keyPrefix}/${moment().format("YYYY/MM/DD")}`
  };
  
  // UPLOAD TO AZURE
  const azRes = await AzureStorage.uploadToBlobStorage(filepathToSave, nameData)
  if(azRes.vurl) {
    return { error: false, vurl: azRes.vurl };
  } else {
    return { error: true, message: "Unable to upload the document" };
  }

}

module.exports = uploadFile;