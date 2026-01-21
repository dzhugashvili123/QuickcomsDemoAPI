require("dotenv").config();
const con = require('../../config');
var logger = require('../utils/logtrace');
var whatsappService = require('../services/whatsapp.service');
var emailService = require('../services/email.service');
var smsService = require('../services/sms.service');
var campaignService = require('../services/campaign.services');
var commomService = require('../services/common.service')
const classname = 'scheduler.controller.js'
const db = require("../utils/database");
const xmlparser = require('fast-xml-parser');
const { dirname } = require('path');
var fs = require('fs');
const { messagequeueStatusEnum } = require('../models/whatsapp.message.status');
const Sequelize = require('sequelize');
const { Op } = Sequelize;

exports.processMessageQueue = async (req, res, next) => {
	var methodname = 'processMessageQueue'
	try {
		logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
		await getMessageQueuesByStatus(next, async function (messageQueuedata) {
			logger.info("Class :: " + classname + " :: Method :: " + methodname + " messageQueuedata =\n " + JSON.stringify(messageQueuedata, null, 2));
			// logger.info("Class :: " + classname + " :: Method :: " + methodname + " messageQueuedata length =\n " + messageQueuedata.length);

			if (messageQueuedata != undefined && messageQueuedata != null) {
				messageQueuedata.forEach(messageQueue => {
					if (messageQueue != undefined && messageQueue != null) {
						//var messagequeueId = Number(messageQueue.id);
						// logger.info("Class :: " + classname + " :: Method :: " + methodname + " messagequeueId= " + messagequeueId);
						//var updateStatus = messagequeueStatusEnum.processing;
						logger.info("Class :: " + classname + " :: Method :: " + methodname + " if 1 ::" + messageQueue.meta);
						if (messageQueue.meta != undefined && messageQueue.meta != null) {
							var CustCampaignName = JSON.parse(messageQueue.meta).campaignname;
							// UpdateMessageQueueStatus(messagequeueId, updateStatus);
							// logger.info("Class :: " + classname + " :: Method :: " + methodname + " if 2::" + JSON.parse(messageQueue.meta));
							if ((JSON.parse(messageQueue.meta).records)) {
								logger.info("Class :: " + classname + " :: Method :: " + methodname + " if 3");
								var records = (JSON.parse(messageQueue.meta).records);
								logger.info("Class :: " + classname + " :: Method :: " + methodname + " records length= " + records.length);
								records.forEach(async customer => {


									var customerId = customer.custom_record_id;
									var otpchannel = customer.channel;
									var trackidId = messageQueue.trackingid;
									var priority = (customer.priority != undefined || customer.priority != null) ? customer.priority : "1";
									logger.info("Class :: " + classname + " :: Method :: " + methodname + " customerId = " + customerId);
									logger.info("Class :: " + classname + " :: Method :: " + methodname + " trackidId = " + trackidId);

									var whatsapppayload = { customerid: customerId, priority: priority, status: messagequeueStatusEnum.received, trackingid: trackidId, payload: customer.messagecontent.whatsapp };
									logger.info("Class :: " + classname + " :: Method :: " + methodname + " whatsapppayload = \n" + JSON.stringify(whatsapppayload, null, 2));
									var smspayload = { customerid: customerId, priority: priority, status: messagequeueStatusEnum.received, trackingid: trackidId, payload: customer.messagecontent.sms };
									logger.info("Class :: " + classname + " :: Method :: " + methodname + " smspayload = \n" + JSON.stringify(smspayload, null, 2));
									var emailpayload = { customerid: customerId, priority: priority, status: messagequeueStatusEnum.received, trackingid: trackidId, payload: customer.messagecontent.email };
									logger.info("Class :: " + classname + " :: Method :: " + methodname + " emailpayload = \n" + JSON.stringify(emailpayload, null, 2));


									await commomService.SavechannelsData(emailpayload, "email");
									await commomService.SavechannelsData(whatsapppayload, "whatsapp");
									await commomService.SavechannelsData(smspayload, "sms");
									await ReadCampaignSchemaJosn(async function (jsonData) {
										//logger.info("Class :: " + classname + " :: Method :: " + methodname + " jsonData ::" + JSON.stringify(jsonData));

										if (jsonData && jsonData.campaigns.length > 0) {
											//logger.info("Class :: " + classname + " :: Method :: " + methodname + " campaigns length ::" + jsonData.campaigns.campaign.length);
											for (var i = 0; i < jsonData.campaigns.length; i++) {
												logger.info("Class :: " + classname + " :: Method :: " + methodname + " campaigns length ::" + jsonData.campaigns.length);
												let campaignName = jsonData.campaigns[i].campaignname;
												logger.info("Class :: " + classname + " :: Method :: " + methodname + " campaignName ::" + campaignName);
												logger.info("Class :: " + classname + " :: Method :: " + methodname + " CustCampaignName ::" + CustCampaignName);

												if (CustCampaignName.toLowerCase().includes(campaignName.toLowerCase())) {
													logger.info("Class :: " + classname + " :: Method :: " + methodname + " campaign match ");
													let emailbackupchannel = jsonData.campaigns[i].email.backup;
													let isemailSend = jsonData.campaigns[i].email.send;
													let smsbackupchannel = jsonData.campaigns[i].sms.backup;
													let issmsSend = jsonData.campaigns[i].sms.send;
													let whatsappbackupchannel = jsonData.campaigns[i].whatsapp.backup;
													let iswhatsappSend = jsonData.campaigns[i].whatsapp.send;
													logger.info("Class :: " + classname + " :: Method :: " + methodname + " emailbackupchannel ::" + emailbackupchannel);
													logger.info("Class :: " + classname + " :: Method :: " + methodname + " isemailSend ::" + isemailSend);

													if ((isemailSend == 'true') && (otpchannel == "" || otpchannel.toLowerCase() == "all" || otpchannel.toLowerCase().includes('email')))
														await emailService.InsertEmailQueue(emailpayload, emailbackupchannel, next);
													logger.info("Class :: " + classname + " :: Method :: " + methodname + " whatsappbackupchannel ::" + whatsappbackupchannel);
													logger.info("Class :: " + classname + " :: Method :: " + methodname + " iswhatsappSend ::" + iswhatsappSend);
													if ((iswhatsappSend == 'true') && (otpchannel == "" || otpchannel.toLowerCase() == "all" || otpchannel.toLowerCase().includes('whatsapp')))
														await whatsappService.InsertWhatsAppQueue(whatsapppayload, whatsappbackupchannel, next);
													logger.info("Class :: " + classname + " :: Method :: " + methodname + " smsbackupchannel ::" + smsbackupchannel);
													logger.info("Class :: " + classname + " :: Method :: " + methodname + " issmsSend ::" + issmsSend);
													if ((issmsSend == 'true') && (otpchannel == "" || otpchannel.toLowerCase() == "all" || otpchannel.toLowerCase().includes('sms')))
														await smsService.InsertSMSQueue(smspayload, smsbackupchannel, next);
												}
												else {
													logger.info("Class :: " + classname + " :: Method :: " + methodname + " campaign not matched");
												}
											}
										}
										logger.info("Class :: " + classname + " :: Method :: " + methodname + " Loop completed ::");
									});
								});
							}
						}
					}
				});
			}
		});
		logger.info("Class :: " + classname + " :: Method :: " + methodname + " End");
	} catch (error) {
		logger.error("Class :: " + classname + " :: Method :: " + methodname + " ERROr :: " + error);
		next(error)
	}
};

exports.scheduleSMS = async (req, res, next) => {
	var methodname = 'scheduleSMS'
	try {
		logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
		await smsService.processSMSQueue(next);
		logger.info("Class :: " + classname + " :: Method :: " + methodname + " End");
	} catch (error) {
		next(error)
	}
};

exports.scheduleWhatsApp = async (next) => {
	const methodname = 'scheduleWhatsApp';
	logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
	try {
		await whatsappService.processWhatsAppQueue(next);
		logger.info("Class :: " + classname + " :: Method :: " + methodname + " End");
		//   res.send(responseData);
		//logger.info("Class :: " + classname + " :: Method :: " + methodname + " responseData = \n" + JSON.stringify(responseData));
	} catch (error) {
		console.log('Error = ' + error);
		next(error);
	}
};

exports.scheduleEMail = async (req, res, next) => {
	var methodname = 'scheduleEMail'
	try {
		logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
		await emailService.processEMailQueue(next);
		logger.info("Class :: " + classname + " :: Method :: " + methodname + " End");
	} catch (error) {
		next(error)
	}
};

async function getMessageQueuesByStatus(next, callback) {
	const methodname = 'getMessageQueuesByStatus';
	logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
	const messagequeue = db.messagequeue;
	try {
		var condition = { where: { status: `${messagequeueStatusEnum.received}` } };
		await messagequeue.findAll(condition)
			.then(async (data) => {
				let Ids = data.map(s => Number(s.id));
				let updatecondition = { where: { id: { [Op.in]: Ids } } };
				await db.messagequeue.update({ status: messagequeueStatusEnum.processing }, updatecondition);
				callback(data);
				logger.info("Class :: " + classname + " :: Method :: " + methodname + " End");
			})
			.catch(err => {
				next(err);
				logger.info("Class :: " + classname + " :: Method :: " + methodname + " Error = " + err);
			});
	}
	catch (error) {
		next(error);
	}
}

async function UpdateMessageQueueStatus(messagequeueId, updateStatus) {
	const methodname = 'UpdateMessageQueueStatus';
	logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
	logger.info("Class :: " + classname + " :: Method :: " + methodname + " messagequeueId = " + messagequeueId);
	logger.info("Class :: " + classname + " :: Method :: " + methodname + " updateStatus = " + updateStatus);
	const messagequeue = db.messagequeue;

	try {
		var condition = { where: { id: messagequeueId } };
		await messagequeue.update({ status: messagequeueStatusEnum.processing }, condition)
			.then((data) => {
				logger.info("Class :: " + classname + " :: Method :: " + methodname + " updatedRows");
				logger.info("Class :: " + classname + " :: Method :: " + methodname + " End");
			})
			.catch(err => {
				logger.info("Class :: " + classname + " :: Method :: " + methodname + " Error = " + err);
			});
	}
	catch (error) {
		logger.info("Class :: " + classname + " :: Method :: " + methodname + " Error = " + err);
	}
}

async function ReadCampaignSchemaJosn(callback) {
	const methodname = 'ReadCampaignSchemaJosn';
	try {
		logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
		//logger.info("Class :: " + classname + " :: Method :: " + methodname + " Root Directory path ::::: "+require.main.filename);
		//const appDir = dirname(require.main.filename);
		// logger.info("Class :: " + classname + " :: Method :: " + methodname + " Root Directory appDir :::::::: "+appDir);
		await fs.readFile(con.APP_ROOTDIR + "src/config/CampaignSchema.json", "utf8", function (err, data) {
			if (err) throw err;
			var jsonData = JSON.parse(data);
			//logger.info("Class :: " + classname + " :: Method :: " + methodname + " jsonData ::" + JSON.stringify(jsonData));
			callback(jsonData);
		});
	}
	catch (ex) {
		logger.error("Class :: " + classname + " :: Method :: " + methodname + " EXCEPTION ::" + ex);
	}

}

exports.processCampaignMessages = async (req, res, next) => {
	var methodname = 'processCampaignMessages'
	try {
		logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
		await campaignService.processCampaignQueue(next);
		logger.info("Class :: " + classname + " :: Method :: " + methodname + " End");
	} catch (error) {
		logger.error("Class :: " + classname + " :: Method :: " + methodname + " Error :: " + error);
		next(error)
	}
};