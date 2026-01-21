require("dotenv").config();
const con = require('../../config');
var path = require("path");
var fs = require('fs');
const classname = 'file.download.controller.js'
const logger = require("../utils/logtrace");
var request = require("request");
const formidable = require('formidable');
const CSVToJSON = require('csvtojson');
const fastcsv = require("fast-csv");
var XLSX = require("xlsx");
const converter = require('json-2-csv');
const appRoot = require('app-root-path');
const db = require("../utils/database");
let customerModel = require('../models/poc.model');
const moment = require('moment');
var fimport = require('./file.import.controller');
const Sequelize = require('sequelize');
const { Op } = Sequelize;

const extract = require('extract-zip');
let ssh2SftpClient = require('ssh2-sftp-client');

const crypto = require("crypto");
const { exec } = require("child_process");
var fsExtra = require('fs-extra');
var messages = require('./message.controller');
var commonService = require('../services/common.service');



 async function GetBatchFiles(documentType) {
    const methodname = 'GetBatchFiles';
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
    let batchFiles;
    return new Promise(async (resolve, reject) => {
        try {
            let selectqueryText = `select distinct batchfilename,id,fileid,documenttype  from customers where status='File_Posted' and documenttype='${documentType}'  ORDER BY id`;
            await db.sequelize.query(selectqueryText)
                .then(async (data) => {
                    batchFiles=data;
                    logger.info("Class :: " + classname + " :: Method :: " + methodname + " End");
                    resolve(batchFiles);
                });
        }
        catch (ex) {
            logger.info("Class :: " + classname + " :: Method :: " + methodname + " ERROR = " + ex);
            reject(ex);
        }
        
    });

};

exports.DownloadFilesExt=async ()=>{
    const methodname = 'DownloadFilesExt';
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
    try
    {
        let documentTypes = await commonService.GetDocumentTypes();
        if (documentTypes != undefined) {
            documentTypes.forEach(async (document, i, documentTypes) => {
                logger.info("Class :: " + classname + " :: Method :: " + methodname + " document type = " + document.documentType);
                let batchfiles=await GetBatchFiles(document.documentType);
                      //logger.info("Class :: " + classname + " :: Method :: " + methodname + " batchfiles = "+batchfiles.length);
       // logger.info("Class :: " + classname + " :: Method :: " + methodname + " batchfiles = \n"+JSON.stringify(batchfiles[0],null,2));  
                await GetFilesFromSFTP(batchfiles[0],document);
                logger.info("Class :: " + classname + " :: Method :: " + methodname + " End");
            });
        }
    }
    catch(ex)
    {

    }
}



async function GetFilesFromSFTP(batchfiles,document) {
    const methodname = 'GetFilesFromSFTP';
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
    let processedBatchfile = [];
   
    return new Promise(async (resolve, reject) => {
        try {
            batchfiles.forEach(async (batch,i,batchfiles)=>{
                if (!processedBatchfile.includes(batch.batchfilename)) {
                    logger.info("Class :: " + classname + " :: Method :: " + methodname + " batchfilename = "+batch.batchfilename);
                    let updatecondition={ where: { batchfilename: batch.batchfilename } };
                    await db.customers.update({ status: 'File_Copied'}, updatecondition);
                    processedBatchfile.push(batch.batchfilename);
                    let documentName = batch.batchfilename.replace('.csv', '.csv-part-1.zip');
                    logger.info("Class :: " + classname + " :: Method :: " + methodname + " documentName = "+documentName);
                   let sourcepath = con.FTP_TARGET_PATH + document.output + documentName;
                   let destinationpath = con.ASSETREPO+con.PRINT_FILE_DIR;
                   destinationpath=destinationpath+documentName;
                   logger.info("Class :: " + classname + " :: Method :: " + methodname + " sourcepath = "+sourcepath);
                   logger.info("Class :: " + classname + " :: Method :: " + methodname + " destinationpath = "+destinationpath);
             let filedownloded= await  downloadFile(sourcepath,destinationpath);
             logger.info("Class :: " + classname + " :: Method :: " + methodname + " filedownloded = \n"+JSON.stringify(filedownloded,null,2));
             if(filedownloded){
              logger.info("Class :: " + classname + " :: Method :: " + methodname + " filedownloded ");
              await extract(destinationpath, { dir: con.ASSETREPO + con.PRINT_FILE_DIR + path.parse(batch.batchfilename).name + '/' }).then(async()=>{
                logger.info("Class :: " + classname + " :: Method :: " + methodname + " extracted ");
                await FileMoveAndUpdate(batch).then(async ()=>{
                    logger.info("Class :: " + classname + " :: Method :: " + methodname + " file moved ");

                    if (fs.existsSync(destinationpath)) {
                        await fs.unlinkSync(destinationpath);
                        logger.info("Class :: " + classname + " :: Method :: " + methodname + "local zip file removed= " + destinationpath);
                    }
                    let extractedDir = con.ASSETREPO + con.PRINT_FILE_DIR +  path.parse(batch.batchfilename).name + '/';
                    await  deleteFolder(extractedDir).then(async()=>{
                    logger.info("Class :: " + classname + " :: Method :: " + methodname + "Extracted directory removed= " + extractedDir);
                   })
                })
              });

                }
                else
                {
                    await db.customers.update({ status: 'File_Posted'}, updatecondition);
                }
            }
            if(batchfiles.length==i+1)
            {
                logger.info("Class :: " + classname + " :: Method :: " + methodname + " End");
                resolve(true);
             
            }
          
            });
            
        }
        catch (ex) {
            logger.info("Class :: " + classname + " :: Method :: " + methodname + " ERROR = " + ex);
            reject(ex);
        }
        
    });


};

async function FileMoveAndUpdate(data) {
     let fileNameWithoutExt;
    let localDestinationFilepath;
    let methodname='FileMoveAndUpdate';
    try {
        await fromDir(data, con.ASSETREPO + con.PRINT_FILE_DIR + path.parse(data.batchfilename).name + '/', '.pdf', async function (filename) {
            //     logger.info("Class :: " + classname + " :: Method :: " + methodname + " file found = " + filename);
            if (filename && filename != undefined) {
                fileNameWithoutExt = path.parse(filename).name;
                localDestinationFilepath = con.ASSETREPO + con.PRINT_FILE_DIR + path.parse(data.batchfilename).name + '/' + path.basename(filename);
                if(filename!=localDestinationFilepath)
                {
                    fsExtra.move(filename, localDestinationFilepath).then(async () => {
                        logger.info("Class :: " + classname + " :: Method :: " + methodname + " pdf document  moved = " + fileNameWithoutExt);
                    });
                }
            }
        });
    }
    catch (ex) {

    }
}

async function downloadFile(sourcepath,destinationpath)
{
    const methodname = 'downloadFile';
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
    let sftp = new ssh2SftpClient();
    return new Promise(async (resolve, reject) => {
        try {
            let ftpconfig = await getFtpConfig();
         sftp.connect(ftpconfig).then(async ()=>{
            logger.info("Class :: " + classname + " :: Method :: " + methodname + " SFTP Connected");
           await sftp.get(sourcepath, destinationpath);
            // resolve(true)
         }).then(async ()=>{
            await sftp.delete(sourcepath);
            sftp.end();
            logger.info("Class :: " + classname + " :: Method :: " + methodname + " SFTP DisConnected");
            resolve(true);
         });
        }
        catch (ex) {
            logger.info("Class :: " + classname + " :: Method :: " + methodname + " ERROR = " + ex);
            reject(ex);
        }
        
    });
}

async function getFtpConfig() {
    return ftpconfig = {
        host: con.FTP_HOST,
        type: con.FTP_PROTOCOL_TYPE,
        port: con.FTP_PORT,
        username: con.FTP_USER_NAME,
        password: con.FTP_PASSWORD
    }
}

function fromDir(data, startPath, filter, callback) {
    let methodname = 'fromDir';
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin ");
    try {
        if (!fs.existsSync(startPath)) {
            logger.info("Class :: " + classname + " :: Method :: " + methodname + " no directory = " + startPath);
            return;
        }

        var files = fs.readdirSync(startPath);
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " files length = " + files.length);
        for (var i = 0; i < files.length; i++) {
            var filename = path.join(startPath, files[i]);
            var stat = fs.lstatSync(filename);
            if (stat.isDirectory()) {
                fromDir(data, filename, filter, callback); //recurse
            } else {
                // logger.info("Class :: " + classname + " :: Method :: " + methodname + " End ");
                let fileNameWithoutExt = path.parse(filename).name;
                let localDestinationFilepath = con.ASSETREPO + con.PRINT_FILE_DIR + path.parse(data.batchfilename).name + '/' + path.basename(filename);
                let updateQuery = `update customers set policydocumentpath='${localDestinationFilepath.replace(con.ASSETREPO, '')}',policydocumenthttppath='${localDestinationFilepath.replace(con.ASSETREPO, con.HTTP_ASSETREPO)}', status='Document_Ready' where policynumber= '${fileNameWithoutExt}' and fileid='${data.fileid}'`;
                db.sequelize.query(updateQuery);
                callback(filename.replace(/\\/g, "/"));
            }

        };
    }
    catch (ex) {
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " Exception :: ERROR = " + ex);
    }

};

async function deleteFolder(directoryPath) {
    let methodname = "deleteFolder";
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " directoryPath = " + directoryPath);
    const folders = fs.readdirSync(directoryPath);
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " folders length = " + folders.length);
    if (folders != undefined && folders.length > 0) {
        for (const folder of folders) {
            logger.info("Class :: " + classname + " :: Method :: " + methodname + " folder = " + folder);
            let directory = path.join(directoryPath, folder);
            logger.info("Class :: " + classname + " :: Method :: " + methodname + " directory = " + directory);
            if (fs.statSync(directory).isDirectory()) {
                directory = directory.split("\\").join("/");
                logger.info("Class :: " + classname + " :: Method :: " + methodname + " deleted block = " + directory);
                //await fs.rmdirSync(directory, { recursive: true, force: true });
                fs.rmdir(directory, { recursive: true }, err => {
                    isDeleted = true;
                    if (err) {
                        throw err
                    }
                    //console.log(`${directory} is deleted!`)
                })


            }
        }
    }
};