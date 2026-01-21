module.exports = (sequelize, Sequelize) => {
	const campaignqueue  = sequelize.define("campaignqueue", {
		id: {
			type: Sequelize.BIGINT,
			primaryKey: true,
			unique: true,
			autoIncrement: true
		},
		smscustomerid: {
			type: Sequelize.STRING
		},
		whatsappcustomerid: {
			type: Sequelize.STRING
		},
		campaignname: {
			type: Sequelize.STRING
		},
		firstName: {
			type: Sequelize.STRING
		},
		lastName: {
			type: Sequelize.STRING
		},
		city: {
			type: Sequelize.STRING
		},
		state: {
			type: Sequelize.STRING
		},
		zip: {
			type: Sequelize.STRING
		},
		email: {
			type: Sequelize.STRING
		},
		ConstituencyName: {
			type: Sequelize.STRING
		},
		PartyName: {
			type: Sequelize.STRING
		},		
		MobileNo: {
			type: Sequelize.STRING
		},
		text1link: {
			type: Sequelize.TEXT
		},
		AtalPensionYojana: {
			type: Sequelize.STRING
		},
		APY_Amount: {
			type: Sequelize.STRING
		},
		APY_Date: {
			type: Sequelize.STRING
		},
		PMKSN: {
			type: Sequelize.STRING
		},
		PMKSN_Amount: {
			type: Sequelize.STRING
		},
		PMKSN_Date: {
			type: Sequelize.STRING
		},
		PMGAY: {
			type: Sequelize.STRING
		},
		PMGAY_Amount: {
			type: Sequelize.STRING
		},
		PMGAY_Date: {
			type: Sequelize.STRING
		},
		ThallikiVandhanam: {
			type: Sequelize.STRING
		},
		ThallikiVandhanam_Amount: {
			type: Sequelize.STRING
		},
		ThallikiVandhanam_Date: {
			type: Sequelize.STRING
		},
		AnnaDhaatha: {
			type: Sequelize.STRING
		},
		AnnaDhaatha_Amount: {
			type: Sequelize.STRING
		},
		AnnaDhaatha_Date: {
			type: Sequelize.STRING
		},
		MahaShakti: {
			type: Sequelize.STRING
		},
		MahaShakti_Amount: {
			type: Sequelize.STRING
		},
		MahaShakti_Date: {
			type: Sequelize.STRING
		},
		selectLanguage: {
			type: Sequelize.STRING
		},
		timestamp: {
			type: Sequelize.STRING
		},
		status: {
			type: Sequelize.STRING
		}
	});

	return campaignqueue;
};
