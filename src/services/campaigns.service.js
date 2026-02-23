var logger = require('../utils/logtrace');
const classname = 'campaigns.service.js';
require("dotenv").config();
const con = require('../../config');
const db = require("../utils/database");
var fs = require('fs');
var path = require('path');

/**
 * Read campaigns from campaigns.json
 */
exports.readCampaignsFromJson = async () => {
    const methodname = 'readCampaignsFromJson';
    logger.info(`Class :: ${classname} :: Method :: ${methodname} Begin`);
    try {
        const filePath = path.join(con.APP_ROOTDIR, 'src/config/campaigns.json');
        const data = await fs.promises.readFile(filePath, 'utf8');
        const jsonData = JSON.parse(data);
        logger.info(`Class :: ${classname} :: Method :: ${methodname} Successfully read ${jsonData.campaigns?.length || 0} campaigns from JSON`);
        return jsonData.campaigns || [];
    } catch (error) {
        logger.error(`Class :: ${classname} :: Method :: ${methodname} Error :: ${error}`);
        throw error;
    }
};

/**
 * Sync campaigns from JSON file to database (overwrite existing records)
 */
exports.syncCampaignsToDatabase = async () => {
    const methodname = 'syncCampaignsToDatabase';
    logger.info(`Class :: ${classname} :: Method :: ${methodname} Begin`);
    try {
        // Read campaigns from JSON file
        const campaigns = await exports.readCampaignsFromJson();

        if (!campaigns || campaigns.length === 0) {
            logger.warn(`Class :: ${classname} :: Method :: ${methodname} No campaigns found in JSON file`);
            return;
        }

        // Delete all existing records
        await db.campaigns.destroy({ where: {}, truncate: true });
        logger.info(`Class :: ${classname} :: Method :: ${methodname} Cleared existing campaign records`);

        // Insert new records
        for (const campaign of campaigns) {
            await db.campaigns.create({
                id: campaign.id,
                campaignname: campaign.campaignname,
                status: campaign.status || 'active',
                fields: campaign.fields || [],
                candidateName: campaign.candidateName || null,
                messageTemplate: campaign.messageTemplate || null,
                overlays: campaign.overlays || [],
                emailConfig: campaign.email || {},
                whatsappConfig: campaign.whatsapp || {},
                smsConfig: campaign.sms || {}
            });
            logger.info(`Class :: ${classname} :: Method :: ${methodname} Inserted campaign: ${campaign.campaignname} (ID: ${campaign.id})`);
        }

        logger.info(`Class :: ${classname} :: Method :: ${methodname} Successfully synced ${campaigns.length} campaigns to database`);
    } catch (error) {
        logger.error(`Class :: ${classname} :: Method :: ${methodname} Error :: ${error}`);
        throw error;
    }
};

/**
 * Get all campaigns from database
 */
exports.getAllCampaigns = async () => {
    const methodname = 'getAllCampaigns';
    logger.info(`Class :: ${classname} :: Method :: ${methodname} Begin`);
    try {
        const campaigns = await db.campaigns.findAll();
        logger.info(`Class :: ${classname} :: Method :: ${methodname} Found ${campaigns.length} campaigns`);
        return campaigns;
    } catch (error) {
        logger.error(`Class :: ${classname} :: Method :: ${methodname} Error :: ${error}`);
        throw error;
    }
};

/**
 * Get campaign by ID
 */
exports.getCampaignById = async (id) => {
    const methodname = 'getCampaignById';
    logger.info(`Class :: ${classname} :: Method :: ${methodname} Begin - ID: ${id}`);
    try {
        const campaign = await db.campaigns.findOne({ where: { id } });
        if (campaign) {
            logger.info(`Class :: ${classname} :: Method :: ${methodname} Found campaign: ${campaign.campaignname}`);
        } else {
            logger.warn(`Class :: ${classname} :: Method :: ${methodname} Campaign not found with ID: ${id}`);
        }
        return campaign;
    } catch (error) {
        logger.error(`Class :: ${classname} :: Method :: ${methodname} Error :: ${error}`);
        throw error;
    }
};

/**
 * Get campaign by name
 */
exports.getCampaignByName = async (name) => {
    const methodname = 'getCampaignByName';
    logger.info(`Class :: ${classname} :: Method :: ${methodname} Begin - Name: ${name}`);
    try {
        const campaign = await db.campaigns.findOne({ where: { campaignname: name } });
        if (campaign) {
            logger.info(`Class :: ${classname} :: Method :: ${methodname} Found campaign: ${campaign.campaignname}`);
        } else {
            logger.warn(`Class :: ${classname} :: Method :: ${methodname} Campaign not found with name: ${name}`);
        }
        return campaign;
    } catch (error) {
        logger.error(`Class :: ${classname} :: Method :: ${methodname} Error :: ${error}`);
        throw error;
    }
};

/**
 * Get campaigns by status (active/inactive)
 */
exports.getCampaignsByStatus = async (status) => {
    const methodname = 'getCampaignsByStatus';
    logger.info(`Class :: ${classname} :: Method :: ${methodname} Begin - Status: ${status}`);
    try {
        const campaigns = await db.campaigns.findAll({ where: { status } });
        logger.info(`Class :: ${classname} :: Method :: ${methodname} Found ${campaigns.length} campaigns with status: ${status}`);
        return campaigns;
    } catch (error) {
        logger.error(`Class :: ${classname} :: Method :: ${methodname} Error :: ${error}`);
        throw error;
    }
};

/**
 * Get all active campaigns
 */
exports.getActiveCampaigns = async () => {
    const methodname = 'getActiveCampaigns';
    logger.info(`Class :: ${classname} :: Method :: ${methodname} Begin`);
    try {
        const campaigns = await db.campaigns.findAll({ where: { status: 'active' } });
        logger.info(`Class :: ${classname} :: Method :: ${methodname} Found ${campaigns.length} active campaigns`);
        return campaigns;
    } catch (error) {
        logger.error(`Class :: ${classname} :: Method :: ${methodname} Error :: ${error}`);
        throw error;
    }
};

/**
 * Create a new campaign
 */
exports.createCampaign = async (campaignData) => {
    const methodname = 'createCampaign';
    logger.info(`Class :: ${classname} :: Method :: ${methodname} Begin`);
    try {
        const campaign = await db.campaigns.create({
            id: campaignData.id,
            campaignname: campaignData.campaignname,
            status: campaignData.status || 'active',
            fields: campaignData.fields || [],
            candidateName: campaignData.candidateName || null,
            messageTemplate: campaignData.messageTemplate || null,
            overlays: campaignData.overlays || [],
            emailConfig: campaignData.emailConfig || {},
            whatsappConfig: campaignData.whatsappConfig || {},
            smsConfig: campaignData.smsConfig || {}
        });
        logger.info(`Class :: ${classname} :: Method :: ${methodname} Created campaign: ${campaign.campaignname} (ID: ${campaign.id})`);
        return campaign;
    } catch (error) {
        logger.error(`Class :: ${classname} :: Method :: ${methodname} Error :: ${error}`);
        throw error;
    }
};

/**
 * Update an existing campaign
 */
exports.updateCampaign = async (id, campaignData) => {
    const methodname = 'updateCampaign';
    logger.info(`Class :: ${classname} :: Method :: ${methodname} Begin - ID: ${id}`);
    try {
        const updateData = {};
        if (campaignData.campaignname !== undefined) updateData.campaignname = campaignData.campaignname;
        if (campaignData.status !== undefined) updateData.status = campaignData.status;
        if (campaignData.fields !== undefined) updateData.fields = campaignData.fields;
        if (campaignData.candidateName !== undefined) updateData.candidateName = campaignData.candidateName;
        if (campaignData.messageTemplate !== undefined) updateData.messageTemplate = campaignData.messageTemplate;
        if (campaignData.overlays !== undefined) updateData.overlays = campaignData.overlays;
        if (campaignData.emailConfig !== undefined) updateData.emailConfig = campaignData.emailConfig;
        if (campaignData.whatsappConfig !== undefined) updateData.whatsappConfig = campaignData.whatsappConfig;
        if (campaignData.smsConfig !== undefined) updateData.smsConfig = campaignData.smsConfig;

        const [updatedRows] = await db.campaigns.update(updateData, { where: { id } });

        if (updatedRows > 0) {
            logger.info(`Class :: ${classname} :: Method :: ${methodname} Updated campaign with ID: ${id}`);
            return await exports.getCampaignById(id);
        } else {
            logger.warn(`Class :: ${classname} :: Method :: ${methodname} No campaign found with ID: ${id}`);
            return null;
        }
    } catch (error) {
        logger.error(`Class :: ${classname} :: Method :: ${methodname} Error :: ${error}`);
        throw error;
    }
};

/**
 * Delete a campaign by ID
 */
exports.deleteCampaign = async (id) => {
    const methodname = 'deleteCampaign';
    logger.info(`Class :: ${classname} :: Method :: ${methodname} Begin - ID: ${id}`);
    try {
        const deletedRows = await db.campaigns.destroy({ where: { id } });

        if (deletedRows > 0) {
            logger.info(`Class :: ${classname} :: Method :: ${methodname} Deleted campaign with ID: ${id}`);
            return true;
        } else {
            logger.warn(`Class :: ${classname} :: Method :: ${methodname} No campaign found with ID: ${id}`);
            return false;
        }
    } catch (error) {
        logger.error(`Class :: ${classname} :: Method :: ${methodname} Error :: ${error}`);
        throw error;
    }
};
