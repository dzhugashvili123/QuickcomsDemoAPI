require("dotenv").config();
const con = require('../../config');
const logger = require("../utils/logtrace");
const classname = 'report.controller.js'
var reportService = require('../services/report.services');
const db = require("../utils/database");
const Sequelize = require('sequelize');
const { Op } = Sequelize;
const moment = require('moment');
var request = require("request");
var { generateTemporaryJwtToken } = require('./token.controller')
exports.GetReportByTrackingId = async (req, res) => {
    const methodname = 'GetReportByTrackingId';
    let trackingResponse = {};
    try {
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
        let trackingid;
        let customerid;
        if (Object.keys(req.query).length > 0) {
            for (var propName in req.query) {
                if (req.query.hasOwnProperty(propName)) {
                    if (propName.toUpperCase() == "TRACKINGID") {
                        logger.info("Class :: " + classname + " :: Method :: " + methodname + " Query param  key Name  = " + propName + " value = " + req.query[propName]);
                        trackingid = req.query[propName];
                    }
                    else if (propName.toUpperCase() == "ID") {
                        logger.info("Class :: " + classname + " :: Method :: " + methodname + " Query param key Name  = " + propName + " value = " + req.query[propName]);
                        customerid = req.query[propName];
                    }

                }
            }
            logger.info("Class :: " + classname + " :: Method :: " + methodname + " trackingid = " + trackingid);
            trackingResponse.trackingid = trackingid;
            let reportInfo = await db.sequelize.query(`select meta,"createdAt" from messagequeues where trackingid='${trackingid}'`);
            // logger.info("Class :: " + classname + " :: Method :: " + methodname + " reportInfo = " + JSON.stringify(reportInfo,null,2));
            trackingResponse.datetimestamp = `${moment(new Date()).format('yyyy-MM-DDThh:mm:ss')}Z`;
            if (reportInfo != undefined && reportInfo != null && reportInfo[0][0] != null) {
                trackingResponse.campaignName = JSON.parse(reportInfo[0][0].meta).campaignname;
                trackingResponse.scheduledTime = reportInfo[0][0].createdAt;
            }
            else {
                trackingResponse.campaignName = '';
                trackingResponse.scheduledTime = '';
            }
            trackingResponse.records = [];
            if (trackingid != undefined && trackingid != null && customerid == undefined || customerid == null || customerid == "") {
                let customersInfo = await db.sequelize.query(`select distinct customerid from reports where trackingid='${trackingid}'`);
                //logger.info("Class :: " + classname + " :: Method :: " + methodname + " customersInfo = \n" + JSON.stringify(customersInfo,null,2));
                if (customersInfo[0].length > 0) {
                    customersInfo[0].forEach(async (item, i) => {
                        //logger.info("Class :: " + classname + " :: Method :: " + methodname + " customersInfo item = \n" + JSON.stringify(item,null,2));
                        trackingResponse.records.push(await reportService.getReportBy_Tracking_And_Customer_Id(trackingid, item.customerid));
                        // trackingResponse.records = await reportService.getReportBy_Tracking_OR_Customer_Id(trackingid, undefined);
                        if (customersInfo[0].length == i + 1)
                            res.status(200).send(trackingResponse);
                    });
                }
                else
                {
                    res.status(200).send(trackingResponse);
                }

            }
            else if (trackingid != undefined && trackingid != null && customerid != undefined && customerid != null) {
                trackingResponse.records.push(await reportService.getReportBy_Tracking_And_Customer_Id(trackingid, customerid))
                res.status(200).send(trackingResponse);
            }
        }
        else {
            //get all reports
            let report = await reportService.getTrackingIdWiseCustomersReport();
            logger.info("Class :: " + classname + " :: Method :: " + methodname + "final full report = " + JSON.stringify(report, null, 2));
            res.status(200).send(report);

        }

    }
    catch (ex) {
        logger.error("Class :: " + classname + " :: Method :: " + methodname + " Final Catch ERROR = " + ex);
    }
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " End");
}


String.prototype.replaceAll = function (search, replacement) {
    var target = this;
    return target.split(search).join(replacement);
};

exports.SendCustomerReportToQuickcoms = async function SendCustomerReportToQuickcoms(report) {
    const methodname = 'SendCustomerReportToQuickcoms';
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " report =\n" + JSON.stringify(report, null, 2));
    return new Promise(async (resolve, reject) => {
        try {
            var options = {
                'method': 'POST',
                'url': `${con.QUICKCOMS_DOMAIN}api/notifications/requests/request-audit`,
                'headers': {
                    'Authorization': await generateTemporaryJwtToken(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(report)
            };
			logger.info("Class :: " + classname + " :: Method :: " + methodname + " request detatils =\n" + JSON.stringify(options, null, 2));
            request(options, function (error, response) {
                if (error) throw new Error(error);
logger.info("Class :: " + classname + " :: Method :: " + methodname + " response body =\n" + JSON.stringify(response.body, null, 2));              
			  
                resolve(response.body);
            });
            logger.info("Class :: " + classname + " :: Method :: " + methodname + " End");
        }
        catch (ex) {
            logger.error("Class :: " + classname + " :: Method :: " + methodname + " ERROR = " + ex);
        }
    });

}

exports.getQUickcomsRequest = async function getQUickcomsRequest(req, res) {

}