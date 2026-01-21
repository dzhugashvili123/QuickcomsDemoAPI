module.exports = (sequelize, Sequelize) => {
    const idomos = sequelize.define("idomo", {
        id:{
            type:Sequelize.BIGINT,
            primaryKey:true,
            unique: true,
            autoIncrement: true
        },
        sourcetype:{
            type:Sequelize.STRING
        },
        trackingid:{
            type:Sequelize.STRING
        },
        customerid:{
            type:Sequelize.STRING
        },
        meta:{
            type:Sequelize.TEXT
        },
        videourl:{
            type:Sequelize.TEXT
        },
        shortvideourl:{
            type:Sequelize.TEXT
        },
        status:{
            type:Sequelize.STRING
        },
        timestamp:{
            type:Sequelize.STRING
        }
});
return idomos;
}