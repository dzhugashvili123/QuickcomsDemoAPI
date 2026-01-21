require("dotenv").config();
const con = require('../../config');
var path = require("path");
var fs = require('fs');
const classname = 'notify.controller.js'
const logger = require("../utils/logtrace");
var request = require("request");
const crypto = require("crypto");
var fimport = require('../controllers/file.import.controller');
const fastcsv = require("fast-csv");


exports.SendSMS = async (req, res) => {
  try {
    logger.info("Class :: " + classname + " :: Method :: sendSMS Begin");
    const mobile = req.body.mobile;
    const message = req.body.message;
    logger.info("Class :: " + classname + " :: Method :: sendSMS mobile ::" + mobile);
    await sendSMS(mobile, message, function (response) {
      logger.info("Class :: " + classname + " :: Method ::sendSMS - response::" + response);
      res.send(response);
    });
    logger.info("Class :: " + classname + " :: Method :: sendsms end");
  } catch (error) {
    next(error);
  }
};

exports.SendWhatsApp = async (req, res) => {
  const methodname = 'SendWhatsApp';
  logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
  try {
    var mobile = req.body.mobile;
    var msgContent = req.body.message;
    let msgType = req.body.msgType;
    let mediaUrl = req.body.mediaUrl;
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " mobile =" + mobile);
    if (msgType && msgType != null && msgType != "" && mediaUrl && mediaUrl != null && mediaUrl != "") {
      await sendwhatsappMediaMessage(mobile, msgContent, msgType, mediaUrl, function (response) {
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " response::" + response);
        res.send(response);
      });
    }
    else {
      let templatetype;
      await sendwhatsappTextMessage(mobile, msgContent, templatetype, function (response) {
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " response::" + response);
        res.send(response);
      });
    }
  } catch (error) {
    res.send(error);
  }
};

exports.SendEmail = async (req, res) => {
  logger.info("Class :: " + classname + " :: Method :: SendEmail Begin");
  try {
    var subject = req.body.subject;//"Email Test";
    var toEmail = req.body.toemail;//"venkateswarlu.dasari@tecra.com";
    var bodyContent = req.body.bodycontent;//"Hi, welcome to email service";
    var attachments = req.body.attachments;
    logger.info("Class :: " + classname + " :: Method :: SendEmail subject ::" + subject);
    logger.info("Class :: " + classname + " :: Method :: SendEmail attachments ::" + attachments);
    await sendEmail(subject, toEmail, bodyContent, attachments, function (response) {
      logger.info("Class :: " + classname + " :: Method :: SendEmail response::" + response);
      res.send(response);
    });
    logger.info("Class :: " + classname + " :: Method :: SendEmail end");
  } catch (error) {
    logger.error("Class ::  :: Method :: SendEmail :: ERROR : " + error);
    next(error)
  }
};

exports.SendCAREMSG = async (req, res) => {
  let methodname = 'SendCAREMSG';
  try {
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
    let link;
    let mobile;
    if (Object.keys(req.query).length > 0) {

      link = req.query['link'];
      mobile = req.query['mobile'];
      logger.info("Class :: " + classname + " :: Method :: " + methodname + " link= " + link);
      logger.info("Class :: " + classname + " :: Method :: " + methodname + " mobile = " + mobile);
      let msgContent = `${await fs.readFileSync(con.APP_ROOTDIR + "Templates/CareMessage.txt", { encoding: 'utf8', flag: 'r' })}`;
      msgContent = msgContent.replace('{{DocumentURL}}', link);
      logger.info("Class :: " + classname + " :: Method :: " + methodname + " msgContent = " + msgContent);
      let templatetype;
      await sendwhatsappTextMessage(mobile, msgContent, templatetype, function (response) {
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " response::" + response);
        res.send(response);
        
      });

    }
    logger.info("Class :: " + classname + " :: Method :: SendCAREMSG end");
  } catch (error) {
    next(error);
  }
};

exports.sendOTP = async (req, res) => {
  const methodname = 'sendOTP';
  logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
  try {
    let otp = req.query.otp;
    let expiresin = req.query.expiresin;
    let mobile = req.query.mobile;
    let email = req.query.email;
    let channel = req.query.channel;
    let templateid = req.query.product;
    let templatetype = "sendotp";
    var paramsData;
    if (expiresin && expiresin != null) {
      paramsData = [otp, expiresin];
    }
    else {
      paramsData = [otp];
    }

    if (!otp) res.send('parameter otp is required');

    if (!channel) res.send('parameter channel is required');

    if (!templateid) res.send('parameter templateid is required');

    if (channel.toLowerCase() == "sms" || channel.toLowerCase() == "whatsapp")
      if (!email) res.send('mobile is required');

    if (channel.toLowerCase() == "email")
      if (!mobile) res.send('email is required');

    await this.ProcessTemplateMessage(mobile, templateid, channel, "", "", email, templatetype, paramsData, function (response) {
      logger.info("Class :: " + classname + " :: Method :: " + methodname + " response::" + response);
      res.send(response);
    });
  }
  catch (ex) {
    logger.error("Class :: " + classname + " :: Method :: " + methodname + " error:: " + ex);
  }
};

exports.sendtemplatemsg = async (req, res) => {
  const methodname = 'sendtemplatemsg';
  logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
  try {
    let mobile = req.body.mobile;
    let templateid = req.body.templateid;
    let templatetype = req.body.templatetype;
    let channel = req.body.channel;
    let msgType = req.body.msgType;
    let mediaUrl = req.body.mediaUrl;
    let email = req.body.email;
    let params = req.body.variables;
    var paramsData = [];
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " params::" + params);
    // if (params && params != null)
    //   paramsData = JSON.parse(params);
    await this.ProcessTemplateMessage(mobile, templateid, channel, msgType, mediaUrl, email, templatetype, params, function (response) {
      logger.info("Class :: " + classname + " :: Method :: " + methodname + " response::" + response);
      res.send(response);
    });
  }
  catch (ex) {
    logger.error("Class :: " + classname + " :: Method :: " + methodname + " error:: " + ex);
  }
}

exports.ProcessTemplateMessage = async function ProcessTemplateMessage(mobile, templateid, channel, msgType, mediaUrl, email, templatetype, paramsData, callback) {
  const methodname = 'sendtemplatemsg';
  try {
    let msgContent = '';
    msgContent = await fs.readFileSync(con.APP_ROOTDIR + "Templates/" + templateid + ".txt", { encoding: 'utf8', flag: 'r' });
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " msgContent:: " + msgContent);
    if (paramsData.length > 0) {
      for (var i = 0; i <= paramsData.length; i++) {
        msgContent = msgContent.replace('{{' + (i + 1) + '}}', paramsData[i]);
      }
      logger.info("Class :: " + classname + " :: Method :: " + methodname + " msgContent after replace :: " + msgContent);
    }
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " channel ::" + channel);
    if (channel.toLowerCase() == "whatsapp") {
      if (msgType && msgType != null && msgType != "" && mediaUrl && mediaUrl != null && mediaUrl != "") {
        await sendwhatsappMediaMessage(mobile, msgContent, msgType, mediaUrl, function (response) {
          logger.info("Class :: " + classname + " :: Method :: " + methodname + " response::" + response);
          callback(response);
        });
      }
      else {
        await sendwhatsappTextMessage(mobile, msgContent, templatetype, function (response) {
          logger.info("Class :: " + classname + " :: Method :: " + methodname + " response::" + response);
          callback(response);
        });
      }
    }
    if (channel.toLowerCase() == "sms") {
      await sendSMS(mobile, msgContent, function (response) {
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " response::" + response);
        callback(response);
      });
    }
    if (channel.toLowerCase() == "email") {
      let subject = "One Time Password (OTP) for your online transaction at LGI ";
      //let msgContent = "";
      let attachmentpaths = "";
      await sendEmail(subject, email, msgContent, attachmentpaths, function (response) {
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " response::" + response);
        callback(response);
      });
    }
  }
  catch (ex) {
    logger.error("Class :: " + classname + " :: Method :: " + methodname + " error:: " + ex);
  }
}

async function sendwhatsappMediaMessage(phone, content, msgType, mediaUrl, callback) {
  const methodname = 'sendwhatsappMediaMessage';
  logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
  const userid = con.GS_WHATSAPP_USERID;
  const password = con.GS_WHATSAPP_PWD;
  var options = {
    method: 'POST',
    url: 'https://media.smsgupshup.com/GatewayAPI/rest',
    form:
    {
      userid: userid,
      password: password,
      method: 'SendMediaMessage',
      auth_scheme: 'PLAIN',
      v: 1.1,
      send_to: phone,
      media_url: mediaUrl,
      msg_type: msgType,
      caption: content,
      //isTemplate: true,
      //isHSM: true,
      format: 'JSON',
      //footer: "Reply STOP to unsubscribe"
    }
  };
  logger.info("Class :: " + classname + " :: Method :: " + methodname + " mediaUrl:: " + mediaUrl);
  logger.info("Class :: " + classname + " :: Method :: " + methodname + " msg_type:: " + msgType);
  logger.info("Class :: " + classname + " :: Method :: " + methodname + " caption:: " + content);
  await request(options, function (error, response, body) {
    if (error) {
      logger.error("Class :: " + classname + " :: Method :: " + methodname + " error-1 :: " + error);
    }
    else {
      logger.info("Class :: " + classname + " :: Method :: " + methodname + " Response:: " + body);
      callback(body);
    }
  });
}

async function sendwhatsappTextMessage(phone, content, templatetype, callback) {
  const methodname = 'sendwhatsappTextMessage';
  logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
  const userid = con.GS_WHATSAPP_USERID;
  const password = con.GS_WHATSAPP_PWD;
  var options = {
    method: 'POST',
    url: 'https://media.smsgupshup.com/GatewayAPI/rest',
    form:
    {
      userid: userid,
      password: password,
      method: 'sendMessage',
      auth_scheme: 'PLAIN',
      v: 1.1,
      send_to: phone,
      msg: content,
      msg_type: 'TEXT',
      isTemplate: templatetype == "marketing" ? true : false,
      format: 'JSON'
    }
  };
  await request(options, function (error, response, body) {
    if (error) {
      logger.error("Class :: " + classname + " :: Method :: " + methodname + " error-1 :: " + error);
    }
    else {
      logger.info("Class :: " + classname + " :: Method :: " + methodname + " Response:: " + body);
      callback(body);
    }
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " end");
  });
}

async function sendSMS(phone, msgContent, callback) {
  let methodname = 'sendSMS';
  logger.info("Class :: " + classname + " :: Method :: " + methodname + " begin");
  try {
    const userid = con.GS_SMS_USERID;
    const password = con.GS_SMS_PWD;
    var options = {
      method: 'POST',
      url: 'https://enterprise.smsgupshup.com/GatewayAPI/rest',
      form:
      {
        method: 'sendMessage',
        send_to: phone,
        msg: msgContent,
        msg_type: 'TEXT',
        userid: userid,
        auth_scheme: 'PLAIN',
        password: password,
        format: 'JSON',
        v: 1.1
      }
    };
    await request(options, async function (error, res, body) {
      if (error) {
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " ERROR 1:: " + error);
      }
      else {
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " Response ::" + body);
        callback(body);
      }
    });
  }
  catch (ex) {
    logger.error("Class :: " + classname + " :: Method :: " + methodname + " ERROR 1:: " + ex);
  }
}

async function sendEmail(subject, toEmail, bodyContent, attachmentpaths, callback) {
  logger.info("Class :: " + classname + " :: Method :: sendEmail Begin");
  try {
    var formObj = {
      'method': 'EMS_POST_CAMPAIGN', 'userid': con.GS_EMAIL_USERID, 'password': con.GS_EMAIL_PWD, 'v': '1.1','fromEmailId': con.FROM_EMAIL,
      'content_type': 'text/html', 'name': con.DISPLAY_NAME, 'subject': subject, 'recipients': toEmail,
      'content': bodyContent, 'replyToEmailID': con.FROM_EMAIL
    };
    if (attachmentpaths != undefined && attachmentpaths != null && attachmentpaths != "") {
      var attachments = attachmentpaths.split(","); //Array.from(attachmentpaths)
      logger.info("Class :: " + classname + " :: Method :: sendEmail attachments.length:" + attachments.length);
      if (attachments && attachments.length > 0) {
        for (var i = 0; i <= attachments.length - 1; i++) {
          logger.info("Class ::" + classname + " :: Method :: sendEmail attachments path:" + attachments[i]);
          logger.info("Class :: " + classname + " :: Method :: sendEmail attachments name:" + path.basename(attachments[i]));
          var attachment = {
            'value': fs.createReadStream(attachments[i]),
            'options': {
              'filename': path.basename(attachments[i]),
              'contentType': 'application/pdf'
            }
          }
          let key = 'attachment' + (i + 1);
          formObj[key] = attachment;

        }
      }
    }
    var options = {
      method: 'POST',
      url: 'http://enterprise.webaroo.com/GatewayAPI/rest',
      formData: formObj
    };

    await request(options, function (error, response, body) {
      if (error) {
        logger.info("Class :: " + classname + " :: Method :: sendEmail ERROR 1:: " + error);
        callback(error)
      }
      logger.info("Class :: " + classname + " :: Method :: sendEmail Response:: " + body);
      callback(body);
    });
    logger.info("Class :: email.service :: Method :: sendEmail end");
  } catch (error) {
    callback(error)
  }
}
const cryptojs = require('crypto-js')
let password = "123";
exports.sendoOTPtoQuickComs = async (req, res) => {
  const methodname = 'sendoOTPtoQuickComs';
  logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
  try {
    let encryptedData = req.query.input;
    encryptedData = encryptedData.replaceAll('xMl3Jk', '+').replaceAll('Por21Ld', '/').replaceAll('Ml32', '=')
    const result = cryptojs.AES.decrypt(encryptedData, password);
    let QueryParams = result.toString(cryptojs.enc.Utf8);
    let urlparams = QueryParams.split('&');
    if (urlparams && urlparams != null && urlparams != undefined) {
      // let otp = req.query.otp;
      // let mobile = req.query.mobile;
      // let email = req.query.email;
      // let channel = req.query.channel;
      // let product = req.query.product;
      let otp;
      let mobile;
      let email;
      let channel;
      let product;
      for (var x = 0; x < urlparams.length; x++) {
        var parameters = urlparams[x].split('=');
        for (var y = 0; y < parameters.length; y++) {
          switch (parameters[y]) {
            case "otp": otp = parameters[y + 1];
              break;
            case "mobile": mobile = parameters[y + 1];
              break;
            case "email": email = parameters[y + 1];
              break;
            case "channel": channel = parameters[y + 1];
              break;
            case "product": product = parameters[y + 1];
              break;
          }
        }
      }
      logger.info("Class :: " + classname + " :: Method :: " + methodname + " otp ::" + otp);
      logger.info("Class :: " + classname + " :: Method :: " + methodname + " mobile ::" + mobile);
      logger.info("Class :: " + classname + " :: Method :: " + methodname + " email ::" + email);
      logger.info("Class :: " + classname + " :: Method :: " + methodname + " channel ::" + channel);
      logger.info("Class :: " + classname + " :: Method :: " + methodname + " product ::" + product);
      if (!otp || otp == null || otp == undefined || otp == "") {
        res.send('parameter otp is required');
      }
      if (!channel || channel == null || channel == undefined || channel == "") {
        res.send('parameter channel is required');
      }
      if (!product || product == null || product == undefined || product == "") {
        res.send('parameter product is required');
      }
      if (channel.toLowerCase().includes('whatsapp') || channel.toLowerCase().includes('sms') || channel.toLowerCase().includes('all')) {
        if (!mobile || mobile == null || mobile == undefined || mobile == "") {
          res.send('mobile is required');
        }
      }
      if (channel.toLowerCase().includes('email') || channel.toLowerCase().includes('all')) {
        if (!email || email == null || email == undefined || email == "") {
          res.send('email is required');
        }
      }
      let data = await fs.readFileSync(con.APP_ROOTDIR + "src/config/products.config.json", "utf8");
      if (data != null && data != undefined) {
        var lstproduct = JSON.parse(data).products;
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " lstproduct ::" + lstproduct.length);
        if (lstproduct != null && lstproduct != undefined && lstproduct.length > 0) {
          for (var i = 0; i < lstproduct.length; i++) {
            logger.info("Class :: " + classname + " :: Method :: " + methodname + " Campaign product ::" + lstproduct[i].productName);
            logger.info("Class :: " + classname + " :: Method :: " + methodname + " product ::" + product);
            if (product.toLowerCase() == lstproduct[i].productName.toLowerCase()) {
              var otpcampaign = {
                "data": [
                  {
                    "customer": {
                      "custom_record_id": Math.floor(100000 + Math.random() * 900000),
                      "Email_Id": email,
                      "Mobile_no": mobile,
                      "code": otp,
                      "channel": channel
                    }
                  }
                ]
              };
              logger.info("Class :: " + classname + " :: Method :: " + methodname + " otpcampaign ::" + JSON.stringify(otpcampaign));
              const dirPath = `${con.ASSETREPO}/${con.UPLOAD}/OTP Files`;
              if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath);
              }
              let jsonfilePath = dirPath + '/' + 'Otp_Campaign.json';

              await uploadCampaigntoQuickComs(jsonfilePath, otpcampaign, lstproduct[i], function (resStatus) {
                res.status(200).send("success");
              })
            }
          }
        }
      }
    }
    else {
      res.status(200).send("something wrong went...");
    }

  }
  catch (ex) {
    logger.error("Class :: " + classname + " :: Method :: " + methodname + " Exception ::" + ex);
  }

}

async function uploadCampaigntoQuickComs(jsonfilePath, otpcampaign, product, callback) {
  const methodname = 'sendoOTPtoQuickComs';
  logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
  try {
    await fs.writeFile(jsonfilePath, JSON.stringify(otpcampaign), async function (err) {
      if (err) throw err;
      await fimport.getFileStreamData(jsonfilePath, async (streamdata) => {
        logger.info("Class :: " + classname + " :: Method :: " + methodname + "stream data");
        let document = {
          "sourceId": product.sourceId,
          "locationId": product.locationId,
        }
        await fimport.uploadFileToQuickcoms(streamdata.filestream, jsonfilePath, document, async (fileuploadresponse) => {
          logger.info("Class :: " + classname + " :: Method :: " + methodname + "file uploaded and uploaded response  =\n " + JSON.stringify(fileuploadresponse));
          await fimport.runDataSourceFile(document, async (runresponse) => {
            if (runresponse && runresponse != undefined && runresponse != null) {
              logger.info("Class :: " + classname + " :: Method :: " + methodname + "data source run response  =\n " + JSON.stringify(runresponse));
              let runResponse = JSON.parse(runresponse);
              if (runResponse.status.toLowerCase() != 'fail') {
                logger.info("Class :: " + classname + " :: Method :: " + methodname + " message  = " + runResponse.message);
                callback(runResponse)
              }
            }
          });
        });
      });
    });
  }
  catch (ex) {
    logger.error("Class :: " + classname + " :: Method :: " + methodname + " Exception ::" + ex);
  }
}

exports.sendoOTPtoQuickComsWIthOutEncrypt = async (req, res) => {
  const methodname = 'sendoOTPtoQuickComsWIthOutEncrypt';
  logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
  try {

    let otp = req.query.otp;
    let mobile = req.query.mobile;
    let email = req.query.email;
    let channel = req.query.channel;
    let product = req.query.product;

    logger.info("Class :: " + classname + " :: Method :: " + methodname + " otp ::" + otp);
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " mobile ::" + mobile);
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " email ::" + email);
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " channel ::" + channel);
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " product ::" + product);
    if (!otp || otp == null || otp == undefined || otp == "") {
      res.send('parameter otp is required');
    }
    if (!channel || channel == null || channel == undefined || channel == "") {
      res.send('parameter channel is required');
    }
    if (!product || product == null || product == undefined || product == "") {
      res.send('parameter product is required');
    }
    if (channel.toLowerCase().includes('whatsapp') || channel.toLowerCase().includes('sms') || channel.toLowerCase().includes('all')) {
      if (!mobile || mobile == null || mobile == undefined || mobile == "") {
        res.send('mobile is required');
      }
    }
    if (channel.toLowerCase().includes('email') || channel.toLowerCase().includes('all')) {
      if (!email || email == null || email == undefined || email == "") {
        res.send('email is required');
      }
    }
    let data = await fs.readFileSync(con.APP_ROOTDIR + "src/config/products.config.json", "utf8");
    if (data != null && data != undefined) {
      var lstproduct = JSON.parse(data).products;
      logger.info("Class :: " + classname + " :: Method :: " + methodname + " lstproduct ::" + lstproduct.length);
      if (lstproduct != null && lstproduct != undefined && lstproduct.length > 0) {
        for (var i = 0; i < lstproduct.length; i++) {
          logger.info("Class :: " + classname + " :: Method :: " + methodname + " Campaign product ::" + lstproduct[i].productName);
          logger.info("Class :: " + classname + " :: Method :: " + methodname + " product ::" + product);
          if (product.toLowerCase() == lstproduct[i].productName.toLowerCase()) {
            var otpcampaign = {
              "data": [
                {
                  "customer": {
                    "custom_record_id": Math.floor(100000 + Math.random() * 900000),
                    "Email_Id": email,
                    "Mobile_no": mobile,
                    "code": otp,
                    "channel": channel
                  }
                }
              ]
            };
            logger.info("Class :: " + classname + " :: Method :: " + methodname + " otpcampaign ::" + JSON.stringify(otpcampaign));
            const dirPath = `${con.ASSETREPO}/${con.UPLOAD}/OTP Files`;
            if (!fs.existsSync(dirPath)) {
              fs.mkdirSync(dirPath);
            }
            let jsonfilePath = dirPath + '/' + 'Otp_Campaign.json';

            await uploadCampaigntoQuickComs(jsonfilePath, otpcampaign, lstproduct[i], function (resStatus) {
              res.status(200).send("success");
            })
          }
        }
      }
    }
  }
  catch (ex) {
    logger.error("Class :: " + classname + " :: Method :: " + methodname + " Exception ::" + ex);
  }

}