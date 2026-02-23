var logger = require('../utils/logtrace');
const classname = 'campaign.services.js'
require("dotenv").config();
const con = require('../../config');
const db = require("../utils/database");
var request = require("request");
const { default: axios } = require('axios');
var path = require("path");
var fs = require('fs');
var util = require('util');
const shortid = require('shortid');
var readFile = util.promisify(fs.readFile);
const { messagequeueStatusEnum } = require('../models/whatsapp.message.status');
const campQueueLimit = process.env.CAMPAIGN_QUEUE_LIMIT || 100;
const commonService = require('../services/common.service');

exports.processCampaignQueue = async (next) => {
	const methodname = 'processCampaignQueue';
	logger.info(`Class :: ${classname} :: Method :: ${methodname} Begin`);
	try {
		var condition = { where: { status: `${messagequeueStatusEnum.received}` }, limit: campQueueLimit };

		const records = await db.campaignqueue.findAll(condition);
		logger.info(`Class :: ${classname} :: Method :: ${methodname} Fetched Records Count :: ${records.length}`);
		const data = await readFile(con.APP_ROOTDIR + "src/config/campaignqueue.json", "utf8");
		const json = JSON.parse(data);
		let campaignsArray = [];
		if (Array.isArray(json.campaigns)) {
			campaignsArray = json.campaigns;
		}
		for (const record of records) {
			const campaign = campaignsArray.find(
				(c) => c.campaignname.trim() === record.campaignname.trim()
			);

			if (!campaign) {
				logger.warn(`No campaign config found for: ${record.campaignname}`);
				continue; // skip this record if campaign not found
			}
			await db.campaignqueue.update({ status: messagequeueStatusEnum.processing.toString() }, { where: { id: record.id } });

			if (campaign.sms.send === true) {
				await sendSMS(record.id, record.MobileNo, record.firstName, record, campaign.sms.templateId, campaign.sms.generateVideo);
			}

			if (campaign.whatsapp.send === true) {
				await sendwhatsappMessageWithoutAttachment(record, campaign, campaign.whatsapp.generateVideo);
			}
		}
		logger.info(`Class :: ${classname} :: Method :: ${methodname} Completed all records`);

	} catch (error) {
		logger.error(`Class :: ${classname} :: Method :: ${methodname} Error :: ${error}`);
		next(error);
	}
};

async function sendSMS(Id, phone, msgContent, customer, templateId, generateVideo) {
	const methodname = "sendSMS";
	logger.info(`Class :: ${classname} :: Method :: ${methodname} begin`);
	let template = "";
	const clientsData = await commonService.GetClients();
	const client = clientsData.find(c => c.name.toLowerCase() === customer.PartyName.toLowerCase());
	if (!client) {
		logger.error(`Class :: ${classname} :: Method :: ${methodname} Client not found for partyName: ${customer.PartyName}`);
	}
	try {
		template = fs.readFileSync(`${con.APP_ROOTDIR}Templates/${templateId}.txt`, { encoding: "utf8", flag: "r" });
	} catch (err) {
		logger.error(`Template read failed: ${err}`);
		return;
	}
	logger.info(`Class :: ${classname} :: Method :: ${methodname} template:: ${template}`);

	let videoResUrl = "";
	if (generateVideo === true) {
		try {
			videoResUrl = await callVideoGenerationApi(customer, client.clientMeta?.videoTemplateId);
		} catch (err) {
			logger.error(`Video generation failed: ${err}`);
		}
	}
	const pdfUrl = client.clientMeta.pdfEnglish || "";
	logger.info(`Class :: ${classname} :: Method :: ${methodname} videoResUrl:: ${videoResUrl}`);

	const finalMessage = template.replace("<Variable1>", msgContent)
		.replace("<Variable2>", videoResUrl)
		.replace("<Variable3>", pdfUrl);
	logger.info(`Class :: ${classname} :: Method :: ${methodname} finalMessage:: ${finalMessage}`);

	const smsProvider = client.smsConfig?.providerSettings;
	const payload = {
		username: smsProvider.userId || con.EQC_SMS_USERID,
		password: smsProvider.password || con.EQC_SMS_PWD,
		to: phone,
		from: smsProvider.from || "TECRAS",
		tmplId: templateId,
		text: finalMessage,
		makeShort: "1",
	};

	logger.info(`Class :: ${classname} :: Method :: ${methodname} Request Body = ${JSON.stringify(payload)}`);

	try {
		const response = await axios.post("https://api.equence.in/pushsms", payload, {
			headers: { "Content-Type": "application/json" }
		});

		const responseData = response.data;
		logger.info(`Class :: ${classname} :: Method :: ${methodname} Response:: ${JSON.stringify(responseData)}`);

		if (responseData && responseData.response && Array.isArray(responseData.response) && responseData.response.length > 0 && responseData.response[0].mrid) {
			const msgid = responseData.response[0].mrid.trim();
			logger.info(`Class :: ${classname} :: Method :: ${methodname} msgid:: ${msgid}`);
			await db.campaignqueue.update(
				{ status: messagequeueStatusEnum.completed, smscustomerid: msgid },
				{ where: { id: Id } }
			);
			logger.info(`Class :: ${classname} :: Method :: ${methodname} updatedRows:: for Id ${Id}`);
		} else {
			throw new Error(`Invalid response body: ${JSON.stringify(responseData)}`);
		}
	} catch (error) {
		logger.error(`Class :: ${classname} :: Method :: ${methodname} ERROR:: ${error.message}`);
		await db.campaignqueue.update(
			{ status: messagequeueStatusEnum.failed },
			{ where: { id: Id } }
		);
	}

	logger.info(`Class :: ${classname} :: Method :: ${methodname} end`);
}

async function sendwhatsappMessageWithoutAttachment(customer, campaign, generateVideo) {
	logger.info('sendwhatsappMessageWithoutAttachment=============== ');
	const methodname = "sendwhatsappMessageWithoutAttachment";
	const templateId = campaign.whatsapp.templateId;
	const clientsData = await commonService.GetClients();
	const client = clientsData.find(c => c.name.toLowerCase() === customer.PartyName.toLowerCase());
	if (!client) {
		logger.error(`Class :: ${classname} :: Method :: ${methodname} Client not found for partyName: ${customer.PartyName}`);
	}
	logger.info(`Class :: ${classname} :: Method :: ${methodname} Begin`);
	let template = "";
	try {
		template = fs.readFileSync(con.APP_ROOTDIR + `Templates/${templateId}.txt`, { encoding: "utf8" });
	} catch (err) {
		logger.error(`Class :: ${classname} :: Method :: ${methodname} Template read failed: ${err}`);
		return;
	}
	logger.info(`Class :: ${classname} :: Method :: ${methodname} template:: ${template}`);

	let videoResUrl = "";
	if (generateVideo && generateVideo === true) {
		try {
			videoResUrl = await callVideoGenerationApi(customer, client.clientMeta?.videoTemplateId);
		} catch (err) {
			logger.error(`Class :: ${classname} :: Method :: ${methodname} Video generation failed: ${err}`);
		}
	}


	// const pdffileUrl = await generateShortPdfUrl(customer.campaignname,{
	// 	recipientName: customer.firstName,
	// 	candidateName: campaign.candidateName,
	// 	messageTemplate: campaign.messageTemplate,
	// 	location: customer.ConstituencyName,
	// 	selectLanguage: customer.selectLanguage
	// });

	// let pdffile = await shortenUrl(pdffileUrl);

	logger.info(`Class :: ${classname} :: Method :: ${methodname} videoResUrl:: ${videoResUrl}`);
	//logger.info(`Class :: ${classname} :: Method :: ${methodname} pdffileUrl ****:: ${pdffileUrl}`);
	let pdffile = "";
	if (customer.selectLanguage === "H") {
		pdffile = client.clientMeta?.pdfHindi || "";
	} else if (customer.selectLanguage === "E") {
		pdffile = client.clientMeta?.pdfEnglish || ""; ``
	}
	else if (customer.selectLanguage === "T") {
		pdffile = client.clientMeta?.pdfTelugu || "";
	}
	else {
		pdffile = client.clientMeta?.pdfEnglish || "";
	}
	const finalMessage = template
		.replace("<Variable1>", customer.firstName)
		.replace("<Variable2>", videoResUrl)
		.replace("<Variable3>", pdffile);

	logger.info(`Class :: ${classname} :: Method :: ${methodname} finalMessage:: ${finalMessage}`);

	const whatsAppProvider = client.whatsAppConfig?.providerSettings;

	const userid = whatsAppProvider ? whatsAppProvider.userId : con.EQC_WHATSAPP_USERID;
	const password = whatsAppProvider ? whatsAppProvider.password : con.EQC_WHATSAPP_PWD;
	const url = "https://channels.equence.in/unifiedservice?";

	const payload = {
		userName: userid,
		password: password,
		channelId: "WAP",
		whatsAppEntity: {
			whatsAppSourceAddress: whatsAppProvider ? whatsAppProvider.senderId : con.EQC_WHATSAPP_SOURCE_ADDRESS,
			whatsAppDestinationAddress: customer.MobileNo,
			templateId: templateId,
			variables: [
				customer.firstName
			],
			category: "Marketing",
			dynamicUrl: videoResUrl,
			mediaAttachment: {
				type: "IMAGE",
				url: "https://videos.laadshyd.com/vf/static/sumanth/nvsumanth.jpeg"
			},
		}
	};

	logger.info(`Class :: ${classname} :: Method :: ${methodname} Request Body :: ${JSON.stringify(payload)}`);

	try {
		const response = await axios.post(url, payload, {
			headers: { "Content-Type": "application/json" },
			timeout: 120000
		});

		const responseData = response.data;
		logger.info(`Class :: ${classname} :: Method :: ${methodname} Response :: ${JSON.stringify(responseData)}`);

		if (responseData && responseData.response && Array.isArray(responseData.response) && responseData.response.length > 0 && responseData.response[0].mrid) {
			const msgid = responseData.response[0].mrid.trim();
			logger.info(`Class :: ${classname} :: Method :: ${methodname} msgid:: ${msgid}`);

			const updatecondition = { where: { id: customer.id } };
			await db.campaignqueue.update(
				{ status: messagequeueStatusEnum.completed, whatsappcustomerid: msgid },
				updatecondition
			);
		} else {
			throw new Error(`Invalid response body: ${JSON.stringify(responseData)}`);
		}
	} catch (error) {
		logger.error(`Class :: ${classname} :: Method :: ${methodname} ERROR :: ${error.message}`);
		const updatecondition = { where: { id: customer.id } };
		await db.campaignqueue.update(
			{ status: messagequeueStatusEnum.failed },
			updatecondition
		);
	}

	logger.info(`Class :: ${classname} :: Method :: ${methodname} End`);
}

async function callVideoGenerationApi(data, videoTemplateId) {
	let methodname = 'callVideoGenerationApi';
	logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");

	if (!videoTemplateId) {
		logger.warn(`Class :: ${classname} :: Method :: ${methodname} No videoTemplateId provided`);
		return null;
	}

	const videoBaseUrl = process.env.VIDEO_BASE_URL || 'https://videos.laadshyd.com/vf/vapi/uploadGripCampaignData/';
	const videoUrl = videoBaseUrl + videoTemplateId;
	//var text1link = data.text1link;
	//var PartyName = data.PartyName || 'BJP';
	var fullName = data.firstName; //+ " " + data.lastName;
	var selectLanguage = data.selectLanguage;

	const partyName = data.PartyName;
	// if (partyName.trim().toLowerCase() === 'bjp') {
	// 	var AtalPensionYojana = data.AtalPensionYojana; // y/n
	// 	var APY_Amount = data.APY_Amount;
	// 	var APY_Date = data.APY_Date.replace(/-/g, '/');
	// 	var PMKSN = data.PMKSN;
	// 	var PMKSN_Amount = data.PMKSN_Amount;
	// 	var PMKSN_Date = data.PMKSN_Date.replace(/-/g, '/');
	// 	var PMGAY = data.PMGAY;
	// 	var PMGAY_Amount = data.PMGAY_Amount;
	// 	var PMGAY_Date = data.PMGAY_Date.replace(/-/g, '/');
	// 	var ThallikiVandhanam = '';
	// 	var ThallikiVandhanam_Amount = '';
	// 	var ThallikiVandhanam_Date = '';
	// 	var AnnaDhaatha = '';
	// 	var AnnaDhaatha_Amount = '';
	// 	var AnnaDhaatha_Date = '';
	// 	var MahaShakti = '';
	// 	var MahaShakti_Amount = '';
	// 	var MahaShakti_Date = '';
	// }
	// else if (partyName.trim().toLowerCase() === 'tdp') {
	// 	var AtalPensionYojana = '';
	// 	var APY_Amount = '';
	// 	var APY_Date = '';
	// 	var PMKSN = '';
	// 	var PMKSN_Amount = '';
	// 	var PMKSN_Date = '';
	// 	var PMGAY = '';
	// 	var PMGAY_Amount = '';
	// 	var PMGAY_Date = '';
	// 	var ThallikiVandhanam = data.ThallikiVandhanam; // y/n
	// 	var ThallikiVandhanam_Amount = data.ThallikiVandhanam_Amount;
	// 	var ThallikiVandhanam_Date = data.ThallikiVandhanam_Date.replace(/-/g, '/');
	// 	var AnnaDhaatha = data.AnnaDhaatha;
	// 	var AnnaDhaatha_Amount = data.AnnaDhaatha_Amount;
	// 	var AnnaDhaatha_Date = data.AnnaDhaatha_Date.replace(/-/g, '/');
	// 	var MahaShakti = data.MahaShakti;
	// 	var MahaShakti_Amount = data.MahaShakti_Amount;
	// 	var MahaShakti_Date = data.MahaShakti_Date.replace(/-/g, '/');
	// }


	var policyRecords = [{
		fullName: fullName,
		Policy_No: data.MobileNo,
		PartyName: partyName,
		//profileLink: text1link,
		// PartyName: PartyName,
		// AtalPensionYojana: AtalPensionYojana,
		// APY_Amount: APY_Amount,
		// APY_Date: APY_Date,
		// PMKSN: PMKSN,
		// PMKSN_Amount: PMKSN_Amount,
		// PMKSN_Date: PMKSN_Date,
		// PMGAY: PMGAY,
		// PMGAY_Amount: PMGAY_Amount,
		// PMGAY_Date: PMGAY_Date,
		// ThallikiVandhanam: ThallikiVandhanam,
		// ThallikiVandhanam_Amount: ThallikiVandhanam_Amount,
		// ThallikiVandhanam_Date: ThallikiVandhanam_Date,
		// AnnaDhaatha: AnnaDhaatha,
		// AnnaDhaatha_Amount: AnnaDhaatha_Amount,
		// AnnaDhaatha_Date: AnnaDhaatha_Date,
		// MahaShakti: MahaShakti,
		// MahaShakti_Amount: MahaShakti_Amount,
		// MahaShakti_Date: MahaShakti_Date,
		selectLanguage: selectLanguage
	}];

	try {
		const response = await axios.post(videoUrl, policyRecords, {
			headers: {
				"Content-Type": "application/json",
			},
		});
		const fullUrl = response.data && response.data[0] && response.data[0].shorturl;
		logger.info("Class :: " + classname + " :: Method :: " + methodname + " response:: " + JSON.stringify(response.data, null, 2));
		if (fullUrl) {
			//const shortUrl = await videoshortenUrl(fullUrl);
			const shortUrl = fullUrl;
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


// async function callVideoGenerationApi(data) {
// 	let methodname = 'callVideoGenerationApi';
// 	logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
// 	var text1link = data.text1link;
// 	var PartyName = data.PartyName || 'BJP';
// 	var fullName = data.firstName; //+ " " + data.lastName;
// 	var selectLanguage = data.selectLanguage;

// 	const partyName = data.PartyName;
// 	if (partyName.trim().toLowerCase() === 'bjp') {
// 		var AtalPensionYojana = data.AtalPensionYojana; // y/n
// 		var APY_Amount = data.APY_Amount;
// 		var APY_Date = data.APY_Date.replace(/-/g, '/');
// 		var PMKSN = data.PMKSN;
// 		var PMKSN_Amount = data.PMKSN_Amount;
// 		var PMKSN_Date = data.PMKSN_Date.replace(/-/g, '/');
// 		var PMGAY = data.PMGAY;
// 		var PMGAY_Amount = data.PMGAY_Amount;
// 		var PMGAY_Date = data.PMGAY_Date.replace(/-/g, '/');
// 		var ThallikiVandhanam = '';
// 		var ThallikiVandhanam_Amount = '';
// 		var ThallikiVandhanam_Date = '';
// 		var AnnaDhaatha = '';
// 		var AnnaDhaatha_Amount = '';
// 		var AnnaDhaatha_Date = '';
// 		var MahaShakti = '';
// 		var MahaShakti_Amount = '';
// 		var MahaShakti_Date = '';
// 	}
// 	else if(partyName.trim().toLowerCase() === 'tdp'){
// 		var AtalPensionYojana = '';
// 		var APY_Amount = '';
// 		var APY_Date = '';
// 		var PMKSN = '';
// 		var PMKSN_Amount = '';
// 		var PMKSN_Date = '';
// 		var PMGAY = '';
// 		var PMGAY_Amount = '';
// 		var PMGAY_Date = '';
// 		var ThallikiVandhanam = data.ThallikiVandhanam; // y/n
// 		var ThallikiVandhanam_Amount = data.ThallikiVandhanam_Amount;
// 		var ThallikiVandhanam_Date = data.ThallikiVandhanam_Date.replace(/-/g, '/');
// 		var AnnaDhaatha = data.AnnaDhaatha;
// 		var AnnaDhaatha_Amount = data.AnnaDhaatha_Amount;
// 		var AnnaDhaatha_Date = data.AnnaDhaatha_Date.replace(/-/g, '/');
// 		var MahaShakti = data.MahaShakti;
// 		var MahaShakti_Amount = data.MahaShakti_Amount;
// 		var MahaShakti_Date = data.MahaShakti_Date.replace(/-/g, '/');
// 	}


// 	var policyRecords = [{
// 		fullName: fullName,
// 		profileLink: text1link,
// 		PartyName: PartyName,
// 		AtalPensionYojana: AtalPensionYojana,
// 		APY_Amount: APY_Amount,
// 		APY_Date: APY_Date,
// 		PMKSN: PMKSN,
// 		PMKSN_Amount: PMKSN_Amount,
// 		PMKSN_Date: PMKSN_Date,
// 		PMGAY: PMGAY,
// 		PMGAY_Amount: PMGAY_Amount,
// 		PMGAY_Date: PMGAY_Date,
// 		ThallikiVandhanam: ThallikiVandhanam,
// 		ThallikiVandhanam_Amount: ThallikiVandhanam_Amount,
// 		ThallikiVandhanam_Date: ThallikiVandhanam_Date,
// 		AnnaDhaatha: AnnaDhaatha,
// 		AnnaDhaatha_Amount: AnnaDhaatha_Amount,
// 		AnnaDhaatha_Date: AnnaDhaatha_Date,
// 		MahaShakti: MahaShakti,
// 		MahaShakti_Amount: MahaShakti_Amount,
// 		MahaShakti_Date: MahaShakti_Date,
// 		selectLanguage: selectLanguage
// 	}];

// 	try {
// 		const bjp_url = con.VIDEO_BJP_URL;
// 		const tdp_url = con.VIDEO_TDP_URL;

// 		const url = partyName.trim().toLowerCase() === 'bjp' ? bjp_url : tdp_url;

// 		const response = await axios.post(url, policyRecords, {
// 			headers: {
// 				"Content-Type": "application/json",
// 			},
// 		});
// 		const fullUrl = response.data && response.data[0] && response.data[0].shorturl;
// 		logger.info("Class :: " + classname + " :: Method :: " + methodname + " response:: " + JSON.stringify(response.data, null, 2));
// 		if (fullUrl) {
// 			const shortUrl = await videoshortenUrl(fullUrl);
// 			logger.info("Class :: " + classname + " :: Method :: " + methodname + " fullUrl:: " + fullUrl);
// 			logger.info("Class :: " + classname + " :: Method :: " + methodname + " shortUrl:: " + shortUrl);
// 			logger.info("Class :: " + classname + " :: Method :: " + methodname + " End");
// 			return shortUrl;
// 		} else {
// 			logger.warn("Class :: " + classname + " :: Method :: " + methodname + " :: Response does not contain a valid URL");
// 			logger.info("Class :: " + classname + " :: Method :: " + methodname + " End");
// 			return null;
// 		}
// 	} catch (err) {
// 		logger.error("Class :: " + classname + " :: Method :: " + methodname + " error:: " + err);
// 		logger.info("Class :: " + classname + " :: Method :: " + methodname + " End");
// 		return null;
// 	}
// }

// async function shortenUrl(longUrl) {
// 	try {
// 		const res = await axios.get(
// 			`https://is.gd/create.php?format=simple&url=${encodeURIComponent(longUrl)}`
// 		);
// 		logger.info("Class :: " + classname + " :: Method :: shortenUrl response:: " + res.data);
// 		return res.data;
// 	} catch (error) {
// 		logger.error("Class :: " + classname + " :: Method :: shortenUrl error:: " + error.message);
// 		return longUrl;
// 	}
// }

async function videoshortenUrl(longUrl) {
	try {
		// Clean unwanted single quotes if present
		const cleanedUrl = longUrl.replace(/^'|'$/g, "");

		const res = await axios.get(
			`https://tinyurl.com/api-create.php?url=${encodeURIComponent(cleanedUrl)}`
		);

		logger.info("Class :: " + + " :: Method :: shortenUrl response:: " + res.data);
		return res.data; // TinyURL returns plain text short URL

	} catch (error) {
		logger.error("Class :: " + + " :: Method :: shortenUrl error:: " + error.message);
		return longUrl;
	}
}

// async function generateShortPdfUrl(campaignname, userData) {
// 	const id = shortid.generate().substr(0, 6);
// 	const url = `https://company.tecra.com/pdf-viewer/${id}`; // full URL
// 	//https://company.tecra.com/
// 	await db.pdfmapping.create({
// 		campaignname,
// 		shortId: id,
// 		userData: userData,
// 		url: url,
// 	});
// 	return url;
// }