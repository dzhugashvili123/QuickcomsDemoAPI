const express = require("express");
const router = express.Router();
const {
    getAllCampaigns,
    getActiveCampaigns,
    getCampaignsByStatus,
    getCampaignById,
    getCampaignByName,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    syncCampaignsFromJson
} = require("../controllers/campaigns.controller");

// GET routes
router.get("/campaigns", getAllCampaigns);
router.get("/campaigns/active", getActiveCampaigns);
router.get("/campaigns/status/:status", getCampaignsByStatus);
router.get("/campaigns/:id", getCampaignById);
router.get("/campaigns/name/:name", getCampaignByName);

// POST routes
router.post("/campaigns", createCampaign);
router.post("/campaigns/sync", syncCampaignsFromJson);

// PUT routes
router.put("/campaigns/:id", updateCampaign);

// DELETE routes
router.delete("/campaigns/:id", deleteCampaign);

module.exports = router;
