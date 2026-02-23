const express = require("express");
const router = express.Router();
const {
    getAllClients,
    getActiveClients,
    getClientsByStatus,
    getClientById,
    getClientByName,
    createClient,
    updateClient,
    deleteClient,
    syncClientsFromJson,
    getClientCampaigns
} = require("../controllers/clients.controller");

// GET routes
router.get("/clients", getAllClients);
router.get("/clients/active", getActiveClients);
router.get("/clients/status/:status", getClientsByStatus);
router.get("/clients/:id", getClientById);
router.get("/clients/name/:name", getClientByName);
router.get("/clients/:id/campaigns", getClientCampaigns);

// POST routes
router.post("/clients", createClient);
router.post("/clients/sync", syncClientsFromJson);

// PUT routes
router.put("/clients/:id", updateClient);

// DELETE routes
router.delete("/clients/:id", deleteClient);

module.exports = router;
