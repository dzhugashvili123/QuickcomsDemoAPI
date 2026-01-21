var logger = require('../utils/logtrace');
const classname = 'report.service.js'
require("dotenv").config();
const con = require('../../config');
const db = require("../utils/database");
const Sequelize = require('sequelize');
const { Op } = Sequelize;
const smsqueue = require('../models/smsqueue.model');
const smstracking = require('../models/smstracking.model');
const { data } = require('../utils/logtrace');
exports.getSMSReport = async (isReport, id) => {
    const methodname = 'getSMSReport';
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
    let query;
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " isReport = " + isReport);
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " id = " + id);
    try {
        if (isReport) {
            query = SMS_TrackingId_Report_Query(id);
            // logger.info("Class :: " + classname + " :: Method :: " + methodname + " trackingId report query = \n" + query);
        }
        else {
            query = SMS_CustomerId_Report_Query(id);
            // logger.info("Class :: " + classname + " :: Method :: " + methodname + " customerId report query = \n" + query);

        }
        const [results, metadata] = await db.sequelize.query(query);
        //logger.info("Class :: " + classname + " :: Method :: " + methodname + " sms report data = \n" + JSON.stringify(results, null, 2));
        return results;
    }
    catch (ex) {
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " ERROR = " + ex);
    }
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " End");
}

exports.getTrackingIdWiseCustomersReport = async () => {
    let methodname = 'getTrackingIdWiseCustomersReport';
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
    let data = [];
    try {
        let alltrackingIds = await db.sequelize.query(GetAllTrackingIds());
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " trackings count" + alltrackingIds.length);
        // logger.info("Class :: " + classname + " :: Method :: " + methodname + " trackings data" +JSON.stringify(alltrackingIds,null,2));
        //logger.info("Class :: " + classname + " :: Method :: " + methodname + " all trackings reports = \n" +JSON.stringify(report,null,2));
        return (await getData(alltrackingIds));
    }
    catch (ex) {
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " ERROR = " + ex);
    }

}


exports.getReportBy_Tracking_OR_Customer_Id = async (trackingid, customerid) => {
    const methodname = 'getReportBy_Tracking_OR_Customer_Id';
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " trackingid = " + trackingid);
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " customerid = " + customerid);
    let report;
    try {
        let condition;
        if ((trackingid != undefined && trackingid != null && trackingid != "") && (customerid == undefined || customerid == null || customerid == "")) {
            logger.info("Class :: " + classname + " :: Method :: " + methodname + " get by tracking id only");
            condition = { where: { trackingid: `${trackingid}` } };
            report = await db.reports.findAll(condition);
            if (report != undefined && report != null && report.length > 0) {
                logger.info("Class :: " + classname + " :: Method :: " + methodname + " End");
                return await getCustomersReport(report);
            }
        }
        else if (trackingid != undefined && trackingid != null && trackingid != "" && customerid != undefined && customerid != null && customerid != "") {
            logger.info("Class :: " + classname + " :: Method :: " + methodname + " get by customr id and tracking id");
            condition = { where: { trackingid: `${trackingid}`, customerid: `${customerid}` } };
            report = await db.reports.findAll(condition);
            logger.info("Class :: " + classname + " :: Method :: " + methodname + " End");
            return await getCustomersReport(report);
        }


    }
    catch (ex) {
        logger.error("Class :: " + classname + " :: Method :: " + methodname + " ERROR = " + ex);
    }

}

exports.getReportBy_Tracking_And_Customer_Id = async (trackingid, customerid) => {
    const methodname = 'getReportBy_Tracking_And_Customer_Id';
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " trackingid = " + trackingid);
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " customerid = " + customerid);
    let report;
    let customerdata = { customer: {}, response: {
         email: {
            send: "",
            delivered: "",
            opened: "",
            clickscount: "",
            bounced: ""
         }, 
         sms: {
            send: "",
            delivered: "",
            read: "",
            undelivered: "",
            statusmsg: ""
         }, 
         whatsapp: {
            send: "",
            delivered: "",
            read: "",
            undelivered: "",
            statusmsg: ""
         }
         } };

    try {
        let condition;
        return new Promise(async (resolve, reject) => {
            if (trackingid != undefined && trackingid != null && trackingid != "" && customerid != undefined && customerid != null && customerid != "") {
                logger.info("Class :: " + classname + " :: Method :: " + methodname + " get by customr id and tracking id");
                condition = { where: { trackingid: `${trackingid}`, customerid: `${customerid}` } };
                report = await db.reports.findAll(condition);
                if (report.length == 0)
                    resolve(customerdata);

                logger.info("Class :: " + classname + " :: Method :: " + methodname + " customer id= " + customerid);
                let custcondition = { where: { id: customerid } };
                let customerInfo = await db.customers.findAll(custcondition);
                if (customerInfo != null && customerInfo != undefined && customerInfo != "") {
                    logger.info("Class :: " + classname + " :: Method :: " + methodname + " customer table data ");
                    let customerMetaData = JSON.parse(customerInfo[0].metadata);
                    // logger.info("Class :: " + classname + " :: Method :: " + methodname + " customerMetaData= \n" +JSON.stringify(customerMetaData.customer,null,2));
                    customerdata.customer.customerId = customerid;
                    customerdata.customer.firstName = customerMetaData.customer.TXT_CUSTOMER_NAME;
                    customerdata.customer.lastName = '';
                    customerdata.customer.email = customerMetaData.customer.Email_Id;
                    customerdata.customer.phoneNumber = customerMetaData.customer.MobileNo;
                }
                else {
                    logger.info("Class :: " + classname + " :: Method :: " + methodname + " report table data ");
                    customerdata.customer.customerId = customerid;
                    customerdata.customer.firstName = '';
                    customerdata.customer.lastName = '';
                    customerdata.customer.email = '';
                    customerdata.customer.phoneNumber = '';
                }




                await report.forEach(async (customer, i, report) => {
                    if ((customer.emailaddress != undefined && customer.emailaddress != null && customer.emailaddress != "") && (customer.emailmessageid != undefined && customer.emailmessageid != null && customer.emailmessageid != "")) {
                        customerdata.customer.email = customer.emailaddress;
                        // customerdata.response.email = {};
                        customerdata.response.email = JSON.parse(customer.emailreport).email;
                    }

                    if ((customer.smsnumber != undefined && customer.smsnumber != null && customer.smsnumber != "") && (customer.smsmessageid != undefined && customer.smsmessageid != null && customer.smsmessageid != "")) {
                        customerdata.customer.phoneNumber = (customer.smsnumber != null && customer.smsnumber != undefined && customer.smsnumber != "") ? customer.smsnumber : customer.whatsappnumber;
                        //customerdata.response.sms = {};
                        customerdata.response.sms = JSON.parse(customer.smsreport).sms;
                    }

                    if ((customer.whatsappnumber != undefined && customer.whatsappnumber != null && customer.whatsappnumber != "") && (customer.whatsappmessageid != undefined && customer.whatsappmessageid != null && customer.whatsappmessageid != "")) {
                        customerdata.customer.phoneNumber = (customer.whatsappnumber != null && customer.whatsappnumber != undefined && customer.whatsappnumber != "") ? customer.whatsappnumber : customer.smsnumber;
                        //customerdata.response.whatsapp = {};
                        customerdata.response.whatsapp = JSON.parse(customer.whatsappreport).whatsapp;
                    }
                    if (report.length == i + 1) {
                        logger.info("Class :: " + classname + " :: Method :: " + methodname + " customer data = " + JSON.stringify(customerdata, null, 2));
                        logger.info("Class :: " + classname + " :: Method :: " + methodname + " End");
                        resolve(customerdata);
                    }

                });

            }
        });

    }
    catch (ex) {
        logger.error("Class :: " + classname + " :: Method :: " + methodname + " ERROR = " + ex);
    }

}

exports.getSMSReportBy_Tracking_And_Customer_Id = async (trackingid, customerid) => {
    const methodname = 'getSMSReportBy_Tracking_And_Customer_Id';
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " trackingid = " + trackingid);
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " customerid = " + customerid);
    let report;
    let customerdata = { customer: {}, response: {} };
    try {
        return new Promise(async (resolve, reject) => {
            let condition;
            if (trackingid != undefined && trackingid != null && trackingid != "" && customerid != undefined && customerid != null && customerid != "") {
                logger.info("Class :: " + classname + " :: Method :: " + methodname + " get by customr id and tracking id");
                condition = { where: { trackingid: `${trackingid}`, customerid: `${customerid}` } };
                report = await db.reports.findAll(condition);
                logger.info("Class :: " + classname + " :: Method :: " + methodname + " customer id= " + customerid);
                let custcondition = { where: { id: customerid } };
                let customerInfo = await db.customers.findAll(custcondition);
                if (customerInfo != null && customerInfo != undefined && customerInfo != "") {
                    logger.info("Class :: " + classname + " :: Method :: " + methodname + " customer table data ");
                    let customerMetaData = JSON.parse(customerInfo[0].metadata);
                    // logger.info("Class :: " + classname + " :: Method :: " + methodname + " customerMetaData= \n" +JSON.stringify(customerMetaData.customer,null,2));
                    customerdata.customer.customerId = customerid;
                    customerdata.customer.firstName = customerMetaData.customer.TXT_CUSTOMER_NAME;
                    customerdata.customer.lastName = '';
                    customerdata.customer.email = customerMetaData.customer.Email_Id;
                    customerdata.customer.phoneNumber = customerMetaData.customer.MobileNo;
                }
                else {
                    logger.info("Class :: " + classname + " :: Method :: " + methodname + " report table data ");
                    customerdata.customer.customerId = customerid;
                    customerdata.customer.firstName = '';
                    customerdata.customer.lastName = '';
                    customerdata.customer.email = '';
                    customerdata.customer.phoneNumber = '';
                }
                await report.forEach(async (customer, i, report) => {

                    if ((customer.smsnumber != undefined && customer.smsnumber != null && customer.smsnumber != "") && (customer.smsmessageid != undefined && customer.smsmessageid != null && customer.smsmessageid != "")) {
                        customerdata.customer.phoneNumber = (customer.smsnumber != null && customer.smsnumber != undefined && customer.smsnumber != "") ? customer.smsnumber : customer.whatsappnumber;
                        customerdata.response.sms = {};
                        customerdata.response.sms = JSON.parse(customer.smsreport).sms;
                    }

                    if (report.length == i + 1) {
                        logger.info("Class :: " + classname + " :: Method :: " + methodname + " customer data = " + JSON.stringify(customerdata, null, 2));
                        logger.info("Class :: " + classname + " :: Method :: " + methodname + " End");
                        resolve(customerdata);
                    }

                });

            }
        });

    }
    catch (ex) {
        logger.error("Class :: " + classname + " :: Method :: " + methodname + " ERROR = " + ex);
    }

}

exports.getEmailReportBy_Tracking_And_Customer_Id = async (trackingid, customerid) => {
    const methodname = 'getEmailReportBy_Tracking_And_Customer_Id';
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " trackingid = " + trackingid);
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " customerid = " + customerid);
    let report;
    let customerdata = { customer: {}, response: {} };
    try {
        let condition;
        return new Promise(async (resolve, reject) => {
            if (trackingid != undefined && trackingid != null && trackingid != "" && customerid != undefined && customerid != null && customerid != "") {
                logger.info("Class :: " + classname + " :: Method :: " + methodname + " get by customr id and tracking id");
                condition = { where: { trackingid: `${trackingid}`, customerid: `${customerid}` } };
                report = await db.reports.findAll(condition);
                logger.info("Class :: " + classname + " :: Method :: " + methodname + " customer id= " + customerid);
                let custcondition = { where: { id: customerid } };
                let customerInfo = await db.customers.findAll(custcondition);
                if (customerInfo != null && customerInfo != undefined && customerInfo != "") {
                    logger.info("Class :: " + classname + " :: Method :: " + methodname + " customer table data ");
                    let customerMetaData = JSON.parse(customerInfo[0].metadata);
                    // logger.info("Class :: " + classname + " :: Method :: " + methodname + " customerMetaData= \n" +JSON.stringify(customerMetaData.customer,null,2));
                    customerdata.customer.customerId = customerid;
                    customerdata.customer.firstName = customerMetaData.customer.TXT_CUSTOMER_NAME;
                    customerdata.customer.lastName = '';
                    customerdata.customer.email = customerMetaData.customer.Email_Id;
                    customerdata.customer.phoneNumber = customerMetaData.customer.MobileNo;
                }
                else {
                    logger.info("Class :: " + classname + " :: Method :: " + methodname + " report table data ");
                    customerdata.customer.customerId = customerid;
                    customerdata.customer.firstName = '';
                    customerdata.customer.lastName = '';
                    customerdata.customer.email = '';
                    customerdata.customer.phoneNumber = '';
                }
                await report.forEach(async (customer, i, report) => {
                    if ((customer.emailaddress != undefined && customer.emailaddress != null && customer.emailaddress != "") && (customer.emailmessageid != undefined && customer.emailmessageid != null && customer.emailmessageid != "")) {
                        customerdata.customer.email = customer.emailaddress;
                        customerdata.response.email = {};
                        customerdata.response.email = JSON.parse(customer.emailreport).email;
                    }
                    if (report.length == i + 1) {
                        logger.info("Class :: " + classname + " :: Method :: " + methodname + " customer data = " + JSON.stringify(customerdata, null, 2));
                        logger.info("Class :: " + classname + " :: Method :: " + methodname + " End");
                        resolve(customerdata);
                    }

                });

            }

        });
    }
    catch (ex) {
        logger.error("Class :: " + classname + " :: Method :: " + methodname + " ERROR = " + ex);
    }

}

exports.getWhatsappReportBy_Tracking_And_Customer_Id = async (trackingid, customerid) => {
    const methodname = 'getWhatsappReportBy_Tracking_And_Customer_Id';
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " trackingid = " + trackingid);
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " customerid = " + customerid);
    let report;
    let customerdata = { customer: {}, response: {} };
    try {
        let condition;
        if (trackingid != undefined && trackingid != null && trackingid != "" && customerid != undefined && customerid != null && customerid != "") {
            logger.info("Class :: " + classname + " :: Method :: " + methodname + " get by customr id and tracking id");
            condition = { where: { trackingid: `${trackingid}`, customerid: `${customerid}` } };
            report = await db.reports.findAll(condition);
            logger.info("Class :: " + classname + " :: Method :: " + methodname + " customer id= " + customerid);
            let custcondition = { where: { id: customerid } };
            let customerInfo = await db.customers.findAll(custcondition);
            if (customerInfo != null && customerInfo != undefined && customerInfo != "") {
                logger.info("Class :: " + classname + " :: Method :: " + methodname + " customer table data ");
                let customerMetaData = JSON.parse(customerInfo[0].metadata);
                // logger.info("Class :: " + classname + " :: Method :: " + methodname + " customerMetaData= \n" +JSON.stringify(customerMetaData.customer,null,2));
                customerdata.customer.customerId = customerid;
                customerdata.customer.firstName = customerMetaData.customer.TXT_CUSTOMER_NAME;
                customerdata.customer.lastName = '';
                customerdata.customer.email = customerMetaData.customer.Email_Id;
                customerdata.customer.phoneNumber = customerMetaData.customer.MobileNo;
            }
            else {
                logger.info("Class :: " + classname + " :: Method :: " + methodname + " report table data ");
                customerdata.customer.customerId = customerid;
                customerdata.customer.firstName = '';
                customerdata.customer.lastName = '';
                customerdata.customer.email = '';
                customerdata.customer.phoneNumber = '';
            }
            await report.forEach(async (customer, i, report) => {

                if ((customer.whatsappnumber != undefined && customer.whatsappnumber != null && customer.whatsappnumber != "") && (customer.whatsappmessageid != undefined && customer.whatsappmessageid != null && customer.whatsappmessageid != "")) {
                    customerdata.customer.phoneNumber = (customer.whatsappnumber != null && customer.whatsappnumber != undefined && customer.whatsappnumber != "") ? customer.whatsappnumber : customer.smsnumber;
                    customerdata.response.whatsapp = {};
                    customerdata.response.whatsapp = JSON.parse(customer.whatsappreport).whatsapp;
                }


                if (report.length == i + 1) {
                    logger.info("Class :: " + classname + " :: Method :: " + methodname + " customer data = " + JSON.stringify(customerdata, null, 2));
                    logger.info("Class :: " + classname + " :: Method :: " + methodname + " End");
                    resolve(customerdata);
                }

            });

        }


    }
    catch (ex) {
        logger.error("Class :: " + classname + " :: Method :: " + methodname + " ERROR = " + ex);
    }

}


exports.getWhatsAppReport = async (isReport, id) => {
    const methodname = 'getWhatsAppReport';
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
    let query;
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " isReport = " + isReport);
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " id = " + id);
    try {
        if (isReport) {
            query = WhatsApp_TrackingId_Report_Query(id);
            // logger.info("Class :: " + classname + " :: Method :: " + methodname + " trackingId report query = \n" + query);
        }
        else {
            query = WhatsApp_CustomerId_Report_Query(id);
            //logger.info("Class :: " + classname + " :: Method :: " + methodname + " customerId report query = \n" + query);

        }
        const [results, metadata] = await db.sequelize.query(query);
        //logger.info("Class :: " + classname + " :: Method :: " + methodname + " sms report data = \n" + JSON.stringify(results, null, 2));
        return results;
    }
    catch (ex) {
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " ERROR = " + ex);
    }
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " End");
}


async function getReportBy_Tracking_OR_Customer_ID(trackingid, customerid) {
    const methodname = 'getReportBy_Tracking_OR_Customer_ID';
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " trackingid = " + trackingid);
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " customerid = " + customerid);
    let report;
    try {
        let condition;
        if (trackingid != undefined && trackingid != null && trackingid != "" && customerid == undefined || customerid == null || customerid == "") {
            logger.info("Class :: " + classname + " :: Method :: " + methodname + " get by tracking id only");
            condition = { where: { trackingid: `${trackingid}` } };
            report = await db.reports.findAll(condition);
            if (report != undefined && report != null && report.length > 0) {
                logger.info("Class :: " + classname + " :: Method :: " + methodname + " End");
                return await getCustomersReport(report);
            }
        }
        else if (trackingid != undefined && trackingid != null && trackingid != "" && customerid != undefined && customerid != null && customerid != "") {
            logger.info("Class :: " + classname + " :: Method :: " + methodname + " get by customr id and tracking id");
            condition = { where: { trackingid: `${trackingid}`, customerid: `${customerid}` } };
            report = await db.reports.findAll(condition);
            logger.info("Class :: " + classname + " :: Method :: " + methodname + " End");
            return await getCustomersReport(report);
        }


    }
    catch (ex) {
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " ERROR = " + ex);
    }

}

async function getCustomersReport(customersReport) {
    let methodname = 'getCustomersReport';
    let data = { records: [] };

    logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
    return new Promise(async (resolve, reject) => {
        try {
            logger.info("Class :: " + classname + " :: Method :: " + methodname + " customers count = " + customersReport.length);
            await customersReport.forEach(async (customer, i, customersReport) => {
                logger.info("Class :: " + classname + " :: Method :: " + methodname + " customer id= " + customer.customerid);
                let customerdata = { customer: {}, response: {} };
                if (customer.customerid != undefined && customer.customerid != null && customer.customerid != "") {

                    let custcondition = { where: { id: customer.customerid } };
                    let customerInfo = await db.customers.findAll(custcondition);
                    if (customerInfo != null && customerInfo != undefined && customerInfo != "") {
                        logger.info("Class :: " + classname + " :: Method :: " + methodname + " customer table data ");
                        let customerMetaData = JSON.parse(customerInfo[0].metadata);
                        // logger.info("Class :: " + classname + " :: Method :: " + methodname + " customerMetaData= \n" +JSON.stringify(customerMetaData.customer,null,2));
                        customerdata.customer.customerId = customer.customerid;
                        customerdata.customer.firstName = customerMetaData.customer.TXT_CUSTOMER_NAME;
                        customerdata.customer.lastName = '';
                        customerdata.customer.email = customerMetaData.customer.Email_Id;
                        customerdata.customer.phoneNumber = customerMetaData.customer.MobileNo;
                    }
                    else {
                        logger.info("Class :: " + classname + " :: Method :: " + methodname + " report table data ");

                        customerdata.customer.customerId = customer.customerid;
                        customerdata.customer.firstName = '';
                        customerdata.customer.lastName = '';
                        customerdata.customer.email = '';
                        customerdata.customer.phoneNumber = '';

                    }
                    if ((customer.emailaddress != undefined && customer.emailaddress != null && customer.emailaddress != "") && (customer.emailmessageid != undefined && customer.emailmessageid != null && customer.emailmessageid != "")) {
                        customerdata.customer.email = customer.emailaddress;
                        customerdata.response.email = {};
                        customerdata.response.email = JSON.parse(customer.emailreport).email;
                    }
                    if ((customer.whatsappnumber != undefined && customer.whatsappnumber != null && customer.whatsappnumber != "") && (customer.whatsappmessageid != undefined && customer.whatsappmessageid != null && customer.whatsappmessageid != "")) {
                        customerdata.customer.phoneNumber = (customer.whatsappnumber != null && customer.whatsappnumber != undefined && customer.whatsappnumber != "") ? customer.whatsappnumber : customer.smsnumber;
                        customerdata.response.whatsapp = {};
                        customerdata.response.whatsapp = JSON.parse(customer.whatsappreport).whatsapp;
                    }
                    if ((customer.smsnumber != undefined && customer.smsnumber != null && customer.smsnumber != "") && (customer.smsmessageid != undefined && customer.smsmessageid != null && customer.smsmessageid != "")) {
                        customerdata.customer.phoneNumber = (customer.smsnumber != null && customer.smsnumber != undefined && customer.smsnumber != "") ? customer.smsnumber : customer.whatsappnumber;
                        customerdata.response.sms = {};
                        customerdata.response.sms = JSON.parse(customer.smsreport).sms;
                    }
                    // logger.info("Class :: " + classname + " :: Method :: " + methodname + " customerdata= \n" +JSON.stringify(customerdata,null,2));
                    data.records.push(customerdata);

                    if (data.records.length == customersReport.length) {
                        // logger.info("Class :: " + classname + " :: Method :: " + methodname + " customers length = "+data.records.length);
                        logger.info("Class :: " + classname + " :: Method :: " + methodname + " End");
                        resolve(data.records);
                    }
                }
            });
        }
        catch (ex) {
            logger.error("Class :: " + classname + " :: Method :: " + methodname + " ERROR = " + ex);
        }
    });


}


function SMS_TrackingId_Report_Query(id) {
    let query = `SELECT 
      sq.trackingid,
      sq.customerid,
      st.messageid,
      st.status,
      st.timestamp
  FROM
      smsqueues as sq
  INNER JOIN smstrackings st
      ON sq.messageid = st.messageid
      where sq.trackingid='${id}'
  ORDER BY sq.customerid asc`;
    return query;
}
function SMS_CustomerId_Report_Query(id) {
    let query = `SELECT 
      sq.trackingid,
      sq.customerid,
      st.messageid,
      st.status,
      st.timestamp
  FROM
      smsqueues as sq
  INNER JOIN smstrackings st
      ON sq.messageid = st.messageid
      where sq.customerid='${id}'
  ORDER BY sq.customerid asc`;
    return query;
}

function GetAllTrackingIds(id) {
    let query = `SELECT 
     distinct trackingid
      
  FROM
      reports 
  ORDER BY trackingid asc`;
    return query;
}

function getReportByTrackingId_Query(id) {
    let query = `SELECT 
      eq.trackingid,
      eq.customerid,
      et.messageid,
      et.eventtype,
      et.timestamp
  FROM
  emailqueues as eq
  INNER JOIN emailtrackings et
      ON eq.messageid = et.messageid
      where eq.trackingid='${id}'
  ORDER BY eq.customerid asc`;
    return query;
}

function EMAIL_CustomerId_Report_Query(id) {
    let query = `SELECT 
    eq.trackingid,
    eq.customerid,
    et.messageid,
    et.eventtype,
    et.timestamp
FROM
emailqueues as eq
INNER JOIN emailtrackings et
    ON eq.messageid = et.messageid
    where eq.customerid='${id}'
ORDER BY eq.customerid asc`;
    return query;
}

function WhatsApp_TrackingId_Report_Query(id) {
    let query = `SELECT 
      wq.trackingid,
      wq.customerid,
      wt.messageid,
      wt.eventtype,
      wt.timestamp
  FROM
  whatsappqueues as wq
  INNER JOIN whatsapptrackings wt
      ON wq.messageid = wt.messageid
      where wq.trackingid='${id}'
  ORDER BY wq.customerid asc`;
    return query;
}

function WhatsApp_CustomerId_Report_Query(id) {
    let query = `SELECT 
      wq.trackingid,
      wq.customerid,
      wt.messageid,
      wt.eventtype,
      wt.timestamp
  FROM
  whatsappqueues as wq
  INNER JOIN whatsapptrackings wt
      ON wq.messageid = wt.messageid
      where wq.customerid='${id}'
  ORDER BY wq.customerid asc`;
    return query;
}

function getCustomerIdByTrackedId_Query(id) {
    let query = `SELECT 
    mq.trackingid,
    sq.customerid as smscustomers,
    eq.customerid as emailcustomers,
    wq.customerid as whatsappcustomers
FROM
messagequeues as mq
INNER JOIN smsqueues as sq   ON mq.trackingid = sq.trackingid 
INNER JOIN emailqueues as eq ON mq.trackingid = eq.trackingid 
INNER JOIN whatsappqueues as wq ON mq.trackingid = wq.trackingid
  
    where mq.trackingid='${id}'`
    return query;
}

async function getData(alltrackingIds) {
    let methodname = 'getData';
    let data = [];
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
    try {
        alltrackingIds[0].forEach(async (data, i) => {
            let trackingdata = { trackingid: '', data: [] };
            logger.info("Class :: " + classname + " :: Method :: " + methodname + " trackingid data = " + data.trackingid);
            trackingdata.trackingid = await getData1(data.trackingid);
            trackingdata.data = await getReportBy_Tracking_OR_Customer_ID(data.trackingid, undefined);
            data[i] = trackingdata;
        });
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " End");
        return data;
    }
    catch (ex) {

    }
}

async function getData1(alltrackingIds) {
    let methodname = 'getData1';
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
    try {
        alltrackingIds[0].forEach((data, i) => {
            logger.info("Class :: " + classname + " :: Method :: " + methodname + " End");
            return data.trackingid;
        });
    }
    catch (ex) {

    }
}

  //https://sebhastian.com/sequelize-join/