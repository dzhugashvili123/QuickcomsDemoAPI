const express = require("express");
const router = express.Router();
const checkAuth = require("../middlewares/checkAuth");
const { sendmessage } = require("../controllers/message.controller");
const { whatsapp, sms, email } = require("../controllers/callback.controller");
const { SendSMS, SendWhatsApp, SendEmail, sendtemplatemsg, sendOTP, sendoOTPtoQuickComs, sendoOTPtoQuickComsWIthOutEncrypt, SendCAREMSG } = require("../controllers/notify.controller");
const { scheduleWhatsApp, scheduleSMS, scheduleEMail, processMessageQueue } = require("../controllers/scheduler.controller");
const { XLSXFileImport, GetFileStream, BulkOTPFileImport, FileUploadToDataSource } = require("../controllers/file.import.controller");
const { GetReportByTrackingId } = require("../controllers/report.controller");
const { agentFileImport } = require("../controllers/agent.file.controller");
const { UploadCampaignData, GetCampaigns, GetCampaignReportByTrackingId } = require("../controllers/campaing.controller");
const { generateQuickcomsToken, generateQuickcomsTokenByGroup } = require("../controllers/token.controller");
const { generateIdomoVideo, generateIdomoToken } = require("../controllers/idomo.video.controller");
const { generatepsVideo, getvideourl } = require("../controllers/ps.video.controller");
const { UploadECCampaignData, ProcessCampgingCsv, GetCampaignsCampaignQueue, loginUser, handleSubmitSelectedRows, GetSelectCampaigns, generatePefOverview } = require("../controllers/campaignqueue.controller");
const { updateCampaignUser, getBjpCampaignUsers, getTdpCampaignUsers, updateBjpCampaignUser, updateTdpCampaignUser, getAdvCampaignUsers } = require("../controllers/campaignusers.controller");

router.get("/run/messagequeue", processMessageQueue);
router.get("/run/sms", scheduleSMS);
router.get("/run/whatsapp", scheduleWhatsApp);
router.get("/run/email", scheduleEMail);


// POC request routing //
router.post("/msg", checkAuth, sendmessage);

// EC Campaign routing 
router.post("/file-upload", UploadECCampaignData);
router.post("/process-campaign", ProcessCampgingCsv);
router.get("/get-campaigns", GetCampaignsCampaignQueue);
router.post("/login", loginUser);
router.post("/submit-selected-rows", handleSubmitSelectedRows);
router.get("/get-select-campaigns", GetSelectCampaigns);
router.get("/pdf/:shortId", generatePefOverview);

router.post("/msg", checkAuth, sendmessage);

// call back routing for channels //
router.post("/callback/whatsapp", whatsapp);
router.get("/callback/sms", sms);
router.post("/callback/email", email);

// test routing for channels //
router.post("/notify/sendsms", SendSMS);
router.post("/notify/sendwhatsapp", SendWhatsApp);
router.post("/notify/sendemail", SendEmail);
router.get("/notify/caremsg", SendCAREMSG);


// template id based routing for channels //
router.post("/notify/sendmsg", sendtemplatemsg);
router.get("/notify/sendotptest", sendOTP);
router.get("/notify/sendotp", checkAuth, sendoOTPtoQuickComs);
router.get("/notify/otp", checkAuth, sendoOTPtoQuickComsWIthOutEncrypt);

// fileimport and reports routing
router.post("/fileimport", XLSXFileImport);
router.get("/reports", GetReportByTrackingId);
router.post("/filestream", GetFileStream);
router.post("/fileimport/agent", agentFileImport);
router.post("/fileimport/otp", BulkOTPFileImport);
router.post("/fileimport/datasource", FileUploadToDataSource);
router.post("/uploadcampaign", UploadCampaignData);
router.get("/getcampaigns", GetCampaigns);
router.get("/getcampaignreport", GetCampaignReportByTrackingId);
router.get("/generatetoken", generateQuickcomsToken);
router.get("/generatetokenbygroup", generateQuickcomsTokenByGroup);
router.post("/idomo/generatevideo", generateIdomoVideo);
router.get("/idomo/generatetoken", generateIdomoToken);


router.post("/ps/generatepsvideo", generatepsVideo);
router.get("/ps/getvideourl", getvideourl);

router.get("/get-select-campaign-users-bjp", getBjpCampaignUsers);
router.get("/get-select-campaign-users-tdp", getTdpCampaignUsers);
router.get("/get-select-campaign-users-adv", getAdvCampaignUsers);
router.post('/update-campaign-user', updateCampaignUser);
router.post('/update-bjp-user', updateBjpCampaignUser);
router.post('/update-tdp-user', updateTdpCampaignUser);

module.exports = router;