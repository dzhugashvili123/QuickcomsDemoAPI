var logger = require('../utils/logtrace');
const classname = 'clients.service.js';
require("dotenv").config();
const con = require('../../config');
const db = require("../utils/database");
var fs = require('fs');
var path = require('path');

/**
 * Read clients.json from config folder
 */
exports.readClientsFromJson = async () => {
    const methodname = 'readClientsFromJson';
    logger.info(`Class :: ${classname} :: Method :: ${methodname} Begin`);
    try {
        const filePath = path.join(con.APP_ROOTDIR, 'src/config/clients.json');
        const data = await fs.promises.readFile(filePath, 'utf8');
        const jsonData = JSON.parse(data);
        logger.info(`Class :: ${classname} :: Method :: ${methodname} Successfully read ${jsonData.Clients?.length || 0} clients from JSON`);
        return jsonData.Clients || [];
    } catch (error) {
        logger.error(`Class :: ${classname} :: Method :: ${methodname} Error :: ${error}`);
        throw error;
    }
};

/**
 * Sync clients from JSON file to database (overwrite existing records)
 */
exports.syncClientsToDatabase = async () => {
    const methodname = 'syncClientsToDatabase';
    logger.info(`Class :: ${classname} :: Method :: ${methodname} Begin`);
    try {
        // Read clients from JSON file
        const clients = await exports.readClientsFromJson();

        if (!clients || clients.length === 0) {
            logger.warn(`Class :: ${classname} :: Method :: ${methodname} No clients found in JSON file`);
            return;
        }

        // Delete all existing records
        await db.clients.destroy({ where: {}, truncate: true });
        logger.info(`Class :: ${classname} :: Method :: ${methodname} Cleared existing client records`);

        // Insert new records
        for (const client of clients) {
            await db.clients.create({
                id: client.id,
                name: client.name,
                status: client.status || 'active',
                clientMeta: client.clientMeta || {},
                whatsAppConfig: client.whatsAppConfig || {},
                smsConfig: client.smsConfig || {},
                emailConfig: client.emailConfig || {},
                campaigns: client.campaigns || ""
            });
            logger.info(`Class :: ${classname} :: Method :: ${methodname} Inserted client: ${client.name} (ID: ${client.id})`);
        }

        logger.info(`Class :: ${classname} :: Method :: ${methodname} Successfully synced ${clients.length} clients to database`);
    } catch (error) {
        logger.error(`Class :: ${classname} :: Method :: ${methodname} Error :: ${error}`);
        throw error;
    }
};

/**
 * Get all clients from database
 */
exports.getAllClients = async () => {
    const methodname = 'getAllClients';
    logger.info(`Class :: ${classname} :: Method :: ${methodname} Begin`);
    try {
        const clients = await db.clients.findAll({
            attributes: { exclude: ['whatsAppConfig', 'smsConfig', 'emailConfig'] }
        });
        logger.info(`Class :: ${classname} :: Method :: ${methodname} Found ${clients.length} clients`);
        return clients;
    } catch (error) {
        logger.error(`Class :: ${classname} :: Method :: ${methodname} Error :: ${error}`);
        throw error;
    }
};

/**
 * Get client by ID
 */
exports.getClientById = async (id) => {
    const methodname = 'getClientById';
    logger.info(`Class :: ${classname} :: Method :: ${methodname} Begin - ID: ${id}`);
    try {
        const client = await db.clients.findOne({
            where: { id },
            attributes: { exclude: ['whatsAppConfig', 'smsConfig', 'emailConfig'] }
        });
        if (client) {
            logger.info(`Class :: ${classname} :: Method :: ${methodname} Found client: ${client.name}`);
        } else {
            logger.warn(`Class :: ${classname} :: Method :: ${methodname} Client not found with ID: ${id}`);
        }
        return client;
    } catch (error) {
        logger.error(`Class :: ${classname} :: Method :: ${methodname} Error :: ${error}`);
        throw error;
    }
};

/**
 * Get client by name
 */
exports.getClientByName = async (name) => {
    const methodname = 'getClientByName';
    logger.info(`Class :: ${classname} :: Method :: ${methodname} Begin - Name: ${name}`);
    try {
        const client = await db.clients.findOne({
            where: { name },
            attributes: { exclude: ['whatsAppConfig', 'smsConfig', 'emailConfig'] }
        });
        if (client) {
            logger.info(`Class :: ${classname} :: Method :: ${methodname} Found client: ${client.name}`);
        } else {
            logger.warn(`Class :: ${classname} :: Method :: ${methodname} Client not found with name: ${name}`);
        }
        return client;
    } catch (error) {
        logger.error(`Class :: ${classname} :: Method :: ${methodname} Error :: ${error}`);
        throw error;
    }
};

/**
 * Get clients by status (active/inactive)
 */
exports.getClientsByStatus = async (status) => {
    const methodname = 'getClientsByStatus';
    logger.info(`Class :: ${classname} :: Method :: ${methodname} Begin - Status: ${status}`);
    try {
        const clients = await db.clients.findAll({
            where: { status },
            attributes: { exclude: ['whatsAppConfig', 'smsConfig', 'emailConfig'] }
        });
        logger.info(`Class :: ${classname} :: Method :: ${methodname} Found ${clients.length} clients with status: ${status}`);
        return clients;
    } catch (error) {
        logger.error(`Class :: ${classname} :: Method :: ${methodname} Error :: ${error}`);
        throw error;
    }
};

/**
 * Get all active clients
 */
exports.getActiveClients = async () => {
    const methodname = 'getActiveClients';
    logger.info(`Class :: ${classname} :: Method :: ${methodname} Begin`);
    try {
        const clients = await db.clients.findAll({
            where: { status: 'active' },
            attributes: { exclude: ['whatsAppConfig', 'smsConfig', 'emailConfig'] }
        });
        logger.info(`Class :: ${classname} :: Method :: ${methodname} Found ${clients.length} active clients`);
        return clients;
    } catch (error) {
        logger.error(`Class :: ${classname} :: Method :: ${methodname} Error :: ${error}`);
        throw error;
    }
};

/**
 * Create a new client
 */
exports.createClient = async (clientData) => {
    const methodname = 'createClient';
    logger.info(`Class :: ${classname} :: Method :: ${methodname} Begin`);
    try {
        const client = await db.clients.create({
            id: clientData.id,
            name: clientData.name,
            status: clientData.status || 'active',
            clientMeta: clientData.clientMeta || {},
            whatsAppConfig: clientData.whatsAppConfig || {},
            smsConfig: clientData.smsConfig || {},
            emailConfig: clientData.emailConfig || {},
            campaigns: clientData.campaigns || ""
        });
        logger.info(`Class :: ${classname} :: Method :: ${methodname} Created client: ${client.name} (ID: ${client.id})`);
        return client;
    } catch (error) {
        logger.error(`Class :: ${classname} :: Method :: ${methodname} Error :: ${error}`);
        throw error;
    }
};

/**
 * Update an existing client
 */
exports.updateClient = async (id, clientData) => {
    const methodname = 'updateClient';
    logger.info(`Class :: ${classname} :: Method :: ${methodname} Begin - ID: ${id}`);
    try {
        const updateData = {};
        if (clientData.name !== undefined) updateData.name = clientData.name;
        if (clientData.status !== undefined) updateData.status = clientData.status;
        if (clientData.clientMeta !== undefined) updateData.clientMeta = clientData.clientMeta;
        if (clientData.whatsAppConfig !== undefined) updateData.whatsAppConfig = clientData.whatsAppConfig;
        if (clientData.smsConfig !== undefined) updateData.smsConfig = clientData.smsConfig;
        if (clientData.emailConfig !== undefined) updateData.emailConfig = clientData.emailConfig;
        if (clientData.campaigns !== undefined) updateData.campaigns = clientData.campaigns;

        const [updatedRows] = await db.clients.update(updateData, { where: { id } });

        if (updatedRows > 0) {
            logger.info(`Class :: ${classname} :: Method :: ${methodname} Updated client with ID: ${id}`);
            return await exports.getClientById(id);
        } else {
            logger.warn(`Class :: ${classname} :: Method :: ${methodname} No client found with ID: ${id}`);
            return null;
        }
    } catch (error) {
        logger.error(`Class :: ${classname} :: Method :: ${methodname} Error :: ${error}`);
        throw error;
    }
};

/**
 * Delete a client by ID
 */
exports.deleteClient = async (id) => {
    const methodname = 'deleteClient';
    logger.info(`Class :: ${classname} :: Method :: ${methodname} Begin - ID: ${id}`);
    try {
        const deletedRows = await db.clients.destroy({ where: { id } });

        if (deletedRows > 0) {
            logger.info(`Class :: ${classname} :: Method :: ${methodname} Deleted client with ID: ${id}`);
            return true;
        } else {
            logger.warn(`Class :: ${classname} :: Method :: ${methodname} No client found with ID: ${id}`);
            return false;
        }
    } catch (error) {
        logger.error(`Class :: ${classname} :: Method :: ${methodname} Error :: ${error}`);
        throw error;
    }
};

/**
 * Get campaigns for a specific client
 */
exports.getClientCampaigns = async (clientId) => {
    const methodname = 'getClientCampaigns';
    logger.info(`Class :: ${classname} :: Method :: ${methodname} Begin - ClientID: ${clientId}`);
    try {
        const client = await db.clients.findOne({ where: { id: clientId } });
        if (!client || !client.campaigns) {
            logger.warn(`Class :: ${classname} :: Method :: ${methodname} No campaigns found for client: ${clientId}`);
            return [];
        }

        // Split "1,2,3" into [1, 2, 3]
        const campaignIds = client.campaigns.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));

        if (campaignIds.length === 0) return [];

        // Fetch all matching campaigns
        const campaigns = await db.campaigns.findAll({
            where: {
                id: campaignIds
            },
            attributes: { exclude: ['emailConfig', 'whatsappConfig', 'smsConfig'] }
        });

        logger.info(`Class :: ${classname} :: Method :: ${methodname} Found ${campaigns.length} campaigns for client: ${clientId}`);
        return campaigns;
    } catch (error) {
        logger.error(`Class :: ${classname} :: Method :: ${methodname} Error :: ${error}`);
        throw error;
    }
};

