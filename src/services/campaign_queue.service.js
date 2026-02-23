var logger = require('../utils/logtrace');
const classname = 'campaign_queue.service.js';
require("dotenv").config();
const con = require('../../config');
const db = require("../utils/database");
const axios = require('axios');
const fs = require('fs');
const util = require('util');
const { messagequeueStatusEnum } = require('../models/whatsapp.message.status');
const campQueueLimit = process.env.CAMPAIGN_QUEUE_LIMIT || 100;

/**
 * Process records from campaign_queue table
 */
exports.processCampaignQueue = async (next) => {
    const methodname = 'processCampaignQueue';
    logger.info(`Class :: ${classname} :: Method :: ${methodname} Begin`);
    try {
        const condition = {
            where: { status: `${messagequeueStatusEnum.received}` },
            limit: campQueueLimit,
            order: [['id', 'ASC']]
        };

        const records = await db.campaign_queue.findAll(condition);
        logger.info(`Class :: ${classname} :: Method :: ${methodname} Fetched Records Count :: ${records.length}`);

        for (const record of records) {
            try {
                // Fetch Campaign and Client details
                const campaign = await db.campaigns.findOne({ where: { id: record.campaignid } });
                const client = await db.clients.findOne({ where: { id: record.clientid } });

                if (!campaign) {
                    logger.warn(`Class :: ${classname} :: Method :: ${methodname} No campaign found for record ID: ${record.id}, campaignid: ${record.campaignid}`);
                    continue;
                }

                if (!client) {
                    logger.warn(`Class :: ${classname} :: Method :: ${methodname} No client found for record ID: ${record.id}, clientid: ${record.clientid}`);
                    continue;
                }

                // Update status to processing
                await db.campaign_queue.update(
                    { status: messagequeueStatusEnum.processing.toString() },
                    { where: { id: record.id } }
                );

                const smsConfig = campaign.smsConfig || {};
                const whatsappConfig = campaign.whatsappConfig || {};

                // Process SMS
                if (smsConfig.send === true || smsConfig.send === 'true') {
                    await sendSMS(record, campaign, client);
                }

                // Process WhatsApp
                if (whatsappConfig.send === true || whatsappConfig.send === 'true') {
                    await sendwhatsappMessage(record, campaign, client);
                }

            } catch (recordError) {
                logger.error(`Class :: ${classname} :: Method :: ${methodname} Error processing record ID: ${record.id} :: ${recordError}`);
                await db.campaign_queue.update(
                    { status: messagequeueStatusEnum.failed.toString() },
                    { where: { id: record.id } }
                );
            }
        }
        logger.info(`Class :: ${classname} :: Method :: ${methodname} Completed all records`);

    } catch (error) {
        logger.error(`Class :: ${classname} :: Method :: ${methodname} Error :: ${error}`);
        if (next) next(error);
    }
};

/**
 * Combines all data sources into a flat map for variable resolution
 */
function getDataMap(record, client, videoUrl) {
    const dataMap = {
        mobile: record.mobile,
        email: record.email,
        language: record.language,
        videoUrl: videoUrl,
        url: videoUrl,
        ...record.dynamicdata,
        ...client.clientMeta
    };

    // Resolve pdfUrl based on language
    const language = record.language || "E";
    let pdfUrl = "";
    if (language === "H") {
        pdfUrl = client.clientMeta?.pdfHindi || "";
    } else if (language === "E") {
        pdfUrl = client.clientMeta?.pdfEnglish || "";
    } else if (language === "T") {
        pdfUrl = client.clientMeta?.pdfTelugu || "";
    } else {
        pdfUrl = client.clientMeta?.pdfEnglish || "";
    }
    dataMap.pdfUrl = pdfUrl;

    return dataMap;
}

/**
 * Replaces placeholders in template with values from dataMap
 */
function resolveTemplate(template, dataMap) {
    return template.replace(/{{(\w+)}}/g, (match, key) => {
        return dataMap[key] !== undefined ? dataMap[key] : match;
    });
}

async function sendSMS(record, campaign, client) {
    const methodname = "sendSMS";
    logger.info(`Class :: ${classname} :: Method :: ${methodname} begin for record ID: ${record.id}`);

    const smsConfig = campaign.smsConfig || {};
    const templateId = smsConfig.templateId;
    const generateVideo = smsConfig.generateVideo === true || smsConfig.generateVideo === 'true';

    if (!templateId) {
        logger.error(`Class :: ${classname} :: Method :: ${methodname} Template ID not found in campaign config for record ID: ${record.id}`);
        return;
    }

    try {
        let template = "";
        try {
            template = fs.readFileSync(`${con.APP_ROOTDIR}Templates/${templateId}.txt`, { encoding: "utf8", flag: "r" });
        } catch (err) {
            logger.error(`Class :: ${classname} :: Method :: ${methodname} Template read failed: ${err}`);
            return;
        }

        let videoResUrl = "";
        if (generateVideo) {
            try {
                videoResUrl = await callVideoGenerationApi(client.name, record, client.clientMeta?.videoTemplateId);
            } catch (err) {
                logger.error(`Class :: ${classname} :: Method :: ${methodname} Video generation failed: ${err}`);
            }
        }

        const dataMap = getDataMap(record, client, videoResUrl);
        const finalMessage = resolveTemplate(template, dataMap);

        const smsProvider = client.smsConfig?.providerSettings || {};
        const payload = {
            username: smsProvider.userId || con.EQC_SMS_USERID,
            password: smsProvider.password || con.EQC_SMS_PWD,
            to: record.mobile,
            from: smsProvider.from || "TECRAS",
            tmplId: templateId,
            text: finalMessage,
            makeShort: "1",
        };

        logger.info(`Class :: ${classname} :: Method :: ${methodname} Request Body = ${JSON.stringify(payload)}`);

        const response = await axios.post("https://api.equence.in/pushsms", payload, {
            headers: { "Content-Type": "application/json" }
        });

        const responseData = response.data;
        logger.info(`Class :: ${classname} :: Method :: ${methodname} Response:: ${JSON.stringify(responseData)}`);

        if (responseData && responseData.response && Array.isArray(responseData.response) && responseData.response.length > 0 && responseData.response[0].mrid) {
            const msgid = responseData.response[0].mrid.trim();
            await db.campaign_queue.update(
                { status: messagequeueStatusEnum.completed.toString(), smsresponseid: msgid },
                { where: { id: record.id } }
            );
        } else {
            throw new Error(`Invalid response body: ${JSON.stringify(responseData)}`);
        }
    } catch (error) {
        logger.error(`Class :: ${classname} :: Method :: ${methodname} ERROR:: ${error.message}`);
        await db.campaign_queue.update(
            { status: messagequeueStatusEnum.failed.toString() },
            { where: { id: record.id } }
        );
    }
}

async function sendwhatsappMessage(record, campaign, client) {
    const methodname = "sendwhatsappMessage";
    logger.info(`Class :: ${classname} :: Method :: ${methodname} begin for record ID: ${record.id}`);

    const whatsappConfig = campaign.whatsappConfig || {};
    const templateId = whatsappConfig.templateId;
    const generateVideo = whatsappConfig.generateVideo === true || whatsappConfig.generateVideo === 'true';

    if (!templateId) {
        logger.error(`Class :: ${classname} :: Method :: ${methodname} Template ID not found in campaign config for record ID: ${record.id}`);
        return;
    }

    try {
        let videoResUrl = "";
        if (generateVideo) {
            try {
                videoResUrl = await callVideoGenerationApi(client.name, record, client.clientMeta?.videoTemplateId);
            } catch (err) {
                logger.error(`Class :: ${classname} :: Method :: ${methodname} Video generation failed: ${err}`);
            }
        }

        const dataMap = getDataMap(record, client, videoResUrl);

        // Resolve variables array for WhatsApp API
        const variableNames = whatsappConfig.variables || [];
        const resolvedVariables = variableNames.map(name => {
            return dataMap[name] !== undefined ? dataMap[name] : "";
        });

        const whatsAppProvider = client.whatsAppConfig?.providerSettings || {};
        const userid = whatsAppProvider.userId || con.EQC_WHATSAPP_USERID;
        const password = whatsAppProvider.password || con.EQC_WHATSAPP_PWD;
        const url = "https://channels.equence.in/unifiedservice?";

        const payload = {
            userName: userid,
            password: password,
            channelId: "WAP",
            whatsAppEntity: {
                whatsAppSourceAddress: whatsAppProvider.senderId || con.EQC_WHATSAPP_SOURCE_ADDRESS,
                whatsAppDestinationAddress: record.mobile,
                templateId: templateId,
                variables: resolvedVariables,
                category: "Marketing",
                dynamicUrl: videoResUrl,
                mediaAttachment: {
                    type: "IMAGE",
                    url: "https://videos.laadshyd.com/vf/static/sumanth/nvsumanth.jpeg"
                },
            }
        };

        logger.info(`Class :: ${classname} :: Method :: ${methodname} Request Body :: ${JSON.stringify(payload)}`);

        const response = await axios.post(url, payload, {
            headers: { "Content-Type": "application/json" },
            timeout: 120000
        });

        const responseData = response.data;
        logger.info(`Class :: ${classname} :: Method :: ${methodname} Response :: ${JSON.stringify(responseData)}`);

        if (responseData && responseData.response && Array.isArray(responseData.response) && responseData.response.length > 0 && responseData.response[0].mrid) {
            const msgid = responseData.response[0].mrid.trim();
            await db.campaign_queue.update(
                { status: messagequeueStatusEnum.completed.toString(), whatsappresponseid: msgid },
                { where: { id: record.id } }
            );
        } else {
            throw new Error(`Invalid response body: ${JSON.stringify(responseData)}`);
        }
    } catch (error) {
        logger.error(`Class :: ${classname} :: Method :: ${methodname} ERROR :: ${error.message}`);
        await db.campaign_queue.update(
            { status: messagequeueStatusEnum.failed.toString() },
            { where: { id: record.id } }
        );
    }
}

async function callVideoGenerationApi(clientName, record, videoTemplateId) {
    const methodname = 'callVideoGenerationApi';
    logger.info(`Class :: ${classname} :: Method :: ${methodname} Begin`);

    if (!videoTemplateId) {
        logger.warn(`Class :: ${classname} :: Method :: ${methodname} No videoTemplateId provided`);
        return null;
    }

    const videoBaseUrl = process.env.VIDEO_BASE_URL || 'https://videos.laadshyd.com/vf/vapi/uploadGripCampaignData/';
    const videoUrl = videoBaseUrl + videoTemplateId;

    const firstName = record.dynamicdata?.firstName || "";
    const language = record.language || "E";

    const policyRecords = [{
        ...record.dynamicdata,
        fullName: firstName,
        Policy_No: record.mobile,
        PartyName: clientName,
        selectLanguage: language
    }];

    logger.info(`Class :: ${classname} :: Method :: ${methodname} PolicyRecords Payload :: ${JSON.stringify(policyRecords)}`);

    try {
        const response = await axios.post(videoUrl, policyRecords, {
            headers: { "Content-Type": "application/json" },
        });

        const fullUrl = response.data && response.data[0] && response.data[0].shorturl;
        logger.info(`Class :: ${classname} :: Method :: ${methodname} response:: ${JSON.stringify(response.data, null, 2)}`);

        if (fullUrl) {
            return fullUrl;
        } else {
            logger.warn(`Class :: ${classname} :: Method :: ${methodname} Response does not contain a valid URL`);
            return null;
        }
    } catch (err) {
        logger.error(`Class :: ${classname} :: Method :: ${methodname} error:: ${err}`);
        return null;
    }
}
