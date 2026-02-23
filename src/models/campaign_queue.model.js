module.exports = (sequelize, Sequelize) => {
	const campaignqueue = sequelize.define("campaign_queue", {
		id: {
			type: Sequelize.BIGINT,
			primaryKey: true,
			unique: true,
			autoIncrement: true
		},
		campaignid: {
			type: Sequelize.INTEGER
		},
		clientid: {
			type: Sequelize.INTEGER
		},
		mobile: {
			type: Sequelize.STRING
		},
		email: {
			type: Sequelize.STRING
		},
		language: {
			type: Sequelize.STRING
		},
		smsresponseid: {
			type: Sequelize.STRING
		},
		whatsappresponseid: {
			type: Sequelize.STRING
		},
		timestamp: {
			type: Sequelize.STRING
		},
		status: {
			type: Sequelize.STRING
		},
		dynamicdata: {
			type: Sequelize.JSONB,
			allowNull: true,
			defaultValue: {}
		}
	});

	return campaignqueue;
};
