const  winston  = require("winston");
const config = require('../../config');
const logpath = config.logfilepath;
const errorlogpath=config.errorlogfilepath;
const { format } = require('winston');
const {  printf } = format;
module.exports = logger = winston.createLogger({
    transports: [       
        new (require("winston-daily-rotate-file"))({
            zippedArchive: false,
            datePattern: 'YYYY-MM-DD-HH',
            maxFiles: '10',
            maxSize: '20m',
            filename: logpath ,
            level: 'info',            
            format: winston.format.combine(
                winston.format.timestamp({format:'MM:DD:YYYY:HH:mm:ss'}),
                winston.format.json(),
                printf(info => ` ${info.level}: ${info.timestamp} ${info.message}`)
            )
        }), 
        new (require("winston-daily-rotate-file"))({
            zippedArchive: false,
            datePattern: 'YYYY-MM-DD-HH',
            maxFiles: '10',
            maxSize: '20m',
            filename: errorlogpath ,
            level: 'error',            
            format: winston.format.combine(
                winston.format.timestamp({format:'MM:DD:YYYY:HH:mm:ss'}),
                winston.format.json(),
                printf(info => ` ${info.level}: ${info.timestamp} ${info.message}`)
            )
        })
    
    ]
});

