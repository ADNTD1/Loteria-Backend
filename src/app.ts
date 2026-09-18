import express from 'express';
import cors from 'cors';
import { swaggerSpec } from './config/swagger.config.js';
import swaggerUi from 'swagger-ui-express'

import userRouter from './routes/user.routes.js';
import gameRouter from './routes/game.routes.js'
import { errorHandler, notFoundHandler } from './middlewares/error.middleware.js';

// La app se exporta sin app.listen() para poder probarla con supertest.
const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Salas y partidas van por WebSockets; REST solo para auth y catálogo de cartas.
app.use('/api/users', userRouter);
app.use('/api/game', gameRouter);

// Siempre al final, después de todas las rutas.
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
