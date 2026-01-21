require("dotenv").config();
const con = require('../../config');
const db = require("../utils/database");
const logger = require("../utils/logtrace");
const classname = 'message.controller.js'
const crypto = require("crypto");
const {messagequeueStatusEnum} =require('../models/whatsapp.message.status');
const { stringify } = require("querystring");
exports.sendmessage = async (req, res, next) => {
  let methodname='sendmessage';
	logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
	try {
		console.log(req.body);
		logger.info("Class :: " + classname + " :: Method :: " + methodname + " req.body = " + JSON.stringify(req.body));
		let response = {};
     await this.SaveDataIntoMessageQueue(req.body, function (trackingId) {
	  logger.info("Class :: " + classname + " :: Method :: " + methodname + " req.body = "+req.body);
      logger.info("Class :: " + classname + " :: Method :: " + methodname + " trackingId = "+trackingId);
      response.trackingid=trackingId;
      response.status='sucess';
      response.statuscode=200;
      res.send(response);
    });
    } catch (error) {
      next(error);
    }
  };

  exports.SaveDataIntoMessageQueue=async function SaveDataIntoMessageQueue(req,callback)  {
    const methodname = 'SaveDataIntoMessageQueue';
   
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
    //var mobile=req.body.mobile;
    //var message=req.body.message;
    //logger.info("Class :: " + classname + " :: Method :: " + methodname);
    try {
      let guid = crypto.randomBytes(16).toString("hex");
      if(req.orderid!=undefined)
      {
        guid=req.orderid;
      }
      let data={meta:JSON.stringify(req),trackingid:guid,timestamp:new Date().toISOString(),status:messagequeueStatusEnum.received};
      logger.info("Class :: " + classname + " :: Method :: " + methodname + " data = \n"+JSON.stringify(data));
       await db.messagequeue.create(data)
       .then(() => {
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " Inserted in db");
        callback(guid);
      })
      .catch(err => {
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " Record Insert Error = "+err);
        callback(err);
      });
    } catch (error) {
      callback(error)
    }
  };