
const logger = require("../utils/logtrace");
const jwt = require("jwt-simple");
const classname = 'token.controller.js'

exports.generateQuickcomsToken = async (req, res) => {
    const methodname = 'generateToken';
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
    try {

        let jwttoken =await this.generateTemporaryJwtToken();
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " jwttoken = " + jwttoken);
        res.send({Token:jwttoken});
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " End");
    }
    catch (err) {
        logger.error("Class :: " + classname + " :: Method :: " + methodname + " ERROR = " + error);

    }
};

exports.generateQuickcomsTokenByGroup = async (req, res) => {
    const methodname = 'generateQuickcomsTokenByGroup';
    logger.info("Class :: " + classname + " :: Method :: " + methodname + " Begin");
    try {
        let groupId = req.query['gid'];
        let groupName = req.query['gname'];
        let jwttoken =await this.generateTemporaryJwtTokenByGroup(groupId,groupName);
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " jwttoken = " + jwttoken);
        res.send({Token:jwttoken});
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " End");
    }
    catch (err) {
        logger.error("Class :: " + classname + " :: Method :: " + methodname + " ERROR = " + error);

    }
};

exports.generateTemporaryJwtToken = async () => {
    return new Promise(async (resolve, reject) => {
        const user = {
            id: {
                "id": 8,
                "roles": [
                    "Admin"
                ]
            },
            meta: {},
            name: "system",
            firstName: "system",
            lastName: "system",
            email: "pvsaiprasad@gmail.com",
            activeGroup: {
                "id": 10,
                "name": "ABSLI Demo"
            },
            roles: ["Admin"],
            policies: ["Admin"]
        };

        resolve(`JWT ${generateJwtToken(user, 60 * 60 * 24)}`)
    });
}

exports.generateTemporaryJwtTokenByUser = async (jwtAdminuser) => {
    let methodname="generateTemporaryJwtTokenByUser";
    return new Promise(async (resolve, reject) => {
        const user = {
            id: {
                "id": jwtAdminuser.id.id,
                "roles": [
                    "Admin"
                ]
            },
            meta: {},
            name: jwtAdminuser.name,
            firstName: jwtAdminuser.firstName,
            lastName: jwtAdminuser.lastName,
            email: jwtAdminuser.email,
            activeGroup: {
                "id": jwtAdminuser.activeGroup.id,
                "name": jwtAdminuser.activeGroup.name
            },
            roles: ["Admin"],
            policies: ["Admin"]
        };
        let jwtToken= `JWT ${generateJwtToken(user, 60 * 60 * 24)}`;
        logger.info("Class :: " + classname + " :: Method :: " + methodname + " jwtToken = " + jwtToken);
        resolve(jwtToken);
    });
}
exports.generateTemporaryJwtTokenByGroup = async (groupId,groupName) => {
    return new Promise(async (resolve, reject) => {
        const user = {
            id: {
                "id": 8,
                "roles": [
                    "Admin"
                ]
            },
            meta: {},
            name: "system",
            firstName: "system",
            lastName: "system",
            email: "pvsaiprasad@gmail.com",
            activeGroup: {
                "id": Number(groupId),
                "name": groupName
            },
            roles: ["Admin"],
            policies: ["Admin"]
        };
     
        resolve(`JWT ${generateJwtToken(user, 60 * 60 * 24)}`)
    });
}


function generateJwtToken(user, tokenExpirationTime) {

    logger.info("Class :: " + classname + " :: Method :: generateJwtToken = " + JSON.stringify(user,null,2));

    const iat = new Date().getTime() / 1000;
    const jwtPayload = {
        iat: iat,
        exp: iat + parseInt(tokenExpirationTime),
        id: user
    };
    return jwt.encode(jwtPayload, "the-super-secret-hash-key-without-a-chance-to-guess", "HS256", {});
}


