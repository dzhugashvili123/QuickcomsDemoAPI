var logger = require('../utils/logtrace');
const classname = 'campaignqueue.controller.js';
require("dotenv").config();

const db = require("../utils/database");
const Sequelize = require('sequelize');

exports.getBjpCampaignUsers = async (req, res) => {
    const methodname = 'getBjpCampaignUsers';
    console.log("!!!Ballsy!!!");
    logger.info(`Class :: ${classname} :: Method :: ${methodname} :: Begin`);

    try {
        const campaignName = req.query.campaignName || 'Demo List';

        logger.info(`Campaign Name = ${campaignName}`);

        const query = `
            SELECT
                id,
                "firstName",
                "lastName",
                "MobileNo",
                email,
                city,
                state,
                zip,
                "ConstituencyName",
                "PartyName",
                text1link,
                "AtalPensionYojana",
                "APY_Amount",
                "APY_Date",
                "PMKSN",
                "PMKSN_Amount",
                "PMKSN_Date",
                "PMGAY",
                "PMGAY_Amount",
                "PMGAY_Date",
                "ThallikiVandhanam",
                "ThallikiVandhanam_Amount",
                "ThallikiVandhanam_Date",
                "AnnaDhaatha",
                "AnnaDhaatha_Amount",
                "AnnaDhaatha_Date",
                "MahaShakti",
                "MahaShakti_Amount",
                "MahaShakti_Date",
                "selectLanguage"
            FROM public.campaignqueues
            WHERE campaignname = :campaignName AND "PartyName" = 'BJP'
            ORDER BY "createdAt" DESC
        `;

        const results = await db.sequelize.query(query, {
            replacements: { campaignName },
            type: Sequelize.QueryTypes.SELECT
        });

        logger.info(
            `Class :: ${classname} :: Method :: ${methodname} :: Records fetched = ${results.length}`
        );

        return res.status(200).json({
            success: true,
            data: {
                rowData: results
            }
        });

    } catch (err) {
        logger.error(
            `Class :: ${classname} :: Method :: ${methodname} :: ERROR = ${err}`
        );

        return res.status(500).json({
            success: false,
            message: 'Failed to fetch campaign users',
            error: err.message
        });
    } finally {
        logger.info(`Class :: ${classname} :: Method :: ${methodname} :: End`);
    }
};

exports.getTdpCampaignUsers = async (req, res) => {
    const methodname = 'getTdpCampaignUsers';
    console.log("!!!Ballsy!!!");
    logger.info(`Class :: ${classname} :: Method :: ${methodname} :: Begin`);

    try {
        const campaignName = req.query.campaignName || 'Demo List';

        logger.info(`Campaign Name = ${campaignName}`);

        const query = `
            SELECT
                id,
                "firstName",
                "lastName",
                "MobileNo",
                email,
                city,
                state,
                zip,
                "ConstituencyName",
                "PartyName",
                text1link,
                "AtalPensionYojana",
                "APY_Amount",
                "APY_Date",
                "PMKSN",
                "PMKSN_Amount",
                "PMKSN_Date",
                "PMGAY",
                "PMGAY_Amount",
                "PMGAY_Date",
                "ThallikiVandhanam",
                "ThallikiVandhanam_Amount",
                "ThallikiVandhanam_Date",
                "AnnaDhaatha",
                "AnnaDhaatha_Amount",
                "AnnaDhaatha_Date",
                "MahaShakti",
                "MahaShakti_Amount",
                "MahaShakti_Date",
                "selectLanguage"
            FROM public.campaignqueues
            WHERE campaignname = :campaignName AND "PartyName" = 'TDP'
            ORDER BY "createdAt" DESC
        `;

        const results = await db.sequelize.query(query, {
            replacements: { campaignName },
            type: Sequelize.QueryTypes.SELECT
        });

        logger.info(
            `Class :: ${classname} :: Method :: ${methodname} :: Records fetched = ${results.length}`
        );

        return res.status(200).json({
            success: true,
            data: {
                rowData: results
            }
        });

    } catch (err) {
        logger.error(
            `Class :: ${classname} :: Method :: ${methodname} :: ERROR = ${err}`
        );

        return res.status(500).json({
            success: false,
            message: 'Failed to fetch campaign users',
            error: err.message
        });
    } finally {
        logger.info(`Class :: ${classname} :: Method :: ${methodname} :: End`);
    }
};

exports.getAdvCampaignUsers = async (req, res) => {
    const methodname = 'getAdvCampaignUsers';
    console.log("!!!Ballsy!!!");
    logger.info(`Class :: ${classname} :: Method :: ${methodname} :: Begin`);

    try {
        const campaignName = req.query.campaignName || 'Demo List';

        logger.info(`Campaign Name = ${campaignName}`);

        const query = `
            SELECT
                id,
                "firstName",
                "lastName",
                "MobileNo",
                email,
                city,
                state,
                zip,
                "ConstituencyName",
                "PartyName",
                text1link,
                "AtalPensionYojana",
                "APY_Amount",
                "APY_Date",
                "PMKSN",
                "PMKSN_Amount",
                "PMKSN_Date",
                "PMGAY",
                "PMGAY_Amount",
                "PMGAY_Date",
                "ThallikiVandhanam",
                "ThallikiVandhanam_Amount",
                "ThallikiVandhanam_Date",
                "AnnaDhaatha",
                "AnnaDhaatha_Amount",
                "AnnaDhaatha_Date",
                "MahaShakti",
                "MahaShakti_Amount",
                "MahaShakti_Date",
                "selectLanguage"
            FROM public.campaignqueues
            WHERE campaignname = :campaignName AND "PartyName" = 'ADV'
            ORDER BY "createdAt" DESC
        `;

        const results = await db.sequelize.query(query, {
            replacements: { campaignName },
            type: Sequelize.QueryTypes.SELECT
        });

        logger.info(
            `Class :: ${classname} :: Method :: ${methodname} :: Records fetched = ${results.length}`
        );

        return res.status(200).json({
            success: true,
            data: {
                rowData: results
            }
        });

    } catch (err) {
        logger.error(
            `Class :: ${classname} :: Method :: ${methodname} :: ERROR = ${err}`
        );

        return res.status(500).json({
            success: false,
            message: 'Failed to fetch campaign users',
            error: err.message
        });
    } finally {
        logger.info(`Class :: ${classname} :: Method :: ${methodname} :: End`);
    }
};

exports.updateCampaignUser = async (req, res) => {
    try {
        const data = req.body;

        if (!data.id) {
            return res.status(400).json({
                success: false,
                message: 'ID is required'
            });
        }

        // Map of allowed DB columns ←→ request fields
        const fieldMap = {
            firstName: `"firstName"`,
            lastName: `"lastName"`,
            MobileNo: `"MobileNo"`,
            email: `email`,
            city: `city`,
            state: `state`,
            zip: `zip`,
            ConstituencyName: `"ConstituencyName"`,
            PartyName: `"PartyName"`,
            text1link: `text1link`,
            AtalPensionYojana: `"AtalPensionYojana"`,
            APY_Amount: `"APY_Amount"`,
            APY_Date: `"APY_Date"`,
            PMKSN: `"PMKSN"`,
            PMKSN_Amount: `"PMKSN_Amount"`,
            PMKSN_Date: `"PMKSN_Date"`,
            PMGAY: `"PMGAY"`,
            PMGAY_Amount: `"PMGAY_Amount"`,
            PMGAY_Date: `"PMGAY_Date"`,
            selectLanguage: `"selectLanguage"`
        };

        const updates = [];
        const replacements = { id: data.id };

        // Build SET clause dynamically
        for (const key in fieldMap) {
            const value = data[key];

            // 🔑 THIS IS THE CORE RULE
            if (value !== undefined && value !== null && value !== '') {
                updates.push(`${fieldMap[key]} = :${key}`);
                replacements[key] = value;
            }
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields provided to update'
            });
        }

        // Always update updatedAt
        updates.push(`"updatedAt" = NOW()`);

        const query = `
            UPDATE public.campaignqueues
            SET ${updates.join(', ')}
            WHERE id = :id
        `;

        await db.sequelize.query(query, { replacements });

        return res.status(200).json({
            success: true,
            message: 'Campaign user updated successfully'
        });

    } catch (err) {
        console.error('Update error:', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to update campaign user',
            error: err.message
        });
    }
};

exports.updateBjpCampaignUser = async (req, res) => {
    try {
        const data = req.body;

        if (!data.id) {
            return res.status(400).json({
                success: false,
                message: 'ID is required'
            });
        }

        // Map of allowed DB columns ←→ request fields
        const fieldMap = {
            firstName: `"firstName"`,
            lastName: `"lastName"`,
            MobileNo: `"MobileNo"`,
            email: `email`,
            city: `city`,
            state: `state`,
            zip: `zip`,
            ConstituencyName: `"ConstituencyName"`,
            PartyName: `"PartyName"`,
            text1link: `text1link`,
            AtalPensionYojana: `"AtalPensionYojana"`,
            APY_Amount: `"APY_Amount"`,
            APY_Date: `"APY_Date"`,
            PMKSN: `"PMKSN"`,
            PMKSN_Amount: `"PMKSN_Amount"`,
            PMKSN_Date: `"PMKSN_Date"`,
            PMGAY: `"PMGAY"`,
            PMGAY_Amount: `"PMGAY_Amount"`,
            PMGAY_Date: `"PMGAY_Date"`,
            selectLanguage: `"selectLanguage"`
        };

        const updates = [];
        const replacements = { id: data.id };

        // Build SET clause dynamically
        for (const key in fieldMap) {
            const value = data[key];

            // 🔑 THIS IS THE CORE RULE
            if (value !== undefined && value !== null && value !== '') {
                updates.push(`${fieldMap[key]} = :${key}`);
                replacements[key] = value;
            }
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields provided to update'
            });
        }

        // Always update updatedAt
        updates.push(`"updatedAt" = NOW()`);

        const query = `
            UPDATE public.campaignqueues
            SET ${updates.join(', ')}
            WHERE id = :id
        `;

        await db.sequelize.query(query, { replacements });

        return res.status(200).json({
            success: true,
            message: 'Campaign user updated successfully'
        });

    } catch (err) {
        console.error('Update error:', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to update campaign user',
            error: err.message
        });
    }
};

exports.updateTdpCampaignUser = async (req, res) => {
    try {
        const data = req.body;

        if (!data.id) {
            return res.status(400).json({
                success: false,
                message: 'ID is required'
            });
        }

        // Map of allowed DB columns ←→ request fields
        const fieldMap = {
            firstName: `"firstName"`,
            lastName: `"lastName"`,
            MobileNo: `"MobileNo"`,
            email: `email`,
            city: `city`,
            state: `state`,
            zip: `zip`,
            ConstituencyName: `"ConstituencyName"`,
            PartyName: `"PartyName"`,
            text1link: `text1link`,
            ThallikiVandhanam: `"ThallikiVandhanam"`,
            ThallikiVandhanam_Amount: `"ThallikiVandhanam_Amount"`,
            ThallikiVandhanam_Date: `"ThallikiVandhanam_Date"`,
            AnnaDhaatha: `"AnnaDhaatha"`,
            AnnaDhaatha_Amount: `"AnnaDhaatha_Amount"`,
            AnnaDhaatha_Date: `"AnnaDhaatha_Date"`,
            MahaShakti: `"MahaShakti"`,
            MahaShakti_Amount: `"MahaShakti_Amount"`,
            MahaShakti_Date: `"MahaShakti_Date"`,
            selectLanguage: `"selectLanguage"`
        };

        const updates = [];
        const replacements = { id: data.id };

        // Build SET clause dynamically
        for (const key in fieldMap) {
            const value = data[key];

            // 🔑 THIS IS THE CORE RULE
            if (value !== undefined && value !== null && value !== '') {
                updates.push(`${fieldMap[key]} = :${key}`);
                replacements[key] = value;
            }
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields provided to update'
            });
        }

        // Always update updatedAt
        updates.push(`"updatedAt" = NOW()`);

        const query = `
            UPDATE public.campaignqueues
            SET ${updates.join(', ')}
            WHERE id = :id
        `;

        await db.sequelize.query(query, { replacements });

        return res.status(200).json({
            success: true,
            message: 'Campaign user updated successfully'
        });

    } catch (err) {
        console.error('Update error:', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to update campaign user',
            error: err.message
        });
    }
};

exports.updateAdvCampaignUser = async (req, res) => {
    try {
        const data = req.body;

        if (!data.id) {
            return res.status(400).json({
                success: false,
                message: 'ID is required'
            });
        }

        // Map of allowed DB columns ←→ request fields
        const fieldMap = {
            firstName: `"firstName"`,
            lastName: `"lastName"`,
            MobileNo: `"MobileNo"`,
            PartyName: `"PartyName"`,
            text1link: `text1link`,
            selectLanguage: `"selectLanguage"`
        };

        const updates = [];
        const replacements = { id: data.id };

        // Build SET clause dynamically
        for (const key in fieldMap) {
            const value = data[key];

            // 🔑 THIS IS THE CORE RULE
            if (value !== undefined && value !== null && value !== '') {
                updates.push(`${fieldMap[key]} = :${key}`);
                replacements[key] = value;
            }
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields provided to update'
            });
        }

        // Always update updatedAt
        updates.push(`"updatedAt" = NOW()`);

        const query = `
            UPDATE public.campaignqueues
            SET ${updates.join(', ')}
            WHERE id = :id
        `;

        await db.sequelize.query(query, { replacements });

        return res.status(200).json({
            success: true,
            message: 'Campaign user updated successfully'
        });

    } catch (err) {
        console.error('Update error:', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to update campaign user',
            error: err.message
        });
    }
};