import 'dotenv/config';
import http from 'http';
import app from './app.js';
import { initGameSessionSocket } from './sockets/gameSession.socket.js';

const PORT = process.env.PORT || 3000;

const httpServer = http.createServer(app);
initGameSessionSocket(httpServer);

httpServer.listen(PORT, () => {
  console.log(`server listening in port ${PORT}`)
  console.log(`Server Url: http://localhost:${PORT}`)
  console.log(`APIs docs in http://localhost:${PORT}/api-docs`)
  console.log(`WebSockets enabled`)
})