module.exports = (sequelize, Sequelize) => {
	const PdfMapping = sequelize.define("pdfmapping", {
		id: {
			type: Sequelize.BIGINT,
			primaryKey: true,
			autoIncrement: true,
			unique: true
		},
		shortId: {
			type: Sequelize.STRING,
			allowNull: true
		},
		campaignname: {
			type: Sequelize.STRING
		},
		userData: {
			type: Sequelize.JSON,
			allowNull: true
		},
		url: {
			type: Sequelize.STRING,
			allowNull: true
		}
	});

	return PdfMapping;
};
