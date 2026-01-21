module.exports = (sequelize, Sequelize) => {
	const UploadedFileData = sequelize.define("uploadedfiledata", {
		id: {
			type: Sequelize.BIGINT,
			primaryKey: true,
			autoIncrement: true
		},
		filename: {
			type: Sequelize.STRING,
			allowNull: false
		},		
		campaignname: {
			type: Sequelize.STRING
		},
		rowData: {
			type: Sequelize.JSON,
			allowNull: false
		},
		rowCount: {
			type: Sequelize.INTEGER
		}		
	});

	return UploadedFileData;
};
