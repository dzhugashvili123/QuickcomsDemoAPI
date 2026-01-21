module.exports = (sequelize, Sequelize) => {
    const messagequeue = sequelize.define("psvideo", {
        id:{
            type:Sequelize.BIGINT,
            primaryKey:true,
            unique: true,
            autoIncrement: true
        },
        meta:{
            type:Sequelize.TEXT
        },
        timestamp:{
            type:Sequelize.STRING
        },
        shortid:{
            type:Sequelize.STRING

        },
        videourl:{
            type:Sequelize.STRING
        },
        videoid:{
            type:Sequelize.STRING
        },
        status:{
            type:Sequelize.STRING
        }
});
return messagequeue;
}