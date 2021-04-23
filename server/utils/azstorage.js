"use strict";
const { v4: uuidv4 } = require('uuid');
const slugify = require("slugify");
const fs = require("fs");
const config = require('config');

const {
  BlobServiceClient,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
  StorageSharedKeyCredential,
} = require("@azure/storage-blob");

const docStorageAccountName = config.get('azure.docStorageAccountName') || '';
const docStorageAccountKey = config.get('azure.docStorageAccountKey') || '';
const docContainerName = config.get('azure.docContainerName') || '';

const accountName = docStorageAccountName;
const accountKey = docStorageAccountKey;
const defaultContainerName = docContainerName;

const sharedKeyCredential = new StorageSharedKeyCredential(
  accountName,
  accountKey
);

const generateBlobSASURL = (conName, blobName, expireTime = 86400000) => {
  try {
    const blobSAS = generateBlobSASQueryParameters(
      {
        containerName: conName, // Required
        blobName, // Required
        permissions: BlobSASPermissions.parse("r"), // Required
        startsOn: new Date(), // Required
        expiresOn: new Date(new Date().valueOf() + expireTime), // Optional. Date type
      },
      sharedKeyCredential
    ).toString();
    return blobSAS;
  } catch (error) {
    console.error(error);
    return null;
  }
};

const deleteLocalFile = (filePath) => {
  fs.unlink(filePath, (err) => {
    if (!err) {
      console.log(`Successfully deleted ${filePath}`);
    } else {
      console.error(`Error occured while deleting ${filePath}`);
    }
  });
};

const createContainerIfNotExists = async (client, containerName) => {
  try {
    const containerClient = client.getContainerClient(containerName);
    try {
      await containerClient.create();
    } catch (error) {
      const { statusCode, details } = error || {};
      const { errorCode } = details || {};
      if (statusCode == 409 || errorCode === "ContainerAlreadyExists") {
        return containerClient;
      } else {
        return null;
      }
    }
    return containerClient;
  } catch (error) {
    console.error(error.statusCode, error.name, error.code, error.details);
    return null;
  }
};

const uploadToBlobStorage = async (filePath, ubody) => {
  try {
    const blobServiceClient = new BlobServiceClient(
      `https://${accountName}.blob.core.windows.net`,
      sharedKeyCredential
    );
    const { docname: ublobName, blobContainerName: blobContainerNameRaw, docPrefix } = ubody || {};
    const blobContainerName = slugify(blobContainerNameRaw);
    let containerName = blobContainerName;
    let containerClient = await createContainerIfNotExists(blobServiceClient, containerName);

    if (!containerClient) {
      containerName = defaultContainerName;
      containerClient = blobServiceClient.getContainerClient(defaultContainerName);
    }
    const blobName = `${docPrefix}/` + slugify(ublobName);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    const bcres = await blockBlobClient.uploadFile(filePath);
    const expTime = 38 * 86400000;
    const blobSAS = generateBlobSASURL(containerName, blobName, expTime);
    if (bcres && !bcres.errorCode) {
      deleteLocalFile(filePath);
    } else {
      console.error('Error while uploading blob', ubody, bcres);
    }
    return {
      vurl: `https://${accountName}.blob.core.windows.net/${containerName}/${blobName}?${blobSAS}`,
    };
  } catch (error) {
    console.error(error);
    return error;
  }
};

module.exports = {
  uploadToBlobStorage,
};