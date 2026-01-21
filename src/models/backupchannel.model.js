module.exports = (sequelize, Sequelize) => {
    const backupchannelqueue = sequelize.define("backupchannelqueue", {
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
        channel:{
            type:Sequelize.STRING
        },
        content:{
            type:Sequelize.JSON
        },
        status:{
            type:Sequelize.STRING
        }
});
return backupchannelqueue;
}

