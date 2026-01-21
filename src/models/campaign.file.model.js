module.exports = (sequelize, Sequelize) => {
    const campaigns = sequelize.define("campaign", {
        id: {
            type: Sequelize.BIGINT,
            primaryKey: true,
            unique: true,
            autoIncrement: true
        },
        fileid: {
            type: Sequelize.STRING
        },
        filename: {
            type: Sequelize.STRING
        },
        recordscount: {
            type: Sequelize.TEXT
        }, 
        receivedddatetime: {
            type: Sequelize.STRING
        },      
        processeddatetime: {
            type: Sequelize.STRING
        },
        status:{
            type: Sequelize.STRING 
        }
    });
    return campaigns;
}


