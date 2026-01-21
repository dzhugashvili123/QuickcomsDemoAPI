module.exports = (sequelize, Sequelize) => {
    const customer = sequelize.define("customer", {
        id: {
            type: Sequelize.BIGINT,
            primaryKey: true,
            unique: true,
            autoIncrement: true
        },
        fileid: {
            type: Sequelize.STRING
        },

        recordid: {
            type: Sequelize.STRING
        },
        customer_id: {
            type: Sequelize.STRING
        },
        policynumber: {
            type: Sequelize.STRING
        },
        documenttype: {
            type: Sequelize.STRING
        },
        metadata: {
            type: Sequelize.TEXT
        },
        policydocumenthttppath:{
            type: Sequelize.TEXT
        },
        policydocumentpath: {
            type: Sequelize.TEXT
        },
        processed_date: {
            type: Sequelize.STRING
        },
        batchfilename: {
            type: Sequelize.STRING
        },
        trackingId:{
            type: Sequelize.STRING
        },
        status: {
            type: Sequelize.STRING
        }
    });
    return customer;
}


