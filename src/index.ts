import express from 'express';
import type { Request, Response } from 'express';


const app = express();
const PORT = process.env.port || 3000;


app.use(express.json());

app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Server running.' });
});

app.listen(PORT, () => {
  console.log(`server listening in port ${PORT}`)
  console.log(`Server Url: http://localhost:${PORT}`)
})
