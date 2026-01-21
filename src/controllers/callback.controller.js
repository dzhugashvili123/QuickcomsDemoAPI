require("dotenv").config();
const con = require('../../config');
const classname = 'callback.controller.js'
const logger = require("../utils/logtrace");
var whatsappService = require('../services/whatsapp.service');
var callBackService = require('../services/callback.service');
const db = require("../utils/database");
const Sequelize = require('sequelize');
const { Op } = Sequelize;
var reportService = require('../services/report.services');
const moment = require('moment');
var { SendCustomerReportToQuickcoms } = require('./report.controller')

exports.whatsapp = async (req, res, next) => {
  const methodname = 'whatsapp';
  logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
  try {
    // save db call
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " response = " + req.body.response);
    var responsedata = JSON.parse(req.body.response);
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " responsedata = " + JSON.stringify(responsedata));
    let data = {};
    data.messageid = responsedata[0].externalId.trim();
    data.eventtype = responsedata[0].eventType;
    data.timestamp = responsedata[0].eventTs;
    data.status = responsedata[0].cause;
    data.mobile = responsedata[0].destAddr;

    data.response = JSON.stringify(responsedata);

    await db.whatsappptracking.create(data)
      .then(() => {
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " Inserted in db");
      })
      .catch(err => {
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " Record Insert Error = " + err);
      });
    await callBackService.updateWhatsAppReport(data);
    let reportcondition = { where: { whatsappmessageid: `${data.messageid}` } };
    await db.reports.findAll(reportcondition).then(async (customerdata) => {
      if (customerdata[0].trackingid != undefined && customerdata[0].trackingid != null && customerdata[0].trackingid != "") {
        let trackingResponse = {};
        trackingResponse.trackingId = customerdata[0].trackingid;
        let reportInfo = await db.sequelize.query(`select meta,"createdAt" from messagequeues where trackingid='${trackingResponse.trackingId}'`);
       // logger.info("Class :: " + classname + " :: Method :: " + methodname + " reportInfo = " + JSON.stringify(reportInfo, null, 2));
       if(reportInfo!=undefined && reportInfo!=null && reportInfo!=""){ 
       trackingResponse.datetimestamp = `${moment(new Date()).format('yyyy-MM-DDTHH:mm:ss')}Z`;
        trackingResponse.campaignName = JSON.parse(reportInfo[0][0].meta).campaignname;
        trackingResponse.scheduledTime = reportInfo[0][0].createdAt;//`${moment(new Date(reportInfo[0][0].createdAt)).format('yyyy-MM-DDTHH:mm:ss')}Z`;//reportInfo[0][0].createdAt;
        trackingResponse.records=[];
        trackingResponse.records.push(await reportService.getReportBy_Tracking_And_Customer_Id(trackingResponse.trackingId, customerdata[0].customerid));
        let response = await SendCustomerReportToQuickcoms(trackingResponse);
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " response from quickcoms = " + JSON.stringify(response));
      }
      else {
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " report not identified");
      }
      }
    });
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " END");
    res.status(200).send("Success");
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " END");
  } catch (error) {
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " ERROR = " + error);
    next(error);
  }
};

exports.sms = async (req, res, next) => {
  const methodname = 'sms';
  logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
  try {
    let data = {};
    data.messageid = req.query['externalId'].trim();
    data.timestamp = req.query['deliveredTS'];
    data.status = req.query['status'].trim();

    await db.smstracking.create(data)
      .then(async () => {
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " Inserted in db");
      })
      .catch(err => {
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " Record Insert Error = " + err);
      });
    await callBackService.updateSMSReport(data);
    let reportcondition = { where: { smsmessageid: `${data.messageid}` } };
    await db.reports.findAll(reportcondition).then(async (customerdata) => {
      if (customerdata[0].trackingid != undefined && customerdata[0].trackingid != null && customerdata[0].trackingid != "") {
        let trackingResponse = {};
        trackingResponse.trackingId  = customerdata[0].trackingid;
        let reportInfo = await db.sequelize.query(`select meta,"createdAt" from messagequeues where trackingid='${trackingResponse.trackingId}'`);
        // logger.info("Class :: " + classname + " :: Method :: " + methodname + " reportInfo = " + JSON.stringify(reportInfo,null,2));
        if (reportInfo != undefined && reportInfo != null && reportInfo != "") {
          trackingResponse.datetimestamp = `${moment(new Date()).format('yyyy-MM-DDTHH:mm:ss')}Z`;
          trackingResponse.campaignName = JSON.parse(reportInfo[0][0].meta).campaignname;
          trackingResponse.scheduledTime =reportInfo[0][0].createdAt;//`${moment(new Date(reportInfo[0][0].createdAt)).format('yyyy-MM-DDTHH:mm:ss')}Z`; //reportInfo[0][0].createdAt;
          trackingResponse.records=[];
          trackingResponse.records.push(await reportService.getReportBy_Tracking_And_Customer_Id(trackingResponse.trackingId, customerdata[0].customerid));
          let response = await SendCustomerReportToQuickcoms(trackingResponse);
          logger.info("Class :: " + classname + " :: Method :: " + methodname + " response from quickcoms = " + JSON.stringify(response));
        }
        else {
          logger.info("Class :: " + classname + " :: Method :: " + methodname + " report not identified");
        }
      }
    });
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " END");
    res.status(200).send("Success");
  } catch (error) {
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " ERROR = " + error);
    next(error);
  }
};

exports.email = async (req, res, next) => {
  const methodname = 'email';
  logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
  try {
    // save db call
    logger.info("Class :: " + classname + " :: Method :: " + methodname + "  Response ::\n" + req.body.response);
    var responsedata = JSON.parse(req.body.response);
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " Event Response ::\n" + JSON.stringify(responsedata, null, 2));
    let data = {};
    data.messageid = responsedata[0].campaignid.trim();
    data.eventtype = responsedata[0].event.trim();
    data.timestamp = responsedata[0].timestamp;
    data.response = JSON.stringify(responsedata);

    await db.emailtracking.create(data)
      .then(() => {
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " Inserted in db");
      })
      .catch(err => {
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " Record Insert Error = " + err);
      });
    await callBackService.updateEmailReport(data);
    let reportcondition = { where: { emailmessageid: `${data.messageid}` } };
    await db.reports.findAll(reportcondition).then(async (customerdata) => {
      
      if (customerdata[0]!=undefined && customerdata[0].trackingid != undefined && customerdata[0].trackingid != null && customerdata[0].trackingid != "") {
        let trackingResponse = {};
        trackingResponse.trackingId  = customerdata[0].trackingid;
        let reportInfo = await db.sequelize.query(`select meta,"createdAt" from messagequeues where trackingid='${trackingResponse.trackingId}'`);
        if (reportInfo != undefined && reportInfo != null && reportInfo != "") {
          // logger.info("Class :: " + classname + " :: Method :: " + methodname + " reportInfo = " + JSON.stringify(reportInfo,null,2));
          trackingResponse.datetimestamp = `${moment(new Date()).format('yyyy-MM-DDTHH:mm:ss')}Z`;
          trackingResponse.campaignName = JSON.parse(reportInfo[0][0].meta).campaignname;
          trackingResponse.scheduledTime =reportInfo[0][0].createdAt;//`${moment(new Date(reportInfo[0][0].createdAt)).format('yyyy-MM-DDTHH:mm:ss')}Z`; //reportInfo[0][0].createdAt;
          trackingResponse.records=[];
          trackingResponse.records.push(await reportService.getReportBy_Tracking_And_Customer_Id(trackingResponse.trackingId, customerdata[0].customerid));
          let response = await SendCustomerReportToQuickcoms(trackingResponse);
          logger.info("Class :: " + classname + " :: Method :: " + methodname + " response from quickcoms = " + JSON.stringify(response));
        }
      }
      else {
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " report not identified");
      }
    });

    //
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " END");
    res.status(200).send("Success");
  } catch (error) {
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " ERROR = " + error);
    next(error);
  }
};