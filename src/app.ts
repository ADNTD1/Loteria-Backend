import express from 'express';
import cors from 'cors';
import { swaggerSpec } from './config/swagger.config.js';
import swaggerUi from 'swagger-ui-express'

import userRouter from './routes/user.routes.js';
import gameRouter from './routes/game.routes.js'
import { errorHandler, notFoundHandler } from './middlewares/error.middleware.js';

// La app se exporta sin app.listen() para poder probarla con supertest.
const app = express();

// Detrás de un proxy (túnel de Cloudflare, Nginx, balanceador) todas las
// peticiones llegan con la IP del proxy. Sin esto, express-rate-limit cuenta
// a todos los jugadores como si fueran uno solo y bloquea a la sala entera.
app.set("trust proxy", 1);

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
