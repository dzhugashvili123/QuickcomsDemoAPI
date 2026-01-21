module.exports = (sequelize, Sequelize) => {
    const agentdata = sequelize.define("agentdetail", {
        id: {
            type: Sequelize.BIGINT,
            primaryKey: true,
            unique: true,
            autoIncrement: true
        },
        documenttype: {
            type: Sequelize.STRING
        },
        policynumber: {
            type: Sequelize.STRING
        },       
        name_of_insured: {
            type: Sequelize.STRING
        },      
        dispatch_date: {
            type: Sequelize.STRING
        },
        prod_code: {
            type: Sequelize.STRING
        },
        email_template: {
            type: Sequelize.STRING
        },
        type_of_email: {
            type: Sequelize.STRING
        },
        email_id: {
            type: Sequelize.STRING
        },
        status: {
            type: Sequelize.STRING
        },
        zipfilename: {
            type: Sequelize.STRING
        }
    });
    return agentdata;
}


