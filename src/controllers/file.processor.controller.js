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
const moment = require('moment');
var fimport = require('../controllers/file.import.controller');
const Sequelize = require('sequelize');
const { Op } = Sequelize;

const extract = require('extract-zip');
let ssh2SftpClient = require('ssh2-sftp-client');

const crypto = require("crypto");
const { exec } = require("child_process");
var fsExtra = require('fs-extra');
var messages = require('../controllers/message.controller');
var commonService = require('../services/common.service');

exports.ProcessCutomerFileData = async () => {
    let methodname = 'ProcessCutomerFileData';
    debugger;
    try {
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin ");
        let documentTypes = await commonService.GetDocumentTypes();
        if (documentTypes != undefined) {
            documentTypes.forEach(async (document, i, documentTypes) => {
                logger.info("Class :: " + classname + " :: Method :: " + methodname + " document type = " + document.documentType);
                // let selectqueryText = `select  * from customers where status='Received' and documenttype='${document.documentType}' ORDER BY fileid,recordid  FETCH NEXT ${con.PAGE_SIZE} ROWS ONLY`;
                var documentTypecondition = { where: { status: `Received`, documenttype: `${document.documentType}` } };
                await db.customers.findAll(documentTypecondition)
                    .then(async (data) => {
                        if (data != undefined && data != null) {
                            logger.info("Class :: " + classname + " :: Method :: " + methodname + " document type = " + document.documentType + ' Length = ' + data.length);
                            const paginationLimit = con.PAGE_SIZE;
                            const pageCount = Math.ceil(data.length / paginationLimit);
                            for (let i = 1; i <= pageCount; i++) {
                                //take current page with that batch items and loop it and send message
                                var start = ((i - 1) * paginationLimit);
                                var end = parseInt(start) + parseInt(paginationLimit);
                                let batchData = data.slice(start, end);
                                if (batchData != undefined && batchData.length > 0) {
                                    let updatecondition;
                                    let fileIds = batchData.map(s => Number(s.id));
                                    updatecondition = { where: { id: { [Op.in]: fileIds } } };
                                    const guid = crypto.randomBytes(8).toString("hex");
                                    let fileName = guid + '.csv';
                                    await db.customers.update({ status: 'Processing', batchfilename: fileName }, updatecondition).then(async () => {
                                        logger.info("Class :: " + classname + " :: Method :: " + methodname + " updatedRows");
                                        await getMetaDat(batchData, async function (lstcustomers) {

                                            if (lstcustomers != undefined && lstcustomers != null) {
                                                logger.info("Class :: " + classname + " :: Method :: " + methodname + " csv data length =" + lstcustomers.length);
                                                //logger.info("Class :: " + classname + " :: Method :: " + methodname + " csv data =\n" + JSON.stringify(lstcustomers, null, 2));
                                                //convert db data to csv file
                                                const dirPath = `${con.ASSETREPO}/${con.UPLOAD}`;
                                                if (!fs.existsSync(dirPath)) {
                                                    fs.mkdirSync(dirPath);
                                                }
                                                let csvfilePath = dirPath + '/' + fileName;
                                                const ws = await fs.createWriteStream(csvfilePath);
                                                await fastcsv
                                                    .write(lstcustomers, { headers: true })
                                                    .on("finish", async () => {
                                                        logger.info("Class :: " + classname + " :: Method :: " + methodname + "file written completed ");
                                                        await fimport.getFileStreamData(csvfilePath, async (streamdata) => {
                                                            logger.info("Class :: " + classname + " :: Method :: " + methodname + "stream data");
                                                            await fimport.uploadFileToQuickcoms(streamdata.filestream, csvfilePath, document, async (fileuploadresponse) => {
                                                                logger.info("Class :: " + classname + " :: Method :: " + methodname + "file uploaded and uploaded response  =\n " + JSON.stringify(fileuploadresponse));
                                                                if (fileuploadresponse.toLowerCase().includes('successfully')) {
                                                                    await db.customers.update({ status: 'File_Posted' }, updatecondition);
                                                                }
                                                                else {
                                                                    await db.customers.update({ status: 'Received' }, updatecondition);
                                                                }
                                                                if (pageCount == i) {
                                                                    await fimport.runDataSourceFile(document, async (runresponse) => {
                                                                        //if (runresponse && runresponse != undefined && runresponse != null) {
                                                                        logger.info("Class :: " + classname + " :: Method :: " + methodname + "data source run response  =\n " + JSON.stringify(runresponse));
                                                                        //let runResponse = JSON.parse(runresponse);
                                                                        //logger.info("Class :: " + classname + " :: Method :: " + methodname + " message  = " + runResponse.message);
                                                                        // logger.info("Class :: " + classname + " :: Method :: " + methodname + " File_Posted  =\n " + JSON.stringify(updatecondition, null, 2));
                                                                        // }
                                                                    });
                                                                }
                                                            });
                                                        });
                                                    }).pipe(ws);
                                            }
                                        });
                                    })
                                        .catch(err => {
                                            logger.info("Class :: " + classname + " :: Method :: " + methodname + " Exception2 ERROR = " + err);
                                        });

                                }
                            }

                        }

                    }).catch(ex => {
                        logger.error("Class :: " + classname + " :: Method :: " + methodname + " Exception1 ERROR:: " + ex);
                    })
                logger.info("Class :: " + classname + " :: Method :: " + methodname + " End ");
            });

        }
    }
    catch (ex) {
        logger.error("Class :: " + classname + " :: Method :: " + methodname + " Exception ERROR:: " + ex);
    }
}

exports.UploadCustomerData = async () => {
    let methodname = 'UploadCustomerData';
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin ");
    try {
        let documentTypes = await commonService.GetDocumentTypes();
        if (documentTypes != undefined && documentTypes.filter(x => x.documentType.toUpperCase() == "POLICY_SCHEDULE")) {

            let document = documentTypes.filter(x => x.documentType.toUpperCase() == "POLICY_SCHEDULE")[0];
            logger.info("Class :: " + classname + " :: Method :: " + methodname + " document =  \n " + JSON.stringify(document, null, 2));
            let customerSchema = "" //await commonService.GetSchema(document.schemaName);
            // logger.info("Class :: " + classname + " :: Method :: " + methodname + " customerSchema = \n "+JSON.stringify(customerSchema,null,2));
            var documentTypecondition = { where: { status: `Received`, documenttype: `${document.documentType}` } };
            await db.customers.findAll(documentTypecondition)
                .then(async (customersdata) => {
                    if (customersdata != undefined && customersdata != null) {
                        let cutomerIds = customersdata.map(s => Number(s.id));
                        let updatecondition={ where: { id: { [Op.in]: cutomerIds } } };
                        await db.customers.update({ status: 'Processing'}, updatecondition);
                        AssignCustomerDataToSchema(customersdata, document).then(() => {
                        });
                    }
                });
        }


        logger.info("Class :: " + classname + " :: Method :: " + methodname + " End ");
    }
    catch (ex) {
        logger.error("Class :: " + classname + " :: Method :: " + methodname + " ERROR :: " + ex);
    }
}

exports.Upload_LGI_CustomerData = async () => {
    let methodname = 'Upload_LGI_CustomerData';
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin ");
    try {
        let documentTypes = await commonService.GetDocumentTypes();
        if (documentTypes != undefined && documentTypes.filter(x => x.documentType.toUpperCase() == "LGI_CAMPAIGN")) {

            let document = documentTypes.filter(x => x.documentType.toUpperCase() == "LGI_CAMPAIGN")[0];
            logger.info("Class :: " + classname + " :: Method :: " + methodname + " document =  \n " + JSON.stringify(document, null, 2));
            let customerSchema = "" //await commonService.GetSchema(document.schemaName);
            // logger.info("Class :: " + classname + " :: Method :: " + methodname + " customerSchema = \n "+JSON.stringify(customerSchema,null,2));
            var documentTypecondition = { where: { status: `Received`, documenttype: `${document.documentType}` } };
            await db.customers.findAll(documentTypecondition)
                .then(async (customersdata) => {
                    if (customersdata != undefined && customersdata != null) {
                        let cutomerIds = customersdata.map(s => Number(s.id));
                        let updatecondition={ where: { id: { [Op.in]: cutomerIds } } };
                        await db.customers.update({ status: 'Processing'}, updatecondition);
                        AssignCustomerDataToSchema(customersdata, document).then(() => {
                        });
                    }
                });
        }


        logger.info("Class :: " + classname + " :: Method :: " + methodname + " End ");
    }
    catch (ex) {
        logger.error("Class :: " + classname + " :: Method :: " + methodname + " ERROR :: " + ex);
    }
}
exports.SendMessages = async () => {
    let methodname = 'SendMessages';
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin ");
    try {
        let files = await GetDistinctFiles();
        if (files != undefined) {
            logger.info("Class :: " + classname + " :: Method :: " + methodname + " files length  = " + files.length);
            logger.info("Class :: " + classname + " :: Method :: " + methodname + " files  = \n" + JSON.stringify(files, null, 2));
            files.forEach(async (file, i, files) => {
                logger.info("Class :: " + classname + " :: Method :: " + methodname + " file  = " + file.fileid);
                let documentTypes = await commonService.GetDocumentTypes();
                let fileId = file.fileid;
                let campaign = documentTypes.filter(x => x.documentType.toLowerCase() == file.documenttype.toLowerCase())[0].campaign;

                var condition = { where: { fileid: file.fileid, documenttype: file.documenttype, status: `Document_Ready` } };
                await db.customers.findAll(condition)
                    .then(async (data) => {
                        // logger.info("Class :: " + classname + " :: Method :: " + methodname + " data = \n  "+JSON.stringify(data,null,2));
                        let customerIds = data.map(s => Number(s.id));
                        let updatecondition = { where: { id: { [Op.in]: customerIds } } };
                        await db.customers.update({ status: 'Message_Processing' }, updatecondition);
                        //logger.info("Class :: " + classname + " :: Method :: " + methodname + " data =  \n"+JSON.stringify(data,null,2));
                        await GetCustomersRecords(data, fileId, campaign, async (messagesdata) => {
                            if (messagesdata != undefined) {
                                // logger.info("Class :: " + classname + " :: Method :: " + methodname + " messagesdata =  \n"+JSON.stringify(messagesdata,null,2)); 
                                await messages.SaveDataIntoMessageQueue(messagesdata, async function (trackingId) {
                                    logger.info("Class :: " + classname + " :: Method :: " + methodname + " trackingId = " + trackingId);
                                    if (trackingId != undefined && trackingId != null && trackingId != "") {
                                        logger.info("Class :: " + classname + " :: Method :: " + methodname + " request posted in message queue ");
                                        await db.customers.update({ status: 'Processed', trackingId: trackingId }, updatecondition);
                                    }
                                });
                            }
                        });
                        logger.info("Class :: " + classname + " :: Method :: " + methodname + " End ");
                    });
            });
        }



    }
    catch (ex) {
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " Exception :: ERROR = " + ex);
    }
}

async function getMetaDat(data, cb) {
    let lstcustomerdata = [];
    let methodname = 'getMetaDat';
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin ");
    try {
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " data length= " + data.length);
        await data.forEach(async (item, i, data) => {
            await lstcustomerdata.push(JSON.parse(item.metadata).customer);
            logger.info("Class :: " + classname + " :: Method :: " + methodname + " End ");
            if (data.length == i + 1) {
                cb(lstcustomerdata);
            }
        });
    }
    catch (ex) {
        logger.error("Class :: " + classname + " :: Method :: " + methodname + " Exception ERROR:: " + ex);
        cb(undefined);
    }
}

async function AssignCustomerDataToSchema(customers, document) {
    let methodname = 'AssignCustomerDataToSchema';
    let JsonData = { data: [] };
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin ");

    try {

        await customers.forEach(async (customer, i, customers) => {
            let customerObj = document;
            await getCustomerData(customerObj, customer, async function (result) {
                // let result = await getCustomerData(customerObj, customer);
                logger.info("Class :: " + classname + " :: Method :: " + methodname + " INDEX OF CUSTOMER DATA=  \n" + i);
                //logger.info("Class :: " + classname + " :: Method :: " + methodname + " result=  \n" + JSON.stringify(result, null, 2));
                JsonData.data.push({ customer: result });
                if (customers.length == JsonData.data.length) {
                    var buff = Buffer.from(JSON.stringify(JsonData));
                   // logger.info("Class :: " + classname + " :: Method :: " + methodname + " Records count=  " + buff);
                    //fs.appendFileSync('./Assets/outputfiles/Output_Private_Car_Policy.json', JSON.stringify(data, null, 2));
                    const guid = crypto.randomBytes(8).toString("hex");
                    let fileName = guid + '.json';
                    await fimport.uploadFileToQuickcoms(buff, fileName, document, async (fileuploadresponse) => {
                        logger.info("Class :: " + classname + " :: Method :: " + methodname + "file uploaded and uploaded response  =\n " + JSON.stringify(fileuploadresponse));
                        let updatecondition;
                        let fileIds = customers.map(s => Number(s.id));
                        updatecondition = { where: { id: { [Op.in]: fileIds } } };
                        if (fileuploadresponse.toLowerCase().includes('successfully')) {
                            await fimport.runDataSourceFile(document, async (runresponse) => {
                                //if (runresponse && runresponse != undefined && runresponse != null) {
                                logger.info("Class :: " + classname + " :: Method :: " + methodname + "data source run response  =\n " + JSON.stringify(runresponse));
                                await db.customers.update({ status: 'File_Posted' }, updatecondition)
                                // }
                            });
                        }
                        else {
                            await db.customers.update({ status: 'Received' }, updatecondition);
                        }

                    });
                }
            });
        });
        // logger.info("Class :: " + classname + " :: Method :: " + methodname + " Records=  \n"+JSON.stringify( data,null,2));

    }
    catch (ex) {
        logger.error("Class :: " + classname + " :: Method :: " + methodname + " ERROR = " + ex);
    }
}

async function getCustomerData(customer_schema, customer, callback) {
    let methodname = 'getCustomerData';
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin ");
    // return new Promise(async (resolve, reject) => {
    try {
        let customerObj = {};
        let metadata = JSON.parse(customer.metadata).customer;

        customerObj.custom_record_id = customer.id;
        customerObj.Document_Type = metadata.Document_Type;
        customerObj.TXT_POLICY_NO = metadata.TXT_POLICY_NO;
        customerObj.TXT_POLICY_NO_CHAR = metadata.TXT_POLICY_NO_CHAR;
        customerObj.TXT_CUSTOMER_ID = metadata.TXT_CUSTOMER_ID;
        customerObj.TXT_CUSTOMER_NAME = metadata.TXT_CUSTOMER_NAME;
        customerObj.Dispath_Location = metadata.Dispath_Location;
        customerObj.Dispatch_Date = metadata.Dispatch_Date;
        customerObj.Dispatch_Mode = metadata.Dispatch_Mode;
        customerObj.Dispatch_Type = metadata.Dispatch_Type;
        customerObj.Dispatch_to = metadata.Dispatch_to;
        customerObj.Name_of_the_Person_Policy_Dispatched_to = metadata.Name_of_the_Person_Policy_Dispatched_to;
        customerObj.AddressLine1 = metadata.AddressLine1;
        customerObj.AddressLine2 = (metadata.AddressLine2 == 0) ? "" : metadata.AddressLine2;
        customerObj.AddressLine3 = metadata.AddressLine3;
        customerObj.CityDistrictName = metadata.CityDistrictName;
        customerObj.StateName = metadata.StateName;
        customerObj.CityDistrictCode = metadata.CityDistrictCode;
        customerObj.MobileISD = metadata.MobileISD;
        customerObj.MobileISD2 = metadata.MobileISD2;
        customerObj.MobileISD3 = metadata.MobileISD3;
        customerObj.MobileNo = metadata.MobileNo;
        customerObj.MobileNo2 = metadata.MobileNo2;
        customerObj.MobileNo3 = metadata.MobileNo3;
        customerObj.Email_Id = metadata.Email_Id;
        customerObj.GSTIN_No = metadata.GSTIN_No;
        customerObj.TXT_POLICY_EFF_FROMHOUR = metadata.TXT_POLICY_EFF_FROMHOUR;
        customerObj.DAT_POLICY_EFF_FROMDATE = metadata.DAT_POLICY_EFF_FROMDATE.split('-').join('/');
        customerObj.DAT_POLICY_EFF_TODATE = metadata.DAT_POLICY_EFF_TODATE.split('-').join('/');
        customerObj.DAT_REFERENCE_DATE = metadata.DAT_REFERENCE_DATE.split('-').join('/');
        customerObj.Covernote_Date = metadata.Covernote_Date.split('-').join('/');
        customerObj.PropRisks_AuthorityLocation_Mandatary = metadata.PropRisks_AuthorityLocation_Mandatary;
        customerObj.UIN_CODES = metadata.UIN_CODES;
        customerObj.Customer_UIN = metadata.Customer_UIN;
        customerObj.POS_Intermediary_Name = metadata.POS_Intermediary_Name;
        customerObj.POS_Intermediary_Code = metadata.POS_Intermediary_Code;
        customerObj.POS_PhoneNo = metadata.POS_PhoneNo;
        customerObj.POS_AadharNumber = metadata.POS_AadharNumber;
        customerObj.POS_PanNumber = metadata.POS_PanNumber;
        customerObj.PropBranchDetails_IMDBranchName = metadata.PropBranchDetails_IMDBranchName;
        customerObj.PropBranchDetails_IMDBranchCode = metadata.PropBranchDetails_IMDBranchCode;
        customerObj.PropBranchDetails_IMDBranchPhoneNo = metadata.PropBranchDetails_IMDBranchPhoneNo;
        customerObj.PropBranchDetails_IMDBranchEmail = metadata.PropBranchDetails_IMDBranchEmail;
        customerObj.PropRisks_RegistrationNumber = metadata.PropRisks_RegistrationNumber;
        customerObj.PropRisks_RegistrationNumber2 = metadata.PropRisks_RegistrationNumber2;
        customerObj.PropRisks_RegistrationNumber3 = metadata.PropRisks_RegistrationNumber3;
        customerObj.PropRisks_RegistrationNumber4 = metadata.PropRisks_RegistrationNumber4;
        customerObj.PropRisks_YearofManufacture = metadata.PropRisks_YearofManufacture;
        customerObj.PropRisks_DateofRegistration = metadata.PropRisks_DateofRegistration.split('/').join('-');
        customerObj.PropRisks_Dateofdelivery = metadata.PropRisks_Dateofdelivery.split('/').join('-');
        customerObj.PropRisks_Engineno = metadata.PropRisks_Engineno;
        customerObj.PropRisks_Chassisn = metadata.PropRisks_Chassisn;
        customerObj.PropRisks_Manufacture = metadata.PropRisks_Manufacture;
        customerObj.PropRisks_Make = metadata.PropRisks_Make;
        customerObj.PropRisks_Model = metadata.PropRisks_Model;
        customerObj.PropRisks_Typeofbody_Mandatary = metadata.PropRisks_Typeofbody_Mandatary;
        customerObj.PropRisks_SegmentType = metadata.PropRisks_SegmentType;
        customerObj.PropRisks_LiscensedCarryingCapacity_Mandatary = metadata.PropRisks_LiscensedCarryingCapacity_Mandatary;
        customerObj.Trailer_Registration_No = metadata.Trailer_Registration_No;
        customerObj.Trailer_Chassis_No = metadata.Trailer_Chassis_No;
        customerObj.Trailer_IDV = metadata.Trailer_IDV;
        customerObj.IDVYear = metadata.IDVYear;
        customerObj.PropRisks_IDVofthevehicle = await formatNumber(metadata.PropRisks_IDVofthevehicle);
        customerObj.Trailers = metadata.Trailers;
        customerObj.Side_Car = metadata.Side_Car;
        customerObj.Non_Electrical_Accessories = metadata.Non_Electrical_Accessories;
        customerObj.Electrical_Electronic_Accessories = metadata.Electrical_Electronic_Accessories;
        customerObj.Bi_Fuel_kit_CNG_LPG = metadata.Bi_Fuel_kit_CNG_LPG;
        customerObj.PropGeneralProposalInformation_TotalSi = await formatNumber(metadata.PropGeneralProposalInformation_TotalSi);
        customerObj.NUM_GROSS_COVER_PREMIUM = await formatNumber(metadata.NUM_GROSS_COVER_PREMIUM);
        customerObj.No_claim_bonus25 = await formatNumber(metadata.No_claim_bonus25);
        customerObj.NUM_NET_OD_PREMIUM = await formatNumber(metadata.NUM_NET_OD_PREMIUM);
        customerObj.Add_On_Cover_Details = await AddOnCoverItems(metadata);
        customerObj.Total_Add_On_Cover_Premium = await formatNumber(metadata.Total_Add_On_Cover_Premium);
        customerObj.Basic_TP = await formatNumber(metadata.Basic_TP);
        customerObj.LL_to_paid_Driver_IMT_28 = await formatNumber(metadata.LL_to_paid_Driver_IMT_28);
        customerObj.NUM_NET_TP_PREMIUM = await formatNumber(metadata.NUM_NET_TP_PREMIUM);
        customerObj.PA_Owner_Driver = await formatNumber(metadata.PA_Owner_Driver);
        customerObj.NUM_NET_PREMIUM = await formatNumber(metadata.NUM_NET_PREMIUM);
        customerObj.CGST_percentage = !metadata.SGST_percentage.toString().includes('%') ? await percentNumber(metadata.CGST_percentage) : metadata.CGST_percentage;
        customerObj.NUM_CGST_AMOUNT = await formatNumber(metadata.NUM_CGST_AMOUNT);
        customerObj.SGST_percentage = !metadata.SGST_percentage.toString().includes('%') ? await percentNumber(metadata.SGST_percentage) : metadata.CGST_percentage;
        customerObj.NUM_SGST_AMOUNT = await formatNumber(metadata.NUM_SGST_AMOUNT);
        customerObj.NUM_TOTAL_PREMIUM = await formatNumber(metadata.NUM_TOTAL_PREMIUM);
        customerObj.PropFinancierDetails_AddRow = metadata.PropFinancierDetails_AddRow;
        customerObj.Damage_to_third_party_property = !metadata.Damage_to_third_party_property.toString().includes(',') ? await formatNumber(metadata.Damage_to_third_party_property) : metadata.Damage_to_third_party_property;
        customerObj.PA_cover_for_ownerDriver = await formatNumber(metadata.PA_cover_for_ownerDriver);
        customerObj.NUM_ENDORSEMENT_NO = metadata.NUM_ENDORSEMENT_NO;
        customerObj.Name_of_the_Nominee = metadata.Name_of_the_Nominee;
        customerObj.Relationship_with_Insured = metadata.Relationship_with_Insured;
        customerObj.Name_of_Appointee = metadata.Name_of_Appointee;
        customerObj.Relationship_with_the_Nominee = metadata.Relationship_with_the_Nominee;
        customerObj.TXT_INVOICE_NO_CHAR = metadata.TXT_INVOICE_NO_CHAR;
        customerObj.Branch_GSTIN_No = metadata.Branch_GSTIN_No;
        customerObj.SAC_Code = metadata.SAC_Code;
        customerObj.Place_of_Supply = metadata.Place_of_Supply;
        customerObj.IRDA_Regn_No = metadata.IRDA_Regn_No;
        customerObj.CINno = metadata.CINno;
        customerObj.TXT_PRODUCT_NAME = metadata.TXT_PRODUCT_NAME;
        customerObj.PropRisks_NewAddOnIDV = metadata.PropRisks_NewAddOnIDV;
        customerObj.PropRisks_VoluntaryExcessAmount = metadata.PropRisks_VoluntaryExcessAmount;
        customerObj.PropPreviousPolicyDetails_PolicyNo = metadata.PropPreviousPolicyDetails_PolicyNo;
        customerObj.PropPreviousPolicyDetails_CorporateCustomerId_Mandatary = metadata.PropPreviousPolicyDetails_CorporateCustomerId_Mandatary;
        customerObj.PropPreviousPolicyDetails_PolicyEffectiveFrom = await ExcelDateToJSDate(metadata.PropPreviousPolicyDetails_PolicyEffectiveFrom, 'dd/mm/yyyy');
        customerObj.PropPreviousPolicyDetails_PolicyEffectiveTo = await ExcelDateToJSDate(metadata.PropPreviousPolicyDetails_PolicyEffectiveTo, 'dd/mm/yyyy');
        customerObj.PropPreviousPolicyDetails_PreviousPolicyType = metadata.PropPreviousPolicyDetails_PreviousPolicyType;
        customerObj.PropPreviousPolicyDetails_NCBPercentage = metadata.PropPreviousPolicyDetails_NCBPercentage;
        customerObj.Claim_made_in_Previous_Policy = metadata.Claim_made_in_Previous_Policy;
        customerObj.Prod_Code = metadata.Prod_Code;
        customerObj.PDF_File_Name = metadata.PDF_File_Name;
        customerObj.Print_Flag = metadata.Print_Flag;
        customerObj.SMS_Template = metadata.SMS_Template;
        customerObj.Type_of_SMS = metadata.Type_of_SMS;
        customerObj.Email_Template = metadata.Email_Template;
        customerObj.Type_of_Email = metadata.Type_of_Email;
        customerObj.Whatsup_Template = metadata.Whatsup_Template;
        customerObj.Type_of_Whatsup = metadata.Type_of_Whatsup;
        customerObj.Business_Type = metadata.Business_Type;
        customerObj.OD_Period = metadata.OD_Period;
        customerObj.Masked_Email = metadata.Masked_Email;
        customerObj.Masked_Phoneno = metadata.Masked_Phoneno;
        callback(customerObj);
    }
    catch (ex) {
        logger.error("Class :: " + classname + " :: Method :: " + methodname + " ERROR = " + ex);
        resolve(undefined);
    }
    // });
}

async function formatNumber(x) {
    let methodname = 'formatNumber';
    return new Promise(async (resolve, reject) => {
        try {
            if (x == "")
                x = 0;

            //logger.info("Class :: " + classname + " :: Method :: " + methodname + " x = " + x);
            x = Number(x).toFixed(2);
            // logger.info("Class :: " + classname + " :: Method :: " + methodname + " x1 = " + x);
            // let LOCALE_STRING = 'en-IN';
            // let DECIMALPOINTS = 2;
            // let result = Number(amountString).toLocaleString(LOCALE_STRING, { minimumFractionDigits: DECIMALPOINTS, maximumFractionDigits: DECIMALPOINTS });
            let result = x.toString().split('.')[0].length > 3 ? x.toString().substring(0, x.toString().split('.')[0].length - 3).replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + x.toString().substring(x.toString().split('.')[0].length - 3) : x.toString();
            result = result.toString().includes('.') ? result.toString() : result + '.00';
            //logger.info("Class :: " + classname + " :: Method :: " + methodname + " result = " + result);
            resolve(result);
        }
        catch (ex) {
            logger.error("Class :: " + classname + " :: Method :: " + methodname + " ERROR = " + ex);
            resolve(x);
        }
    });

}

async function percentNumber(numString) {
    let methodname = 'percentNumber';
    return new Promise(async (resolve, reject) => {
        try {
            numString = numString.toString();
            let LOCALE_STRING = 'en-IN';
            let result = `${parseFloat(Number(numString).toLocaleString(LOCALE_STRING, { style: "percent" }))}%`;
            //logger.info("Class :: " + classname + " :: Method :: " + methodname + " result = " + result);
            resolve(result);
        }
        catch (ex) {
            logger.error("Class :: " + classname + " :: Method :: " + methodname + " ERROR = " + ex);
            resolve(numString);
        }
    });
}

async function ExcelDateToJSDate(serial, formatType) {
    let methodname = 'ExcelDateToJSDate';
    return new Promise(async (resolve, reject) => {
        try {
            var utc_days = Math.floor(serial - 25569);
            var utc_value = utc_days * 86400;
            var date_info = new Date(utc_value * 1000);
            if (formatType == 'dd/mm/yyyy') {
                resolve(`${date_info.getDate().toString().length == 1 ? `0${date_info.getDate()}` : date_info.getDate()}/${(date_info.getMonth() + 1).toString().length == 1 ? `0${(date_info.getMonth() + 1)}` : (date_info.getMonth() + 1)}/${date_info.getFullYear()}`);
            }
        }
        catch (ex) {
            logger.error("Class :: " + classname + " :: Method :: " + methodname + " ERROR = " + ex);
            resolve(serial);
        }
    });
}

async function AddOnCoverItems(metadata) {
    let methodname = 'getCustomerData';
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin ");
    let data = [];
    return new Promise(async (resolve, reject) => {
        try {
            let fields = metadata.Add_On_Cover_Field1.split(',');
            let codes = metadata.Add_On_Cover_ASEQ.split(',');
            let values = metadata.Add_On_Cover_Value1.toString().split(',');

            fields.forEach(async (field, i) => {
                data.push({
                    Add_On_Cover_Field1: fields[i],
                    Add_On_Cover_ASEQ: codes[i],
                    Add_On_Cover_Value1: await formatNumber(values[i])
                });
                if (fields.length == i + 1) {
                    // logger.info("Class :: " + classname + " :: Method :: " + methodname + " data = \n "+JSON.stringify(data,null,2));
                    resolve(data);
                }


            });

        }
        catch (ex) {
            logger.error("Class :: " + classname + " :: Method :: " + methodname + " ERROR = " + ex);
            resolve(undefined);
        }
    });
}

async function GetCustomersRecords(customers, fileId, campaign, cb) {
    let methodname = 'GetCustomersRecords';
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin ");

    let sendMessageRequest = { orderid: '', campaignname: '', records: [] };

    try {

        if (customers != undefined && customers.length > 0) {
            sendMessageRequest.orderid = fileId;
            sendMessageRequest.campaignname = campaign;

            await customers.forEach(async (customer, i, customers) => {
                //  logger.info("Class :: " + classname + " :: Method :: " + methodname + " customer meta data = " + customer.metadata);
                //recordsdata.records.push(getCustomerJSON(customer));
                //var condition = { where: { id: customer.id } };
                // await db.customers.update({ status: 'Completed' }, condition);

                await getCustomerJSON(customer, async (data) => {
                    logger.info("Class :: " + classname + " :: Method :: " + methodname + " customer data = \n" + JSON.stringify(data, null, 2));
                    if (data != undefined)
                        sendMessageRequest.records.push(data);
                });

                if (customers.length == i + 1) {
                    logger.info("Class :: " + classname + " :: Method :: " + methodname + " recordsdata = \n" + JSON.stringify(sendMessageRequest, null, 2));
                    cb(sendMessageRequest);
                }

            });

        }
    }
    catch (ex) {
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " Exception :: ERROR = " + ex);
        cb(undefined);
    }
}

async function getCustomerJSON(customer, cb) {
    let methodname = 'getCustomerJSON';
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin ");
    try {
        let metadata = JSON.parse(customer.metadata).customer;
        if ((metadata.Type_of_Whatsup && metadata.Type_of_Whatsup != null && metadata.Type_of_Whatsup.toLowerCase() == "1way" &&
            metadata.Whatsup_Template && metadata.Whatsup_Template != null && metadata.Whatsup_Template != "") ||
            (metadata.Type_of_SMS && metadata.Type_of_SMS != null && metadata.Type_of_SMS.toLowerCase() == "sms" &&
                metadata.SMS_Template && metadata.SMS_Template != null && metadata.SMS_Template != "")) {

            let data = {
                "customerid": metadata.TXT_CUSTOMER_ID,
                "recordidentifier": {
                    "id": customer.id,
                    "name": metadata.TXT_CUSTOMER_NAME
                },
                "messagecontent": {

                },
                "priority": 1
            }

            logger.info("Class :: " + classname + " :: Method :: " + methodname + " type of whatsapp " + metadata.Type_of_Whatsup);
            logger.info("Class :: " + classname + " :: Method :: " + methodname + " Whatsup_Template=  " + metadata.Whatsup_Template);
            if (metadata.Type_of_Whatsup && metadata.Type_of_Whatsup != null && metadata.Type_of_Whatsup.toLowerCase() == "1way" &&
                metadata.Whatsup_Template && metadata.Whatsup_Template != null && metadata.Whatsup_Template != "") {
                await getSMSContent(metadata, 'whatsapp', customer, async (whatsappdata) => {
                    logger.info("Class :: " + classname + " :: Method :: " + methodname + " getSMSContent = \n" + JSON.stringify(data, null, 2));
                    data.messagecontent.whatsapp = {};
                    data.messagecontent.whatsapp = whatsappdata;
                    // data.messagecontent.whatsapp=(whatsappresult);
                });
            }

            if (metadata.Type_of_SMS && metadata.Type_of_SMS != null && metadata.Type_of_SMS.toLowerCase() == "sms" &&
                metadata.SMS_Template && metadata.SMS_Template != null && metadata.SMS_Template != "") {
                await getSMSContent(metadata, 'sms', customer, async (smsdata) => {
                    logger.info("Class :: " + classname + " :: Method :: " + methodname + " getSMSContent = \n" + JSON.stringify(data, null, 2));
                    data.messagecontent.sms = {};
                    data.messagecontent.sms = smsdata;
                    // data.messagecontent.sms = data;
                });
            };
            cb(data);
        }
        else
            cb(undefined);
    }
    catch (ex) {
        cb(undefined);
    }

}

async function getSMSContent(metadata, channel, customer, cb) {
    let methodname = 'getSMSContent';
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin ");
    try {
        await GetTemplateContent(customer, channel, async (msgcontent) => {
            logger.info("Class :: " + classname + " :: Method :: " + methodname + " msgcontent =  " + msgcontent);
            cb({
                "phone": (metadata.MobileNo != undefined && metadata.MobileNo != "" && metadata.MobileNo != null) ? metadata.MobileNo : metadata.MobileNo2,
                "content": msgcontent,
                "contentpath": "",
                "contentstream": "",
                "attachments": [
                    customer.policydocumentpath
                ]
            }
            )
        });
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " End ");
    }
    catch (ex) {
        logger.error("Class :: " + classname + " :: Method :: " + methodname + " Exception ERROR= " + ex);
    }
}
async function GetTemplateContent(customer, channel, cb) {
    let methodname = 'GetTemplateContent';
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin ");
    let metadata = JSON.parse(customer.metadata).customer;
    // return new Promise(async (resolve, reject) => {
    try {
        let msgContent = '';

        if (channel.toLowerCase() == 'sms') {
            msgContent = await fs.readFileSync(con.APP_ROOTDIR + "Templates/PolicySchedule_SMS.txt", { encoding: 'utf8', flag: 'r' });
            // msgContent = await msgContent.replace("{{1}}", "{{DocumentURL}}").replace("{{2}}", metadata.TXT_PRODUCT_NAME).replace("{{3}}", metadata.TXT_POLICY_NO_CHAR).replace("{{4}}", con.SUPPORT_PHONE);
            msgContent = await msgContent.replace("{{1}}", metadata.TXT_CUSTOMER_NAME).replace("{{2}}", con.COMPANY_NAME).replace("{{3}}", metadata.TXT_PRODUCT_NAME).replace("{{4}}", "{{DocumentURL}}");
            logger.info("Class :: " + classname + " :: Method :: " + methodname + " sms msgContent =  " + msgContent);
            cb(msgContent);
        }
        if (channel.toLowerCase() == 'whatsapp') {
            msgContent = await fs.readFileSync(con.APP_ROOTDIR + "Templates/" + metadata.Whatsup_Template + ".txt", { encoding: 'utf8', flag: 'r' });
            //msgContent = await msgContent.replace("{{1}}", "{{DocumentURL}}").replace("{{2}}", metadata.TXT_PRODUCT_NAME).replace("{{3}}", metadata.TXT_POLICY_NO_CHAR).replace("{{4}}", con.SUPPORT_PHONE);
            msgContent = await msgContent.replace("{{1}}", metadata.TXT_PRODUCT_NAME).replace("{{2}}", metadata.TXT_POLICY_NO_CHAR).replace("{{3}}", con.SUPPORT_PHONE);
            logger.info("Class :: " + classname + " :: Method :: " + methodname + " whatsapp msgContent =  " + msgContent);
            cb(msgContent);
        }
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " End ");
        //resolve(msgContent);
    }
    catch (ex) {
        logger.error("Class :: " + classname + " :: Method :: " + methodname + " Exception :: ERROR = " + ex);
        //reject(ex);
    }
    // });
}

async function GetDistinctFiles(documentType) {
    const methodname = 'GetDistinctFiles';
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
    let batchFiles;
    // logger.info("Class :: " + classname + " :: Method :: " + methodname + " documentType = "+documentType);
    return new Promise(async (resolve, reject) => {
        try {
            // let selectqueryText = `select distinct documenttype,fileid  from customers where status='Document_Ready' and documenttype='${documentType}'  ORDER BY fileid`;
            let selectqueryText = `select distinct documenttype,fileid  from customers where status='Document_Ready'   ORDER BY fileid`;
            await db.sequelize.query(selectqueryText)
                .then(async (data) => {
                    batchFiles = data[0];
                    logger.info("Class :: " + classname + " :: Method :: " + methodname + " End");
                    resolve(batchFiles);
                });
        }
        catch (ex) {
            logger.info("Class :: " + classname + " :: Method :: " + methodname + " ERROR = " + ex);
            reject(ex);
        }

    });

};