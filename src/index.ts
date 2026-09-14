import express from 'express';
import type { Request, Response } from 'express';
import userRouter from './routes/user.routes.js';
import roomRouter from './routes/room.routes.js';

const app = express();
const PORT = process.env.port || 3000;


app.use(express.json());

app.use('/api/users', userRouter);
app.use('/api/rooms', roomRouter);


app.listen(PORT, () => {
  console.log(`server listening in port ${PORT}`)
  console.log(`Server Url: http://localhost:${PORT}`)
})
