module.exports = (sequelize, Sequelize) => {
    const reports = sequelize.define("report", {
        id:{
            type:Sequelize.BIGINT,
            primaryKey:true,
            unique: true,
            autoIncrement: true
        },
        trackingid:{
            type:Sequelize.STRING
        },
        customerid:{
            type:Sequelize.STRING
        },
        emailaddress:{
            type:Sequelize.STRING
        },
        emailmessageid:{
            type:Sequelize.STRING
        },
        emailreport:{
            type:Sequelize.TEXT
        },
        smsnumber:{
            type:Sequelize.STRING
        },
        smsmessageid:{
            type:Sequelize.STRING
        },
        smsreport:{
            type:Sequelize.TEXT
        },
        whatsappnumber:{
            type:Sequelize.STRING
        },
        whatsappmessageid:{
            type:Sequelize.STRING
        },
        whatsappreport:{
            type:Sequelize.TEXT
        },
        report:{
            type:Sequelize.TEXT
        },
        status:{
            type:Sequelize.STRING
        },
        timestamp:{
            type:Sequelize.STRING
        }
});
return reports;
}