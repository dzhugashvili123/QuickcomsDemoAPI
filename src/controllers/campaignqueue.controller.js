require("dotenv").config();
const con = require('../../config');
var path = require("path");
var fs = require('fs');
const classname = 'cammpaignqueue.controller.js';
const logger = require("../utils/logtrace");
var request = require("request");
const formidable = require('formidable');
const fastcsv = require("fast-csv");
const db = require("../utils/database");
const cryptojs = require('crypto-js');
const { messagequeueStatusEnum } = require('../models/whatsapp.message.status');
const { log } = require("console");
var util = require('util');
var readFile = util.promisify(fs.readFile);
const passwordKey = '123'; // same key used for encrypting passwords
const pdfUrlMapping = {};
var schedule = require("../services/pdf.server");

exports.UploadECCampaignData = async (req, res) => {
	try {
		logger.info(`Class :: ${classname} :: Method :: UploadECCampaignData Begin`);
		const form = formidable({ multiples: false }); // single file

		form.parse(req, async (err, fields, files) => {
			if (err) {
				logger.error("Form parse error:", err);
				return res.status(500).json({ error: "File parsing error" });
			}

			const uploadedFile = files.file;
			if (!uploadedFile) {
				return res.status(400).json({ error: "No file uploaded" });
			}

			const destPath = path.join(con.APP_ROOTDIR, "src/config", uploadedFile.originalFilename);
			fs.mkdirSync(path.dirname(destPath), { recursive: true });

			if (fs.existsSync(destPath)) {
				const backupDir = path.join(con.APP_ROOTDIR, "src/config/backup");
				fs.mkdirSync(backupDir, { recursive: true });

				const dateStr = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
				const backupPath = path.join(backupDir, `${uploadedFile.originalFilename}_backup_${dateStr}`);

				fs.renameSync(destPath, backupPath); // move the existing file
				logger.info(`Existing file moved to backup: ${backupPath}`);
			}

			// Save the uploaded file
			fs.copyFile(uploadedFile.filepath, destPath, (err) => {
				if (err) {
					logger.error("File save error:", err);
					return res.status(500).json({ error: "Error saving file" });
				}

				// Delete temp file
				fs.unlink(uploadedFile.filepath, (unlinkErr) => {
					if (unlinkErr) logger.warn("Temp file delete warning:", unlinkErr);
				});

				logger.info("File uploaded successfully to: " + destPath);
				res.json({
					message: "File uploaded successfully",
					location: destPath
				});
			});
		});
		logger.info(`Class :: ${classname} :: Method :: UploadEcCampaignData End`);
	} catch (ex) {
		logger.error("Exception ERROR :: " + ex);
		return res.status(500).json({ error: "Internal server error" });
	}
};

exports.ProcessCampgingCsv = async (req, res) => {
	try {
		logger.info(`Class :: ${classname} :: Method :: ProcessCampaigningCsv Begin`);

		const { fileName, campaignName } = req.body;
		if (!fileName) return res.status(400).json({ error: 'File name is required' });
		if (!campaignName) return res.status(400).json({ error: 'Campaign name is required' });

		const originalFilePath = path.join(con.APP_ROOTDIR, "src/config", fileName);
		if (!fs.existsSync(originalFilePath)) {
			return res.status(404).json({ error: 'File not found' });
		}

		// Load campaign fields configuration
		const readJson = await readFile(con.APP_ROOTDIR + "src/config/campaignqueue.json", "utf8");
		const fieldsConfig = JSON.parse(readJson);
		const campaignConfig = fieldsConfig.campaigns.find(c => c.campaignname === campaignName);
		const matches = fieldsConfig.campaigns
			.filter(c => c.campaignname === campaignName);

		console.log("MATCH COUNT =", matches.length);
		console.log(JSON.stringify(matches, null, 2));
		if (!campaignConfig) {
			return res.status(400).json({ error: `No configuration found for campaign: ${campaignName}` });
		}

		const rowsToInsert = [];

		fs.createReadStream(originalFilePath)
			.pipe(fastcsv.parse({ headers: true }))
			.on('error', error => {
				logger.error('CSV read error:', error);
				res.status(500).json({ error: 'Failed to read CSV file' });
			})
			.on('data', row => {
				// Only include fields defined in the JSON configuration
				const filteredRow = {};
				campaignConfig.fields.forEach(field => {
					filteredRow[field.key] = row[field.key] || '';
				});

				filteredRow.status = messagequeueStatusEnum.received;
				filteredRow.timestamp = new Date().toISOString();
				filteredRow.campaignname = campaignName;

				rowsToInsert.push(filteredRow);
			})
			.on('end', async rowCount => {
				logger.info(`CSV file read successfully. ${rowCount} rows`);

				try {
					const insertedRows = await db.campaignqueue.bulkCreate(rowsToInsert);
					await db.uploadedfiledata.create({
						filename: fileName,
						campaignname: campaignName,
						rowData: rowsToInsert, // save all CSV rows as JSON
						rowCount: insertedRows.length,
					});

					// Move the processed CSV to "processed" folder
					const processedDir = path.join(con.APP_ROOTDIR, "src/config/processed");
					if (!fs.existsSync(processedDir)) fs.mkdirSync(processedDir, { recursive: true });

					const processedFilePath = path.join(processedDir, fileName);
					fs.renameSync(originalFilePath, processedFilePath);

					res.json({
						message: 'Data inserted into campaignqueue successfully',
						insertedCount: insertedRows.length,
						filePath: processedFilePath
					});
				} catch (insertError) {
					logger.error('Database insert error:', insertError);
					res.status(500).json({ error: 'Failed to insert data into campaignqueue' });
				}
			});

		logger.info(`Class :: ${classname} :: Method :: ProcessCampaigningCsv End`);
	} catch (ex) {
		logger.error("Exception ERROR :: " + ex);
		return res.status(500).json({ error: "Internal server error" });
	}
};

// exports.ProcessCampgingCsv = async (req, res) => {
// 	try {
// 		logger.info(`Class :: ${classname} :: Method :: ProcessCampgingCsv Begin`);
// 		const { fileName, campaignName } = req.body;
// 		if (!fileName) return res.status(400).json({ error: 'File name is required' });
// 		if (!campaignName) return res.status(400).json({ error: 'Campaign name is required' });

// 		const originalFilePath = path.join(con.APP_ROOTDIR, "src/config", fileName);
// 		if (!fs.existsSync(originalFilePath)) {
// 			return res.status(404).json({ error: 'File not found' });
// 		}

// 		const rowsToInsert = [];

// 		fs.createReadStream(originalFilePath)
// 			.pipe(fastcsv.parse({ headers: true }))
// 			.on('error', error => {
// 				logger.error('CSV read error:', error);
// 				res.status(500).json({ error: 'Failed to read CSV file' });
// 			})
// 			.on('data', row => {
// 				row.status = messagequeueStatusEnum.received;
// 				row.timestamp = new Date().toISOString();
// 				row.campaignname = campaignName;
// 				rowsToInsert.push(row);
// 			})
// 			.on('end', async rowCount => {
// 				logger.info(`CSV file read successfully. ${rowCount} rows`);

// 				try {
// 					const insertedRows = await db.campaignqueue.bulkCreate(rowsToInsert);

// 					// After inserting records, move the file to a "processed" folder
// 					const processedDir = path.join(con.APP_ROOTDIR, "src/config/processed");
// 					if (!fs.existsSync(processedDir)) fs.mkdirSync(processedDir, { recursive: true });

// 					const processedFilePath = path.join(processedDir, fileName);
// 					fs.renameSync(originalFilePath, processedFilePath); // move file

// 					res.json({
// 						message: 'Data inserted into campaignqueue successfully',
// 						insertedCount: insertedRows.length,
// 						filePath: processedFilePath
// 					});
// 				} catch (insertError) {
// 					logger.error('Database insert error:', insertError);
// 					res.status(500).json({ error: 'Failed to insert data into campaignqueue' });
// 				}
// 			});
// 		logger.info(`Class :: ${classname} :: Method :: ProcessCampgingCsv End`);
// 	} catch (ex) {
// 		logger.error("Exception ERROR :: " + ex);
// 		return res.status(500).json({ error: "Internal server error" });
// 	}
// };

exports.GetCampaignsCampaignQueue = (_req, res) => {
	try {
		logger.info(`Class :: ${classname} :: Method :: GetCampaignsCampaignQueue Begin`);
		const filePath = path.join(con.APP_ROOTDIR, 'src/config/campaignqueue.json');

		const data = fs.readFileSync(filePath, 'utf8');
		const json = JSON.parse(data);

		logger.info(`Campaigns retrieved successfully: ${json.campaigns.length} campaigns found`);

		return res.json({
			success: true,
			campaigns: json.campaigns || []
		});
	} catch (err) {
		logger.error('GetCampaigns error:', err);
		return res.status(500).json({ error: 'Internal server error' });
	}
};

exports.loginUser = async (req, res) => {
	const methodname = 'loginUser';
	logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");

	try {
		const { identifier, password } = req.body;
		if (!identifier || !password) {
			return res.status(400).json({ success: false, error: 'Username/email and password required' });
		}

		const selectQuery = `
            SELECT id, firstname, lastname, username, email, "passwordHash"
            FROM public.campaignusers
            WHERE ("username" = :identifier OR "email" = :identifier)
              AND "isDeleted" = false
            LIMIT 1
        `;

		const users = await db.sequelize.query(selectQuery, { replacements: { identifier }, type: db.sequelize.QueryTypes.SELECT });
		if (!users || users.length === 0) {
			return res.status(401).json({ success: false, error: 'Invalid username/email or password' });
		}

		const { id, firstname, lastname, username: dbUsername, email, passwordHash } = users.shift();

		// Decrypt stored password
		const storedPassword = passwordHash.replaceAll('xMl3Jk', '+').replaceAll('Por21Ld', '/').replaceAll('Ml32', '=');
		const decryptedPassword = cryptojs.AES.decrypt(storedPassword, passwordKey).toString(cryptojs.enc.Utf8);

		// Compare passwords
		if (decryptedPassword !== password) {
			return res.status(401).json({ success: false, error: 'Invalid username/email or password' });
		}

		logger.info(`User logged in successfully: ${dbUsername}`);

		return res.json({
			success: true,
			id,
			username: dbUsername,
			firstname,
			lastname,
			email,
		});

	} catch (ex) {
		logger.error("Class :: " + classname + " :: Method :: " + methodname + " ERROR = " + ex);
		return res.status(500).json({ success: false, error: 'Internal server error' });
	}
};

exports.handleSubmitSelectedRows = async (req, res) => {
	const methodname = 'handleSubmitSelectedRows';
	logger.info(`Class :: ${classname} :: Method :: ${methodname} Begin`);

	try {
		logger.info(
			`Class :: ${classname} :: Method :: ${methodname} Request Body = ${JSON.stringify(req.body, null, 2)}`
		);

		const { selectedRows, selectedCampaign } = req.body;

		if (!selectedRows || !Array.isArray(selectedRows) || selectedRows.length === 0) {
			return res.status(400).json({
				success: false,
				error: 'No rows selected'
			});
		}

		// Extract numeric IDs safely
		const ids = selectedRows
			.map(row => Number(row.id))
			.filter(id => !isNaN(id));

		if (ids.length === 0) {
			return res.status(400).json({
				success: false,
				error: 'No valid IDs found'
			});
		}

		// BULK UPDATE (single query)
		const query = `
			UPDATE public.campaignqueues
			SET
				status = 1,
				"updatedAt" = NOW()
			WHERE id IN (:ids)
		`;

		await db.sequelize.query(query, {
			replacements: {
				ids,
				campaignname: selectedCampaign
			}
		});

		logger.info(
			`Class :: ${classname} :: Method :: ${methodname} Successfully updated ${ids.length} rows`
		);

		return res.status(200).json({
			success: true,
			updatedCount: ids.length
		});

	} catch (ex) {
		logger.error(
			`Class :: ${classname} :: Method :: ${methodname} ERROR = ${ex}`
		);

		return res.status(500).json({
			success: false,
			error: 'Internal server error'
		});
	}
};


exports.GetSelectCampaigns = async (req, res) => {
	const methodname = 'GetSelectCampaigns';
	logger.info(`Class :: ${classname} :: Method :: ${methodname} Begin`);
	try {
		// Fetch the most recent uploaded file (first record by uploadedAt)
		// const uploadedFile = await db.uploadedfiledata.findOne({
		//     order: [['uploadedAt', 'DESC']] // newest first
		// });

		const uploadedFile = await db.uploadedfiledata.findOne({
			order: [['id', 'ASC']] // first inserted record
		});

		if (!uploadedFile) {
			return res.status(404).json({ success: false, error: 'No uploaded file found' });
		}

		res.json({ success: true, data: uploadedFile });
	} catch (ex) {
		logger.error(`Class :: ${classname} :: Method :: ${methodname} ERROR = ${ex}`);
		res.status(500).json({ success: false, error: 'Internal server error' });
	}
};

exports.generatePefOverview = async (req, res) => {
	const methodname = 'generatePefOverview';
	logger.info(`Class :: ${classname} :: Method :: ${methodname} Begin`);
	try {
		const shortId = req.params.shortId;
		const record = await db.pdfmapping.findOne({ where: { shortId } });
		if (!record) {
			return res.status(404).send("Invalid URL or data not found");
		}
		const readJson = await readFile(con.APP_ROOTDIR + "src/config/campaignqueue.json", "utf8");
		const campaignName = record.campaignname;
		const fieldsConfig = JSON.parse(readJson);
		const campaignConfig = fieldsConfig.campaigns.find(c => c.campaignname === campaignName);
		logger.info(`Campaign Config: ${JSON.stringify(campaignConfig)}`);
		const userData = record.userData;

		const pdfPath = path.join(con.APP_ROOTDIR, `src/config/${con.PDF_FILENAME}`);
		const pdfBuffer = await schedule.overlayTextOnPDF(pdfPath, userData, campaignConfig);


		res.setHeader("Content-Type", "application/pdf");
		res.setHeader("Content-Disposition", "inline; filename=generated.pdf");
		res.send(pdfBuffer);

	} catch (ex) {
		logger.error(`Class :: ${classname} :: Method :: ${methodname} ERROR = ${ex}`);
		return res.status(500).json({ success: false, error: 'Internal server error' });
	}
}
