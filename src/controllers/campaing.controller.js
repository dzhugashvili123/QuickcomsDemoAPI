require("dotenv").config();
const con = require('../../config');
var path = require("path");
var fs = require('fs');
const classname = 'campaign.controller.js'
const logger = require("../utils/logtrace");
var request = require("request");
const formidable = require('formidable');
const CSVToJSON = require('csvtojson');
const fastcsv = require("fast-csv");
const xlsx = require('xlsx');
var XLSX = require("xlsx");
const converter = require('json-2-csv');
const appRoot = require('app-root-path');
const db = require("../utils/database");
let customerModel = require('../models/poc.model');
let commonSerivce = require('../services/common.service')
const moment = require('moment');
const crypto = require("crypto");
var messages = require('../controllers/message.controller');
const { messagequeueStatusEnum } = require('../models/whatsapp.message.status');
var url = require("url");
var reportService = require('../services/report.services');
var Blob = require('buffer');


exports.GetCampaigns = async (req, res) => {
    const methodname = 'GetCampaigns';
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
    try {
        let selectQury="SELECT id, campaignname, status, fields, \"candidateName\", \"messageTemplate\", overlays FROM campaigns ORDER BY id desc LIMIT 5";
        db.sequelize.query(selectQury).then(async (data) => {
            res.send(data[0]);
        });
    }
    catch (ex) {
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " ERROR = " + ex);
    }
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " End");
}
exports.GetCampaignReportByTrackingId = async (req, res) => {
    const methodname = 'GetCampaignReportByTrackingId';
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
    let trackingid;
    let filedetails;
    let filename;
    let records;
    let workbook;
    let sheetNames;
    const dirPath = `${con.ASSETREPO}${con.DOWNLOAD}`;
    let campaignDir;
    try {
        // var parsedUrl = url.parse(req.url, true); // true to get query as object
        // var queryAsObject = parsedUrl.query;
        // logger.info("Class :: " + classname + " :: Method :: " + methodname + " Received Query params from url = \n" + JSON.stringify(queryAsObject, null, 2));



        trackingid = req.query['trackingid'].trim();
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " trackingid = " + trackingid);
        let filenamecondition = { where: { fileid: trackingid } };
        db.campaign.findAll(filenamecondition).then(async (data) => {
            // logger.info("Class :: " + classname + " :: Method :: " + methodname + " data = \n" + JSON.stringify(data, null, 2));
            filedetails = data[0];
            filename = filedetails.filename;
            if (trackingid != undefined && trackingid != null && trackingid != "") {
                logger.info("Class :: " + classname + " :: Method :: " + methodname + " get by tracking id only");
                let repotcondition = { where: { trackingid: `${trackingid}` } };
                db.reports.findAll(repotcondition).then(async (report)=>{
               logger.info("Class :: " + classname + " :: Method :: " + methodname + " trackingid = " + trackingid);
             // let report=    [{"id":"3","trackingid":"dc3f7cbd347f9ced36d0149dbb36fd1d","customerid":"1676559180101","emailaddress":"rajasekhar.mannava@gmail.com","emailmessageid":"4840626230153789445","emailreport":"{\"email\":{\"send\":true,\"delivered\":\"20/01/1970T03:42:39\",\"opened\":\"\",\"clickscount\":\"\",\"bounced\":false}}","smsnumber":"9652013370","smsmessageid":null,"smsreport":"{\"sms\":{\"send\":\"\",\"delivered\":\"\",\"read\":\"\",\"undelivered\":\"\",\"statusmsg\":\"\"}}","whatsappnumber":"9652013370","whatsappmessageid":null,"whatsappreport":"{\"whatsapp\":{\"send\":\"\",\"delivered\":\"\",\"read\":\"\",\"undelivered\":\"\",\"statusmsg\":\"\"}}","report":"{\"response\":{\"email\":{\"send\":true,\"delivered\":\"20/01/1970T03:42:39\",\"opened\":\"\",\"clickscount\":\"\",\"bounced\":false},\"whatsapp\":{\"send\":\"\",\"delivered\":\"\",\"read\":\"\",\"undelivered\":\"\",\"statusmsg\":\"\"},\"sms\":{\"send\":\"\",\"delivered\":\"\",\"read\":\"\",\"undelivered\":\"\",\"statusmsg\":\"\"}}}","status":null,"timestamp":null,"createdAt":"2023-02-16T14:53:30.574Z","updatedAt":"2023-02-16T15:24:24.959Z"}];
               logger.info("Class :: " + classname + " :: Method :: " + methodname + " report = \n" + JSON.stringify(report));
               if (report != undefined && report != null && report.length > 0) {

                    let campaignreportresult = await getCampaignsReport(report, filename);
                  
                    // let campaignreportresult = [


                    //     {
                    //         "FileName": filename,
                    //         "Channel": "email",
                    //         "To": "allabakash@tecra.com",
                    //         "Sent": true,
                    //         "Delivered": "19700120T092940Z",
                    //         "Opened": "19700120T092941Z",
                    //         "Bounce": false,
                    //         "ResponseMessage": ""
                    //     },
                    //     {
                    //         "FileName": filename,
                    //         "Channel": "whatsapp",
                    //         "To": "9502440065",
                    //         "Sent": true,
                    //         "Delivered": "20230207T143803Z",
                    //         "Opened": "20230207T154942Z",
                    //         "Bounce": false,
                    //         "ResponseMessage": ""
                    //     },
                    //     {
                    //         "FileName": filename,
                    //         "Channel": "sms",
                    //         "To": "9502440065",
                    //         "Sent": true,
                    //         "Delivered": "15/02/2023T05:33:14",
                    //         "Opened": "",
                    //         "Bounce": false,
                    //         "ResponseMessage": ""
                    //     }

                    // ];

                    if (!fs.existsSync(dirPath)) {
                        fs.mkdirSync(dirPath);
                    }
                    campaignDir = dirPath + 'Reports/'
                    if (!fs.existsSync(campaignDir)) {
                        fs.mkdirSync(campaignDir);
                    }
                    const report_fileName = `${path.parse(filename).name}_${moment(new Date()).format('DDMMyyyyHHmmss')}${path.extname(filename)}`;

                    // headers for the excel sheet
                    let header = ["FileName", "Channel", "To", "Sent", "Delivered", "Opened", "Bounce", "ResponseMessage"];
                    // create workbook
                    let wb = xlsx.utils.book_new()
                    //  write into excel sheet.

                    // let ws = xlsx.utils.json_to_sheet(campaignreportresult, { header: header });
                    let ws = xlsx.utils.json_to_sheet(campaignreportresult);
                    xlsx.utils.book_append_sheet(wb, ws, `Report`)

                    // file name of the excel sheet
                    let exportFileName = campaignDir + report_fileName;
                    // create excel sheet
                    xlsx.writeFile(wb, exportFileName);
                    res.send({downloadurl:exportFileName.replace(con.ASSETREPO,con.HTTP_ASSETREPO)});
                }
                // else
                // {
                //     res.send({downloadurl:undefined});
                // }
            });
            }
        });
    }
    catch (ex) {
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " ERROR = " + ex);
    }
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " End");
}


exports.UploadCampaignData = async (req, res) => {
    const methodname = 'UploadCampaignData';
    let attachment;
    let filePath;
    let fileName;
    let workbook;
    let sheetNames;
    let UploadCampaignDir;
    const dirPath = `${con.ASSETREPO}/${con.UPLOAD}`;
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
    let campaingfile = {};
    let sendMessageRequest = { filename: '', trackingid: '', campaignname: '', records: [] };
    try {
        var contype = req.headers['content-type'];
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " Request Content Type = " + contype);
        if (!fs.existsSync(dirPath))
            fs.mkdirSync(dirPath);

        UploadCampaignDir = `${dirPath}Campaigns/`;
        if (!fs.existsSync(UploadCampaignDir))
            fs.mkdirSync(UploadCampaignDir);

        if (contype.toLowerCase().includes('form-data')) {
            logger.info("Class :: " + classname + " :: Method :: " + methodname + " file upload in form data ");
            const form = formidable({ multiples: true });
            form.parse(req, async (err, fields, files) => {

                attachment = files.attachment;
                var attachementFileName = attachment.originalFilename;
                fileName = attachementFileName;
                workbook = await XLSX.readFile(attachment.filepath);
                sheetNames = await workbook.SheetNames;

                let sheet1xlsxdata = await XLSX.utils.sheet_to_json(workbook.Sheets[sheetNames[0]], { defval: "" });
                logger.info("Class :: " + classname + " :: Method :: " + methodname + " uploaded campaign data  = \n" + JSON.stringify(sheet1xlsxdata, null, 2));

                
                sheet1xlsxdata.forEach((row) => {
                    if (row.Channel.toLowerCase() == "sms") {
                        let smsdata = {
                            "custom_record_id": "",
                            "recordidentifier": {
                                "id": "",
                                "name": ""
                            },
                            "messagecontent": {
        
                            },
                            "priority": 1
                        };

                        smsdata.messagecontent.sms = {};
                        smsdata.messagecontent.sms = {
                            "phone": row.To,
                            "content": row.Message,
                            "contentpath": "",
                            "contentstream": "",
                            "attachments": undefined
                        }
                        let guid = crypto.randomBytes(16).toString("hex");
                        smsdata.custom_record_id = guid;//new Date().getTime();
                        sendMessageRequest.records.push(smsdata);
                    }
                    else if (row.Channel.toLowerCase() == "whatsapp") {
                        let whatsappdata = {
                            "custom_record_id": "",
                            "recordidentifier": {
                                "id": "",
                                "name": ""
                            },
                            "messagecontent": {
        
                            },
                            "priority": 1
                        };
                        whatsappdata.messagecontent.whatsapp = {};
                        whatsappdata.messagecontent.whatsapp = {
                            "phone": row.To,
                            "content": row.Message,
                            "contentpath": "",
                            "contentstream": "",
                            "attachments":undefined
                        }
                        let guid = crypto.randomBytes(16).toString("hex");
                        whatsappdata.custom_record_id = guid;//new Date().getTime();
                        sendMessageRequest.records.push(whatsappdata);
                        
                    }
                    else if (row.Channel.toLowerCase() == "email") {
                        let emaildata = {
                            "custom_record_id": "",
                            "recordidentifier": {
                                "id": "",
                                "name": ""
                            },
                            "messagecontent": {
        
                            },
                            "priority": 1
                        };

                        emaildata.messagecontent.email = {};
                        emaildata.messagecontent.email = {
                            "to": row.To,
                            "subject": "CCM MTL Notification",
                            "content": row.Message,
                            "attachments": "",
                            "contentpath":"",
                            "contentstream":"",
                        }
                        let guid = crypto.randomBytes(16).toString("hex");
                        emaildata.custom_record_id =guid;// new Date().getTime();
                        sendMessageRequest.records.push(emaildata);
                      
                    }
                });
               // logger.info("Class :: " + classname + " :: Method :: " + methodname + " send message data = \n " + JSON.stringify(sendMessageRequest, null, 2));
                if (sendMessageRequest != undefined) {
                    await messages.SaveDataIntoMessageQueue({}, async function (trackingid) {
                        logger.info("Class :: " + classname + " :: Method :: " + methodname + " trackingId = " + trackingid);
                        if (trackingid != undefined && trackingid != null && trackingid != "") {
                            campaingfile.filename = fileName;

                            campaingfile.receivedddatetime = `${moment(new Date()).format('DD/MM/yyyy HH:mm:ss')}`;
                            campaingfile.status = 'Received';
                            campaingfile.fileid = trackingid;

                            sendMessageRequest.filename = fileName;
                            sendMessageRequest.trackingid = trackingid;
                            sendMessageRequest.campaignname = 'Campaign Report';
                            let updatecondition = { where: { trackingid: trackingid } };
                            logger.info("Class :: " + classname + " :: Method :: " + methodname + " request posted in message queue ");
                            let msgqueuedata = { meta: JSON.stringify(sendMessageRequest), timestamp: new Date().toISOString(), status: messagequeueStatusEnum.received };
                            db.messagequeue.update(msgqueuedata, updatecondition);

                            campaingfile.recordscount = sendMessageRequest.records.length;
                            campaingfile.processeddatetime = `${moment(new Date()).format('DD/MM/yyyy HH:mm:ss')}`;
                            db.campaign.create(campaingfile).then(() => {
                                // db.campaign.findAll().then(async (data) => {
                                //     res.send(data);
                                // });
                                let selectQury="SELECT id, campaignname, status, fields, \"candidateName\", \"messageTemplate\", overlays FROM campaigns ORDER BY id desc LIMIT 5";
                                db.sequelize.query(selectQury).then(async (data) => {
                                    res.send(data[0]);
                                });
                            });
                        }
                    });
                }
            });
        }


    }
    catch (ex) {

    }
}

async function getCampaignsReport(customersReport, filename) {
    let methodname = 'getCampaignsReport';
    let data = { records: [] };

    logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
    try {
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " customers count = " + customersReport.length);
        await customersReport.forEach((customer, i, customersReport) => {
            logger.info("Class :: " + classname + " :: Method :: " + methodname + " customer id= " + customer.customerid);
            logger.info("Class :: " + classname + " :: Method :: " + methodname + " filename = " + filename);
            let customerdata = {};
            if (customer.customerid != undefined && customer.customerid != null && customer.customerid != "") {
               
                if (customer.emailmessageid != undefined && customer.emailmessageid != null && customer.emailmessageid != "") {
                    let emailresponse = JSON.parse(customer.emailreport).email;
                    customerdata.customerid = customer.customerid;
                    customerdata.Filename = filename;
                    customerdata.Channel = "email";
                    customerdata.To = customer.emailaddress;
                    customerdata.Sent = emailresponse.send;
                    customerdata.Delivered = emailresponse.delivered;
                    customerdata.Opened = emailresponse.opened;
                    customerdata.Bounce = emailresponse.bounced;
                    customerdata.ResponseMessage = "";
                    data.records.push(customerdata);
                    customerdata = {};
                }
                if (customer.whatsappmessageid != undefined && customer.whatsappmessageid != null && customer.whatsappmessageid != "") {

                    let whatsappresponse = JSON.parse(customer.whatsappreport).whatsapp;
                    customerdata.customerid = customer.customerid;
                    customerdata.Filename = filename;
                    customerdata.Channel = "whatsapp";
                    customerdata.To = customer.whatsappnumber;
                    customerdata.Sent = whatsappresponse.send;
                    customerdata.Delivered = whatsappresponse.delivered;
                    customerdata.Opened = whatsappresponse.read;
                    customerdata.Bounce = whatsappresponse.undelivered;
                    customerdata.ResponseMessage = whatsappresponse.statusmsg;
                    data.records.push(customerdata);
                    customerdata = {};
                }
                if (customer.smsmessageid != undefined && customer.smsmessageid != null && customer.smsmessageid != "") {

                    let smsresponse = JSON.parse(customer.smsreport).sms;
                    customerdata.customerid = customer.customerid;
                    customerdata.Filename = filename;
                    customerdata.Channel = "sms";
                    customerdata.To = customer.smsnumber;
                    customerdata.Sent = smsresponse.send;
                    customerdata.Delivered = smsresponse.delivered;
                    customerdata.Opened = smsresponse.read;
                    customerdata.Bounce = smsresponse.undelivered;
                    customerdata.ResponseMessage = smsresponse.statusmsg;
                    data.records.push(customerdata);
                    customerdata = {};
                }

            }
        });
    }
    catch (ex) {
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " ERROR = " + ex);
    }
    //logger.info("Class :: " + classname + " :: Method :: " + methodname + " Records = \n"+JSON.stringify(data.records,null,2));
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " End");
    return data.records;

}


//https://stackoverflow.com/questions/71569905/json-to-excel-in-javascript
//https://bobbyhadz.com/blog/javascript-referenceerror-blob-is-not-defined#:~:text=ReferenceError%3A%20Blob%20is%20not%20defined%20in%20JavaScript%20%23,it%2C%20e.g.%20import%20%7B%20Blob%20%7D%20from%20%27buffer%27%3B.
//https://stackoverflow.com/questions/39825069/node-xlsx-for-write-excel-file
//https://buildcoding.com/useful-npm-libraries-to-create-excel-files-in-node-js/#3_xlsx