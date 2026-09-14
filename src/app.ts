import express from 'express';
import { swaggerSpec } from './config/swagger.config.js';
import swaggerUi from 'swagger-ui-express'

import userRouter from './routes/user.routes.js';
import roomRouter from './routes/room.routes.js';
import gameRouter from './routes/game.routes.js'
import { errorHandler, notFoundHandler } from './middlewares/error.middleware.js';

// La app se exporta sin app.listen() para poder probarla con supertest.
const app = express();

app.use(express.json());
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/api/users', userRouter);
app.use('/api/rooms', roomRouter);
app.use('/api/game', gameRouter);

// Siempre al final, después de todas las rutas.
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
