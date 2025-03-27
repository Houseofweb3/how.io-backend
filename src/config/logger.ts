import winston from 'winston';
import 'winston-daily-rotate-file'; // If using file transport

// Define custom log levels and colors (optional)
const customLevels = {
    levels: {
        error: 0,
        warn: 1,
        info: 2,
        http: 3,
        verbose: 4,
        debug: 5,
        silly: 6,
    },
    colors: {
        error: 'red',
        warn: 'yellow',
        info: 'green',
        http: 'magenta',
        verbose: 'cyan',
        debug: 'blue',
        silly: 'gray',
    },
};

winston.addColors(customLevels.colors);

// Define log levels and format
const logFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
        return `${timestamp} ${level}: ${message}`;
    }),
);

// Console transport
const consoleTransport = new winston.transports.Console({
    format: winston.format.combine(winston.format.colorize(), logFormat),
});

// File transport (optional)
const fileTransport = new winston.transports.DailyRotateFile({
    filename: './logs/application-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
});

// Create the logger instance
const logger = winston.createLogger({
    level: 'info', // Set log level
    levels: customLevels.levels,
    format: logFormat,
    transports: [
        consoleTransport,
        fileTransport, // Add file transport if needed
    ],
});

export default logger;
