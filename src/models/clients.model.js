module.exports = (sequelize, Sequelize) => {
    const clients = sequelize.define("clients", {
        id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            unique: true,
            allowNull: false
        },
        name: {
            type: Sequelize.STRING,
            allowNull: false
        },
        status: {
            type: Sequelize.STRING,
            allowNull: false,
            defaultValue: 'active'
        },
        campaigns: {
            type: Sequelize.STRING,
            allowNull: true
        },
        clientMeta: {
            type: Sequelize.JSONB,
            allowNull: true,
            defaultValue: {}
        },
        whatsAppConfig: {
            type: Sequelize.JSONB,
            allowNull: true,
            defaultValue: {}
        },
        smsConfig: {
            type: Sequelize.JSONB,
            allowNull: true,
            defaultValue: {}
        },
        emailConfig: {
            type: Sequelize.JSONB,
            allowNull: true,
            defaultValue: {}
        }
    });

    return clients;
};
