require("dotenv").config();
const con = require('../../config');
const classname = 'clients.controller.js';
const logger = require("../utils/logtrace");
const clientsService = require("../services/clients.service");

/**
 * GET /api/clients
 * Get all clients
 */
exports.getAllClients = async (req, res) => {
    const methodname = 'getAllClients';
    logger.info(`Class :: ${classname} :: Method :: ${methodname} Begin`);
    try {
        const clients = await clientsService.getAllClients();
        logger.info(`Class :: ${classname} :: Method :: ${methodname} Retrieved ${clients.length} clients`);
        return res.status(200).json({
            success: true,
            count: clients.length,
            data: clients
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
 * GET /api/clients/active
 * Get all active clients
 */
exports.getActiveClients = async (req, res) => {
    const methodname = 'getActiveClients';
    logger.info(`Class :: ${classname} :: Method :: ${methodname} Begin`);
    try {
        const clients = await clientsService.getActiveClients();
        logger.info(`Class :: ${classname} :: Method :: ${methodname} Retrieved ${clients.length} active clients`);
        return res.status(200).json({
            success: true,
            count: clients.length,
            data: clients
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
 * GET /api/clients/status/:status
 * Get clients by status
 */
exports.getClientsByStatus = async (req, res) => {
    const methodname = 'getClientsByStatus';
    const { status } = req.params;
    logger.info(`Class :: ${classname} :: Method :: ${methodname} Begin - Status: ${status}`);
    try {
        const clients = await clientsService.getClientsByStatus(status);
        logger.info(`Class :: ${classname} :: Method :: ${methodname} Retrieved ${clients.length} clients with status: ${status}`);
        return res.status(200).json({
            success: true,
            count: clients.length,
            data: clients
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
 * GET /api/clients/:id
 * Get client by ID
 */
exports.getClientById = async (req, res) => {
    const methodname = 'getClientById';
    const { id } = req.params;
    logger.info(`Class :: ${classname} :: Method :: ${methodname} Begin - ID: ${id}`);
    try {
        const client = await clientsService.getClientById(parseInt(id));
        if (!client) {
            logger.warn(`Class :: ${classname} :: Method :: ${methodname} Client not found with ID: ${id}`);
            return res.status(404).json({
                success: false,
                error: 'Client not found'
            });
        }
        logger.info(`Class :: ${classname} :: Method :: ${methodname} Retrieved client: ${client.name}`);
        return res.status(200).json({
            success: true,
            data: client
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
 * GET /api/clients/name/:name
 * Get client by name
 */
exports.getClientByName = async (req, res) => {
    const methodname = 'getClientByName';
    const { name } = req.params;
    logger.info(`Class :: ${classname} :: Method :: ${methodname} Begin - Name: ${name}`);
    try {
        const client = await clientsService.getClientByName(name);
        if (!client) {
            logger.warn(`Class :: ${classname} :: Method :: ${methodname} Client not found with name: ${name}`);
            return res.status(404).json({
                success: false,
                error: 'Client not found'
            });
        }
        logger.info(`Class :: ${classname} :: Method :: ${methodname} Retrieved client: ${client.name}`);
        return res.status(200).json({
            success: true,
            data: client
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
 * POST /api/clients
 * Create a new client
 */
exports.createClient = async (req, res) => {
    const methodname = 'createClient';
    logger.info(`Class :: ${classname} :: Method :: ${methodname} Begin`);
    try {
        const clientData = req.body;

        // Validate required fields
        if (!clientData.id || !clientData.name) {
            return res.status(400).json({
                success: false,
                error: 'Client ID and name are required'
            });
        }

        const client = await clientsService.createClient(clientData);
        logger.info(`Class :: ${classname} :: Method :: ${methodname} Created client: ${client.name} (ID: ${client.id})`);
        return res.status(201).json({
            success: true,
            data: client
        });
    } catch (error) {
        logger.error(`Class :: ${classname} :: Method :: ${methodname} ERROR :: ${error}`);

        // Handle duplicate key error
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({
                success: false,
                error: 'Client with this ID already exists'
            });
        }

        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

/**
 * PUT /api/clients/:id
 * Update an existing client
 */
exports.updateClient = async (req, res) => {
    const methodname = 'updateClient';
    const { id } = req.params;
    logger.info(`Class :: ${classname} :: Method :: ${methodname} Begin - ID: ${id}`);
    try {
        const clientData = req.body;
        const updatedClient = await clientsService.updateClient(parseInt(id), clientData);

        if (!updatedClient) {
            logger.warn(`Class :: ${classname} :: Method :: ${methodname} Client not found with ID: ${id}`);
            return res.status(404).json({
                success: false,
                error: 'Client not found'
            });
        }

        logger.info(`Class :: ${classname} :: Method :: ${methodname} Updated client: ${updatedClient.name}`);
        return res.status(200).json({
            success: true,
            data: updatedClient
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
 * DELETE /api/clients/:id
 * Delete a client
 */
exports.deleteClient = async (req, res) => {
    const methodname = 'deleteClient';
    const { id } = req.params;
    logger.info(`Class :: ${classname} :: Method :: ${methodname} Begin - ID: ${id}`);
    try {
        const deleted = await clientsService.deleteClient(parseInt(id));

        if (!deleted) {
            logger.warn(`Class :: ${classname} :: Method :: ${methodname} Client not found with ID: ${id}`);
            return res.status(404).json({
                success: false,
                error: 'Client not found'
            });
        }

        logger.info(`Class :: ${classname} :: Method :: ${methodname} Deleted client with ID: ${id}`);
        return res.status(200).json({
            success: true,
            message: 'Client deleted successfully'
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
 * POST /api/clients/sync
 * Sync clients from JSON to database
 */
exports.syncClientsFromJson = async (req, res) => {
    const methodname = 'syncClientsFromJson';
    logger.info(`Class :: ${classname} :: Method :: ${methodname} Begin`);
    try {
        await clientsService.syncClientsToDatabase();
        logger.info(`Class :: ${classname} :: Method :: ${methodname} Clients synced successfully`);
        return res.status(200).json({
            success: true,
            message: 'Clients synced from JSON to database successfully'
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
 * GET /api/clients/:id/campaigns
 * Get campaigns assigned to a client
 */
exports.getClientCampaigns = async (req, res) => {
    const methodname = 'getClientCampaigns';
    const { id } = req.params;
    logger.info(`Class :: ${classname} :: Method :: ${methodname} Begin - ID: ${id}`);
    try {
        const campaigns = await clientsService.getClientCampaigns(parseInt(id));
        logger.info(`Class :: ${classname} :: Method :: ${methodname} Retrieved ${campaigns.length} campaigns for client: ${id}`);
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

