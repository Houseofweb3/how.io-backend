import 'reflect-metadata';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import express, { Application, Request, Response } from 'express';
import { createServer, Server as HttpServer } from 'http';

import routes from './routes';
import logger from './config/logger';
import swaggerDocument from './swagger.json';
import { AppDataSource } from './config/data-source';


const app: Application = express();
const port: number = process.env.PORT ? parseInt(process.env.PORT) : 3000;

const options = {
    swaggerDefinition: swaggerDocument,
    apis: ['./src/routes/*.ts', './src/models/*.ts'], // Path to the API docs
};

const specs = swaggerJsdoc(options);

app.use('/docs', swaggerUi.serve, swaggerUi.setup(specs));
app.use('/api', routes);

// Dummy API 
app.get('/', (req: Request, res: Response) => {
    res.send('Hello World!');
});

// Initialize TypeORM data source
AppDataSource.initialize().then(() => {
    logger.info('Database connected successfully');

    const server: HttpServer = createServer(app);

    server.listen(port, () => {
        logger.info(`Server is running on port ${port}`);
    });
}).catch(error => {
    logger.error('Database connection failed:', error);
});
