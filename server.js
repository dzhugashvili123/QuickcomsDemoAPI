const express = require("express");
const { Client } = require('pg');
const cors = require("cors");
require("dotenv").config();
const con = require('./config');
const cron = require("node-cron");
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const { ACCESS_DENIED_ERR, API_ENDPOINT_NOT_FOUND_ERR, SERVER_ERR } = require("./errors");
const { createJwtToken, verifyJwtToken } = require("./src/utils/token.util");
const authRoutes = require("./src/routes/auth.route");
var logger = require('./src/utils/logtrace');
var schedule = require("./src/controllers/scheduler.controller");
var { ProcessCutomerFileData, DownloadJobs, SendMessages, UploadCustomerData, Upload_LGI_CustomerData } = require('./src/controllers/file.processor.controller');
var { DownloadFilesExt } = require("./src/controllers/file.download.controller");
var agent = require("./src/controllers/agent.file.controller");
const sftpClient = require('ssh2-sftp-client');
var mainwatcher = require('./src/watchers/mainloop')
const cryptojs = require('crypto-js')
let password = "123";

const config = {
	host: '183.82.96.182',
	port: 22,
	username: 'tecra_qa',
	password: 'tecra1'
};

const db = require("./src/utils/database");
// init express app
const app = express();
app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());



app.use(function (req, res, next) {
	try {
		res.header("Access-Control-Allow-Origin", "*");
		res.header("Access-Control-Allow-Headers", "Accept,Accept-Language,Content-Language,Content-Type");
		res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, DELETE,PUT");
		res.header("Access-Control-Expose-Headers", "ontent-Length,Content-Range");
		next();

	} catch (ex) {
		logger.error("Error occured at app.use. " + ex);
		return res.status(500).send("Internal server exception");
	}

});

// main method for connect db and run node
main();

app.get("/", function (request, response) {
	//logger.info("TEST SFTP BEGIN :");
	try {
		// let client = new sftpClient();

		// let localpath = 'D:/Websites/QuickComs/PolicyMarkettingPOC/QuickcomsDemoAPI/assets/PRINT_FILES/';
		// let serverpath = '/home/tecra_qa/ArcetDemo/Liberty_POC/PolicySchedule_Output/';

		// client.connect(config)
		// .then(() => {
		// logger.info("TEST SFTP CONNECTED :");
		// return client.get(serverpath, localpath);
		// })
		// .then(() => {
		// logger.info("TEST SFTP DISCONNECT :");
		// client.end();
		// })
		// .catch(err => {
		// console.error(err.message);
		// logger.info("TEST SFTP INNER ERROR :"+err);
		// });


		// client.connect(config)
		// .then(() => {
		// logger.info("TEST SFTP CONNECTED :");
		// return client.list(serverpath);
		// }).then(data => {
		// //console.log(data, 'the data info');
		// data.forEach(async element => {
		// //console.log('element.name' + element.name);
		// logger.info("TEST SFTP element.name :"+element.name);
		// await client.fastGet(serverpath + '/' + element.name, localpath + element.name, {keepaliveInterval:0});
		// //await client.delete(serverpath + '/' + element.name);
		// });
		// }).catch(err => {
		// logger.info("TEST SFTP INNER ERROR :"+err);
		// });
	}
	catch (ex) {
		logger.info("TEST SFTP ERROR :" + ex);
	}
	response.json({ "Message": "Welcome to Node js" });
});

app.post("/encrypt", (req, res) => {
	logger.info("Class :: encrypt begin ");
	let params = req.body.url;
	const result = cryptojs.AES.encrypt(params, password);
	res.send(result.toString().replaceAll('+', 'xMl3Jk').replaceAll('/', 'Por21Ld').replaceAll('=', 'Ml32'));
})
app.get("/decrypt", (req, res) => {
	logger.info("Class :: decrypt begin ");
	let encryptedData = req.query.input;
	encryptedData = encryptedData.replaceAll('xMl3Jk', '+').replaceAll('Por21Ld', '/').replaceAll('Ml32', '=')
	const result = cryptojs.AES.decrypt(encryptedData, password);
	let urlparams = result.toString(cryptojs.enc.Utf8);
	res.send(urlparams);
})


// index route
app.get("/api/healthcheck", (req, res) => {
	res.status(200).json({
		type: "success",
		message: "server is up and running",
		data: null,
	});
});

// generate jwt token and pass
app.post("/api/generateToken", (req, res) => {
	const channeltoken = req.header(con.CHANNEL_HEADER_KEY);
	logger.info("channeltoken :" + channeltoken);
	if (con.CHANNEL_TOKEN == channeltoken) {
		logger.info("createJwtToken  Begin");
		const token = createJwtToken({ AppName: con.CHANNEL_TOKEN });
		logger.info("generated Jwt token :" + token);
		logger.info("createJwtToken  End");
		res.send(token);
	}
	else {
		logger.info("generateToken method :: " + ACCESS_DENIED_ERR);
		return res.status(401).send(ACCESS_DENIED_ERR);
	}
});

app.get("/api/authtoken", (req, res) => {
	const channeltoken = req.header(con.CHANNEL_HEADER_KEY);
	logger.info("channeltoken :authtoken: " + channeltoken);
	try {
		logger.info("channeltoken :authtoken HOST:" + req.header('Host'));
	}
	catch { }
	if (con.CHANNEL_TOKEN == channeltoken) {
		logger.info("createJwtToken  Begin");
		const token = createJwtToken({ AppName: con.CHANNEL_TOKEN });
		logger.info("generated Jwt token :" + token);
		logger.info("createJwtToken  End");
		res.send(token);
	}
	else {
		logger.info("generateToken method :: " + ACCESS_DENIED_ERR);
		return res.status(401).send(ACCESS_DENIED_ERR);
	}
});

// routes middlewares
app.use("/api", authRoutes);

// page not found error handling  middleware
app.use("*", (req, res, next) => {
	const error = {
		status: 404,
		message: API_ENDPOINT_NOT_FOUND_ERR,
	};
	logger.error("Error occured at app.use. " + error);
	next(error);
});

// global error handling middleware
app.use((err, req, res, next) => {
	logger.error("Error occured at app.use. " + err);
	const status = err.status || 500;
	const message = err.message || SERVER_ERR;
	const data = err.data || null;
	res.status(status).json({
		type: "error",
		message,
		data,
	});
});

async function main() {
	try {
		// const client = new Client(dbcon);
		// await client.connect().catch(ex => {
		//   logger.error("database not connected. " + ex);
		// });
		logger.info("Server started running on :" + con.PORT);
		mainwatcher.setupMainLoop();
		db.sequelize.sync()
			.then(() => {
				logger.info("Class :: index.js  :: sync Synced db ");
			})
			.catch((err) => {
				logger.error("Error occured at db.sequelize.sync() " + err.message);
			});
		app.listen(con.PORT, () => console.log(`Server listening on port ${con.PORT}`));

		//db for using Model


	} catch (error) {
		logger.error("database not connected-1. " + error);
		process.exit(1);
	}
}





// var isWhatsAppEnabled = true;
// cron.schedule("*/30 * * * * ",async function () {
//   if (isWhatsAppEnabled) {
//     isWhatsAppEnabled = false;
// 	logger.info("scheduleWhatsApp Service Begin :: #######");
//     await schedule.scheduleWhatsApp();
//     logger.info("scheduleWhatsApp Service END :: #######");
//     isWhatsAppEnabled = true;               
//   }
// });

// var isSMSServiceEnabled = true;
// cron.schedule("1 * * * * *",async function () {
//   if (isSMSServiceEnabled) {
//     isSMSServiceEnabled = false;
// 	logger.info("scheduleSMS Service Begin :: #######");
//     await schedule.scheduleSMS();
//     logger.info("scheduleSMS Service END :: #######");
//     isSMSServiceEnabled = true;               
//   }
// });

// var isEmailServiceEnabled = true;
// cron.schedule("*/30 * * * *",async function () {
//   if (isEmailServiceEnabled) {
//     isEmailServiceEnabled = false;
// 	logger.info("scheduleEMail Service Begin :: #######");
//     await schedule.scheduleEMail();
//     logger.info("scheduleEMail Service END :: #######");
//     isEmailServiceEnabled = true;               
//   }
// });

// function extractValuesFromTemplate(template, content) {
//     const variableRegex = /<([^>]+)>/g;
//     let regexPattern = '';
//     let lastIndex = 0;
//     let match;

//     while ((match = variableRegex.exec(template)) !== null) {
//         // fixed text before variable, escape regex chars
//         const fixedText = template.slice(lastIndex, match.index);
//         regexPattern += escapeRegExpFlexibleWhitespace(fixedText);

//         // Instead of greedy (.+?), allow matching anything non-greedy including newlines (use [\s\S]+?)
//         regexPattern += '([\\s\\S]+?)';

//         lastIndex = match.index + match[0].length;
//     }

//     // Add trailing fixed text
//     regexPattern += escapeRegExpFlexibleWhitespace(template.slice(lastIndex));

//     // Create full regex with ^ $ to match whole content
//     const fullRegex = new RegExp('^' + regexPattern + '$');

//     const resultMatch = fullRegex.exec(content);
//     if (!resultMatch) {
//         throw new Error("Content does not match the template structure.");
//     }

//     // Return captured variable values (skip full match at index 0)
//     return resultMatch.slice(1);
// }

// function escapeRegExpFlexibleWhitespace(text) {
//     // Escape regex special chars but convert all whitespace (space, tabs, newlines) to \s+
//     return text
//         .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')   // Escape regex chars
//         .replace(/\s+/g, '\\s+');                  // Replace all whitespace sequences with \s+
// }


// // ✅ Example Usage
// const template = `Dear <Variable1>, Thank you for joining us. Please check our vision here: <Variable2> 
// Here is the PDF file: <Variable3>`;

// const content = `Dear Rahul, Thank you for joining us. Please check our vision here: {{DocumentURL}} Here is the PDF file: {{PDFURL}}`;

// const values = extractValuesFromTemplate(template, content);
// console.log(values);
 
// const axios = require("axios");


// async function shortenUrl(longUrl) {
//   try {
//     const encodedUrl = longUrl.replace(/ /g, "%20"); // replace spaces
//     const res = await axios.get(
//       `https://is.gd/create.php?format=simple&url=${encodeURIComponent(encodedUrl)}`
//     );
//     return res.data;
//   } catch (error) {
//     console.error("Error shortening URL:", error.message);
//     return longUrl;
//   }
// }

// //Test
// (async () => {
//   const testUrl = "https://my-app-public-files-123.s3.ap-south-2.amazonaws.com/Image.pdf";
//   const shortUrl = await shortenUrl(testUrl);
//   console.log("Returned Short URL:", shortUrl);
// })();
