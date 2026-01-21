module.exports = (sequelize, Sequelize) => {
    const emailtracking = sequelize.define("emailtracking", {
        id:{
            type:Sequelize.BIGINT,
            primaryKey:true,
            unique: true,
            autoIncrement: true
        },
        messageid:{
            type:Sequelize.STRING
        },
        eventtype:{
            type:Sequelize.STRING
        },
        timestamp:{
            type:Sequelize.STRING
        },
        response:{
            type:Sequelize.TEXT
        }
});
return emailtracking;
}