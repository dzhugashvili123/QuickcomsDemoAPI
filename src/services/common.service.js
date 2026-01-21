var path = require("path");
var fs = require('fs');
const db = require("../utils/database");
const con = require('../../config');
var logger = require('../utils/logtrace');
var request = require("request");
const moment=require('moment');
var http = require('http');
const https = require("https");
const classname = 'commom.service'


exports.GetShortURL = async (attachmentStream, callback) => {
    let methodname = 'GetShortURL';
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
    try {
        //call short url api with stream data  
        let attach=JSON.parse(attachmentStream); 
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " attach :: "+attach);  
        var filestream = fs.createReadStream(con.ASSETREPO + "/" + attach);
        var fileName=path.basename(attach.toString());
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " filestream :: "+filestream);
        //logger.info("Class :: " + classname + " :: Method :: " + methodname + " fileName :: "+fileName);
        var options = {
            method: 'POST',
            url: con.SHORTURLAPI+"uploadasset/shorturl",// shorturl api url
            formData: {
                'data': {
                    'value': filestream,
                    'options': {
                        'filename': fileName,
                        'contentType': null
                    }
                }
            }
        };
        await request(options, async function (error, response, body) {
            if (error) {
                logger.error("Class :: " + classname + " :: Method :: " + methodname + " error-1 :: " + error);
            }
            else {
                let responseData = JSON.parse(body);
                logger.info("Class :: " + classname + " :: Method :: " + methodname + " body ::" + responseData);
                callback(responseData);

            }
            logger.info("Class :: " + classname + " :: Method :: " + methodname + " end");
        });
    }
    catch (error) {
        logger.error("Class :: " + classname + " :: Method :: " + methodname + " error:: " + error);
        callback(error);
    }
}
exports.GetStreamContent = async (filestream, callback) => {
    let methodname = 'GetStreamContent';
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
    try {
        await streamToString(filestream).then(function (response) {
            callback(response);
        });
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " end");
    }
    catch (ex) {
        logger.error("Class :: " + classname + " :: Method :: " + methodname + " Error = " + ex);
    }
}
async function streamToString(stream) {
    const chunks = [];
    return new Promise((resolve, reject) => {
        stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        stream.on('error', (err) => reject(err));
        stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    })
}

exports.SavechannelsData= async (payloaddata,channelType)=>{
    const methodname = 'SavechannelsData';
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
    try {
      let data = {};
      data.trackingid = payloaddata.trackingid;
      data.customerid = payloaddata.customerid;
      data.content = payloaddata.payload;
      data.channel = channelType;
      data.status = payloaddata.status;
        
      logger.info("Class :: " + classname + " :: Method :: " + methodname + " data = " + JSON.stringify(data, null, 2));
      await db.backupchannel.create(data)
        .then(async () => {
          logger.info("Class :: " + classname + " :: Method :: " + methodname + " Inserted in db");
        })
        .catch(err => {
          logger.info("Class :: " + classname + " :: Method :: " + methodname + " Record Insert Error = " + err);
        });
    } catch (error) {
      logger.info("Class :: " + classname + " :: Method :: " + methodname + " Exception ERROR = " + error);
    }
}

exports.GetDocumentTypes=async function GetDocumentTypes() {
    const methodname = 'GetDocumentTypes';
    return new Promise(async (resolve, reject) => {
    try
    {
      logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
     let data=   await fs.readFileSync(con.APP_ROOTDIR + "src/config/documents.json", "utf8");
     //logger.info("Class :: " + classname + " :: Method :: " + methodname + " data = "+data);
     if(data!=undefined)
     {
        resolve(JSON.parse(data).documentTypes);
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " documents length = "+JSON.parse(data).documentTypes.length);
    }
     else
     resolve(undefined);
     logger.info("Class :: " + classname + " :: Method :: " + methodname + " End");
    }
    catch(ex)
    {
        console.log('exception = '+ex);
      logger.error("Class :: " + classname + " :: Method :: " + methodname + " EXCEPTION ::" + ex);
    }
});
    
  }

  exports.GetSchema=async function GetSchema(schemaName) {
    const methodname = 'GetSchema';
    return new Promise(async (resolve, reject) => {
    try
    {
      logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
     let data=   await fs.readFileSync(con.APP_ROOTDIR + "src/config/schemas/"+schemaName, "utf8");
     //logger.info("Class :: " + classname + " :: Method :: " + methodname + " data = "+data);
     if(data!=undefined)
     {
        resolve(JSON.parse(data));
    }
     else
     resolve(undefined);
     logger.info("Class :: " + classname + " :: Method :: " + methodname + " End");
    }
    catch(ex)
    {
        console.log('exception = '+ex);
      logger.error("Class :: " + classname + " :: Method :: " + methodname + " EXCEPTION ::" + ex);
    }
});
    
  }
  exports.endsWith=async function endsWith(str, endstr) {
    return new Promise(async (resolve, reject) => {
        try{
        resolve(str.slice(-Number(endstr.length))==endstr);
        }
        catch(ex)
        {
            resolve(ex.message);
        }
    });
}

exports.convertTimeStampToDateTime=async function convertTimeStampToDateTime(timestamp) {
    let result;
    return new Promise(async (resolve, reject) => {
        try{
            if(timestamp.length=="10")
            {
              result=`${moment.unix(Number(timestamp)).utc().format('YYYY-MM-DDTHH:mm:ss')}Z`;
              resolve(result);
            }
            else if(timestamp.length=="13")
            {
              timestamp=timestamp.substr(0,10);
              result=`${moment.unix(Number(timestamp)).utc().format('YYYY-MM-DDTHH:mm:ss')}Z`;
              resolve(result);
            }
          //  result=`${moment(new Date(Number(timestamp))).format('DD/MM/yyyyThh:mm:ss')}`;
          //result=`${moment(new Date(Number(timestamp))).format('yyyy-MM-DDThh:mm:ss')}Z`; 
         // result=`${moment.unix(timestamp).utc().format('YYYY-MM-DDTHH:mm:ss')}Z`;
         
           
        }
        catch(ex)
        {
            resolve(ex.message);
        }
    });
}

exports.getHttpPathContent=async function getHttpPathContent(httpPath)
{
  let methodname='getHttpPathContent';
  logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin ");
  return new Promise(async (resolve, reject) => {
  try
  {
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " url =  "+httpPath);

    var url = new URL(httpPath);
    var client = http; /* default  client */
    client = (url.protocol == "https:") ? https : client;
    await client.get(url, async (response) => {
   let data  =await streamToString(response);
       // data is now my string variable
      //  logger.info("Class :: " + classname + " :: Method :: " + methodname + " response data =  " + data);
      resolve(data);
    });
  }
  catch(ex)
  {
    logger.error("Class :: " + classname + " :: Method :: " + methodname + " ERROR = "+ex);
  }
});
}

exports.streamToString_bkp=async function streamToString(stream, cb) {
    const chunks = [];
    stream.on('data', (chunk) => {
      chunks.push(chunk.toString());
    });
    stream.on('end', () => {
      cb(chunks.join(''));
    });
  }

  
  