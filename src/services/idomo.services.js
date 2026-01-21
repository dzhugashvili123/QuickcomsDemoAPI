require("dotenv").config();
const con = require('../../config');
var logger = require('../utils/logtrace');
var request = require("request");
var http = require('http');
const https = require("https");
const classname = 'idomo.service.js'



exports.generateIdomoVideo = async (bodydata) => {
    let methodname = 'generateIdomoVideo';
    return new Promise(async (resolve, reject) => {
        try {
            logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
            logger.info("Class :: " + classname + " :: Method :: " + methodname + " data = "+JSON.stringify(bodydata,null,2));
            let  accountId =con.IDOMO_ACCOUNT_ID;
           let secretkey=con.IDOMO_SECRET_KEY;
           let endpoint=con.IDOMO_END_POINT;
           logger.info("Class :: " + classname + " :: Method :: " + methodname + " accountId = "+accountId);
           logger.info("Class :: " + classname + " :: Method :: " + methodname + " secretkey = "+secretkey);
           logger.info("Class :: " + classname + " :: Method :: " + methodname + " endpoint = "+endpoint);

            let basictoken = await this.generateIdomoToken(accountId,secretkey);

            var options = {
                'method': 'POST',
                'url': endpoint,
                'headers': {
                    'Authorization': basictoken,
                    'Accept': 'application/json'
                },
                body: JSON.stringify(bodydata)
            };
            logger.info("Class :: " + classname + " :: Method :: " + methodname + " options = \n"+JSON.stringify(options,null,2));

       await request(options, function (error, response) {
           if (error) throw new Error(error);
            logger.info("Class :: " + classname + " :: Method :: " + methodname + " Response:: " + response.body);
            resolve(response.body);
           });
   /* resolve({
        status: "Success",
        output: {
            video: [
                {
                    video_type: "mp4",
                    height: 1080,
                    duration: 72,
                    cost: 3,
                    links: {
                        url: "https://v.idomoo.com/11768/0000/ow3idc287dep5sxc1f91nf2i2r22i4az38zg2m.mp4",
                        check_status_url: "https://usa-api.idomoo.com/v2/clipstatus?id=11768/0000/ow3idc287dep5sxc1f91nf2i2r22i4az38zg2m.mp4"
                    }
                }
            ]
        },
        unique_id: "11768/0000/ow3idc287dep5sxc1f91nf2i2r22i4az38zg2m",
        request_id: "cb91f17b-0c6a-491b-9d47-4635385f7d10",
        total_cost: 3,
        check_status_url: "https://usa-api.idomoo.com/v2/clipstatus?id=11768/0000/ow3idc287dep5sxc1f91nf2i2r22i4az38zg2m"
    });
	*/
            logger.info("Class :: " + classname + " :: Method :: " + methodname + " End");
        } catch (error) {
            reject(error);
        }
    });
};

exports.generateIdomoToken = async (accountId, secretkey) => {
    let methodname = 'generateIdomoToken';
    let base64strdata;
    return new Promise(async (resolve, reject) => {
        try {
            logger.info("Class :: " + classname + " :: Method :: " + methodname + " accountId = " + accountId);
            logger.info("Class :: " + classname + " :: Method :: " + methodname + " secretkey = " + secretkey);
            let strdata = `${accountId}:${secretkey}`;
            logger.info("Class :: " + classname + " :: Method :: " + methodname + " strdata = " + strdata);
            let buff = Buffer.from(strdata, 'utf-8');
            base64strdata = buff.toString('base64');
            logger.info("Class :: " + classname + " :: Method :: " + methodname + " base64strdata = " + base64strdata);
        }
        catch (ex) {

        }
        resolve(`Basic ${base64strdata}`);
    });
}


exports.GetIdomoVideoShortURL =async function GetIdomoVideoShortURL(videoURL) {
    let methodname = 'GetIdomoVideoShortURL';
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
    return new Promise(async (resolve, reject) => {
    try {
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " videoURL = "+videoURL);
      //call short url api with stream data  
      let fileName = videoURL.split("/").pop();
      logger.info("Class :: " + classname + " :: Method :: " + methodname + " videofileName = "+fileName);
      const filestreambuffer = await request.get(videoURL, { encoding: null }); 
      logger.info("Class :: " + classname + " :: Method :: " + methodname + " filestreambuffer = "+filestreambuffer);
      logger.info("Class :: " + classname + " :: Method :: " + methodname + " filestreambuffer1 = \n"+JSON.stringify(filestreambuffer,null,2));
      var options = {
        method: 'POST',
        url: con.SHORTURLAPI+"uploadasset/shorturl",// shorturl api url
        formData: {
          'data': {
            'value': filestreambuffer,
            'options': {
              'filename': fileName,
              'contentType': null
            }
          }
        }
      };
      await request(options, async function (error, response, body) {
        if (error) {
          logger.error("Class :: " + classname + " :: Method :: " + methodname + " error-1 :: " + error);
        }
        else {
          let responseData = JSON.parse(body);
          logger.info("Class :: " + classname + " :: Method :: " + methodname + " shorturl responseData ::" + body);
          logger.info("Class :: " + classname + " :: Method :: " + methodname + " shorturl  ::" + responseData.shorturl);
            resolve(responseData.shorturl);
        }
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " end");
      });
    }
    catch (error) {
      logger.error("Class :: " + classname + " :: Method :: " + methodname + " error:: " + error);
      resolve(error);
    }
});
  }