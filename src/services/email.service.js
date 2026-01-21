var logger = require('../utils/logtrace');
const classname = 'email.service.js'
require("dotenv").config();
const con = require('../../config');
const db = require("../utils/database");
const { messagequeueStatusEnum } = require('../models/whatsapp.message.status');
const Sequelize = require('sequelize');
const { Op } = Sequelize;
var request = require("request");
var path = require("path");
var fs = require('fs');
var http = require('http');
const https = require("https");
const crypto = require("crypto");
var commonService = require('../services/common.service');

exports.InsertEmailQueue = async (payloaddata, backupchannel) => {
	const methodname = 'InsertEmailQueue';

	logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
	// logger.info("Class :: " + classname + " :: Method :: " + methodname  +" payload = "+JSON.stringify(payloaddata,null,2));

	try {
		//debugger;
		let data = {};
		let reportdata = {};
		let policydocumenturl = '';
		data.trackingid = payloaddata.trackingid;
		data.customerid = payloaddata.customerid;
		data.toemail = payloaddata.payload.to != null ? payloaddata.payload.to : null;
		data.subject = payloaddata.payload.subject;
		data.content = payloaddata.payload.content;
		data.contentpath = payloaddata.payload.contentpath;
		data.contentstream = payloaddata.payload.contentstream;
		data.priority = payloaddata.priority;
		data.backupchannel = backupchannel;
		data.status = payloaddata.status;
		if (payloaddata.payload && payloaddata.payload != undefined && payloaddata.payload.attachments != null && payloaddata.payload.attachments != undefined) {
			if (payloaddata.payload && payloaddata.payload.attachments.length == 1) {
				data.attachments = payloaddata.payload.attachments.toString().replace('[', '').replace(']', '');
				policydocumenturl = payloaddata.payload.attachments.toString();
			}
			else {
				policydocumenturl = payloaddata.payload.attachments.toString();
				data.attachments = JSON.stringify(payloaddata.payload.attachments.toString());
			}
		}
		reportdata.trackingid = payloaddata.trackingid;
		reportdata.customerid = payloaddata.customerid;
		reportdata.emailaddress = payloaddata.payload.to != null ? payloaddata.payload.to : null;
		//logger.info("Class :: " + classname + " :: Method :: " + methodname  +" model = "+JSON.stringify(data,null,2));
		await db.emailqueue.create(data)
			.then(async () => {
				logger.info("Class :: " + classname + " :: Method :: " + methodname + " Inserted in db");
				//insert record for report 
				await InsertEmailReport(reportdata);
				let updateQuery = `update customers set policydocumenthttppath='${policydocumenturl}',policydocumentpath='${policydocumenturl.replace(con.SHORTURL_HTTPPATH, con.SHORTURL_ASSETPATh)}', status='Processed' where id= '${data.customerid}'`;
				await db.sequelize.query(updateQuery);
				//  callback(true);
			})
			.catch(err => {
				logger.error("Class :: " + classname + " :: Method :: " + methodname + " Record Insert Error = " + err);
				// callback(err);
			});
	} catch (error) {
		logger.error("Class :: " + classname + " :: Method :: " + methodname + " ERROr :: " + error);
		// callback(error);
	}
};

exports.processEMailQueue = async (next) => {
	let methodname = 'processEMailQueue';
	logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin ");
	try {

		var condition = { where: { status: `${messagequeueStatusEnum.received}` } };
		await db.emailqueue.findAll(condition)
			.then(async (data) => {
				logger.info("Class :: " + classname + " :: Method :: " + methodname + " data = \n" + JSON.stringify(data, null, 2));
				let emailqueuequeueIds = data.map(s => Number(s.id));
				logger.info("Class :: " + classname + " :: Method :: " + methodname + " emailqueuequeueIds = \n" + JSON.stringify(emailqueuequeueIds, null, 2));
				if (data != undefined && data != null) {
					//update the sms queue status 
					let updatecondition = { where: { id: { [Op.in]: emailqueuequeueIds } } };
					await db.emailqueue.update({ status: messagequeueStatusEnum.processing }, updatecondition).then((data) => {
						logger.info("Class :: " + classname + " :: Method :: " + methodname + " updatedRows");
					})
						.catch(err => {
							logger.info("Class :: " + classname + " :: Method :: " + methodname + " Error = " + err);
						});

					// send message by based on priority and created at asc
					const paginationLimit = con.EMAIL_MSG_BATCH_SIZE;
					const pageCount = Math.ceil(data.length / paginationLimit);
					for (let i = 1; i <= pageCount; i++) {
						//take current page with that batch items and loop it and send message
						var start = ((i - 1) * paginationLimit);
						var end = parseInt(start) + parseInt(paginationLimit);
						let batchData = data.slice(start, end);
						logger.info("Class :: " + classname + " :: Method :: " + methodname + " data = \n" + JSON.stringify(batchData, null, 2));
						if (batchData != undefined && batchData.length > 0) {
							await sendEmailUPLOAD_CAMPAIGN(batchData);
						}
					}
				}
			})
			.catch(err => {
				logger.info("Class :: " + classname + " :: Method :: " + methodname + " Error = " + err);
				// next(err);
			});
		logger.info("Class :: " + classname + " :: Method :: " + methodname + " End ");
	} catch (error) {
		//next(error);
	}
};

async function sendEmailCAMPAIGN(batchData) {

	let methodname = "sendEmailCAMPAIGN";
	logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
	try {
		batchData.forEach(async customer => {

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
			logger.info("Class :: " + classname + " :: Method :: " + methodname + " msgContent :: " + msgContent);
			var formObj = {
				'method': 'EMS_POST_CAMPAIGN', 'userid': con.GS_EMAIL_USERID, 'password': con.GS_EMAIL_PWD, 'v': '1.1', 'fromEmailId': con.FROM_EMAIL,
				'content_type': 'text/html', 'name': con.DISPLAY_NAME, 'subject': customer.subject, 'recipients': customer.toemail,
				'content': msgContent, 'replyToEmailID': con.FROM_EMAIL
			};
			if (customer.attachments != undefined && customer.attachments != null && customer.attachments != "") {
				logger.info("Class :: " + classname + " :: Method :: " + methodname + " customer.attachments :: " + customer.attachments);
				var attachments = customer.attachments.split(","); //Array.from(attachmentpaths)
				logger.info("Class :: " + classname + " :: Method :: " + methodname + " attachments.length:" + attachments.length);

				logger.info("Class ::" + classname + " :: Method :: " + methodname + " attachments path:" + attachments[0]);

				let attachmentlocalpath = con.ASSETREPO + "/" + attachments[0];
				if (attachments[0].includes('https://assets.tecra.com')) {
					attachmentlocalpath = attachments[0].replace(con.SHORTURL_HTTPPATH, con.SHORTURL_ASSETPATh)
					//https://assets.tecra.com/assets/files/2023/2/18/a0a65dbb-cd1f-912a-0f57-1fd2b5de914b.pdf
					//D:\Websites\QuickComs\PolicyMarkettingPOC\Assets.tecra.shortURL\AssetRepo
				}
				var attachment = {
					'value': fs.createReadStream(attachmentlocalpath),
					'options': {
						'filename': path.basename(attachments[0]),
						'contentType': 'application/pdf'
					}
				}
				var i = 0;
				let key = 'attachment' + (i + 1);
				formObj[key] = attachment;
			}
			//}
			//}

			logger.info("Class :: " + classname + " :: Method ::  formObj = " + JSON.stringify(formObj, null, 2));
			var options = {
				method: 'POST',
				url: 'https://api.eqnc.in/apggw/v1/email/send',
				formData: formObj
			};

			request(options, async function (error, response, body) {
				if (error) {
					logger.info("Class :: " + classname + " :: Method :: " + methodname + " ERROR 1:: " + error);
					let updatecondition = { where: { id: customer.id } };
					logger.info("Class :: " + classname + " :: Method :: " + methodname + " updatecondition:: " + updatecondition);
					await db.emailqueue.update({ status: messagequeueStatusEnum.failed }, updatecondition).then((data) => {
						logger.info("Class :: " + classname + " :: Method :: " + methodname + " updatedRows");
					})
				}
				else {
					var responseData = body.split('|');
					logger.info("Class :: " + classname + " :: Method :: " + methodname + " responseData:: " + responseData[1]);
					let updatecondition = { where: { id: customer.id } };
					logger.info("Class :: " + classname + " :: Method :: " + methodname + " updatecondition:: " + updatecondition);
					await db.emailqueue.update({ status: messagequeueStatusEnum.completed, messageid: responseData[1].trim() }, updatecondition).then(async (data) => {
						logger.info("Class :: " + classname + " :: Method :: " + methodname + " updatedRows");
						logger.info("Class :: " + classname + " :: Method :: " + methodname + " Response:: " + body);
						let messageid = responseData[1];
						await updateEmailReport(customer.trackingid, customer.customerid, messageid);
					});
				}
			});

		});

		logger.info("Class :: email.service :: Method :: " + methodname + " end");
	} catch (error) {
	}
}
async function sendEmailUPLOAD_CAMPAIGN(batchData) {

	let methodname = "sendEmailUPLOAD_CAMPAIGN";
	logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
	try {
		batchData.forEach(async customer => {

			var formObj = {
				'userid': con.ENC_USERID, 'password': con.ENC_PWD, 'v': '1.1', 'fromEmailId': con.FROM_EMAIL,
				'content_type': 'text/html', 'name': con.DISPLAY_NAME, 'subject': customer.subject, 'recipients': customer.toemail,
				'replyToEmailID': con.FROM_EMAIL
			};
			let msgContent;
			if (customer.content && customer.content != null && customer.content != "") {
				msgContent = customer.content;
				let key = 'content';
				formObj[key] = msgContent;
				let Methodkey = 'method';
				formObj[Methodkey] = "EMS_POST_CAMPAIGN";
			}
			else if (customer.contentpath && customer.contentpath != null && customer.contentpath != "" && customer.contentpath.includes('http')) {
				msgContent = await commonService.getHttpPathContent(customer.contentpath);
				logger.info("Class :: " + classname + " :: Method :: " + methodname + " msgContent ::" + msgContent);
				try {
					const guid = crypto.randomBytes(8).toString("hex");
					await fs.writeFileSync('./assets/Uploads/' + guid + '.html', msgContent, "utf-8");
					var upload = {
						'value': fs.createReadStream('./assets/Uploads/' + guid + '.html'),
						'options': {
							'filename': path.basename('./assets/Uploads/' + guid + '.html'),
							'contentType': null
						}
					}
					let key = 'newsletter_file';
					formObj[key] = upload;
					let Methodkey = 'method';
					formObj[Methodkey] = "EMS_UPLOAD_CAMPAIGN";
				} catch (ex) {
					logger.error("Class :: email.service :: Method :: " + methodname + " Exception -1 ::" + ex);
				}
			}
			if (customer.attachments != undefined && customer.attachments != null && customer.attachments != "" && customer.attachments != '""') {
				logger.info("Class :: " + classname + " :: Method :: " + methodname + " customer.attachments :: " + customer.attachments);
				var attachments = customer.attachments.split(","); //Array.from(attachmentpaths)
				logger.info("Class :: " + classname + " :: Method :: " + methodname + " attachments.length:" + attachments.length);

				logger.info("Class ::" + classname + " :: Method :: " + methodname + " attachments path:" + attachments[0]);

				let attachmentlocalpath = con.ASSETREPO + "/" + attachments[0];
				if (attachments[0].includes('https://assets.tecra.com')) {
					attachmentlocalpath = attachments[0].replace(con.SHORTURL_HTTPPATH, con.SHORTURL_ASSETPATh);
					logger.info("Class ::" + classname + " :: Method :: " + methodname + " attachments attachmentlocalpath:" + attachmentlocalpath);
				}
				logger.info("Class ::" + classname + " :: Method :: " + methodname + " attachments attachmentlocalpath:" + attachmentlocalpath);
				var attachment = {
					'value': fs.createReadStream(attachmentlocalpath),
					'options': {
						'filename': path.basename(attachmentlocalpath),
						'contentType': 'application/pdf'
					}
				}
				var i = 0;
				let key = 'attachment' + (i + 1);
				formObj[key] = attachment;
			}

			logger.info("Class :: " + classname + " :: Method ::  formObj = " + JSON.stringify(formObj, null, 2));
			var options = {
				method: 'POST',
				url: 'https://api.eqnc.in/apggw/v1/email/send',
				formData: formObj
			};

			request(options, async function (error, response, body) {
				if (error) {
					logger.info("Class :: " + classname + " :: Method :: " + methodname + " ERROR 1:: " + error);
					let updatecondition = { where: { id: customer.id } };
					logger.info("Class :: " + classname + " :: Method :: " + methodname + " updatecondition:: " + updatecondition);
					await db.emailqueue.update({ status: messagequeueStatusEnum.failed }, updatecondition).then((data) => {
						logger.info("Class :: " + classname + " :: Method :: " + methodname + " updatedRows");
					})
				}
				else {
					var responseData = body.split('|');
					logger.info("Class :: " + classname + " :: Method :: " + methodname + " responseData:: " + responseData[1]);
					let updatecondition = { where: { id: customer.id } };
					logger.info("Class :: " + classname + " :: Method :: " + methodname + " updatecondition:: " + updatecondition);
					await db.emailqueue.update({ status: messagequeueStatusEnum.completed, messageid: responseData[1].trim() }, updatecondition).then(async (data) => {
						logger.info("Class :: " + classname + " :: Method :: " + methodname + " updatedRows");
						logger.info("Class :: " + classname + " :: Method :: " + methodname + " Response:: " + body);
						let messageid = responseData[1];
						await updateEmailReport(customer.trackingid, customer.customerid, messageid);
					});
				}
			});

		});

		logger.info("Class :: email.service :: Method :: " + methodname + " end");
	} catch (ex) {
		logger.error("Class :: email.service :: Method :: " + methodname + " Exception ::" + ex);
	}
}


async function InsertEmailReport(reportdata) {
	const methodname = 'InsertEmailReport';
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
						let emaildata = { email: {} };
						emaildata.email = JSON.parse(report).response.email;
						reportdata.emailreport = JSON.stringify(emaildata);
						await db.reports.update(reportdata, condition);
					}
					else {
						//insert new record
						reportdata.report = {};
						reportdata.emailreport = {};
						reportdata.report = await reportResponseData();
						let emaildata = { email: {} };
						emaildata.email = JSON.parse(reportdata.report).response.email;
						reportdata.emailreport = JSON.stringify(emaildata);
						await db.reports.create(reportdata);
						logger.info("Class :: " + classname + " :: Method :: " + methodname + " report data inserted into db = \n" + JSON.stringify(reportdata, null, 2));
					}
				});

		}
	}
	catch (ex) {
		logger.error("Class :: " + classname + " :: Method :: " + methodname + " Exception ERROR = " + ex);
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


async function updateEmailReport(trackingid, customerid, messageid) {
	const methodname = 'updateEmailReport';
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
					await db.reports.update({ emailmessageid: messageid.trim() }, updatecondition).then((data) => {
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