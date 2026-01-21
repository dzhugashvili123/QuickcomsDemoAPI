require("dotenv").config();
const con = require('../../config');
const logger = require("../utils/logtrace");
var idomoService = require('../services/idomo.services');
const db = require("../utils/database");
const classname = 'idomo.vidoe.controller.js'


exports.generateIdomoVideo = async (req, res) => {
    let methodname='generateIdomoVideo';
    let hostname=req.headers.origin || req.headers.referer;
    hostname=hostname?hostname:req.rawHeaders['1'];
    let idomo_originalURL;
    let idomo_shortURL;
    try {
      logger.info("Class :: " + classname + " :: Method :: "+methodname +" Begin");
     logger.info("Class :: " + classname + " :: Method :: " + methodname + " body data = \n"+JSON.stringify(req.body,null,2));
      let responsedata=await  idomoService.generateIdomoVideo(req.body);
      logger.info("Class :: " + classname + " :: Method :: " + methodname + "responsedata = \n"+JSON.stringify(responsedata,null,2));
	  responsedata=JSON.parse(responsedata);
      if(responsedata.status.toUpperCase()=="SUCCESS")
      {
        idomo_originalURL=responsedata.output.video[0].links.url;
        logger.info("Class :: " + classname + " :: Method :: "+methodname +" idomo_originalURL = "+idomo_originalURL);
        idomo_shortURL=await idomoService.GetIdomoVideoShortURL(idomo_originalURL);
        logger.info("Class :: " + classname + " :: Method :: "+methodname +" idomo_shortURL = "+idomo_shortURL);
          // idomo tracking begin
      let idomometadata={requestcontent:{},responsecontent:{}};
      idomometadata.requestcontent=req.body;
      idomometadata.responsecontent=responsedata;
      let idomotrackingdata={sourcetype:hostname,meta:JSON.stringify(idomometadata,null,2),videourl:idomo_originalURL,shortvideourl:idomo_shortURL,status:responsedata.status,timestamp:new Date().toISOString()};
       db.idomos.create(idomotrackingdata).then(()=>{
        
        res.send({videourl:idomo_shortURL});
      });
      // idomo tracking end
     
      }
           
      logger.info("Class :: " + classname + " :: Method :: "+methodname +" End");
    } catch (error) {
      
    }
  };

  exports.generateIdomoToken = async (req, res) => {
    let methodname='generateIdomoToken';
    try {
      logger.info("Class :: " + classname + " :: Method :: "+methodname +" Begin");
      let accountId = req.query['id'];
      let secretkey = req.query['key'];
      let basictoken = await idomoService.generateIdomoToken(accountId,secretkey);
      logger.info("Class :: " + classname + " :: Method :: " + methodname + " basictoken = " + basictoken);
      res.send({Token:basictoken});
      logger.info("Class :: " + classname + " :: Method :: "+methodname +" End");
    } catch (error) {
     
    }
  };


  