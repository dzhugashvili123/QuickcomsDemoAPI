module.exports = (sequelize, Sequelize) => {
    const emailqueue = sequelize.define("emailqueue", {
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
        toemail:{
            type:Sequelize.STRING
        },
        subject:{
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
            type:Sequelize.TEXT
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
return emailqueue;
}

