var logger = require('../utils/logtrace');
const classname = 'callback.service.js'
require("dotenv").config();
const con = require('../../config');
const db = require("../utils/database");
var whatsappService = require('../services/whatsapp.service');
var emailService = require('../services/email.service');
var smsService = require('../services/sms.service');
var { ProcessTemplateMessage } = require('../controllers/notify.controller');
const { messagequeueStatusEnum } = require('../models/whatsapp.message.status');
const commonService = require('../services/common.service');

exports.updateEmailReport = async (data) => {
    const methodname = 'updateEmailReport';
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
    try {
        if (data != undefined && data != null) {
            if (data.messageid != undefined && data.messageid != null && data.eventtype != undefined && data.eventtype != null) {
                switch (data.eventtype.toUpperCase()) {
                    case "DELIVERED":
                        await updateEmailDeliveryReport(data.messageid, data.timestamp);
                        break;
                    case "OPEN":
                        await updateEmailOpenReport(data.messageid, data.timestamp);
                        break;

                    case "HARD_BOUNCE":
                    case "SOFT_BOUNCE":
                    case "INVALID":
                    case "BLOCKED":
                        await updateEmailBounceReport(data.messageid, data.eventtype);
                        await insertBackchannelQueue(data.messageid, 'email');
                        break;
                }
            }
        }
    }
    catch (ex) {
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " Exception ERROR = " + ex);
    }
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " End");
}

exports.updateSMSReport = async (data) => {
    const methodname = 'updateSMSReport';
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
    try {
        if (data != undefined && data != null) {
            if (data.messageid != undefined && data.messageid != null && data.status != undefined && data.status != null) {
                switch (data.status.toUpperCase()) {
                    case "DELIVERED":
                    case "SUCCESS":
                        await updateSMSDeliveryReport(data.messageid, data.status, data.timestamp);
                        break;
                    case "READ":
                        await updateSMSReadReport(data.messageid, data.timestamp);
                        break;

                    case "UNDELIVERED":
                    case "FAIL":
                        await updateSMSUndeliveredReport(data.messageid, data.status);
                        await insertBackchannelQueue(data.messageid, 'sms');
                        break;
                }
            }
        }
    }
    catch (ex) {
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " Exception ERROR = " + ex);
    }
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " End");
}

exports.updateWhatsAppReport = async (data) => {
    const methodname = 'updateWhatsAppReport';
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
    try {
        if (data != undefined && data != null) {
            if (data.messageid != undefined && data.messageid != null && data.eventtype != undefined && data.eventtype != null) {
                switch (data.eventtype.toUpperCase()) {
                    case "SENT":
                    case "DELIVERED":
                        await updateWhatsAppDeliveryReport(data.messageid, data.status, data.timestamp);
                        break;
                    case "READ":
                        await updateWhatsAppReadReport(data.messageid, data.timestamp, data.status);
                        await sendSelfMotionAndLGICampaign(data.mobile, data.messageid);
                        break;

                    case "UNDELIVERED":
                    case "FAILED":
                        await updateWhatsAppUndeliveredReport(data.messageid, data.status);
                        await insertBackchannelQueue(data.messageid, 'whatsapp');
                        break;
                }
            }
        }
    }
    catch (ex) {
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " Exception ERROR = " + ex);
    }
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " End");
}

async function updateEmailDeliveryReport(messageid, timestamp) {
    const methodname = 'updateEmailDeliveryReport';
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
    let emailreport = {};
    try {
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " emailmessageid = " + messageid);
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " timestamp = " + timestamp);
        var condition = { where: { emailmessageid: `${messageid}` } };
        let reportdata = await db.reports.findAll(condition)
        //logger.info("Class :: " + classname + " :: Method :: " + methodname + " reportdata 1 = \n" + JSON.stringify(reportdata, null, 2));
        if (reportdata != undefined && reportdata != null && reportdata.length > 0) {
            let data = reportdata[0];
            logger.info("Class :: " + classname + " :: Method :: " + methodname + " get email report from db to update");
            //need to check email report having or not if not having perepare email report and update
            logger.info("Class :: " + classname + " :: Method :: " + methodname + " emailreport = \n" + reportdata[0].emailreport);
            emailreport = JSON.parse(reportdata[0].emailreport);
            if(emailreport!=null)
            {
            emailreport.email.send = true;
            emailreport.email.bounced = false;
            emailreport.email.delivered = await commonService.convertTimeStampToDateTime(timestamp.toString());
            //logger.info("Class :: " + classname + " :: Method :: " + methodname + " emailreport1 = \n" + JSON.stringify(emailreport));
            logger.info("Class :: " + classname + " :: Method :: " + methodname + " report = \n" + reportdata[0].report);
            let report = JSON.parse(reportdata[0].report);
            //report.response.email = emailreport;
            report.response.email.send = emailreport.email.send;
            report.response.email.delivered = emailreport.email.delivered;
            report.response.email.opened = emailreport.email.opened;
            report.response.email.clickscount = emailreport.email.clickscount;
            report.response.email.bounced = emailreport.email.bounced;
            //logger.info("Class :: " + classname + " :: Method :: " + methodname + " report1  = \n" + JSON.stringify(report));
            // logger.info("Class :: " + classname + " :: Method :: " + methodname + " final updation  = \n" + JSON.stringify({ emailreport: JSON.stringify(emailreport), report: JSON.stringify(report) }));
            await db.reports.update({ emailreport: JSON.stringify(emailreport), report: JSON.stringify(report) }, condition);
            }
            else
            {
                let emailquiuecondition = { where: { messageid: `${messageid}` } };
                await db.emailqueue.findAll(emailquiuecondition).then(async (customerdata) => {
                    if (customerdata != undefined && customerdata != null && customerdata.length > 0) {
                        let updateconditon = { where: { trackingid: customerdata[0].trackingid, customerid: customerdata[0].customerid } };
                        let emailreport = { email: {} };
                        emailreport.email.send = true;
                        emailreport.email.bounced = false;
                        emailreport.email.delivered = await commonService.convertTimeStampToDateTime(timestamp.toString());
                        // logger.info("Class :: " + classname + " :: Method :: " + methodname + " emailreport1 = \n" + JSON.stringify(emailreport));
                        await db.reports.update({ emailreport: JSON.stringify(emailreport), emailmessageid: messageid }, updateconditon);
                    }
                });
            }
        }
        else {
            logger.info("Class :: " + classname + " :: Method :: " + methodname + " reportdata not found ");
            let emailquiuecondition = { where: { messageid: `${messageid}` } };
            await db.emailqueue.findAll(emailquiuecondition).then(async (customerdata) => {
                if (customerdata != undefined && customerdata != null && customerdata.length > 0) {
                    let updateconditon = { where: { trackingid: customerdata[0].trackingid, customerid: customerdata[0].customerid } };
                    let emailreport = { email: {} };
                    emailreport.email.send = true;
                    emailreport.email.bounced = false;
                    emailreport.email.delivered = await commonService.convertTimeStampToDateTime(timestamp.toString());
                    // logger.info("Class :: " + classname + " :: Method :: " + methodname + " emailreport1 = \n" + JSON.stringify(emailreport));
                    await db.reports.update({ emailreport: JSON.stringify(emailreport), emailmessageid: messageid }, updateconditon);
                }
            });
        }
    }
    catch (ex) {
        logger.info("Class :: " + classname + " :: Method :: " + methodname + "Exception ERROR = " + ex);
    }
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " End");
}

async function updateEmailOpenReport(messageid, timestamp) {
    const methodname = 'updateEmailOpenReport';
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
    let emailreport = {};
    try {
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " emailmessageid = " + messageid);
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " timestamp = " + timestamp);
        var condition = { where: { emailmessageid: `${messageid}` } };
        let reportdata = await db.reports.findAll(condition)
        // logger.info("Class :: " + classname + " :: Method :: " + methodname + " reportdata  = \n" + JSON.stringify(reportdata, null, 2));
        if (reportdata != undefined && reportdata != null && reportdata[0] != undefined) {
            //  let data = reportdata[0];
            // logger.info("Class :: " + classname + " :: Method :: " + methodname + " emailreport = \n" + JSON.stringify(reportdata[0].emailreport));
            emailreport = JSON.parse(reportdata[0].emailreport);
            emailreport.email.opened = await commonService.convertTimeStampToDateTime(timestamp.toString());
            // logger.info("Class :: " + classname + " :: Method :: " + methodname + " emailreport1 = \n" + JSON.stringify(emailreport));
            logger.info("Class :: " + classname + " :: Method :: " + methodname + " report = \n" + reportdata[0].report);
            let report = JSON.parse(reportdata[0].report);
            if(report!=null)
            {
            // report.response.email = emailreport;
            report.response.email.send = emailreport.email.send;
            report.response.email.delivered = emailreport.email.delivered;
            report.response.email.opened = emailreport.email.opened;
            report.response.email.clickscount = emailreport.email.clickscount;
            report.response.email.bounced = emailreport.email.bounced;
            // logger.info("Class :: " + classname + " :: Method :: " + methodname + " report1  = \n" + JSON.stringify(report));
            // logger.info("Class :: " + classname + " :: Method :: " + methodname + " final updation  = \n" + JSON.stringify({ emailreport: JSON.stringify(emailreport), report: JSON.stringify(report) }));
            await db.reports.update({ emailreport: JSON.stringify(emailreport), report: JSON.stringify(report) }, condition);
            }
        }
        else {
            logger.info("Class :: " + classname + " :: Method :: " + methodname + " reportdata not found ");
            let emailquiuecondition = { where: { messageid: `${messageid}` } };
            let emaildeliveryTimet = '';
            let selectQury = "SELECT timestamp FROM emailtrackings where eventtype='DELIVERED' ORDER BY id desc LIMIT 1";
            db.sequelize.query(selectQury).then(async (data) => {
                emaildeliveryTimet = data[0];
            });
            //await db.emailtracking.findAll()
            await db.emailqueue.findAll(emailquiuecondition).then(async (customerdata) => {
                if (customerdata != undefined && customerdata != null && customerdata.length > 0) {
                    let updateconditon = { where: { trackingid: customerdata[0].trackingid, customerid: customerdata[0].customerid } };
                    let emailreport = { email: {} };
                    emailreport.email.send = true;
                    emailreport.email.bounced = false;
                    emailreport.email.delivered = await commonService.convertTimeStampToDateTime(emaildeliveryTimet);
                    emailreport.email.opened = await commonService.convertTimeStampToDateTime(timestamp.toString());
                    // logger.info("Class :: " + classname + " :: Method :: " + methodname + " emailreport1 = \n" + JSON.stringify(emailreport));
                    await db.reports.update({ emailreport: JSON.stringify(emailreport), emailmessageid: messageid }, updateconditon);
                }
            });
        }
    }
    catch (ex) {
        logger.info("Class :: " + classname + " :: Method :: " + methodname + "Exception ERROR = " + ex);
    }
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " End");
}

async function updateEmailBounceReport(messageid, error) {
    const methodname = 'updateEmailBounceReport';
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
    let emailreport = {};
    try {
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " emailmessageid = " + messageid);
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " error = " + error);
        var condition = { where: { emailmessageid: `${messageid}` } };
        let reportdata = await db.reports.findAll(condition)
        // logger.info("Class :: " + classname + " :: Method :: " + methodname + " reportdata 1 = \n" + JSON.stringify(reportdata, null, 2));
        if (reportdata != undefined && reportdata != null) {
            let data = reportdata[0];
            logger.info("Class :: " + classname + " :: Method :: " + methodname + " emailreport = \n" + reportdata[0].emailreport);
            emailreport = JSON.parse(reportdata[0].emailreport);
            if(emailreport!=null)
            {
            let bouncedata = { send: false, delivered: '', opened: '', clickscount: '0', bounced: true, error: error };
            emailreport.email = {};
            emailreport.email = bouncedata;
            //  logger.info("Class :: " + classname + " :: Method :: " + methodname + " emailreport1 = \n" + JSON.stringify(emailreport));
            logger.info("Class :: " + classname + " :: Method :: " + methodname + " report = \n" + reportdata[0].report);
            let report = JSON.parse(reportdata[0].report);
            //report.response.email = emailreport;
            report.response.email.send = emailreport.email.send;
            report.response.email.delivered = emailreport.email.delivered;
            report.response.email.opened = emailreport.email.opened;
            report.response.email.clickscount = emailreport.email.clickscount;
            report.response.email.bounced = emailreport.email.bounced;
            // logger.info("Class :: " + classname + " :: Method :: " + methodname + " report1  = \n" + JSON.stringify(report));
            // logger.info("Class :: " + classname + " :: Method :: " + methodname + " final updation  = \n" + JSON.stringify({ emailreport: JSON.stringify(emailreport), report: JSON.stringify(report) }));
            await db.reports.update({ emailreport: JSON.stringify(emailreport), report: JSON.stringify(report) }, condition);
            }
        }

        else {
            logger.info("Class :: " + classname + " :: Method :: " + methodname + " reportdata not found ");
            let emailquiuecondition = { where: { messageid: `${messageid}` } };
            await db.emailqueue.findAll(emailquiuecondition).then(async (customerdata) => {
                if (customerdata != undefined && customerdata != null && customerdata.length > 0) {
                    let updateconditon = { where: { trackingid: customerdata[0].trackingid, customerid: customerdata[0].customerid } };
                    let bouncedata = { send: false, delivered: '', opened: '', clickscount: '0', bounced: true, error: error };
                    let emailreport = { email: {} };
                    emailreport.email = bouncedata;
                    await db.reports.update({ emailreport: JSON.stringify(emailreport), emailmessageid: messageid }, updateconditon);
                }
            });
        }
    }
    catch (ex) {
        logger.info("Class :: " + classname + " :: Method :: " + methodname + "Exception ERROR = " + ex);
    }
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " End");
}


async function updateSMSDeliveryReport(messageid, status, timestamp) {
    const methodname = 'updateSMSDeliveryReport';
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
    let smsreport = {};
    try {
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " smsmessageid = " + messageid);
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " status = " + status);
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " timestamp = " + timestamp);
        var condition = { where: { smsmessageid: `${messageid}` } };
        let reportdata = await db.reports.findAll(condition)
        // logger.info("Class :: " + classname + " :: Method :: " + methodname + " reportdata 1 = \n" + JSON.stringify(reportdata, null, 2));
        if (reportdata != undefined && reportdata != null) {
            let data = reportdata[0];
            // logger.info("Class :: " + classname + " :: Method :: " + methodname + " smsreport = \n" + JSON.stringify(reportdata[0].smsreport));
            smsreport = JSON.parse(reportdata[0].smsreport);
            if(smsreport!=null)
            {
            smsreport.sms.send = true;
            smsreport.sms.statusmsg = status;
            smsreport.sms.undelivered = false;
            smsreport.sms.delivered = await commonService.convertTimeStampToDateTime(timestamp.toString());
            // logger.info("Class :: " + classname + " :: Method :: " + methodname + " smsreport 1 = \n" + JSON.stringify(smsreport));
            logger.info("Class :: " + classname + " :: Method :: " + methodname + " report = \n" + reportdata[0].report);
            let report = JSON.parse(reportdata[0].report);
            //report.response.sms = smsreport;
            report.response.sms.send = smsreport.sms.send;
            report.response.sms.delivered = smsreport.sms.delivered;
            report.response.sms.read = smsreport.sms.read;
            report.response.sms.undelivered = smsreport.sms.undelivered;
            report.response.sms.statusmsg = smsreport.sms.statusmsg;
            // logger.info("Class :: " + classname + " :: Method :: " + methodname + " report 1 = \n" + JSON.stringify(report));
            // logger.info("Class :: " + classname + " :: Method :: " + methodname + "final updation  = \n" + JSON.stringify({ smsreport: JSON.stringify(smsreport), report: JSON.stringify(report) }));
            await db.reports.update({ smsreport: JSON.stringify(smsreport), report: JSON.stringify(report) }, condition);
            }
            else
            {
                let smsqueuecondition = { where: { messageid: `${messageid}` } };
                await db.smsqueue.findAll(smsqueuecondition).then(async (customerdata) => {
                    if (customerdata != undefined && customerdata != null && customerdata.length > 0) {
                        let updateconditon = { where: { trackingid: customerdata[0].trackingid, customerid: customerdata[0].customerid } };
                        let smsreport = { sms: {} };
                        smsreport.sms.send = true;
                        smsreport.sms.delivered = await commonService.convertTimeStampToDateTime(timestamp.toString());
                        smsreport.sms.read = '';
                        smsreport.sms.undelivered = false;
                        smsreport.sms.statusmsg = status;
                        // logger.info("Class :: " + classname + " :: Method :: " + methodname + " emailreport1 = \n" + JSON.stringify(emailreport));
                        await db.reports.update({ smsreport: JSON.stringify(smsreport), smsmessageid: messageid }, updateconditon);
                    }
                }); 
            }
        }
        else {
            logger.info("Class :: " + classname + " :: Method :: " + methodname + " reportdata not found ");
            let smsqueuecondition = { where: { messageid: `${messageid}` } };
            await db.smsqueue.findAll(smsqueuecondition).then(async (customerdata) => {
                if (customerdata != undefined && customerdata != null && customerdata.length > 0) {
                    let updateconditon = { where: { trackingid: customerdata[0].trackingid, customerid: customerdata[0].customerid } };
                    let smsreport = { sms: {} };
                    smsreport.sms.send = true;
                    smsreport.sms.delivered = await commonService.convertTimeStampToDateTime(timestamp.toString());
                    smsreport.sms.read = '';
                    smsreport.sms.undelivered = false;
                    smsreport.sms.statusmsg = status;
                    // logger.info("Class :: " + classname + " :: Method :: " + methodname + " emailreport1 = \n" + JSON.stringify(emailreport));
                    await db.reports.update({ smsreport: JSON.stringify(smsreport), smsmessageid: messageid }, updateconditon);
                }
            });
        }
    }
    catch (ex) {
        logger.info("Class :: " + classname + " :: Method :: " + methodname + "Exception ERROR = " + ex);
    }
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " End");
}

async function updateSMSReadReport(messageid, timestamp) {
    const methodname = 'updateSMSReadReport';
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
    try {
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " smsmessageid = " + messageid);
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " timestamp = " + timestamp);
        var condition = { where: { smsmessageid: `${messageid}` } };
        let reportdata = await db.reports.findAll(condition)
        // logger.info("Class :: " + classname + " :: Method :: " + methodname + " reportdata 1 = \n" + JSON.stringify(reportdata, null, 2));
        if (reportdata != undefined && reportdata != null) {
            // logger.info("Class :: " + classname + " :: Method :: " + methodname + " smsreport = \n" + JSON.stringify(reportdata[0].smsreport));
            let data = reportdata[0];
            let smsreport = JSON.parse(reportdata[0].smsreport);
            if(smsreport!=null)
            {
            smsreport.sms.read = await commonService.convertTimeStampToDateTime(timestamp.toString());
            // logger.info("Class :: " + classname + " :: Method :: " + methodname + " smsreport 1 = \n" + JSON.stringify(smsreport));
            //  logger.info("Class :: " + classname + " :: Method :: " + methodname + " report = \n" + reportdata[0].report);
            let report = JSON.parse(reportdata[0].report);
            //report.response.sms = smsreport;
            report.response.sms.send = smsreport.sms.send;
            report.response.sms.delivered = smsreport.sms.delivered;
            report.response.sms.read = smsreport.sms.read;
            report.response.sms.undelivered = smsreport.sms.undelivered;
            report.response.sms.statusmsg = smsreport.sms.statusmsg;
            //  logger.info("Class :: " + classname + " :: Method :: " + methodname + " report 1 = \n" + JSON.stringify(report));
            //  logger.info("Class :: " + classname + " :: Method :: " + methodname + "final updation  = \n" + JSON.stringify({ smsreport: JSON.stringify(smsreport), report: JSON.stringify(report) }));
            await db.reports.update({ smsreport: JSON.stringify(smsreport), report: JSON.stringify(report) }, condition);
            }
        } else {
            logger.info("Class :: " + classname + " :: Method :: " + methodname + " reportdata not found ");
        }
    }
    catch (ex) {
        logger.info("Class :: " + classname + " :: Method :: " + methodname + "Exception ERROR = " + ex);
    }
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " End");
}

async function updateSMSUndeliveredReport(messageid, status) {
    const methodname = 'updateSMSUndeliveredReport';
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
    let smsreport = {};
    try {
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " smsmessageid = " + messageid);
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " status = " + status);
        var condition = { where: { smsmessageid: `${messageid}` } };
        let reportdata = await db.reports.findAll(condition)
        //  logger.info("Class :: " + classname + " :: Method :: " + methodname + " reportdata 1 = \n" + JSON.stringify(reportdata, null, 2));
        if (reportdata != undefined && reportdata != null) {
            let data = reportdata[0];
            //   logger.info("Class :: " + classname + " :: Method :: " + methodname + " smsreport = \n" + JSON.stringify(reportdata[0].smsreport));
            smsreport = JSON.parse(reportdata[0].smsreport);
            if(smsreport!=null)
            {
            smsreport.sms.send = false;
            smsreport.sms.statusmsg = status;
            smsreport.sms.undelivered = true;
            //   logger.info("Class :: " + classname + " :: Method :: " + methodname + " smsreport 1 = \n" + JSON.stringify(smsreport));
            //   logger.info("Class :: " + classname + " :: Method :: " + methodname + " report = \n" + reportdata[0].report);
            let report = JSON.parse(reportdata[0].report);
            //report.response.sms = smsreport;
            report.response.sms.send = smsreport.sms.send;
            report.response.sms.delivered = smsreport.sms.delivered;
            report.response.sms.read = smsreport.sms.read;
            report.response.sms.undelivered = smsreport.sms.undelivered;
            report.response.sms.statusmsg = smsreport.sms.statusmsg;
            //  logger.info("Class :: " + classname + " :: Method :: " + methodname + " report 1 = \n" + JSON.stringify(report));
            //  logger.info("Class :: " + classname + " :: Method :: " + methodname + "final updation  = \n" + JSON.stringify({ smsreport: JSON.stringify(smsreport), report: JSON.stringify(report) }));
            await db.reports.update({ smsreport: JSON.stringify(smsreport), report: JSON.stringify(report) }, condition);
            }
        }
        else {
            logger.info("Class :: " + classname + " :: Method :: " + methodname + " reportdata not found ");
        }
    }
    catch (ex) {
        logger.info("Class :: " + classname + " :: Method :: " + methodname + "Exception ERROR = " + ex);
    }
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " End");
}

async function updateWhatsAppDeliveryReport(messageid, status, timestamp) {
    const methodname = 'updateWhatsAppDeliveryReport';
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
    let whatsappreport = {};
    try {
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " whatsappmessageid = " + messageid);
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " status = " + status);
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " timestamp = " + timestamp);
        var condition = { where: { whatsappmessageid: `${messageid}` } };
        let reportdata = await db.reports.findAll(condition)
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " reportdata 1 = \n" + JSON.stringify(reportdata, null, 2));
        if (reportdata != undefined && reportdata != null) {
            let data = reportdata[0];
            // logger.info("Class :: " + classname + " :: Method :: " + methodname + " whatsappreport = \n" + JSON.stringify(reportdata[0].whatsappreport));
            whatsappreport = JSON.parse(reportdata[0].whatsappreport);
            if (whatsappreport != null) {
                whatsappreport.whatsapp.send = true;
                whatsappreport.whatsapp.statusmsg = status;
                whatsappreport.whatsapp.undelivered = false;
                whatsappreport.whatsapp.delivered = await commonService.convertTimeStampToDateTime(timestamp.toString());
                logger.info("Class :: " + classname + " :: Method :: " + methodname + " whatsappreport 1 = \n" + JSON.stringify(whatsappreport));
                logger.info("Class :: " + classname + " :: Method :: " + methodname + " report = \n" + reportdata[0].report);
                let report = JSON.parse(reportdata[0].report);
                // report.response.whatsapp = whatsappreport.whatsapp;
                report.response.whatsapp.send = whatsappreport.whatsapp.send;
                report.response.whatsapp.delivered = whatsappreport.whatsapp.delivered;
                report.response.whatsapp.read = whatsappreport.whatsapp.read;
                report.response.whatsapp.undelivered = whatsappreport.whatsapp.undelivered;
                report.response.whatsapp.statusmsg = whatsappreport.whatsapp.statusmsg;
                // logger.info("Class :: " + classname + " :: Method :: " + methodname + " report 1 = \n" + JSON.stringify(report));
                // logger.info("Class :: " + classname + " :: Method :: " + methodname + " final updation = \n" + JSON.stringify({ whatsappreport: JSON.stringify(whatsappreport), report: JSON.stringify(report) }));
                await db.reports.update({ whatsappreport: JSON.stringify(whatsappreport), report: JSON.stringify(report) }, condition);
            }
            else
            {
                let whatsappqueuecondition = { where: { messageid: `${messageid}` } };
                await db.whatsappqueue.findAll(whatsappqueuecondition).then(async (customerdata) => {
                    if (customerdata != undefined && customerdata != null && customerdata.length > 0) {
                        let updateconditon = { where: { trackingid: customerdata[0].trackingid, customerid: customerdata[0].customerid } };
                        let whatsappreport = { whatsapp: {} };
                        whatsappreport.whatsapp.send = true;
                        whatsappreport.whatsapp.delivered = await commonService.convertTimeStampToDateTime(timestamp.toString());
                        whatsappreport.whatsapp.read = '';
                        whatsappreport.whatsapp.undelivered = false;
                        whatsappreport.whatsapp.statusmsg = status;
                        // logger.info("Class :: " + classname + " :: Method :: " + methodname + " emailreport1 = \n" + JSON.stringify(emailreport));
                        await db.reports.update({ whatsappreport: JSON.stringify(whatsappreport), whatsappmessageid: messageid }, updateconditon);
                    }
                });
            }
        }
        else {
            logger.info("Class :: " + classname + " :: Method :: " + methodname + " reportdata not found ");
            let whatsappqueuecondition = { where: { messageid: `${messageid}` } };
            await db.whatsappqueue.findAll(whatsappqueuecondition).then(async (customerdata) => {
                if (customerdata != undefined && customerdata != null && customerdata.length > 0) {
                    let updateconditon = { where: { trackingid: customerdata[0].trackingid, customerid: customerdata[0].customerid } };
                    let whatsappreport = { whatsapp: {} };
                    whatsappreport.whatsapp.send = true;
                    whatsappreport.whatsapp.delivered = await commonService.convertTimeStampToDateTime(timestamp.toString());
                    whatsappreport.whatsapp.read = '';
                    whatsappreport.whatsapp.undelivered = false;
                    whatsappreport.whatsapp.statusmsg = status;
                    // logger.info("Class :: " + classname + " :: Method :: " + methodname + " emailreport1 = \n" + JSON.stringify(emailreport));
                    await db.reports.update({ whatsappreport: JSON.stringify(whatsappreport), whatsappmessageid: messageid }, updateconditon);
                }
            });

        }
    }
    catch (ex) {
        logger.info("Class :: " + classname + " :: Method :: " + methodname + "Exception ERROR = " + ex);
    }
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " End");
}

async function updateWhatsAppReadReport(messageid, timestamp, status) {
    const methodname = 'updateWhatsAppReadReport';
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
    let whatsappreport = {};
    try {
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " whatsappmessageid = " + messageid);
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " timestamp = " + timestamp);
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " status = " + status);
        var condition = { where: { whatsappmessageid: `${messageid}` } };
        let reportdata = await db.reports.findAll(condition)
        // logger.info("Class :: " + classname + " :: Method :: " + methodname + " reportdata 1 = \n" + JSON.stringify(reportdata, null, 2));
        if (reportdata != undefined && reportdata != null) {
            let data = reportdata[0];
            //  logger.info("Class :: " + classname + " :: Method :: " + methodname + " whatsappreport  = \n" + JSON.stringify(reportdata[0].whatsappreport));
            whatsappreport = JSON.parse(reportdata[0].whatsappreport);
            if(whatsappreport!=null)
            {
            whatsappreport.whatsapp.read = await commonService.convertTimeStampToDateTime(timestamp.toString());
            whatsappreport.whatsapp.statusmsg = status;
            // logger.info("Class :: " + classname + " :: Method :: " + methodname + " whatsappreport 1 = \n" + JSON.stringify(whatsappreport));
            logger.info("Class :: " + classname + " :: Method :: " + methodname + " report = \n" + reportdata[0].report);
            let report = JSON.parse(reportdata[0].report);
            // report.response.whatsapp = whatsappreport;
            report.response.whatsapp.send = whatsappreport.whatsapp.send;
            report.response.whatsapp.delivered = whatsappreport.whatsapp.delivered;
            report.response.whatsapp.read = whatsappreport.whatsapp.read;
            report.response.whatsapp.undelivered = whatsappreport.whatsapp.undelivered;
            report.response.whatsapp.statusmsg = whatsappreport.whatsapp.statusmsg;
            //  logger.info("Class :: " + classname + " :: Method :: " + methodname + " report 1 = \n" + JSON.stringify(report));
            //  logger.info("Class :: " + classname + " :: Method :: " + methodname + " final updation  = \n" + JSON.stringify({ whatsappreport: JSON.stringify(whatsappreport), report: JSON.stringify(report) }));
            await db.reports.update({ whatsappreport: JSON.stringify(whatsappreport), report: JSON.stringify(report) }, condition);
            }
        }
        else {
            logger.info("Class :: " + classname + " :: Method :: " + methodname + " reportdata not found ");
            let whatsappqueuecondition = { where: { messageid: `${messageid}` } };
            let whatsappdeliveryTime = '';
            let selectQury = "SELECT timestamp FROM whatsapptrackings where eventtype='DELIVERED' ORDER BY id desc LIMIT 1";
            db.sequelize.query(selectQury).then(async (data) => {
                whatsappdeliveryTime = data[0];
            });
            await db.emailtracking.findAll()
            await db.whatsappqueue.findAll(whatsappqueuecondition).then(async (customerdata) => {
                if (customerdata != undefined && customerdata != null && customerdata.length > 0) {
                    let updateconditon = { where: { trackingid: customerdata[0].trackingid, customerid: customerdata[0].customerid } };
                    let whatsappreport = { whatsapp: {} };
                    whatsappreport.whatsapp.send = true;
                    whatsappreport.whatsapp.delivered = await commonService.convertTimeStampToDateTime(whatsappdeliveryTime);
                    whatsappreport.whatsapp.read = await commonService.convertTimeStampToDateTime(timestamp.toString());
                    whatsappreport.whatsapp.undelivered = false;
                    report.response.whatsapp.statusmsg = status;
                    await db.reports.update({ whatsappreport: JSON.stringify(whatsappreport), whatsappmessageid: messageid }, updateconditon);
                }
            });
        }
    }
    catch (ex) {
        logger.info("Class :: " + classname + " :: Method :: " + methodname + "Exception ERROR = " + ex);
    }
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " End");
}

async function updateWhatsAppUndeliveredReport(messageid, status) {
    const methodname = 'updateWhatsAppUndeliveredReport';
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
    let whatsappreport = {};
    try {
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " whatsappmessageid = " + messageid);
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " status = " + status);
        var condition = { where: { whatsappmessageid: `${messageid}` } };
        let reportdata = await db.reports.findAll(condition)
        // logger.info("Class :: " + classname + " :: Method :: " + methodname + " reportdata 1 = \n" + JSON.stringify(reportdata));
        if (reportdata != undefined && reportdata != null) {
            let data = reportdata[0];
            logger.info("Class :: " + classname + " :: Method :: " + methodname + " whatsappreport  = \n" + JSON.stringify(reportdata[0].whatsappreport));
            whatsappreport = JSON.parse(reportdata[0].whatsappreport);
            if(whatsappreport!=null)
            {
            whatsappreport.whatsapp.send = false;
            whatsappreport.whatsapp.statusmsg = status;
            whatsappreport.whatsapp.undelivered = true;
            //logger.info("Class :: " + classname + " :: Method :: " + methodname + " whatsappreport 1 = \n" + JSON.stringify(whatsappreport));
            logger.info("Class :: " + classname + " :: Method :: " + methodname + " report = \n" + reportdata[0].report);
            let report = JSON.parse(reportdata[0].report);
            //report.response.whatsapp = whatsappreport;
            report.response.whatsapp.send = whatsappreport.whatsapp.send;
            report.response.whatsapp.delivered = whatsappreport.whatsapp.delivered;
            report.response.whatsapp.read = whatsappreport.whatsapp.read;
            report.response.whatsapp.undelivered = whatsappreport.whatsapp.undelivered;
            report.response.whatsapp.statusmsg = whatsappreport.whatsapp.statusmsg;

            //  logger.info("Class :: " + classname + " :: Method :: " + methodname + " report 1 = \n" + JSON.stringify(report));
            // logger.info("Class :: " + classname + " :: Method :: " + methodname + " final updation = \n" + JSON.stringify({ whatsappreport: JSON.stringify(whatsappreport), report: JSON.stringify(report) }));
            await db.reports.update({ whatsappreport: JSON.stringify(whatsappreport), report: JSON.stringify(report) }, condition);
            }
        }
        else {
            logger.info("Class :: " + classname + " :: Method :: " + methodname + " reportdata not found ");
        }
    }
    catch (ex) {
        logger.info("Class :: " + classname + " :: Method :: " + methodname + "Exception ERROR = " + ex);
    }
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " End");
}

async function insertBackchannelQueue(messageid, channelType) {
    const methodname = 'insertBackchannelQueue';
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
    try {
        let channelqueuesData;
        if (channelType.toLowerCase() == 'sms') {
            var condition = { where: { messageid: `${messageid}` } };
            channelqueuesData = await db.smsqueue.findAll(condition);
        }
        if (channelType.toLowerCase() == 'whatsapp') {
            var condition = { where: { messageid: `${messageid}` } };
            channelqueuesData = await db.whatsappqueue.findAll(condition);
        }
        if (channelType.toLowerCase() == 'email') {
            var condition = { where: { messageid: `${messageid}` } };
            channelqueuesData = await db.emailqueue.findAll(condition);
        }
        if (channelqueuesData && channelqueuesData != undefined && channelqueuesData != null) {
            logger.info("Class :: " + classname + " :: Method :: " + methodname + " channelqueuesData length ::" + channelqueuesData.length);
            for (var i = 0; i < channelqueuesData.length; i++) {
                let trackingid = channelqueuesData[i].dataValues.trackingid;
                let customerid = channelqueuesData[i].dataValues.customerid;
                let channel = channelqueuesData[i].dataValues.backupchannel;
                var condition = { where: { trackingid: trackingid, customerid: customerid, channel: channel } };
                let backupqueuesData = await db.backupchannel.findAll(condition);
                logger.info("Class :: " + classname + " :: Method :: " + methodname + " backupqueuesData length ::" + backupqueuesData.length);
                for (var j = 0; j < backupqueuesData.length; j++) {
                    console.log(backupqueuesData[j].dataValues.channel);
                    if (backupqueuesData[j].dataValues.channel.toLowerCase() == 'sms') {
                        var smspayload = { customerid: backupqueuesData[j].dataValues.customerid, priority: 1, status: messagequeueStatusEnum.received, trackingid: backupqueuesData[j].dataValues.trackingid, payload: backupqueuesData[j].dataValues.content };
                        await smsService.InsertSMSQueue(smspayload, '');
                    }
                    if (backupqueuesData[j].dataValues.channel.toLowerCase() == 'whatsapp') {
                        var whatsapppayload = { customerid: backupqueuesData[j].dataValues.customerid, priority: 1, status: messagequeueStatusEnum.received, trackingid: backupqueuesData[j].dataValues.trackingid, payload: backupqueuesData[j].dataValues.content };
                        await whatsappService.InsertWhatsAppQueue(whatsapppayload, 'sms');
                    }
                    if (backupqueuesData[j].dataValues.channel.toLowerCase() == 'email') {
                        var emailpayload = { customerid: backupqueuesData[j].dataValues.customerid, priority: 1, status: messagequeueStatusEnum.received, trackingid: backupqueuesData[j].dataValues.trackingid, payload: backupqueuesData[j].dataValues.content };
                        await emailService.InsertEmailQueue(emailpayload, 'whatsapp');
                    }
                }
            }
        }
    }
    catch (ex) {
        logger.error("Class :: " + classname + " :: Method :: " + methodname + " Exception :: " + ex);
    }
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " End");
}

async function sendSelfMotionAndLGICampaign(mobile, messageid) {
    const methodname = 'sendSelfMotionAndLGICampaign';
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
    try {
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " messageid = " + messageid);
        var condition = { where: { messageid: messageid } };
        await db.whatsappqueue.findAll(condition)
            .then(async (data) => {
                logger.info("Class :: " + classname + " :: Method :: " + methodname + " data = \n" + JSON.stringify(data, null, 2));
                let customerdatacondtion = { where: { id: data[0].customerid } };
                await db.customers.findAll(customerdatacondtion).then(async (customerdata) => {
                    logger.info("Class :: " + classname + " :: Method :: " + methodname + " customerdata = \n" + JSON.stringify(customerdata, null, 2));
                    let customer = JSON.parse(customerdata[0].metadata).customer;
                    //logger.info("Class :: " + classname + " :: Method :: " + methodname + " customer = \n"+JSON.stringify(customer,null,2));
                    let custid = customer.TXT_CUSTOMER_ID;
                    let custname = customer.TXT_CUSTOMER_NAME;
                    let companyname = con.COMPANY_NAME;
                    let supportemail = con.SUPPORT_EMAIL;
                    let supportmobile = con.SUPPORT_PHONE;
                    let paramsData = [custname, companyname, custid, supportemail, supportmobile];

                    await ProcessTemplateMessage(mobile, '6615841', 'whatsapp', '', '', '', 'marketing', paramsData, function (response) {
                        logger.info("Class :: " + classname + " :: Method :: " + methodname + " response::" + response);
                        logger.info("Class :: " + classname + " :: Method :: " + methodname + " End");
                    });
                    //customerdata[0].policydocumentpath
                    let paramsData1 = [companyname];

                    await ProcessTemplateMessage(mobile, '216570', 'whatsapp', 'IMAGE', con.LGI_IMAGE_URL, '', '', paramsData1, function (response1) {
                        logger.info("Class :: " + classname + " :: Method :: " + methodname + " response::" + response1);
                        logger.info("Class :: " + classname + " :: Method :: " + methodname + " End");
                    });

                });
            });

    }
    catch (ex) {
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " Exception :: ERROR = " + ex);
    }
}