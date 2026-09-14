import express from 'express';
import { swaggerSpec } from './config/swagger.config.js';
import swaggerUi from 'swagger-ui-express'

import userRouter from './routes/user.routes.js';
import roomRouter from './routes/room.routes.js';
import gameRouter from './routes/game.routes.js';
import gameSessionRouter from './routes/gameSession.routes.js';

const app = express();
const PORT = process.env.port || 3000;


app.use(express.json());
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/api/users', userRouter);
app.use('/api/rooms', roomRouter);
app.use('/api/game', gameRouter);
app.use('/api/game-session', gameSessionRouter);


app.listen(PORT, () => {
  console.log(`server listening in port ${PORT}`)
  console.log(`Server Url: http://localhost:${PORT}`)
  console.log(`APIs docs in http://localhost:${PORT}/api-docs`)
})
