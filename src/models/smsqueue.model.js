module.exports = (sequelize, Sequelize) => {
    const smsqueue = sequelize.define("smsqueue", {
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
        messageid:{
            type:Sequelize.TEXT
        },
        phone:{
            type:Sequelize.STRING
        },
        content:{
            type:Sequelize.TEXT
        },
        contentpath:{
            type:Sequelize.STRING
        },
        contentstream:{
            type:Sequelize.TEXT
        },
        backupchannel:{
            type:Sequelize.STRING
        },
        attachments:{
            type:Sequelize.STRING
        },
        status:{
            type:Sequelize.STRING
        },
        priority:{
            type:Sequelize.STRING
        }
});
return smsqueue;
}

