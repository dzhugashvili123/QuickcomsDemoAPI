require("dotenv").config();
const con = require('../../config');
var path = require("path");
var fs = require('fs');
const classname = 'cammpaignqueue.controller.js';
const logger = require("../utils/logtrace");
var request = require("request");
const formidable = require('formidable');
const fastcsv = require("fast-csv");
const XLSX = require("xlsx");
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

			const campaignName = fields.campaignName;
			const clientId = fields.clientId;

			const destPath = path.join(con.APP_ROOTDIR, "src/config", uploadedFile.originalFilename);
			fs.mkdirSync(path.dirname(destPath), { recursive: true });

			// Rename file helper
			const saveFile = () => {
				return new Promise((resolve, reject) => {
					fs.copyFile(uploadedFile.filepath, destPath, (err) => {
						if (err) reject(err);
						else resolve(true);
					});
				});
			};

			try {
				await saveFile();
				// Delete temp file
				fs.unlink(uploadedFile.filepath, () => { });

				// If campaign specified, validate immediately
				if (campaignName) {
					const campaignConfig = await db.campaigns.findOne({ where: { campaignname: campaignName } });
					if (!campaignConfig) {
						fs.unlinkSync(destPath);
						return res.status(400).json({ error: `Campaign configuration for '${campaignName}' not found.` });
					}

					const configFields = campaignConfig.fields || [];
					const requiredKeys = configFields.map(f => f.key);
					let rowCount = 0;

					const validate = (filePath) => {
						const ext = path.extname(filePath).toLowerCase();
						return new Promise((resolve, reject) => {
							if (ext === '.xlsx') {
								try {
									const workbook = XLSX.readFile(filePath);
									const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
									const headers = XLSX.utils.sheet_to_json(firstSheet, { header: 1 })[0] || [];
									const missingFields = requiredKeys.filter(key => !headers.includes(key));
									if (missingFields.length > 0) {
										return reject(new Error(`Missing required XLSX headers: ${missingFields.join(', ')}`));
									}
									const sheetData = XLSX.utils.sheet_to_json(firstSheet);
									rowCount = sheetData.length;
									resolve(true);
								} catch (err) {
									reject(err);
								}
							} else {
								// CSV logic
								let headersValidated = false;
								fs.createReadStream(filePath)
									.pipe(fastcsv.parse({ headers: true }))
									.on('headers', headers => {
										const missingFields = requiredKeys.filter(key => !headers.includes(key));
										if (missingFields.length > 0) {
											reject(new Error(`Missing required CSV headers: ${missingFields.join(', ')}`));
										}
										headersValidated = true;
									})
									.on('data', row => {
										const hasContent = Object.values(row).some(val => (val || '').toString().trim() !== '');
										if (hasContent) rowCount++;
									})
									.on('error', err => reject(err))
									.on('end', () => resolve(true));
							}
						});
					};

					try {
						await validate(destPath);
						logger.info(`File validation success: ${rowCount} rows found.`);
						return res.json({
							message: "File uploaded and validated successfully",
							fileName: uploadedFile.originalFilename,
							rowCount: rowCount,
							location: destPath
						});
					} catch (vErr) {
						logger.error("Validation error during upload:", vErr.message);
						if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
						return res.status(400).json({ error: vErr.message });
					}
				}

				logger.info("File uploaded successfully to: " + destPath);
				res.json({
					message: "File uploaded successfully",
					fileName: uploadedFile.originalFilename,
					location: destPath
				});
			} catch (saveErr) {
				logger.error("File save error:", saveErr);
				return res.status(500).json({ error: "Error saving file" });
			}
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

		const { fileName, campaignName, clientId } = req.body;
		if (!fileName) return res.status(400).json({ error: 'File name is required' });
		if (!campaignName) return res.status(400).json({ error: 'Campaign name is required' });

		const originalFilePath = path.join(con.APP_ROOTDIR, "src/config", fileName);
		if (!fs.existsSync(originalFilePath)) {
			return res.status(404).json({ error: 'File not found' });
		}

		// Load campaign configuration from database
		const campaignConfig = await db.campaigns.findOne({ where: { campaignname: campaignName } });

		if (!campaignConfig) {
			return res.status(400).json({ error: `No configuration found for campaign: ${campaignName}` });
		}

		const fields = campaignConfig.fields || [];
		const requiredKeys = fields.map(f => f.key);

		const rowsToInsert = [];
		const originalRows = [];

		const processData = (filePath) => {
			const ext = path.extname(filePath).toLowerCase();
			return new Promise((resolve, reject) => {
				if (ext === '.xlsx') {
					try {
						const workbook = XLSX.readFile(filePath);
						const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
						const sheetData = XLSX.utils.sheet_to_json(firstSheet);

						sheetData.forEach(row => {
							originalRows.push(row);
							const dynamicData = {};
							let hasDynamicData = false;
							fields.forEach(field => {
								const value = (row[field.key] || '').toString().trim();
								dynamicData[field.key] = value;
								if (value) hasDynamicData = true;
							});

							const mobile = (row.MobileNo || row.mobile || '').toString().trim();
							const email = (row.email || '').toString().trim();

							if (mobile || email || hasDynamicData) {
								rowsToInsert.push({
									campaignid: campaignConfig.id,
									clientid: clientId || campaignConfig.clientid || 0,
									mobile: mobile,
									email: email,
									language: row.selectLanguage || row.language || 'E',
									dynamicdata: dynamicData,
									status: messagequeueStatusEnum.received,
									timestamp: new Date().toISOString()
								});
							}
						});
						resolve(true);
					} catch (err) {
						reject(err);
					}
				} else {
					fs.createReadStream(filePath)
						.pipe(fastcsv.parse({ headers: true }))
						.on('data', row => {
							originalRows.push(row);
							const dynamicData = {};
							let hasDynamicData = false;
							fields.forEach(field => {
								const value = (row[field.key] || '').toString().trim();
								dynamicData[field.key] = value;
								if (value) hasDynamicData = true;
							});

							const mobile = (row.MobileNo || row.mobile || '').toString().trim();
							const email = (row.email || '').toString().trim();

							if (mobile || email || hasDynamicData) {
								rowsToInsert.push({
									campaignid: campaignConfig.id,
									clientid: clientId || campaignConfig.clientid || 0,
									mobile: mobile,
									email: email,
									language: row.selectLanguage || row.language || 'E',
									dynamicdata: dynamicData,
									status: messagequeueStatusEnum.received,
									timestamp: new Date().toISOString()
								});
							}
						})
						.on('error', err => reject(err))
						.on('end', () => resolve(true));
				}
			});
		};

		try {
			await processData(originalFilePath);

			const insertedRows = await db.campaign_queue.bulkCreate(rowsToInsert);
			await db.uploadedfiledata.create({
				filename: fileName,
				campaignname: campaignName,
				rowData: originalRows,
				rowCount: insertedRows.length,
			});

			const processedDir = path.join(con.APP_ROOTDIR, "src/config/processed");
			if (!fs.existsSync(processedDir)) fs.mkdirSync(processedDir, { recursive: true });

			const processedFilePath = path.join(processedDir, fileName);
			fs.renameSync(originalFilePath, processedFilePath);

			res.json({
				message: 'Data inserted into campaign_queue successfully',
				insertedCount: insertedRows.length,
				filePath: processedFilePath
			});
		} catch (err) {
			logger.error('Processing error:', err);
			res.status(500).json({ error: err.message || 'Failed to process file' });
		}


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

		const { selectedRows, selectedCampaign, clientId } = req.body;

		if (!selectedRows || !Array.isArray(selectedRows) || selectedRows.length === 0) {
			return res.status(400).json({
				success: false,
				error: 'No rows selected'
			});
		}

		if (!selectedCampaign) {
			return res.status(400).json({
				success: false,
				error: 'Campaign name is required'
			});
		}

		// Prepare all rows for insertion
		const campaignConfig = await db.campaigns.findOne({ where: { campaignname: selectedCampaign } });
		if (!campaignConfig) {
			return res.status(400).json({ success: false, error: `No configuration found for campaign: ${selectedCampaign}` });
		}

		const targetClientId = clientId || campaignConfig.clientid || 0;
		let recordsInserted = 0;

		const rowsToInsert = selectedRows.map(row => {
			// Extract existing dynamicdata if present, otherwise use the row itself (excluding known core fields)
			const dynamic = { ...(row.dynamicdata || row) };

			// Remove fields that shouldn't go into dynamicdata or would conflict
			const keysToRemove = ['id', 'campaignid', 'clientid', 'mobile', 'email', 'language', 'status', 'createdAt', 'updatedAt', 'MobileNo', 'selectLanguage'];
			keysToRemove.forEach(k => delete dynamic[k]);

			return {
				campaignid: campaignConfig.id,
				clientid: targetClientId,
				mobile: row.mobile || row.MobileNo || '',
				email: row.email || '',
				language: row.language || row.selectLanguage || 'E',
				dynamicdata: dynamic,
				status: '1', // received
				timestamp: new Date().toISOString()
			};
		});

		if (rowsToInsert.length > 0) {
			logger.info(`Class :: ${classname} :: Method :: ${methodname} Inserting ${rowsToInsert.length} fresh records into campaign_queue`);
			const inserted = await db.campaign_queue.bulkCreate(rowsToInsert);
			recordsInserted = inserted.length;
		}

		return res.status(200).json({
			success: true,
			insertedCount: recordsInserted
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

exports.GetCampaignQueueRecords = async (req, res) => {
	const methodname = 'GetCampaignQueueRecords';
	logger.info(`Class :: ${classname} :: Method :: ${methodname} Begin`);
	try {
		const { campaignName, clientId } = req.query;

		if (!campaignName || !clientId) {
			return res.status(400).json({ success: false, error: 'campaignName and clientId are required' });
		}

		// 1. Resolve campaignName to campaignId
		const campaign = await db.campaigns.findOne({ where: { campaignname: campaignName } });
		if (!campaign) {
			return res.status(404).json({ success: false, error: 'Campaign not found' });
		}

		// 2. Fetch records from campaign_queue
		const query = `
			SELECT 
				id, campaignid, clientid, mobile, email, language, status, dynamicdata, "createdAt", "updatedAt"
			FROM public.campaign_queues
			WHERE campaignid = :campaignId AND clientid = :clientId
			ORDER BY id DESC
			LIMIT 100
		`;

		const results = await db.sequelize.query(query, {
			replacements: { campaignId: campaign.id, clientId },
			type: db.sequelize.QueryTypes.SELECT
		});

		// 3. Flatten dynamicdata for frontend compatibility
		const flattenedResults = results.map(row => {
			const dynamic = row.dynamicdata || {};
			return {
				...row,
				...dynamic,
				// Ensure core fields aren't overwritten by dynamicdata if they exist there
				id: row.id,
				MobileNo: row.mobile,
				email: row.email,
				selectLanguage: row.language
			};
		});

		return res.json({
			success: true,
			data: {
				rowData: flattenedResults
			}
		});

	} catch (ex) {
		logger.error(`Class :: ${classname} :: Method :: ${methodname} ERROR = ${ex}`);
		return res.status(500).json({ success: false, error: 'Internal server error' });
	}
};

exports.UpdateCampaignQueueRecord = async (req, res) => {
	const methodname = 'UpdateCampaignQueueRecord';
	logger.info(`Class :: ${classname} :: Method :: ${methodname} Begin`);
	try {
		const data = req.body;
		if (!data.id) {
			return res.status(400).json({ success: false, error: 'ID is required' });
		}

		// Separate standard fields from dynamic ones
		const standardFields = ['mobile', 'email', 'language', 'status'];
		const updateData = { ...data };
		delete updateData.id;

		const dynamicUpdates = { ...updateData };
		standardFields.forEach(f => delete dynamicUpdates[f]);

		// Build SQL update
		// We use JSONB concatenation (||) to update dynamicdata
		const query = `
			UPDATE public.campaign_queues
			SET 
				mobile = COALESCE(:mobile, mobile),
				email = COALESCE(:email, email),
				language = COALESCE(:language, language),
				status = COALESCE(:status, status),
				dynamicdata = dynamicdata || :dynamicData,
				"updatedAt" = NOW()
			WHERE id = :id
		`;

		await db.sequelize.query(query, {
			replacements: {
				id: data.id,
				mobile: data.mobile || data.MobileNo || null,
				email: data.email || null,
				language: data.language || data.selectLanguage || null,
				status: data.status || null,
				dynamicData: JSON.stringify(dynamicUpdates)
			}
		});

		return res.json({ success: true, message: 'Record updated successfully' });

	} catch (ex) {
		logger.error(`Class :: ${classname} :: Method :: ${methodname} ERROR = ${ex}`);
		return res.status(500).json({ success: false, error: 'Internal server error' });
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
