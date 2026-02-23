const db = require("../utils/database");
const fastcsv = require("fast-csv");
const logger = require("../utils/logtrace");

exports.DownloadCampaignSample = async (req, res) => {
    try {
        const { campaignName } = req.query;
        if (!campaignName) {
            return res.status(400).json({ error: "Campaign name is required" });
        }

        const campaign = await db.campaigns.findOne({ where: { campaignname: campaignName } });
        if (!campaign) {
            return res.status(404).json({ error: "Campaign not found" });
        }

        const fields = campaign.fields || [];
        if (fields.length === 0) {
            return res.status(400).json({ error: "No fields defined for this campaign" });
        }

        const headers = fields.map(f => f.key);

        // Add default fields if they are not in the schema but expected
        if (!headers.includes('MobileNo')) headers.push('MobileNo');
        if (!headers.includes('email')) headers.push('email');
        if (!headers.includes('selectLanguage')) headers.push('selectLanguage');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${campaignName}_sample.csv`);

        const csvStream = fastcsv.format({ headers: true });
        csvStream.pipe(res);

        // Write one empty row with headers
        const emptyRow = {};
        headers.forEach(h => emptyRow[h] = "");
        csvStream.write(emptyRow);
        csvStream.end();

    } catch (error) {
        logger.error("Error in DownloadCampaignSample:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
