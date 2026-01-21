module.exports = (sequelize, Sequelize) => {
	const User = sequelize.define("campaignuser", {
		id: {
			type: Sequelize.BIGINT,
			primaryKey: true,
			autoIncrement: true,
			unique: true
		},
		firstname: {
			type: Sequelize.STRING,
			allowNull: false
		},
		lastname: {
			type: Sequelize.STRING,
			allowNull: false
		},
		username: {
			type: Sequelize.STRING,
			unique: true,
			allowNull: false
		},
		email: {
			type: Sequelize.STRING,
			allowNull: false,
			unique: true,
			validate: { isEmail: true }
		},
		passwordHash: {
			type: Sequelize.STRING,
			allowNull: false
		},
		status: {
			type: Sequelize.STRING,
			allowNull: false,
			defaultValue: 'active'
		},
		isDeleted: {
			type: Sequelize.BOOLEAN,
			defaultValue: false
		},
		lastLoginAt: {
			type: Sequelize.DATE,
			allowNull: true
		}
	});
	return User;
};
