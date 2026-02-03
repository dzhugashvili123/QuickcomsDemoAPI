var logger = require('../utils/logtrace');
const classname = 'whatsapp.service.js'
require("dotenv").config();
const con = require('../../config');
const { default: axios } = require('axios');
const { WhatsappMessageStatusEnum, messagequeueStatusEnum } = require('../models/whatsapp.message.status');
var commonService = require('../services/common.service');
const db = require("../utils/database");
const Sequelize = require('sequelize');
var request = require("request");
const { Op } = Sequelize;
var path = require("path");
var fs = require('fs');
var util = require('util');
var readFile = util.promisify(fs.readFile);
const { log } = require('console');


exports.InsertWhatsAppQueue = async (payloaddata, backupchannel) => {
	const methodname = 'InsertWhatsAppQueue';
	logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
	logger.info("Class :: " + classname + " :: Method :: " + methodname + " payloaddata = \n" + JSON.stringify(payloaddata, null, 2));
	try {
		let data = {};
		let reportdata = {};
		if (payloaddata.payload != undefined && payloaddata.payload != null) {
			data.trackingid = payloaddata.trackingid;
			data.customerid = payloaddata.customerid;
			data.phone = payloaddata.payload.phone != null ? payloaddata.payload.phone : null;
			data.content = payloaddata.payload.variables;
			data.contentpath = payloaddata.payload.contentpath;
			data.contentstream = payloaddata.payload.contentstream;
			data.priority = payloaddata.priority;
			data.backupchannel = backupchannel;
			data.status = payloaddata.status;
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
			reportdata.trackingid = payloaddata.trackingid;
			reportdata.customerid = payloaddata.customerid;
			reportdata.whatsappnumber = payloaddata.payload.phone != null ? payloaddata.payload.phone : null;
			logger.info("Class :: " + classname + " :: Method :: " + methodname + " whatsapp data = " + JSON.stringify(data, null, 2));
			logger.info("Class :: " + classname + " :: Method :: " + methodname + " reportdata = " + JSON.stringify(reportdata, null, 2));
			await db.whatsappqueue.create(data)
				.then(async () => {
					logger.info("Class :: " + classname + " :: Method :: " + methodname + " Inserted in db");
					await InsertWhatsAppReport(reportdata);
					//callback(true);
				})
				.catch(err => {
					logger.info("Class :: " + classname + " :: Method :: " + methodname + " Record Insert Error = " + err);
					// callback(err);
				});
		}
	} catch (error) {
		logger.info("Class :: " + classname + " :: Method :: " + methodname + " Exception ERROR = " + error);
		// callback(error);
	}
};
async function InsertWhatsAppReport(reportdata) {
	const methodname = 'InsertWhatsAppReport';
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
						let whatsappdata = { whatsapp: {} };
						whatsappdata.whatsapp = JSON.parse(report).response.whatsapp;
						reportdata.whatsappreport = JSON.stringify(whatsappdata);
						await db.reports.update(reportdata, condition);
					}
					else {
						//insert new record
						reportdata.report = {};
						reportdata.whatsappreport = {};
						reportdata.report = await reportResponseData();
						let whatsappdata = { whatsapp: {} };
						whatsappdata.whatsapp = JSON.parse(reportdata.report).response.whatsapp;
						reportdata.whatsappreport = JSON.stringify(whatsappdata);
						logger.info("Class :: " + classname + " :: Method :: " + methodname + " whatsapp report data  = \n" + reportdata.whatsappreport);
						logger.info("Class :: " + classname + " :: Method :: " + methodname + " report data  = \n" + reportdata);
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

exports.processWhatsAppQueue = async (next) => {
	let methodname = 'processWhatsAppQueue';
	logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin ");
	try {
		var condition = { where: { status: `${messagequeueStatusEnum.received}` } };
		await db.whatsappqueue.findAll(condition)
			.then(async (data) => {
				logger.info("Class :: " + classname + " :: Method :: " + methodname + " data = \n" + JSON.stringify(data, null, 2));
				let whatsappqueueIds = data.map(s => Number(s.id));
				logger.info("Class :: " + classname + " :: Method :: " + methodname + " whatsappqueueIds = \n" + JSON.stringify(whatsappqueueIds, null, 2));
				if (data != undefined && data != null) {
					//update the whatsapp queue status 
					let updatecondition = { where: { id: { [Op.in]: whatsappqueueIds } } };
					await db.whatsappqueue.update({ status: messagequeueStatusEnum.processing }, updatecondition).then((data) => {
						logger.info("Class :: " + classname + " :: Method :: " + methodname + " updatedRows");
					})
						.catch(err => {
							logger.info("Class :: " + classname + " :: Method :: " + methodname + " Error = " + err);
						});

					// send message by based on priority and created at asc
					const paginationLimit = con.WHATSAPP_MSG_BATCH_SIZE;
					const pageCount = Math.ceil(data.length / paginationLimit);
					for (let i = 1; i <= pageCount; i++) {
						//take current page with that batch items and loop it and send message
						var start = ((i - 1) * paginationLimit);
						var end = parseInt(start) + parseInt(paginationLimit);
						let batchData = data.slice(start, end);
						if (batchData != undefined && batchData.length > 0) {
							sendWhatsAPPQueue(batchData);
						}
					}
				}
			})
			.catch(err => {
				logger.info("Class :: " + classname + " :: Method :: " + methodname + " Error = " + err);
			});
		logger.info("Class :: " + classname + " :: Method :: " + methodname + " End ");
	} catch (error) {
		logger.info("Class :: " + classname + " :: Method :: " + methodname + " Error = " + error);
	}
};
async function sendWhatsAPPQueue(batchData) {
	const methodname = 'sendWhatsAPPQueue';
	logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
	logger.info("Class :: " + classname + " :: Method :: " + methodname + " batchData = \n" + JSON.stringify(batchData, null, 2));
	try {
		batchData.forEach(async customer => {
			logger.info("Class :: " + classname + " :: Method :: " + methodname + " mobile ::" + customer.phone);
			logger.info("Class :: " + classname + " :: Method :: " + methodname + " message ::" + customer.content);
			logger.info("Class :: " + classname + " :: Method :: " + methodname + " customer.contentpath ::" + customer.contentpath);
			logger.info("Class :: " + classname + " :: Method :: " + methodname + " customer.contentstream ::" + customer.contentstream);
			logger.info("Class :: " + classname + " :: Method :: " + methodname + " customer.attachments ::" + customer.attachments);
			var msgContent;
			if (customer.content && customer.content != null && customer.content != "") {
				msgContent = customer.content;
			}
			else if (customer.contentpath && customer.contentpath != null && customer.contentpath != "" && !customer.contentpath.includes('http')) {
				logger.info("Class :: " + classname + " :: Method :: " + methodname + " contentpath is file path" + customer.contentpath);
				msgContent = await fs.readFileSync(con.ASSETREPO + "/" + customer.contentpath, { encoding: 'utf8', flag: 'r' });
				logger.info("Class :: " + classname + " :: Method :: " + methodname + " else if msgContent from file ::" + msgContent);
				logger.info("Class :: " + classname + " :: Method :: " + methodname + " msgContent length ::" + msgContent.length);
			}
			else if (customer.contentpath && customer.contentpath != null && customer.contentpath != "" && customer.contentpath.includes('http')) {
				logger.info("Class :: " + classname + " :: Method :: " + methodname + " contentpath is http url");
				msgContent = await commonService.getHttpPathContent(customer.contentpath);
				logger.info("Class :: " + classname + " :: Method :: " + methodname + " msgContent from http url ::" + msgContent);
			}
			else {
				await commonService.GetStreamContent(customer.contentstream, function (content) {
					logger.info("Class :: " + classname + " :: Method :: " + methodname + " response::" + content);
					msgContent = content;
				});
			}
			logger.info("Class :: " + classname + " :: Method :: " + methodname + " msgContent ::" + msgContent);
			var longurl = '';
			var shorturl = '';
			logger.info("Class :: " + classname + " :: Method :: " + methodname + " con.WHATSAPP_DOCUMENT_ISSUE ::" + con.WHATSAPP_DOCUMENT_ISSUE);
			if (con.WHATSAPP_DOCUMENT_ISSUE == 'true') {
				logger.info("Class :: " + classname + " :: Method :: " + methodname + " con.WHATSAPP_DOCUMENT_ISSUE is true");
				if (customer.attachments != undefined && customer.attachments != null && customer.attachments != "" && customer.attachments.length > 0) {
					logger.info("Class :: " + classname + " :: Method :: " + methodname + " customer.attachments length > 0");
					if (customer.attachments.includes('https://assets.tecra.com')) {
						await GetShortURLByLongURL(customer.attachments, async function (responseData) {
							msgContent = msgContent.replace('{{DocumentURL}}', responseData.shorturl);
							logger.info("Class :: " + classname + " :: Method :: " + methodname + " after replace url msgContent ::" + msgContent);
							if (msgContent && msgContent != null) {
								await sendwhatsappMessageWithoutAttachment(customer.id, customer.phone, msgContent, customer);
							}
						});
					}
				}
				else {
					logger.info("Class :: " + classname + " :: Method :: " + methodname + "  only send  Approved Content ");
					if (msgContent && msgContent != null) {
						logger.info("Class :: " + classname + " :: Method :: " + methodname + " else msgContent ::" + msgContent);
						await sendwhatsappMessageWithoutAttachment(customer.id, customer.phone, msgContent, customer);
					}
				}
			}
			else {
				if (customer.attachments != undefined && customer.attachments != null && customer.attachments != "" && customer.attachments.length > 0) {
					if (customer.attachments.includes('https://assets.tecra.com')) {
						if (msgContent && msgContent != null) {
							//await sendwhatsappMessageWithoutAttachment(customer.id, customer.phone, msgContent, customer);
							let msgType = 'DOCUMENT';
							let mediaUrl = customer.attachments;
							let fileName = path.basename(customer.attachments);
							logger.info("Class :: " + classname + " :: Method :: " + methodname + "  fileName::" + fileName);
							sendwhatsappMessageWithAttachment(customer.id, customer.phone, msgContent, msgType, mediaUrl, fileName, customer)
						}
					}
					else {
						await GetShortURL(customer.attachments, async function (responseData) {
							logger.info("Class :: " + classname + " :: Method :: " + methodname + " longurl::" + responseData.longurl);
							logger.info("Class :: " + classname + " :: Method :: " + methodname + " shorturl::" + responseData.shorturl);
							longurl = responseData.longurl;
							shorturl = responseData.shorturl;
							msgContent = msgContent.replace('{{DocumentURL}}', shorturl);
							logger.info("Class :: " + classname + " :: Method :: " + methodname + " after variable replace msgContent::" + msgContent);
							if (msgContent && msgContent != null) {
								//await sendwhatsappMessageWithoutAttachment(customer.id, customer.phone, msgContent, customer);
								let msgType = 'DOCUMENT';
								let mediaUrl = longurl;
								let fileName = path.basename(longurl);
								logger.info("Class :: " + classname + " :: Method :: " + methodname + "  fileName::" + fileName);
								sendwhatsappMessageWithAttachment(customer.id, customer.phone, msgContent, msgType, mediaUrl, fileName, customer)
							}
						});
					}

				}
				else {
					logger.info("Class :: " + classname + " :: Method :: " + methodname + "  only send  Approved Content ");
					if (msgContent && msgContent != null) {
						await sendwhatsappMessageWithoutAttachment(customer.id, customer.phone, msgContent, customer);

					}
				}
			}

		})
	} catch (error) {
		logger.error("Class :: " + classname + " :: Method :: " + methodname + " error:: " + error);
	}
}
async function sendwhatsappMessageWithoutAttachment(id, phone, content, customer) {
	const methodname = 'sendwhatsappMessageWithoutAttachment';
	logger.info("Class :: " + classname + " :: Method :: sendwhatsappMessageWithoutAttachment Begin");
	const template = await fs.readFileSync(con.APP_ROOTDIR + "Templates/01k24psh414erb4eyt32j4e37r.txt", { encoding: 'utf8', flag: 'r' });
	logger.info("Class :: " + classname + " :: Method :: sendwhatsappMessageWithoutAttachment template::" + template);
	let values = await extractValuesFromTemplate(template, content);
	logger.info("Class :: " + classname + " :: Method :: sendwhatsappMessageWithoutAttachment :: values extracted from template:: " + JSON.stringify(values, null, 2));
	logger.info("Class :: " + classname + " :: Method :: " + methodname + " phone::" + phone);
	logger.info("Class :: " + classname + " :: Method :: " + methodname + " content::" + content);
	const data = await ReadNamesJson(values[0]);
	logger.info("Class :: " + classname + " :: Method :: " + methodname + " data::" + JSON.stringify(data, null, 2));
	let pdffile;
	const videoResUrl = await callVideoGenerationApi(data);

	if (data.selectLanguage === 'H') {
		pdffile = data.pdfFile; // Hindi
	} else {
		pdffile = data.pdfFile; // English
	}
	logger.info("Class :: " + classname + " :: Method :: " + methodname + " videoResUrl::" + videoResUrl);
	logger.info("Class :: " + classname + " :: Method :: " + methodname + " pdffile::" + pdffile);

	logger.info("Class :: " + classname + " :: Method :: " + methodname + " values before mapping:: " + JSON.stringify(values, null, 2));
	values = values.map(v => {
		if (v.includes('{{DocumentURL}}')) {
			return v.replace('{{DocumentURL}}', videoResUrl);
		} else if (v.includes('{{PDFURL}}')) {
			return v.replace('{{PDFURL}}', pdffile);
		} else {
			return v;
		}
	});

	logger.info("Class :: " + classname + " :: Method :: " + methodname + " values after replacing videoResUrl:: " + JSON.stringify(values, null, 2));

	const userid = con.EQC_WHATSAPP_USERID;
	const password = con.EQC_WHATSAPP_PWD;
	const url = 'https://channels.equence.in/unifiedservice?';

	const payload = {
		userName: userid,
		password: password,
		channelId: "WAP",
		whatsAppEntity: {
			whatsAppSourceAddress: con.EQC_WHATSAPP_SOURCE_ADDRESS,
			whatsAppDestinationAddress: phone,
			templateId: con.EQC_WHATSAPP_TEMPLATE_ID,
			templateName: "test_council",
			variables: [
				data.fullName,
			],
			category: "Marketing",
			dynamicUrl: videoResUrl,
			mediaAttachment: {
				type: "IMAGE",
				url: "https://videos.laadshyd.com/vf/static/sumanth/nvsumanth.jpeg"
			},
		}
	};

	console.log(" payload is =========== :: " + JSON.stringify(payload));
	var options = {
		method: 'POST',
		url: url,
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(payload),
		timeout: 120000 // timeout set to 120 seconds
	};
	logger.info("Class :: " + classname + " :: Method :: " + methodname + " options :: " + JSON.stringify(options));
	await request(options, async function (error, _, body) {
		if (error) {
			logger.error("Class :: " + classname + " :: Method :: " + methodname + " error-1 :: " + error);
		} else {
			let responseData = JSON.parse(body);
			logger.info("Class :: " + classname + " :: Method :: " + methodname + " msgid:: " + responseData.response[0].mrid);
			let updatecondition = { where: { id: id } };
			await db.whatsappqueue.update({ status: messagequeueStatusEnum.completed, messageid: responseData.response[0].mrid.trim() }, updatecondition);
			let messageid = responseData.response[0].mrid;
			await updateWhatsAppReport(customer.trackingid, customer.customerid, messageid);
		}
		logger.info("Class :: " + classname + " :: Method :: " + methodname + " end");
	});
}

async function sendwhatsappMessageWithAttachment(id, phone, content, msgType, mediaUrl, fileName, customer) {
	const methodname = 'sendwhatsappMessageWithAttachment';
	logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
	const userid = con.GS_WHATSAPP_USERID;
	const password = con.GS_WHATSAPP_PWD;
	var options = {
		method: 'POST',
		url: 'https://media.smsgupshup.com/GatewayAPI/rest',
		form:
		{
			userid: userid,
			password: password,
			method: 'SendMediaMessage',
			auth_scheme: 'PLAIN',
			v: 1.1,
			send_to: phone,
			media_url: mediaUrl,
			msg_type: msgType,
			caption: content,
			format: 'JSON',
			filename: fileName
		}
	};
	logger.info("Class :: " + classname + " :: Method :: " + methodname + " mediaUrl:: " + mediaUrl);
	logger.info("Class :: " + classname + " :: Method :: " + methodname + " msg_type:: " + msgType);
	logger.info("Class :: " + classname + " :: Method :: " + methodname + " caption:: " + content);
	await request(options, function (error, response, body) {
		if (error) {
			logger.error("Class :: " + classname + " :: Method :: " + methodname + " error-1 :: " + error);
		}
		else {
			let responseData = JSON.parse(body);
			// loggzinfo("Class :: " + classname + " :: Method :: " + methodname + " msgid:: " + responseData.response.id);
			let updatecondition = { where: { id: id } };
			db.whatsappqueue.update({ status: messagequeueStatusEnum.completed, messageid: responseData.response.id.trim() }, updatecondition).then(async (data) => {
				logger.info("Class :: " + classname + " :: Method :: " + methodname + " updatedRows");
				let messageid = responseData.response.id;
				await updateWhatsAppReport(customer.trackingid, customer.customerid, messageid);
			})
		}
		logger.info("Class :: " + classname + " :: Method :: " + methodname + " end body ::" + body);
	});
}

// async function sendwhatsappMessageWithAttachment(id, phone, content, msgType, mediaUrl, fileName, customer) {
// 	const methodname = 'sendwhatsappMessageWithAttachment';
// 	const videoResUrl = await callVideoGenerationApi();
// 	console.log("Class :: " + classname + " :: Method :: " + methodname + " videores::" + videores);
// 	logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
// 	const userid = con.ENC_USERID;
// 	const password = con.ENC_PWD;
// 	const url = 'https://channels.equence.in/unifiedservice?';

// 	const payload = {
// 		userName: userid,
// 		password: password,
// 		channelId: "WAP",
// 		whatsAppEntity: {
// 			whatsAppSourceAddress: "918655459323",
// 			whatsAppDestinationAddress: phone,
// 			templateId: "01k0ebenm32hnx2n00kzhpht47",
// 			variables: [
// 				content,
// 				videoResUrl
// 			],
// 			category: "Utility"
// 		}
// 	};
// 	var options = {
// 		method: 'POST',
// 		url: url,
// 		headers: {
// 			'Content-Type': 'application/json'
// 		},
// 		body: JSON.stringify(payload)
// 	};

// 	logger.info("Class :: " + classname + " :: Method :: " + methodname + " mediaUrl:: " + mediaUrl);
// 	logger.info("Class :: " + classname + " :: Method :: " + methodname + " msg_type:: " + msgType);
// 	logger.info("Class :: " + classname + " :: Method :: " + methodname + " caption:: " + content);
// 	await request(options, function (error, response, body) {
// 		if (error) {
// 			logger.error("Class :: " + classname + " :: Method :: " + methodname + " error-1 :: " + error);
// 		}
// 		else {
// 			let responseData = JSON.parse(body);
// 			// loggzinfo("Class :: " + classname + " :: Method :: " + methodname + " msgid:: " + responseData.response.id);
// 			let updatecondition = { where: { id: id } };
// 			db.whatsappqueue.update({ status: messagequeueStatusEnum.completed, messageid: responseData.response[0].mrid.trim() }, updatecondition).then(async (data) => {
// 				logger.info("Class :: " + classname + " :: Method :: " + methodname + " updatedRows");
// 				let messageid = responseData.response[0].mrid;
// 				await updateWhatsAppReport(customer.trackingid, customer.customerid, messageid);
// 			})
// 		}
// 		logger.info("Class :: " + classname + " :: Method :: " + methodname + " end body ::" + body);
// 	});
// }

async function updateWhatsAppReport(trackingid, customerid, messageid) {
	const methodname = 'updateWhatsAppReport';
	logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
	logger.info("Class :: " + classname + " :: Method :: " + methodname + " trackingid = " + trackingid);
	logger.info("Class :: " + classname + " :: Method :: " + methodname + " customerid = " + customerid);
	logger.info("Class :: " + classname + " :: Method :: " + methodname + " messageid = " + messageid);
	try {
		var condition = { where: { trackingid: `${trackingid}`, customerid: `${customerid}`, whatsappmessageid: `${messageid}` } };
		await db.reports.findAll(condition)
			.then(async (data) => {
				if (data != undefined && data.length > 0) {
					logger.info("Class :: " + classname + " :: Method :: " + methodname + " response data from db = \n" + JSON.stringify(data, null, 2));
				}
				else {
					//update messageid
					var updatecondition = { where: { trackingid: `${trackingid}`, customerid: `${customerid}` } };
					await db.reports.update({ whatsappmessageid: messageid.trim() }, updatecondition).then((data) => {

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
		//let attach = attachmentStream;
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

async function GetShortURLByLongURL(longurl, callback) {
	let methodname = 'GetShortURLByLongURL';
	logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
	try {
		//call short url api with stream data  
		//let attach = JSON.parse(longurl);
		//logger.info("Class :: " + classname + " :: Method :: " + methodname + " attach :: " + attach);

		var options = {
			'method': 'GET',
			'url': con.SHORTURLAPI + 'generateshorturl',
			'headers': {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				"longurl": longurl
			})

		};
		request(options, function (error, response, body) {
			if (error) {
				logger.error("Class :: " + classname + " :: Method :: " + methodname + " error-1 :: " + error);
			}
			else {
				let responseData = JSON.parse(body);
				logger.info("Class :: " + classname + " :: Method :: " + methodname + " body ::" + responseData);
				callback(responseData);
			}
		});
	}
	catch (error) {
		logger.error("Class :: " + classname + " :: Method :: " + methodname + " error:: " + error);
		callback(error);
	}
}

async function callVideoGenerationApi(data) {
	let methodname = 'callVideoGenerationApi';
	logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
	var text1link = data.text1link;
	var fullName = data.fullName;
	var AtalPensionYojana = data.AtalPensionYojana; // y/n
	var APY_Amount = data.APY_Amount;
	var APY_Date = data.APY_Date;
	var PMKSN = data.PMKSN;
	var PMKSN_Amount = data.PMKSN_Amount;
	var PMKSN_Date = data.PMKSN_Date;
	var PMGAY = data.PMGAY;
	var PMGAY_Amount = data.PMGAY_Amount;
	var PMGAY_Date = data.PMGAY_Date;
	var selectLanguage = data.selectLanguage;


	var policyRecords = [{
		fullName: fullName,
		profileLink: text1link,
		AtalPensionYojana: AtalPensionYojana,
		APY_Amount: APY_Amount,
		APY_Date: APY_Date,
		PMKSN: PMKSN,
		PMKSN_Amount: PMKSN_Amount,
		PMKSN_Date: PMKSN_Date,
		PMGAY: PMGAY,
		PMGAY_Amount: PMGAY_Amount,
		PMGAY_Date: PMGAY_Date,
		selectLanguage: selectLanguage
	}];

	try {
		const url = `http://v2202304113716227529.happysrv.de:8084/video-processing/uploadGripCampaignData/f492073a-a72b-4a49-9bfe-9051c68f6298`;

		const response = await axios.post(url, policyRecords, {
			headers: {
				"Content-Type": "application/json",
			},
		});
		const fullUrl = response.data && response.data[0] && response.data[0].shorturl;
		logger.info("Class :: " + classname + " :: Method :: " + methodname + " response:: " + JSON.stringify(response.data, null, 2));
		if (fullUrl) {
			const shortUrl = await shortenUrl(fullUrl);
			logger.info("Class :: " + classname + " :: Method :: " + methodname + " fullUrl:: " + fullUrl);
			logger.info("Class :: " + classname + " :: Method :: " + methodname + " shortUrl:: " + shortUrl);
			logger.info("Class :: " + classname + " :: Method :: " + methodname + " End");
			return shortUrl;
		} else {
			logger.warn("Class :: " + classname + " :: Method :: " + methodname + " :: Response does not contain a valid URL");
			logger.info("Class :: " + classname + " :: Method :: " + methodname + " End");
			return null;
		}
	} catch (err) {
		logger.error("Class :: " + classname + " :: Method :: " + methodname + " error:: " + err);
		logger.info("Class :: " + classname + " :: Method :: " + methodname + " End");
		return null;
	}
}

async function shortenUrl(longUrl) {
	try {
		const res = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`);
		logger.info("Class :: " + classname + " :: Method :: shortenUrl response:: " + res.data);
		return res.data;
	} catch (error) {
		logger.error("Class :: " + classname + " :: Method :: shortenUrl error:: " + error.message);
		return longUrl;
	}
}


function extractValuesFromTemplate(template, content) {
	const variableRegex = /<([^>]+)>/g;
	let regexPattern = '';
	let lastIndex = 0;
	let match;

	while ((match = variableRegex.exec(template)) !== null) {
		const fixedText = template.slice(lastIndex, match.index);
		regexPattern += escapeRegExpFlexibleWhitespace(fixedText);
		regexPattern += '([\\s\\S]+?)';

		lastIndex = match.index + match[0].length;
	}

	regexPattern += escapeRegExpFlexibleWhitespace(template.slice(lastIndex));

	const fullRegex = new RegExp('^' + regexPattern + '$');
	const resultMatch = fullRegex.exec(content);
	if (!resultMatch) {
		throw new Error("Content does not match the template structure.");
	}

	return resultMatch.slice(1);
}

function escapeRegExpFlexibleWhitespace(text) {
	return text
		.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
		.replace(/\s+/g, '\\s+');
}

async function ReadNamesJson(fullName) {
	const methodname = 'ReadNamesJson';
	try {
		logger.info(`Class :: ${classname} :: Method :: ${methodname} Begin`);

		const data = await readFile(con.APP_ROOTDIR + "src/config/campaign_video_info.json", "utf8");
		const jsonData = JSON.parse(data);

		let result = jsonData.find(item => item.fullName === fullName);
		// If no match found, use "default"
		if (!result) {
			logger.warn(`No match found for "${fullName}". Returning default entry.`);
			result = jsonData.find(item => item.fullName === "Member");
		}

		return result || null;
	} catch (ex) {
		logger.error(`Class :: ${classname} :: Method :: ${methodname} EXCEPTION :: ${ex}`);
		throw ex;
	}
}
