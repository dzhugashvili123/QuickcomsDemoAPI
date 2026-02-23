require("dotenv").config();
const con = require('../../config');
const classname = 'campaigns.controller.js';
const logger = require("../utils/logtrace");
const campaignsService = require("../services/campaigns.service");

/**
 * GET /api/campaigns
 * Get all campaigns
 */
exports.getAllCampaigns = async (req, res) => {
    const methodname = 'getAllCampaigns';
    logger.info(`Class :: ${classname} :: Method :: ${methodname} Begin`);
    try {
        const campaigns = await campaignsService.getAllCampaigns();
        logger.info(`Class :: ${classname} :: Method :: ${methodname} Retrieved ${campaigns.length} campaigns`);
        return res.status(200).json({
            success: true,
            count: campaigns.length,
            data: campaigns
        });
    } catch (error) {
        logger.error(`Class :: ${classname} :: Method :: ${methodname} ERROR :: ${error}`);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

/**
 * GET /api/campaigns/active
 * Get all active campaigns
 */
exports.getActiveCampaigns = async (req, res) => {
    const methodname = 'getActiveCampaigns';
    logger.info(`Class :: ${classname} :: Method :: ${methodname} Begin`);
    try {
        const campaigns = await campaignsService.getActiveCampaigns();
        logger.info(`Class :: ${classname} :: Method :: ${methodname} Retrieved ${campaigns.length} active campaigns`);
        return res.status(200).json({
            success: true,
            count: campaigns.length,
            data: campaigns
        });
    } catch (error) {
        logger.error(`Class :: ${classname} :: Method :: ${methodname} ERROR :: ${error}`);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

/**
 * GET /api/campaigns/status/:status
 * Get campaigns by status
 */
exports.getCampaignsByStatus = async (req, res) => {
    const methodname = 'getCampaignsByStatus';
    const { status } = req.params;
    logger.info(`Class :: ${classname} :: Method :: ${methodname} Begin - Status: ${status}`);
    try {
        const campaigns = await campaignsService.getCampaignsByStatus(status);
        logger.info(`Class :: ${classname} :: Method :: ${methodname} Retrieved ${campaigns.length} campaigns with status: ${status}`);
        return res.status(200).json({
            success: true,
            count: campaigns.length,
            data: campaigns
        });
    } catch (error) {
        logger.error(`Class :: ${classname} :: Method :: ${methodname} ERROR :: ${error}`);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

/**
 * GET /api/campaigns/:id
 * Get campaign by ID
 */
exports.getCampaignById = async (req, res) => {
    const methodname = 'getCampaignById';
    const { id } = req.params;
    logger.info(`Class :: ${classname} :: Method :: ${methodname} Begin - ID: ${id}`);
    try {
        const campaign = await campaignsService.getCampaignById(parseInt(id));
        if (!campaign) {
            logger.warn(`Class :: ${classname} :: Method :: ${methodname} Campaign not found with ID: ${id}`);
            return res.status(404).json({
                success: false,
                error: 'Campaign not found'
            });
        }
        logger.info(`Class :: ${classname} :: Method :: ${methodname} Retrieved campaign: ${campaign.campaignname}`);
        return res.status(200).json({
            success: true,
            data: campaign
        });
    } catch (error) {
        logger.error(`Class :: ${classname} :: Method :: ${methodname} ERROR :: ${error}`);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

/**
 * GET /api/campaigns/name/:name
 * Get campaign by name
 */
exports.getCampaignByName = async (req, res) => {
    const methodname = 'getCampaignByName';
    const { name } = req.params;
    logger.info(`Class :: ${classname} :: Method :: ${methodname} Begin - Name: ${name}`);
    try {
        const campaign = await campaignsService.getCampaignByName(name);
        if (!campaign) {
            logger.warn(`Class :: ${classname} :: Method :: ${methodname} Campaign not found with name: ${name}`);
            return res.status(404).json({
                success: false,
                error: 'Campaign not found'
            });
        }
        logger.info(`Class :: ${classname} :: Method :: ${methodname} Retrieved campaign: ${campaign.campaignname}`);
        return res.status(200).json({
            success: true,
            data: campaign
        });
    } catch (error) {
        logger.error(`Class :: ${classname} :: Method :: ${methodname} ERROR :: ${error}`);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

/**
 * POST /api/campaigns
 * Create a new campaign
 */
exports.createCampaign = async (req, res) => {
    const methodname = 'createCampaign';
    logger.info(`Class :: ${classname} :: Method :: ${methodname} Begin`);
    try {
        const campaignData = req.body;

        // Validate required fields
        if (!campaignData.id || !campaignData.campaignname) {
            return res.status(400).json({
                success: false,
                error: 'Campaign ID and name are required'
            });
        }

        const campaign = await campaignsService.createCampaign(campaignData);
        logger.info(`Class :: ${classname} :: Method :: ${methodname} Created campaign: ${campaign.campaignname} (ID: ${campaign.id})`);
        return res.status(201).json({
            success: true,
            data: campaign
        });
    } catch (error) {
        logger.error(`Class :: ${classname} :: Method :: ${methodname} ERROR :: ${error}`);

        // Handle duplicate key error
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({
                success: false,
                error: 'Campaign with this ID already exists'
            });
        }

        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

/**
 * PUT /api/campaigns/:id
 * Update an existing campaign
 */
exports.updateCampaign = async (req, res) => {
    const methodname = 'updateCampaign';
    const { id } = req.params;
    logger.info(`Class :: ${classname} :: Method :: ${methodname} Begin - ID: ${id}`);
    try {
        const campaignData = req.body;
        const updatedCampaign = await campaignsService.updateCampaign(parseInt(id), campaignData);

        if (!updatedCampaign) {
            logger.warn(`Class :: ${classname} :: Method :: ${methodname} Campaign not found with ID: ${id}`);
            return res.status(404).json({
                success: false,
                error: 'Campaign not found'
            });
        }

        logger.info(`Class :: ${classname} :: Method :: ${methodname} Updated campaign: ${updatedCampaign.campaignname}`);
        return res.status(200).json({
            success: true,
            data: updatedCampaign
        });
    } catch (error) {
        logger.error(`Class :: ${classname} :: Method :: ${methodname} ERROR :: ${error}`);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

/**
 * DELETE /api/campaigns/:id
 * Delete a campaign
 */
exports.deleteCampaign = async (req, res) => {
    const methodname = 'deleteCampaign';
    const { id } = req.params;
    logger.info(`Class :: ${classname} :: Method :: ${methodname} Begin - ID: ${id}`);
    try {
        const deleted = await campaignsService.deleteCampaign(parseInt(id));

        if (!deleted) {
            logger.warn(`Class :: ${classname} :: Method :: ${methodname} Campaign not found with ID: ${id}`);
            return res.status(404).json({
                success: false,
                error: 'Campaign not found'
            });
        }

        logger.info(`Class :: ${classname} :: Method :: ${methodname} Deleted campaign with ID: ${id}`);
        return res.status(200).json({
            success: true,
            message: 'Campaign deleted successfully'
        });
    } catch (error) {
        logger.error(`Class :: ${classname} :: Method :: ${methodname} ERROR :: ${error}`);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

/**
 * POST /api/campaigns/sync
 * Sync campaigns from JSON to database
 */
exports.syncCampaignsFromJson = async (req, res) => {
    const methodname = 'syncCampaignsFromJson';
    logger.info(`Class :: ${classname} :: Method :: ${methodname} Begin`);
    try {
        await campaignsService.syncCampaignsToDatabase();
        logger.info(`Class :: ${classname} :: Method :: ${methodname} Campaigns synced successfully`);
        return res.status(200).json({
            success: true,
            message: 'Campaigns synced from JSON to database successfully'
        });
    } catch (error) {
        logger.error(`Class :: ${classname} :: Method :: ${methodname} ERROR :: ${error}`);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};
