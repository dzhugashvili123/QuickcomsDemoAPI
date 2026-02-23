module.exports = (sequelize, Sequelize) => {
    const campaigns = sequelize.define("campaigns", {
        id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            unique: true,
            allowNull: false
        },
        campaignname: {
            type: Sequelize.STRING,
            allowNull: false
        },
        status: {
            type: Sequelize.STRING,
            allowNull: false,
            defaultValue: 'active'
        },
        fields: {
            type: Sequelize.JSONB,
            allowNull: true,
            defaultValue: []
        },
        candidateName: {
            type: Sequelize.STRING,
            allowNull: true
        },
        messageTemplate: {
            type: Sequelize.TEXT,
            allowNull: true
        },
        overlays: {
            type: Sequelize.JSONB,
            allowNull: true,
            defaultValue: []
        },
        emailConfig: {
            type: Sequelize.JSONB,
            allowNull: true,
            defaultValue: {}
        },
        whatsappConfig: {
            type: Sequelize.JSONB,
            allowNull: true,
            defaultValue: {}
        },
        smsConfig: {
            type: Sequelize.JSONB,
            allowNull: true,
            defaultValue: {}
        }
    });

    return campaigns;
};
