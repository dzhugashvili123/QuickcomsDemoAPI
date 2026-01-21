module.exports = (sequelize, Sequelize) => {
    const messagequeue = sequelize.define("messagequeue", {
        id:{
            type:Sequelize.BIGINT,
            primaryKey:true,
            unique: true,
            autoIncrement: true
        },
        trackingid:{
            type:Sequelize.STRING
        },
        meta:{
            type:Sequelize.TEXT
        },
        timestamp:{
            type:Sequelize.STRING
        },
        status:{
            type:Sequelize.STRING
        }
});
return messagequeue;
}

