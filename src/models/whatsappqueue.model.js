module.exports = (sequelize, Sequelize) => {
    const whatsappqueue = sequelize.define("whatsappqueue", {
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
            type:Sequelize.STRING
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
        attachments:{
            type:Sequelize.STRING
        },
        backupchannel:{
            type:Sequelize.STRING
        },
        status:{
            type:Sequelize.STRING
        },
        priority:{
            type:Sequelize.STRING
        }
});
return whatsappqueue;
}

