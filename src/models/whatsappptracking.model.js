module.exports = (sequelize, Sequelize) => {
    const whatsapptracking = sequelize.define("whatsapptracking", {
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
        status:{
            type:Sequelize.STRING
        },
        timestamp:{
            type:Sequelize.STRING
        },
        response:{
            type:Sequelize.TEXT
        }
});
return whatsapptracking;
}