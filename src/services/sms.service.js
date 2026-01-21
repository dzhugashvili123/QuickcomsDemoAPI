var logger = require('../utils/logtrace');
const classname = 'sms.service.js'
require("dotenv").config();
const con = require('../../config');
const db = require("../utils/database");
const Sequelize = require('sequelize');
var request = require("request");
const { Op } = Sequelize;
var path = require("path");
var fs = require('fs');
const { messagequeueStatusEnum } = require('../models/whatsapp.message.status');
var commonService = require('../services/common.service');


exports.InsertSMSQueue = async (payloaddata, backupchannel) => {
	const methodname = 'InsertSMSQueue';

	logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
	logger.info("Class :: " + classname + " :: Method :: " + methodname + " payload = " + JSON.stringify(payloaddata, null, 2));

	try {
		let data = {};
		let reportdata = {};
		if (payloaddata.payload != undefined && payloaddata.payload != null) {
			data.trackingid = payloaddata.trackingid;
			data.customerid = payloaddata.customerid;
			data.phone = payloaddata.payload.phone != null ? payloaddata.payload.phone : null;
			data.content = payloaddata.payload.content;
			data.contentpath = payloaddata.payload.contentpath;
			data.contentstream = payloaddata.payload.contentstream;
			data.priority = payloaddata.priority;
			data.backupchannel = backupchannel;
			data.status = payloaddata.status;
			reportdata.trackingid = payloaddata.trackingid;
			reportdata.customerid = payloaddata.customerid;
			reportdata.smsnumber = payloaddata.payload.phone != null ? payloaddata.payload.phone : null;
			if (payloaddata.payload.attachments != undefined && payloaddata.payload.attachments.length > 0) {
				if (payloaddata.payload.attachments.length == 1)
					data.attachments = payloaddata.payload.attachments.toString().replace('[', '').replace(']', '');
				else {
					data.attachments = JSON.stringify(payloaddata.payload.attachments.toString());
				}
			}
			else {
				data.attachments = null;
			}

			//logger.info("Class :: " + classname + " :: Method :: " + methodname  +" model = "+JSON.stringify(data,null,2));
			await db.smsqueue.create(data)
				.then(async () => {
					logger.info("Class :: " + classname + " :: Method :: " + methodname + " Inserted in db");
					await InsertSMSReport(reportdata);
					// callback(true);
				})
				.catch(err => {
					logger.info("Class :: " + classname + " :: Method :: " + methodname + " Record Insert Error = " + err);
					// callback(err);
				});
		}
	} catch (error) {
		// callback(error);
	}
}
async function InsertSMSReport(reportdata) {
	const methodname = 'InsertSMSReport';
	logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
	try {
		logger.info("Class :: " + classname + " :: Method :: " + methodname + " reportdata = \n" + JSON.stringify(reportdata, null, 2));
		if (reportdata != null) {
			var condition = { where: { trackingid: `${reportdata.trackingid}`, customerid: `${reportdata.customerid}` } };
			await db.reports.findAll(condition)
				.then(async (data) => {
					if (data != undefined && data.length > 0) {
						logger.info("Class :: " + classname + " :: Method :: " + methodname + " response data from db = \n" + JSON.stringify(data, null, 2));
						let report = await reportResponseData();
						let smsdata = { sms: {} };
						smsdata.sms = JSON.parse(report).response.sms;
						reportdata.smsreport = JSON.stringify(smsdata);
						await db.reports.update(reportdata, condition);
					}
					else {
						//insert new record
						reportdata.report = {};
						reportdata.smsreport = {};
						reportdata.report = await reportResponseData();
						let smsdata = { sms: {} };
						smsdata.sms = JSON.parse(reportdata.report).response.sms;
						reportdata.smsreport = JSON.stringify(smsdata);
						await db.reports.create(reportdata);
						logger.info("Class :: " + classname + " :: Method :: " + methodname + " report data inserted into db = \n" + JSON.stringify(reportdata, null, 2));
					}
				});

		}
	}
	catch (ex) {
		logger.info("Class :: " + classname + " :: Method :: " + methodname + " Exception ERROR = " + ex);
	}
	logger.info("Class :: " + classname + " :: Method :: " + methodname + " End");
}

exports.processSMSQueue = async (next) => {
	let methodname = 'processSMSQueue';
	logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin ");
	try {
		var condition = { where: { status: `${messagequeueStatusEnum.received}` } };

		await db.smsqueue.findAll(condition)
			.then(async (data) => {
				logger.info("Class :: " + classname + " :: Method :: " + methodname + " data = \n" + JSON.stringify(data, null, 2));
				let smsqueuequeueIds = data.map(s => Number(s.id));
				logger.info("Class :: " + classname + " :: Method :: " + methodname + " smsqueuequeueIds = \n" + JSON.stringify(smsqueuequeueIds, null, 2));
				if (data != undefined && data != null) {
					//update the sms queue status 
					let updatecondition = { where: { id: { [Op.in]: smsqueuequeueIds } } };
					await db.smsqueue.update({ status: messagequeueStatusEnum.processing }, updatecondition).then((data) => {
						logger.info("Class :: " + classname + " :: Method :: " + methodname + " updatedRows");
					})
						.catch(err => {
							logger.info("Class :: " + classname + " :: Method :: " + methodname + " Error = " + err);
						});

					// send message by based on priority and created at asc
					const paginationLimit = con.SMS_MSG_BATCH_SIZE;
					const pageCount = Math.ceil(data.length / paginationLimit);
					for (let i = 1; i <= pageCount; i++) {
						//take current page with that batch items and loop it and send message
						var start = ((i - 1) * paginationLimit);
						var end = parseInt(start) + parseInt(paginationLimit);
						let batchData = data.slice(start, end);
						if (batchData != undefined && batchData.length > 0) {
							await SendSMSQueue(batchData);
						}
					}
				}
			})
			.catch(err => {
				logger.error("Class :: " + classname + " :: Method :: " + methodname + " Error = " + err);
			});
		logger.info("Class :: " + classname + " :: Method :: " + methodname + " End ");
	} catch (error) {
		logger.error("Class :: " + classname + " :: Method :: " + methodname + " Error = " + error);
	}
};
async function SendSMSQueue(batchData) {
	try {
		let methodname = 'SendSMSQueue';
		logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
		batchData.forEach(async customer => {
			logger.info("Class :: " + classname + " :: Method :: " + methodname + " mobile ::" + customer.phone);
			logger.info("Class :: " + classname + " :: Method :: " + methodname + " message ::" + customer.content);
			var msgContent;
			if (customer.content && customer.content != null && customer.content != "") {
				msgContent = customer.content;
			}
			else if (customer.contentpath && customer.contentpath != null && customer.contentpath != "" && !customer.contentpath.includes('http')) {
				msgContent = await fs.readFileSync(con.ASSETREPO + "/" + customer.contentpath, { encoding: 'utf8', flag: 'r' });
			}
			else if (customer.contentpath && customer.contentpath != null && customer.contentpath != "" && customer.contentpath.includes('http')) {
				msgContent = await commonService.getHttpPathContent(customer.contentpath);
			}
			else {
				await commonService.GetStreamContent(customer.contentstream, function (content) {
					logger.info("Class :: " + classname + " :: Method :: " + methodname + " response::" + content);
					msgContent = content;
				});
			}
			//debugger;
			logger.info("Class :: " + classname + " :: Method :: " + methodname + " msgContent ::" + msgContent);
			logger.info("Class :: " + classname + " :: Method :: " + methodname + " customer.attachments ::" + customer.attachments);
			var longurl = '';
			if (customer.attachments != undefined && customer.attachments != null && customer.attachments != "" && customer.attachments.length > 0) {
				logger.info("Class :: " + classname + " :: Method :: " + methodname + " GetShortURL  Begin ::");
				if (customer.attachments.includes('https://assets.tecra.com')) {
					msgContent = msgContent.replace('{{DocumentURL}}', customer.attachments);
					if (msgContent && msgContent != null) {
						await sendSMS(customer.id, customer.phone, msgContent, customer);
					}
				}
				else {
					await GetShortURL(customer.attachments, async function (responseData) {
						logger.info("Class :: " + classname + " :: Method :: " + methodname + " longurl::" + responseData.longurl);
						logger.info("Class :: " + classname + " :: Method :: " + methodname + " shorturl::" + responseData.shorturl);
						longurl = responseData.longurl;
						msgContent = msgContent.replace('{{DocumentURL}}', longurl);
						if (msgContent && msgContent != null) {
							await sendSMS(customer.id, customer.phone, msgContent, customer);
						}
					});
				}
			}
			else {
				if (msgContent && msgContent != null) {
					await sendSMS(customer.id, customer.phone, msgContent, customer);
				}
			}
		});
		logger.info("Class :: " + classname + " :: Method :: " + methodname + " end");
	} catch (error) {
		logger.error("Class :: " + classname + " :: Method :: " + methodname + " Error = " + error);
	}
};
async function sendSMS(Id, phone, msgContent, customer) {
	let methodname = 'sendSMS';
	logger.info("Class :: " + classname + " :: Method :: " + methodname + " begin");
	try {
		const userid = con.EQC_USERID;
		const password = con.EQC_PWD;
		const options = {
			method: 'POST',
			url: 'https://api.equence.in/pushsms',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				username: userid,
				password: password,
				to: phone,
				from: "EQUNCE",
				tmplId: con.EQC_SMS_TEMPLATE_ID,
				text: msgContent
			})
		};
		logger.info("Class :: " + classname + " :: Method :: " + methodname + " Request Body = \n" + JSON.stringify(options));
		await request(options, async function (error, res, body) {
			if (error) {
				logger.info("Class :: " + classname + " :: Method :: " + methodname + " ERROR 1:: " + error);
				let updatecondition = { where: { id: Id } };
				logger.info("Class :: " + classname + " :: Method :: " + methodname + " updatecondition:: " + updatecondition);
				await db.smsqueue.update({ status: messagequeueStatusEnum.failed }, updatecondition).then((data) => {
					logger.info("Class :: " + classname + " :: Method :: " + methodname + " updatedRows with error");
				})
			}
			else {
				let responseData = JSON.parse(body);
				// logger.info("Class :: " + classname + " :: Method :: sendSMS Response:: " + responseData);
				logger.info("Class :: " + classname + " :: Method :: " + methodname + " msgid:: " + responseData.response[0].mrid);
				let updatecondition = { where: { id: Id } };
				await db.smsqueue.update({ status: messagequeueStatusEnum.completed, messageid: responseData.response[0].mrid.trim() }, updatecondition).then(async (data) => {
					logger.info("Class :: " + classname + " :: Method :: " + methodname + " updatedRows");
					let msgId = responseData.response[0].mrid.trim();
					await updateSMSReport(customer.trackingid, customer.customerid, msgId);
				})
			}
			logger.info("Class :: " + classname + " :: Method :: " + methodname + " end");
		});
	}
	catch (ex) {
		logger.error("Class :: " + classname + " :: Method :: " + methodname + " ERROR 1:: " + ex);
	}
}

async function updateSMSReport(trackingid, customerid, messageid) {
	const methodname = 'updateSMSReport';
	logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
	logger.info("Class :: " + classname + " :: Method :: " + methodname + " trackingid = " + trackingid);
	logger.info("Class :: " + classname + " :: Method :: " + methodname + " customerid = " + customerid);
	logger.info("Class :: " + classname + " :: Method :: " + methodname + " messageid = " + messageid);
	try {
		var condition = { where: { trackingid: `${trackingid}`, customerid: `${customerid}`, emailmessageid: `${messageid}` } };
		await db.reports.findAll(condition)
			.then(async (data) => {
				if (data != undefined && data.length > 0) {
					logger.info("Class :: " + classname + " :: Method :: " + methodname + " response data from db = \n" + JSON.stringify(data, null, 2));
				}
				else {
					//update messageid
					var updatecondition = { where: { trackingid: `${trackingid}`, customerid: `${customerid}` } };
					await db.reports.update({ smsmessageid: messageid }, updatecondition).then((data) => {
						logger.info("Class :: " + classname + " :: Method :: customer report updated");
					});
				}
			});
	}
	catch (ex) {
		logger.info("Class :: " + classname + " :: Method :: " + methodname + " Exception ERROR = " + ex);
	}
	logger.info("Class :: " + classname + " :: Method :: " + methodname + " End");
}
async function reportResponseData() {
	let data = { response: {} };
	data.response = {
		email: {
			send: "",
			delivered: "",
			opened: "",
			clickscount: "",
			bounced: ""
		},
		whatsapp: {
			send: "",
			delivered: "",
			read: "",
			undelivered: "",
			statusmsg: ""
		},
		sms: {
			send: "",
			delivered: "",
			read: "",
			undelivered: "",
			statusmsg: ""
		}
	}
	return JSON.stringify(data);

}

async function GetShortURL(attachmentStream, callback) {
	let methodname = 'GetShortURL';
	logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
	try {
		//call short url api with stream data  
		let attach = JSON.parse(attachmentStream);
		logger.info("Class :: " + classname + " :: Method :: " + methodname + " attach :: " + attach);
		var filestream = fs.createReadStream(con.ASSETREPO + "/" + attach);
		var fileName = path.basename(attach.toString());
		logger.info("Class :: " + classname + " :: Method :: " + methodname + " filestream :: " + filestream);
		//logger.info("Class :: " + classname + " :: Method :: " + methodname + " fileName :: "+fileName);
		var options = {
			method: 'POST',
			url: con.SHORTURLAPI + "uploadasset/shorturl",// shorturl api url
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
