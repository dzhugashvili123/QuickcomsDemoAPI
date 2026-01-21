module.exports = (sequelize, Sequelize) => {
    const smstracking = sequelize.define("smstracking", {
        id:{
            type:Sequelize.BIGINT,
            primaryKey:true,
            unique: true,
            autoIncrement: true
        },
        messageid:{
            type:Sequelize.STRING
        },
        status:{
            type:Sequelize.STRING
        },
        timestamp:{
            type:Sequelize.STRING
        }
});
return smstracking;
}