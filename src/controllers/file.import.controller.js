require("dotenv").config();
const con = require('../../config');
var path = require("path");
var fs = require('fs');
const classname = 'file.import.controller.js'
const logger = require("../utils/logtrace");
var request = require("request");
const formidable = require('formidable');
const CSVToJSON = require('csvtojson');
const fastcsv = require("fast-csv");
var XLSX = require("xlsx");
const converter = require('json-2-csv');
const appRoot = require('app-root-path');
const db = require("../utils/database");
let customerModel = require('../models/poc.model');
let commonSerivce = require('../services/common.service')
const moment = require('moment');
var { generateTemporaryJwtToken, generateTemporaryJwtTokenByUser } = require('./token.controller')
var commonService = require('../services/common.service');
const jwt = require("jwt-simple");
const { messagequeueStatusEnum } = require('../models/whatsapp.message.status');
exports.XLSXFileImport = async (req, res) => {
	const methodname = 'XLSXFileImport';
	let attachment;
	let filePath;
	let fileName;
	let workbook;
	let sheetNames;
	const dirPath = `${con.ASSETREPO}/${con.UPLOAD}`;
	try {
		logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
		var contype = req.headers['content-type'];
		// logger.info("Class :: " + classname + " :: Method :: " + methodname + " Request Content Type = " + contype);
		if (!fs.existsSync(dirPath)) {
			fs.mkdirSync(dirPath);
		}
		if (contype.toLowerCase().includes('form-data')) {
			logger.info("Class :: " + classname + " :: Method :: " + methodname + " file upload in form data ");
			const form = formidable({ multiples: true });
			form.parse(req, async (err, fields, files) => {
				attachment = files.attachment;
				var attachementFileName = attachment.originalFilename;
				var attachmentFileExtension = path.extname(attachementFileName);
				var attachmentFileMimetype = attachment.mimetype;
				var attachmentFileSize = attachment.size;
				fileName = await attachementFileName;
				filePath = await attachment.filepath;
				// logger.info("Class :: " + classname + " :: Method :: " + methodname + " attachment file path=  "+filePath);
				// logger.info("Class :: " + classname + " :: Method :: " + methodname + " attachment file name=  "+fileName);
				workbook = await XLSX.readFile(attachment.filepath);
				sheetNames = await workbook.SheetNames;


				let sheet1xlsxdata = await XLSX.utils.sheet_to_json(workbook.Sheets[sheetNames[0]], { defval: "" });
				// logger.info("Class :: " + classname + " :: Method :: " + methodname + " sheet1xlsxdata = \n" + JSON.stringify(sheet1xlsxdata, null, 2));
				let customersdata = await ProcessDispatch_ModeByAddress1(sheet1xlsxdata);
				let customersdata1 = await ProcessMaskedPhone(customersdata);
				let customerdataresult = await ProcessMaskedEmail(customersdata1);
				let csvfilePath = dirPath + '/' + fileName.split('.')[0] + '.csv';
				customerdataresult = await JSON.parse(JSON.stringify(customerdataresult).split('\\"').join(''));
				//logger.info("Class :: " + classname + " :: Method :: " + methodname + " customerdataresult = \n" + JSON.stringify(customerdataresult, null, 2));
				const ws = await fs.createWriteStream(csvfilePath);
				await fastcsv
					.write(customerdataresult, { headers: true })
					.on("finish", async () => {
						logger.info("Class :: " + classname + " :: Method :: " + methodname + "file written completed ");
						//res.status(200).send('xlsx file converted into csv');
						await this.getFileStreamData(csvfilePath, async (streamdata) => {
							if (!streamdata.error) {
								await insertPOCData(customerdataresult, async (response) => {
									if (response != undefined && !response.error) {
										res.status(200).send({ status: response.status, referenceid: response.referenceid });
									}
									else {
										res.status(200).send(response);
									}
								});
							}
							else {
								res.status(200).send(streamdata.error);
							}
						});
					}).pipe(ws);
			});
		}
		else {
			logger.info("Class :: " + classname + " :: Method :: " + methodname + " base 64 coming from body");
			// logger.info("Class :: " + classname + " :: Method :: " + methodname + " base 64 data = \n" + JSON.stringify(req.body));
			fileName = new Date().getTime() + '.xlsx';
			let base64encodedData = req.body.data;
			filePath = dirPath + '/' + fileName;
			let buff = Buffer.from(base64encodedData, 'base64');
			fs.writeFileSync(filePath, buff);
			workbook = await XLSX.readFile(filePath);
			sheetNames = await workbook.SheetNames;


			let sheet1xlsxdata = await XLSX.utils.sheet_to_json(workbook.Sheets[sheetNames[0]], { defval: "" });
			// logger.info("Class :: " + classname + " :: Method :: " + methodname + " sheet1xlsxdata = \n" + JSON.stringify(sheet1xlsxdata, null, 2));
			let customersdata = await ProcessDispatch_ModeByAddress1(sheet1xlsxdata);
			let customersdata1 = await ProcessMaskedPhone(customersdata);
			let customerdataresult = await ProcessMaskedEmail(customersdata1);
			let csvfilePath = dirPath + '/' + fileName.split('.')[0] + '.csv';
			customerdataresult = await JSON.parse(JSON.stringify(customerdataresult).split('\\"').join(''));
			//logger.info("Class :: " + classname + " :: Method :: " + methodname + " customerdataresult = \n" + JSON.stringify(customerdataresult, null, 2));
			const ws = await fs.createWriteStream(csvfilePath);
			await fastcsv
				.write(customerdataresult, { headers: true })
				.on("finish", async () => {
					logger.info("Class :: " + classname + " :: Method :: " + methodname + "file written completed ");
					//res.status(200).send('xlsx file converted into csv');
					await this.getFileStreamData(csvfilePath, async (streamdata) => {
						if (!streamdata.error) {
							//logger.info("Class :: " + classname + " :: Method :: " + methodname + " stream response =  \n" + JSON.stringify(streamdata, null, 2));
							//logger.info("Class :: " + classname + " :: Method :: " + methodname + " filestream =  \n" + JSON.stringify(streamdata.filestream, null, 2));
							await insertPOCData(customerdataresult, async (response) => {
								if (response != undefined && !response.error) {
									res.status(200).send({ status: response.status, referenceid: response.referenceid });
								}
								else {
									res.status(200).send(response);
								}
							});
						}
						else {
							res.status(200).send(streamdata.error);
						}
					});
				}).pipe(ws);
		}
	}
	catch (ex) {
		res.status(200).send("something went wrong");
		logger.info("Class :: " + classname + " :: Method :: " + methodname + " Excepiton ERROR :: " + ex);
	}
}

exports.GetFileStream = async (req, res) => {
	const methodname = 'GetFileStream';
	let responsedata = { error: false };
	logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
	try {
		const form = formidable({ multiples: false });
		form.parse(req, async (err, fields, files) => {
			var attachment = files.attachment;
			var attachementFileName = attachment.originalFilename;
			var attachmentFileExtension = path.extname(attachementFileName);
			var attachmentFileMimetype = attachment.mimetype;
			var attachmentFileSize = attachment.size;
			logger.info("Class :: " + classname + " :: Method :: " + methodname + " attachment = \n" + JSON.stringify(attachment, null, 2));
			let buff = await fs.readFileSync(attachment.filepath);
			let base64data = buff.toString('base64');
			logger.info("Class :: " + classname + " :: Method :: " + methodname + " base64data = " + base64data);
			responsedata.data = base64data;
			logger.info("Class :: " + classname + " :: Method :: " + methodname + " End");
			return res.status(200).send(responsedata);
		});

	}
	catch (ex) {
		logger.info("Class :: " + classname + " :: Method :: " + methodname + " Exception ERROR = " + ex);
		responsedata.error = true;
		responsedata.data = ex;
		return res.status(200).send(responsedata);

	}
}


async function ProcessMaskedPhone(customersdata) {
	const methodname = 'ProcessMaskedPhone';
	logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
	try {
		await customersdata.forEach(async (customer) => {
			if (customer.Masked_Phoneno == undefined || customer.Masked_Phoneno == null || customer.Masked_Phoneno == "") {
				if (customer.MobileNo != null && customer.MobileNo != undefined && customer.MobileNo != "" && customer.MobileNo.toString().trim().length == 10) {
					// logger.info("Class :: " + classname + " :: Method :: " + methodname + " MobileNo  = " + customer.MobileNo);
					// logger.info("Class :: " + classname + " :: Method :: " + methodname + " Valid Phone Number");
					await getMaskedPhone(customer.MobileNo.toString().trim(), async function (data) {
						//logger.info("Class :: " + classname + " :: Method :: " + methodname + " Masked_MobileNo = " + data);
						customer.Masked_Phoneno = await customer.MobileISD + data;
					});
				}
			}
		});
		logger.info("Class :: " + classname + " :: Method :: " + methodname + " End");
		return customersdata;

	}
	catch (ex) {
		logger.info("Class :: " + classname + " :: Method :: " + methodname + " ERROR = " + ex);
	}
}

async function ProcessMaskedEmail(customersdata) {
	const methodname = 'ProcessMaskedEmail';
	logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
	try {
		await customersdata.forEach(async (customer) => {
			if (customer.Masked_Email == undefined || customer.Masked_Email == null || customer.Masked_Email == "") {
				if (customer.Email_Id != null && customer.Email_Id != undefined && customer.Email_Id != "") {
					await getMaskedEmail(customer.Email_Id, async function (data) {
						// logger.info("Class :: " + classname + " :: Method :: " + methodname + " Masked_Email = " + data);
						customer.Masked_Email = await data;
					});
				}
			}
		});
		logger.info("Class :: " + classname + " :: Method :: " + methodname + " End");
		return customersdata;

	}
	catch (ex) {
		logger.info("Class :: " + classname + " :: Method :: " + methodname + " ERROR = " + ex);
	}
}

async function ProcessDispatch_ModeByAddress1(customersdata) {
	const methodname = 'ProcessDispatch_ModeByAddress1';
	logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
	try {
		customersdata.forEach(async (customer) => {
			if (customer.AddressLine1.toLowerCase().includes('s/o') || customer.AddressLine1.toLowerCase().includes('po') || customer.AddressLine1.toLowerCase().includes('vill') || customer.AddressLine1.toLowerCase().includes('dist') || customer.AddressLine1.toLowerCase().includes('taluka') || customer.AddressLine1.toLowerCase().includes('village') || customer.AddressLine1.toLowerCase().includes('district')
				|| customer.AddressLine2.toLowerCase().includes('s/o') || customer.AddressLine2.toLowerCase().includes('po') || customer.AddressLine2.toLowerCase().includes('vill') || customer.AddressLine2.toLowerCase().includes('dist') || customer.AddressLine2.toLowerCase().includes('taluka') || customer.AddressLine2.toLowerCase().includes('village') || customer.AddressLine2.toLowerCase().includes('district')
			) {
				// logger.info("Class :: " + classname + " :: Method :: " + methodname + " Sr.No:" + customer.Sr_No);
				customer.Dispatch_Mode = await 'POST';
			}
			else {
				customer.Dispatch_Mode = await 'COURIER';
			}
		});
		logger.info("Class :: " + classname + " :: Method :: " + methodname + " End");
		return customersdata;

	}
	catch (ex) {
		logger.info("Class :: " + classname + " :: Method :: " + methodname + " ERROR = " + ex);
	}
}

async function getMaskedEmail(email, cb) {
	let maskedEmail;
	try {
		email = email.split('');
		let finalArr = [];
		let len = email.indexOf('@');
		email.forEach((item, pos) => {
			(pos >= 2 && pos <= len - 3) ? finalArr.push('*') : finalArr.push(email[pos]);
		});
		maskedEmail = finalArr.join('');
		cb(maskedEmail);
	}
	catch (ex) {
		cb(ex);
	}
}

async function getMaskedPhone(phone, cb) {
	let maskedPhone;

	try {
		let masked = phone.replace(/[\w\W]/g, "*");
		maskedPhone = masked.substring(0, masked.length - 4) + phone.substring(phone.length - 4);
		cb(maskedPhone);
	}
	catch (ex) {
		cb(ex);
	}

}

async function ConvertJsonToCSV(jsondata) {
	const methodname = 'ConvertJsonToCSV';
	logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
	try {
		// convert JSON array to CSV string
		converter.json2csv(jsondata, (err, csv) => {
			if (err) {
				throw err
			}
			// print CSV string
			logger.info("Class :: " + classname + " :: Method :: " + methodname + " CSV data = \n" + JSON.stringify(csv, null, 2));
			logger.info("Class :: " + classname + " :: Method :: " + methodname + " End");
			return csv;
		})
	}
	catch (ex) {
		logger.info("Class :: " + classname + " :: Method :: " + methodname + " ERROR = " + ex);
	}
}
exports.getFileStreamData = async (filePath, cb) => {
	const methodname = 'getFileStreamData';
	logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
	let fileStreamData;
	let data = {};
	try {
		fileStreamData = await fs.createReadStream(filePath);
		//logger.info("Class :: " + classname + " :: Method :: " + methodname + " binary data or stream is ready ");
		logger.info("Class :: " + classname + " :: Method :: " + methodname + " End");
		//return fileStreamData;
		setTimeout(() => {
			data.error = false;
			data.filestream = fileStreamData;
			cb(data);
		}, 2000);

	}
	catch (ex) {
		logger.info("Class :: " + classname + " :: Method :: " + methodname + " ERROR = " + ex);
		data.error = true;
		data.filestream = ex;
		cb(data);
	}
}

async function getFileStreamDataExt(filePath) {
	const methodname = 'getFileStreamDataExt';
	logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
	try {
		var fileStreamData = await fs.createReadStream(filePath);
		logger.info("Class :: " + classname + " :: Method :: " + methodname + " binary data or stream is ready ");
		logger.info("Class :: " + classname + " :: Method :: " + methodname + " End");
		return fileStreamData;
	}
	catch (ex) {
		logger.info("Class :: " + classname + " :: Method :: " + methodname + " ERROR = " + ex);
	}
}

exports.uploadFileToQuickcoms = async (binarydata, filePath, document, cb) => {
	const methodname = 'uploadFileToQuickcoms';
	logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
	try {
		let upload_api = con.QUICKCOMS_UPLOAD_API;
		upload_api = upload_api.replace('{domain}', con.QUICKCOMS_DOMAIN);
		upload_api = upload_api.replace('{0}', document.sourceId);
		upload_api = upload_api.replace('{1}', document.locationId);
		logger.info("Class :: " + classname + " :: Method :: " + methodname + " upload_api = " + upload_api);
		var upload_options = {
			'method': 'POST',
			'url': upload_api,
			'headers': {
				'authorization': await generateTemporaryJwtToken()
			},
			formData: {
				'id': Number(document.sourceId),
				'locationUuid': document.locationId,
				'data': {
					'value': binarydata,
					'options': {
						'filename': filePath,
						'contentType': null
					}
				}
			}
		}
		return await request(upload_options, async function (error, response) {
			if (error) {
				cb(error);
				//return error;
				// return await (true,response);
			}
			else {
				logger.info("Class :: " + classname + " :: Method :: " + methodname + " fil upload response from quickcoms = \n" + JSON.stringify(response.body, null, 2));
				cb(response.body);
				//return response.body;
				//return await (false,response);
			}

		});


	}
	catch (ex) {
		cb(ex);
		logger.info("Class :: " + classname + " :: Method :: " + methodname + " ERROR = " + ex);
	}
}

exports.uploadFileToQuickcomsByUser = async (binarydata, filePath, document, jwtTokenUser, cb) => {
	const methodname = 'uploadFileToQuickcomsByUser';
	logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
	try {
		let upload_api = `${document.domain}api/file/config/import-sources/${document.sourceId}/${document.locationId}/upload`;
		logger.info("Class :: " + classname + " :: Method :: " + methodname + " upload_api = " + upload_api);
		// logger.info("Class :: " + classname + " :: Method :: " + methodname + " jwtTokenUser = \n" + JSON.stringify(jwtTokenUser,null,2));
		//logger.info("Class :: " + classname + " :: Method :: " + methodname + " user id = \n" + jwtTokenUser.id.id);

		// let token=`JWT ${generateJwtToken(jwtTokenUser)}`;
		// logger.info("Class :: " + classname + " :: Method :: " + methodname + " token = " + token);
		var upload_options = {
			'method': 'POST',
			'url': upload_api,
			'headers': {
				'authorization': await generateTemporaryJwtTokenByUser(jwtTokenUser)
			},
			formData: {
				'id': Number(document.sourceId),
				'locationUuid': document.locationId,
				'data': {
					'value': binarydata,
					'options': {
						'filename': filePath,
						'contentType': null
					}
				}
			}
		}
		return await request(upload_options, async function (error, response) {
			if (error) {
				cb(error);
				//return error;
				// return await (true,response);
			}
			else {
				logger.info("Class :: " + classname + " :: Method :: " + methodname + " fil upload response from quickcoms = \n" + JSON.stringify(response.body, null, 2));
				cb(response.body);
				//return response.body;
				//return await (false,response);
			}

		});


	}
	catch (ex) {
		cb(ex);
		logger.info("Class :: " + classname + " :: Method :: " + methodname + " ERROR = " + ex);
	}
}
exports.runDataSourceFile = async (document, cb) => {
	const methodname = 'runDataSourceFile';
	logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
	try {
		let run_api = con.QUICKCOMS_RUN_API;
		run_api = run_api.replace('{domain}', con.QUICKCOMS_DOMAIN);
		logger.info("Class :: " + classname + " :: Method :: " + methodname + " run_api = " + run_api);
		var options = {
			'method': 'PUT',
			'url': con.QUICKCOMS_RUN_API,
			'headers': {
				'authorization': await generateTemporaryJwtToken(),
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ "sourceId": Number(document.sourceId), "locationId": document.locationId })

		};
		logger.info("Class :: " + classname + " :: Method :: " + methodname + " run api payload = " + JSON.stringify({ "sourceId": Number(document.sourceId), "locationId": document.locationId }));
		return await request(options, async function (error, response) {
			if (error) {
				cb(error);
			}
			else {
				logger.info("Class :: " + classname + " :: Method :: " + methodname + " run data source response from quickcoms = \n" + JSON.stringify(response.body, null, 2));
				logger.info("Class :: " + classname + " :: Method :: " + methodname + " End");
				cb(response.body);
				//return response;
				//return response.body;
			}
		});

	}
	catch (ex) {
		cb(ex);
		logger.info("Class :: " + classname + " :: Method :: " + methodname + " ERROR = " + ex);
	}
}

exports.runDataSourceFileByUser = async (document, jwtTokenUser, cb) => {
	const methodname = 'runDataSourceFileByUser';
	logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
	try {
		let run_api = `${document.domain}api/file/config/import-sources/prod-import/run`;

		logger.info("Class :: " + classname + " :: Method :: " + methodname + " run_api = " + run_api);
		//let token=`JWT ${generateJwtToken(jwtTokenUser)}`;
		// logger.info("Class :: " + classname + " :: Method :: " + methodname + " token = " + token);
		var options = {
			'method': 'PUT',
			'url': run_api,
			'headers': {
				'authorization': await generateTemporaryJwtTokenByUser(jwtTokenUser),
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ "sourceId": Number(document.sourceId), "locationId": document.locationId })

		};
		logger.info("Class :: " + classname + " :: Method :: " + methodname + " run api payload = " + JSON.stringify({ "sourceId": Number(document.sourceId), "locationId": document.locationId }));
		return await request(options, async function (error, response) {
			if (error) {
				cb(error);
			}
			else {
				logger.info("Class :: " + classname + " :: Method :: " + methodname + " run data source response from quickcoms = \n" + JSON.stringify(response.body, null, 2));
				logger.info("Class :: " + classname + " :: Method :: " + methodname + " End");
				cb(response.body);
				//return response;
				//return response.body;
			}
		});

	}
	catch (ex) {
		cb(ex);
		logger.info("Class :: " + classname + " :: Method :: " + methodname + " ERROR = " + ex);
	}
}
async function insertPOCData(customersdata, cb) {
	const methodname = 'insertPOCData';
	logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
	let data = [];
	let response = { error: false, referenceid: '', status: '' };
	let fileId = new Date().getTime();
	try {
		let customerModel = {};
		customerModel.fileid = fileId;

		await customersdata.forEach(async (customer, i, customersdata) => {
			customerModel.recordid = i + 1;
			customer.TXT_POLICY_NO_CHAR = customer.TXT_POLICY_NO_CHAR.split("\'").join('');
			customer.PDF_File_Name = customer.PDF_File_Name.split("\'").join('');
			customer.PropPreviousPolicyDetails_PolicyNo = customer.PropPreviousPolicyDetails_PolicyNo.split("\'").join('');
			customerModel.customer_id = customer.TXT_CUSTOMER_ID;
			customerModel.policynumber = customer.TXT_POLICY_NO_CHAR;
			customerModel.documenttype = customer.Document_Type;
			customerModel.metadata = JSON.stringify({ customer });
			customerModel.processed_date = moment(new Date()).format('DD-MM-yyyy');
			customerModel.status = 'Received';
			await db.customers.create(customerModel);
			await data.push(customerModel);
		});
		response.referenceid = fileId;
		response.status = 'success';
		cb(response);
		//  return data;

	}
	catch (ex) {
		logger.info("Class :: " + classname + " :: Method :: " + methodname + " Exception ERROR = " + ex);
		response.error = true;
		response.status = 'fail';
		response.statusmessage = JSON.stringify(ex);
		cb(response);
	}
	logger.info("Class :: " + classname + " :: Method :: " + methodname + " End");
}


exports.BulkOTPFileImport = async (req, res) => {
	const methodname = 'BulkOTPFileImport';
	let attachment;
	let filePath;
	let fileName;
	let workbook;
	let sheetNames;
	const dirPath = `${con.ASSETREPO}/${con.UPLOAD}`;
	try {
		logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
		var contype = req.headers['content-type'];
		// logger.info("Class :: " + classname + " :: Method :: " + methodname + " Request Content Type = " + contype);
		if (!fs.existsSync(dirPath)) {
			fs.mkdirSync(dirPath);
		}
		if (contype.toLowerCase().includes('form-data')) {
			logger.info("Class :: " + classname + " :: Method :: " + methodname + " file upload in form data ");
			const form = formidable({ multiples: true });
			form.parse(req, async (err, fields, files) => {
				var attachementFileName = files.attachment.originalFilename
				var attachmentFileExtension = path.extname(attachementFileName);
				if (!attachmentFileExtension.toLowerCase().includes('.json'))
					return res.status(200).send('Accepting only json format');
				fileName = await attachementFileName;
				filePath = await files.attachment.filepath
				logger.info("Class :: " + classname + " :: Method :: " + methodname + " attachment file path=  " + filePath);
				logger.info("Class :: " + classname + " :: Method :: " + methodname + " attachment file name=  " + fileName);

				await this.getFileStreamData(filePath, async (streamdata) => {
					logger.info("Class :: " + classname + " :: Method :: " + methodname + "stream data");
					let documentTypes = await commonService.GetDocumentTypes();
					let document = documentTypes.filter(x => x.documentType == 'BULK_OTP');
					//console.log('Document = '+JSON.stringify(document,null,2));
					await this.uploadFileToQuickcoms(streamdata.filestream, filePath, document[0], async (fileuploadresponse) => {
						logger.info("Class :: " + classname + " :: Method :: " + methodname + "otp file uploaded and uploaded response  =\n " + JSON.stringify(fileuploadresponse));
						if (fileuploadresponse.toLowerCase().includes('successfully')) {
							await this.runDataSourceFile(document[0], async (runresponse) => {
								//if (runresponse && runresponse != undefined && runresponse != null) {
								logger.info("Class :: " + classname + " :: Method :: " + methodname + "data source run response  =\n " + JSON.stringify(runresponse));
								//let runResponse = JSON.parse(runresponse);
								//logger.info("Class :: " + classname + " :: Method :: " + methodname + " message  = " + runResponse.message);
								// logger.info("Class :: " + classname + " :: Method :: " + methodname + " File_Posted  =\n " + JSON.stringify(updatecondition, null, 2));
								// }
								return res.status(200).send(runresponse);
							});
						}
						else {
							return res.status(200).send(fileuploadresponse);
						}

					});
				});

			});
		}
	}
	catch (ex) {

		logger.info("Class :: " + classname + " :: Method :: " + methodname + " Excepiton ERROR :: " + ex);
		return res.status(200).send("something went wrong");
	}
}


exports.FileUploadToDataSource = async (req, res) => {
	debugger;
	const methodname = 'FileUploadToDataSource';
	let attachment;
	let filePath;
	let fileName;
	let workbook;
	let sheetNames;
	let document;
	let jwtTokenUser;
	let schemaFileType;
	let savedfilePath;
	const dirPath = `${con.ASSETREPO}/${con.UPLOAD}`;
	try {
		logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
		var contype = req.headers['content-type'];
		// logger.info("Class :: " + classname + " :: Method :: " + methodname + " Request Content Type = " + contype);
		if (!fs.existsSync(dirPath)) {
			fs.mkdirSync(dirPath);
		}
		if (contype.toLowerCase().includes('form-data')) {
			logger.info("Class :: " + classname + " :: Method :: " + methodname + " file upload in form data ");
			const form = formidable({ multiples: true });
			form.parse(req, async (err, fields, files) => {
				debugger;
				var attachementFileName = files.attachment.originalFilename
				var attachmentFileExtension = path.extname(attachementFileName);
				document = JSON.parse(fields['dataSource']);
				jwtTokenUser = JSON.parse(fields['user']);
				schemaFileType = JSON.parse(fields['schemaFileExtension']);
				fileName = await attachementFileName;
				filePath = await files.attachment.filepath;
				logger.info("Class :: " + classname + " :: Method :: " + methodname + " fileName=  " + fileName);
				logger.info("Class :: " + classname + " :: Method :: " + methodname + " attachmentFileExtension=  " + attachmentFileExtension);
				logger.info("Class :: " + classname + " :: Method :: " + methodname + " document=  " + JSON.stringify(document, null, 2));
				logger.info("Class :: " + classname + " :: Method :: " + methodname + " jwtTokenUser=  " + JSON.stringify(jwtTokenUser, null, 2));
				logger.info("Class :: " + classname + " :: Method :: " + methodname + " schemaFileType=  " + schemaFileType);

				if (attachmentFileExtension.toLowerCase().includes('.xls') && schemaFileType.toLowerCase() == "csv") {
					workbook = await XLSX.readFile(filePath);
					sheetNames = await workbook.SheetNames;
					let sheet1xlsxdata = await XLSX.utils.sheet_to_json(workbook.Sheets[sheetNames[0]], { defval: "" });
					let dataresult = await JSON.parse(JSON.stringify(sheet1xlsxdata).split('\\"').join(''));
					logger.info("Class :: " + classname + " :: Method :: " + methodname + " dataresult = \n" + JSON.stringify(dataresult, null, 2));
					if (schemaFileType.toLowerCase() == "csv") {
						logger.info("Class :: " + classname + " :: Method :: " + methodname + " csv file uploaded  ");
						//logger.info("Class :: " + classname + " :: Method :: " + methodname + " sheet1xlsxdata = \n" + JSON.stringify(sheet1xlsxdata, null, 2));
						savedfilePath = dirPath + '/' + fileName.split('.')[0] + '.csv';
						const ws = await fs.createWriteStream(savedfilePath);
						await fastcsv
							.write(dataresult, { headers: true })
							.on("finish", async () => {
								logger.info("Class :: " + classname + " :: Method :: " + methodname + "file written completed in the path = " + savedfilePath);
							}).pipe(ws);
					}

				}
				else if (attachmentFileExtension.toLowerCase().includes('.csv') && schemaFileType.toLowerCase().includes('csv')) {
					logger.info("Class :: " + classname + " :: Method :: " + methodname + " csv file uploaded  ");
					savedfilePath = filePath;
				}
				else if (attachmentFileExtension.toLowerCase().includes('.xls') && schemaFileType.toLowerCase().includes('xls')) {
					logger.info("Class :: " + classname + " :: Method :: " + methodname + " xlsx file uploaded  ");
					savedfilePath = filePath;
				}
				else if (attachmentFileExtension.toLowerCase().includes('json') && schemaFileType.toLowerCase() == "json") {
					logger.info("Class :: " + classname + " :: Method :: " + methodname + " json file uploaded  ");
					savedfilePath = filePath;

					// savedfilePath = dirPath + '/' + fileName.split('.')[0] + '.json';
					// let jsonfileData = { data: [] };
					// jsonfileData.data = dataresult;
					// logger.info("Class :: " + classname + " :: Method :: " + methodname + " dataresult = \n" + JSON.stringify(jsonfileData, null, 2));
					// fs.writeFile(savedfilePath, JSON.stringify(jsonfileData, null, 2), function (err) {
					//     if (err) {
					//         logger.info("Class :: " + classname + " :: Method :: " + methodname + "json file written error = " + err);
					//         return console.log(err);
					//     }
					//     logger.info("Class :: " + classname + " :: Method :: " + methodname + "Json file written completed in the path = " + savedfilePath);
					// });

				}
				if (savedfilePath != undefined && savedfilePath != "" && savedfilePath != null) {
					await this.getFileStreamData(savedfilePath, async (streamdata) => {
						await this.uploadFileToQuickcomsByUser(streamdata.filestream, savedfilePath, document, jwtTokenUser, async (fileuploadresponse) => {
							logger.info("Class :: " + classname + " :: Method :: " + methodname + "file uploaded and uploaded response  =\n " + JSON.stringify(fileuploadresponse));
							if (fileuploadresponse != null && fileuploadresponse != "" && fileuploadresponse != null && fileuploadresponse.code == undefined) {
								try {
									if (fileuploadresponse.toLowerCase().includes('successfully')) {
										await this.runDataSourceFileByUser(document, jwtTokenUser, async (runresponse) => {
											logger.info("Class :: " + classname + " :: Method :: " + methodname + "data source run response  =\n " + JSON.stringify(runresponse));
											//let runResponse = JSON.parse(runresponse);
											//logger.info("Class :: " + classname + " :: Method :: " + methodname + " message  = " + runResponse.message);
											// logger.info("Class :: " + classname + " :: Method :: " + methodname + " File_Posted  =\n " + JSON.stringify(updatecondition, null, 2));
											// }
											return res.status(200).send(runresponse);
										});
									}
									else {
										return res.status(200).send(fileuploadresponse);
									}
								}
								catch (ex) {
									return res.status(200).send(fileuploadresponse);
								}
							}
							else {
								return res.status(200).send('error occured while uploading a file');
							}
						});
					});
				}
			});
		}
	}
	catch (ex) {
		logger.info("Class :: " + classname + " :: Method :: " + methodname + " Excepiton ERROR :: " + ex);
		return res.status(200).send("something went wrong");
	}
}

//vehicle
//"sourceId":11,
//"locationId":"c44e75c1-541c-482e-88fe-d863e29a63ab"


//  SOURCE_ID=14
// LOCATION_ID='9a69d5da-b7a3-41dc-80d2-d44951244ecd'