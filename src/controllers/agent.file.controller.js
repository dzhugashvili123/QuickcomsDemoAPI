require("dotenv").config();
const classname = 'agent.file.controller.js'
const logger = require("../utils/logtrace");
const formidable = require('formidable');
const reader = require('xlsx');
const db = require("../utils/database");
var request = require("request");
const con = require('../../config');
var fimport = require('../controllers/file.import.controller');
const fastcsv = require("fast-csv");
var fs = require('fs');
const Sequelize = require('sequelize');
const { Op } = Sequelize;


exports.agentFileImport = async (req, res) => {
    const methodname = 'agentFileImport';
    try {
        let filePath;
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
        var contype = req.headers['content-type'];
        if (contype.toLowerCase().includes('form-data')) {
            const form = formidable({ multiples: true });
            form.parse(req, async (err, fields, files) => {
                filePath = await files.file.filepath;
                logger.info("Class :: " + classname + " :: Method :: " + methodname + " filePath ::" + filePath);
                let AgentData = [];
                const file = await reader.readFile(filePath);
                const sheets = file.SheetNames;
                for (let i = 0; i < sheets.length; i++) {
                    const temp = reader.utils.sheet_to_json(
                        file.Sheets[file.SheetNames[i]])
                    temp.forEach((row) => {
                        var data = {};
                        data.policynumber = row.Policy_No.replaceAll('"', '');
                        data.documenttype = row.Document_Type;
                        data.name_of_insured = row.Name_of_Insured;
                        data.dispatch_date = row.Dispatch_Date;
                        data.prod_code = row.Prod_Code;
                        data.email_template = row.Email_Template;
                        data.type_of_email = row.Type_of_Email;
                        data.email_id = row.Email_Id;
                        data.status = 'Received';
                        AgentData.push(data);
                    })
                }
                logger.info("Class :: " + classname + " :: Method :: " + methodname + " Data Length ::" + ((AgentData && AgentData != null) ? AgentData.length : 0));
                if (AgentData && AgentData.length > 0) {
                    db.agentdata.bulkCreate(AgentData)
                        .then(() => {
                            logger.info("Class :: " + classname + " :: Method :: " + methodname + " Agent Data Inserted ");
                            res.status(200).send({
                                message: "Agent file uploaded successfully"
                            });
                        })
                        .catch((error) => {
                            logger.error("Class :: " + classname + " :: Method :: " + methodname + " Agent Data not Inserted ::" + error);
                            res.status(500).send({
                                message: "Fail to import data into database!",
                                error: error.message,
                            });
                        });
                };
            });
        }
        else {
            // filePath = req.body.filepath;
            let fileName = new Date().getTime() + '.xlsx';
            let base64encodedData = req.body.data;
            const dirPath = `${con.ASSETREPO}/${con.UPLOAD}`;
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath);
            }
            filePath = dirPath + '/' + fileName;
            let buff = Buffer.from(base64encodedData, 'base64');
            await fs.writeFileSync(filePath, buff);
            logger.info("Class :: " + classname + " :: Method :: " + methodname + " filePath ::" + filePath);
            let AgentData = [];
            const file = await reader.readFile(filePath);
            const sheets = file.SheetNames;
            for (let i = 0; i < sheets.length; i++) {
                const temp = reader.utils.sheet_to_json(
                    file.Sheets[file.SheetNames[i]])
                temp.forEach((row) => {
                    var data = {};
                    data.policynumber = row.Policy_No.replaceAll('"', '');
                    data.documenttype = row.Document_Type;
                    data.name_of_insured = row.Name_of_Insured;
                    data.dispatch_date = row.Dispatch_Date;
                    data.prod_code = row.Prod_Code;
                    data.email_template = row.Email_Template;
                    data.type_of_email = row.Type_of_Email;
                    data.email_id = row.Email_Id;
                    data.status = 'Received';
                    AgentData.push(data);
                })
            }
            logger.info("Class :: " + classname + " :: Method :: " + methodname + " Data Length ::" + ((data && data != null) ? data.length : 0));
            if (AgentData && AgentData.length > 0) {
                db.agentdata.bulkCreate(AgentData)
                    .then(() => {
                        logger.info("Class :: " + classname + " :: Method :: " + methodname + " Agent Data Inserted ");
                        res.status(200).send({
                            message: "Uploaded the file successfully: "
                        });
                    })
                    .catch((error) => {
                        logger.error("Class :: " + classname + " :: Method :: " + methodname + " Agent Data not Inserted ::" + error);
                        res.status(500).send({
                            message: "Fail to import data into database!",
                            error: error.message,
                        });
                    });
            };
        }
    }
    catch (ex) {
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " Excepiton ERROR :: " + ex);
        res.status(200).send("something went wrong");
    }
}

exports.agentfileProcess = async (req, res) => {
    const methodname = 'agentfileProcess';
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
    try {
        var condition = { where: { status: 'Received' } };
        var agentData = await db.agentdata.findAll(condition);
        let emails = [];
        if (agentData && agentData != null && agentData != undefined && agentData.length > 0) {
            await agentData.filter(function (item) {
                var i = emails.findIndex(x => (x.email_id == item.email_id));
                if (i <= -1) {
                    emails.push(item);
                }
                return null;
            });
            if (emails && emails != null && emails.length > 0) {
                var condition1 = { where: { status: 'Processed' } };
                var customersData = await db.customers.findAll(condition1);
                if (customersData && customersData != null && customersData != undefined && customersData.length > 0) {
                    let customerIds = customersData.map(s => Number(s.id));
                    let updatecondition = { where: { id: { [Op.in]: customerIds } } };
                    await db.customers.update({ status: "Completed" }, updatecondition);
                    for (var i = 0; i < emails.length; i++) {
                        let updatecondition = { where: { email_id: emails[i].dataValues.email_id, status: "Received" } };
                        await db.agentdata.update({ status: "Processing" }, updatecondition)
                        var lstAgent = agentData.filter(val => val.email_id.includes(emails[i].dataValues.email_id));
                        logger.info("Class :: " + classname + " :: Method :: " + methodname + " Data Length ::" + ((lstAgent && lstAgent != null) ? lstAgent.length : 0));
                        let AgentDocuments = {};
                        AgentDocuments.agentEmail = emails[i].dataValues.email_id;
                        logger.info("Class :: " + classname + " :: Method :: " + methodname + " AgentDocuments.agentEmail ::" + AgentDocuments.agentEmail);
                        AgentDocuments.DocumentUrls = []
                        for (var j = 0; j < lstAgent.length; j++) {
                            logger.info("Class :: " + classname + " :: Method :: " + methodname + " Data Length ::");
                            if (customersData && customersData != undefined && customersData != null) {
                                var data = customersData.find(val => (val.documenttype.includes(lstAgent[j].dataValues.documenttype)) && (val.policynumber.includes(lstAgent[j].dataValues.policynumber)));
                                if (data && data != undefined) {
                                    logger.info("Class :: " + classname + " :: Method :: " + methodname + " Document Path ::" +  data.dataValues.policydocumentpath);
                                    AgentDocuments.DocumentUrls.push(data.dataValues.policydocumentpath);
                                }
                            }
                        }
                        if (AgentDocuments.DocumentUrls && AgentDocuments.DocumentUrls.length > 0) {
                            logger.info("Class :: " + classname + " :: Method :: " + methodname + " AgentDocuments.agentEmail::" + AgentDocuments.agentEmail);
                            await GetShortURLforAgent(AgentDocuments, function (response) {
                                logger.info("Class :: " + classname + " :: Method :: " + methodname + " agentEmail ::" + AgentDocuments.agentEmail);
                                let shorturl = JSON.parse(response.body).shorturl;
                                logger.info("Class :: " + classname + " :: Method :: " + methodname + " response ::" + JSON.stringify(response, null, 2));
                                if (shorturl && shorturl != null && shorturl != undefined) {
                                    let updatecondition = { where: { email_id: AgentDocuments.agentEmail, status: "Processing" } };
                                    db.agentdata.update({ status: "Processed", zipfilename: shorturl }, updatecondition)
                                }
                            });
                        }
                    }
                }
            }
        }
    }
    catch (ex) {
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " Excepiton ERROR :: " + ex);
    }
}

exports.SendAgentData = async (req, eres) => {
    const methodname = 'SendAgentData';
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
    try {
        const dirPath = `${con.ASSETREPO}/${con.UPLOAD}`;
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath);
        }
        let selectqueryText = `select distinct "email_id" as "Email_Id","zipfilename" as "Document_Link"  from "agentdetails" where "status"='Processed' ORDER BY "email_id"`;
        await db.sequelize.query(selectqueryText)
            .then(async (agentData) => {
                if (agentData[0] && agentData[0] != null && agentData[0] != undefined && agentData[0].length > 0) {
                    let csvfilePath = dirPath + '/' + 'AgentDetails.csv';
                    const ws = await fs.createWriteStream(csvfilePath);
                    await fastcsv.write(agentData[0], { headers: true }).on("finish", async () => {
                        await fimport.getFileStreamData(csvfilePath, async (streamdata) => {
                            logger.info("Class :: " + classname + " :: Method :: " + methodname + "stream data");
                            let document = {
                                "sourceId": con.AGENT_SOURCEID,
                                "locationId": con.AGENT_LOCATIONID,
                            }
                            await fimport.uploadFileToQuickcoms(streamdata.filestream, csvfilePath, document, async (fileuploadresponse) => {
                                logger.info("Class :: " + classname + " :: Method :: " + methodname + "file uploaded and uploaded response  =\n " + JSON.stringify(fileuploadresponse));
                                await fimport.runDataSourceFile(document, async (runresponse) => {
                                    if (runresponse && runresponse != undefined && runresponse != null) {
                                        logger.info("Class :: " + classname + " :: Method :: " + methodname + "data source run response  =\n " + JSON.stringify(runresponse));
                                        let runResponse = JSON.parse(runresponse);
                                        if (runResponse.status.toLowerCase() != 'fail') {
                                            logger.info("Class :: " + classname + " :: Method :: " + methodname + " message  = " + runResponse.message);
                                            if (runResponse.status.toLowerCase() != 'fail' && !runResponse.message.toLowerCase().includes('no data found')) {
                                                let agentIds = agentData[0].map(s => (s.Email_Id));
                                                let updatecondition = { where: { email_id: { [Op.in]: agentIds }, status: "Processed" } };
                                                db.agentdata.update({ status: "FTP_END" }, updatecondition)
                                            }
                                        }
                                    }
                                });
                            });
                        });
                    }).pipe(ws);
                }
            });
    }
    catch (ex) {
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " Excepiton ERROR :: " + ex);
    }

}

async function GetShortURLforAgent(AgentDocuments, callback) {
    let methodname = 'GetShortURLforAgent';
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin:: ");
    try {
        var options = {
            'method': 'GET',
            'url': con.SHORTURLAPI + "uploadbundleasset/shorturl",
            'headers': {
                'Content-Type': 'application/json',
                'httpfiles': 'false'
            },
            body: JSON.stringify({
                "data": AgentDocuments.DocumentUrls,

            })
        };
        await request(options, function (error, response) {
            if (error) throw new Error(error);
            logger.info("Class :: " + classname + " :: Method :: " + methodname + " response:: " + JSON.stringify(response, null, 2));
            callback(response);
        });
    }
    catch (ex) {
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " Excepiton ERROR :: " + ex);
    }
}