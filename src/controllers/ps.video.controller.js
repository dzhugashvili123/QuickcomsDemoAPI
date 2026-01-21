require("dotenv").config();
const con = require('../../config');
const logger = require("../utils/logtrace");

const db = require("../utils/database");
const classname = 'ps.vidoe.controller.js'
const formidable = require('formidable');
const shortid = require('shortid');
//const Psvideo = require('../models/ps.video.model')(sequelize, Sequelize);
const fs = require('fs');
const multer = require('multer');
const axios = require('axios');
const upload = multer({ dest: 'uploads/' });
const xlsx = require('xlsx');
const Sequelize = require('sequelize');
const { Op } = Sequelize;
const xml2js = require('xml2js');
exports.generatepsVideo = async (req, res) => {
    let methodname = 'generatepsVideo';
    let hostname = req.headers.origin || req.headers.referer;
    hostname = hostname ? hostname : req.rawHeaders['1'];
    try {
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
        var contype = req.headers['content-type'];
        if (contype.toLowerCase().includes('form-data')) {
            const form = formidable({ multiples: false });
            form.parse(req, async (err, fields, files) => {
                const videoId = fields.videoId;
                const excelFile = files.excelFile;
                if (!excelFile || !excelFile.filepath) {
                    return res.status(400).json({ error: 'Excel file not provided.' });
                }
                const excelFilePath = excelFile.filepath;
                const excelData = readExcelFile(excelFilePath);
                const xmlData = fs.readFileSync('GRIPPolicy.xml', 'utf8');
                xml2js.parseString(xmlData, async (err, result) => {
                    if (err) {
                        console.error('Error parsing XML:', err);
                        return;
                    }
                    const xmlvideoId = result.videoinfo.element[0].$.videoId;
                    // Result contains the parsed XML data as a JavaScript object
                    if (videoId !== xmlvideoId) {
                        return res.status(400).json({ error: 'Video ID does not match.' });
                    }
                    const comparisonResult = await compareColumns(excelData, result);
                    if (comparisonResult) {
                        let responseshorturls = await insertExcelDatainDB(excelData,videoId,excelFilePath);
                        res.send(responseshorturls);
                        await this.postdatatoPython();
                        //res.send(responseshorturls);

                    }
                    else
                    {
                        res.status(400).json({ error: 'Columns in Excel file do not match XML data.' });
                    }

                });
            });
        }

    }
    catch (error) {

    }
};
function readExcelFile(filePath) {
    try {
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        return xlsx.utils.sheet_to_json(worksheet);
    } catch (error) {
        console.error('Error reading Excel file:', error);
        return [];
    }
}
function compareColumns(excelData, xmlData) {
    const xmlVariables = xmlData.videoinfo.variables[0].variable;
    const xmlColumns = xmlVariables.map(v => v.$.key);
    const columnsToCompare = Object.keys(excelData[0]);
    for (const column of xmlColumns) {
        // Check if any row in excelColumns contains the column
        if (!columnsToCompare.some(row => row === column)) {
            return false;
        }
    }
    return true;
}

async function insertExcelDatainDB(excelData,videoId,excelFilePath) {
    try {

        const timestamp = new Date().toISOString();
        const dataToInsert = excelData.map(row => ({
            meta: JSON.stringify(row),
            timestamp: timestamp,
            status: 'Received',
            shortid: shortid.generate().substr(0, 6),
            videoid:videoId

        }));

        await db.psvideo.bulkCreate(dataToInsert);
         
        
        // Read the existing Excel file
        const workbook = xlsx.readFile(excelFilePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Add a new column for 'shortid' if it doesn't exist
        if (!worksheet['M1']) { // Assuming 'M' is the column letter for 'DocumentURL'
            worksheet['M1'] = { t: 's', v: 'shortid' };
        }

        // Update the Excel file with 'responseshorturls' in the 'shortid' column
        dataToInsert.forEach((row, index) => {
            const rowIndex = index + 2; // Assuming header row is at index 1
            worksheet[`M${rowIndex}`] = { t: 's', v: `${con.SHORT_URL}${row.shortid}` };
        });

        // Write the updated data back to the Excel file
        xlsx.writeFile(workbook, excelFilePath);

        console.log('Excel data and shortid URLs inserted successfully.');
        return dataToInsert.map((row) => {
            return con.SHORT_URL + row.shortid;
        });
        // return dataToInsert.map((row) => {
        //     return 'http://apps.tecra.com/pvideo/' + row.shortid
        // })
        console.log('Excel data inserted successfully.');
    } catch (error) {
        console.error('Error inserting Excel data:', error);
    }
}


exports.postdatatoPython = async () => {
    let methodname = 'postdatatoPython';
    //debugger;
    try {
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
        var recordcondition = { where: { status: `Received` } };
        await db.psvideo.findAll(recordcondition)
            .then(async (data) => {
                let recordids = data.map(s => Number(s.id));
                const updatecondition = { where: { id: { [Op.in]: recordids } } };
                await db.psvideo.update({ status: 'Processing' }, updatecondition).then(async () => {
                    //post data to python
                    for (const row of data) {
                        let senddata = JSON.parse(row.meta);
                        try {
                            const response = await axios.post(con.PYTHON_VIDEO_GENERATION_API,senddata);
                            let pythonresponse=response.data.message;
                            //let pythonresponse = 'https://assets.tecra.com/assets/files/2024/4/17/lJKv4i7JH_DigiGo_2min_AudioFinal_MAACFontReduced2Surendra.mp4';
                            //const responseupdate = { where: { id: { [Op.in]: [parseInt(row.id)] } } };
                            let rowid = parseInt(row.id);
                            var responseupdate = { where: { id: rowid } };
                            await db.psvideo.update({ status: 'Completed', videourl: pythonresponse }, responseupdate);
                        } catch (error) {
                            console.error('Error sending data to Python:', error);
                            // Handle the error as needed
                        }
                    }

                })
            }).catch(ex => {
                logger.error("Class :: " + classname + " :: Method :: " + methodname + " Exception1 ERROR:: " + ex);
            })
    }
    catch (ex) {
        logger.error("Class :: " + classname + " :: Method :: " + methodname + " Exception ERROR:: " + ex);
    }
}


exports.getvideourl = async (req, res) => {
    const shortid = req.headers['shortid'];

    if (!shortid) {
        return res.status(400).json({ error: 'Shortid is required in headers' });
    }

    try {
        // Find the record in the database where shortid matches
        const videoRecord = await db.psvideo.findOne({
            where: { shortid: shortid }
        });

        if (!videoRecord) {
            return res.status(404).json({ error: 'Video not found' });
        }

        // Extract the videourl from the record
        const videourl = videoRecord.videourl;

        res.json({ videourl });
    } catch (error) {
        console.error('Error fetching video URL:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}



