require("dotenv").config();
const con = require('../../config');
const Sequelize = require('sequelize');
const sequelize = new Sequelize(con.DB_NAME, con.DB_USER, con.DB_PWD, {
    host: con.DB_HOST,
    dialect: 'postgres',
    operatorsAliases: false,
    logging: false,
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    },
});
const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;
db.messagequeue = require("../models/messagequeue.model")(sequelize, Sequelize);
db.whatsappqueue = require("../models/whatsappqueue.model")(sequelize, Sequelize);
db.smsqueue = require("../models/smsqueue.model")(sequelize, Sequelize);
db.emailqueue = require("../models/emailqueue.model")(sequelize, Sequelize);
db.emailtracking = require("../models/emailtracking.model")(sequelize, Sequelize);
db.smstracking = require("../models/smstracking.model")(sequelize, Sequelize);
db.whatsappptracking = require("../models/whatsappptracking.model")(sequelize, Sequelize);
db.backupchannel = require("../models/backupchannel.model")(sequelize, Sequelize);
db.reports = require("../models/report.model")(sequelize, Sequelize);
db.customers = require("../models/poc.model")(sequelize, Sequelize);
db.agentdata = require("../models/agentdata.model")(sequelize, Sequelize);
db.campaign = require("../models/campaign.file.model")(sequelize, Sequelize);
db.idomos = require("../models/idomo.model")(sequelize, Sequelize);
db.psvideo = require("../models/ps.video.model")(sequelize, Sequelize);
db.campaignqueue = require("../models/campaignqueue.model")(sequelize, Sequelize);
db.campaignuser = require("../models/campaignuser.model")(sequelize, Sequelize);
db.uploadedfiledata = require("../models/uploadedfiledata.model")(sequelize, Sequelize);
db.pdfmapping = require("../models/pdfmapping.model")(sequelize, Sequelize);
db.clients = require("../models/clients.model")(sequelize, Sequelize);
db.campaigns = require("../models/campaigns.model")(sequelize, Sequelize);
db.campaign_queue = require("../models/campaign_queue.model")(sequelize, Sequelize);


module.exports = db;
