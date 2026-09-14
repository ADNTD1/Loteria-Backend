import app from './app.js';

const PORT = process.env.port || 3000;

app.listen(PORT, () => {
  console.log(`server listening in port ${PORT}`)
  console.log(`Server Url: http://localhost:${PORT}`)
  console.log(`APIs docs in http://localhost:${PORT}/api-docs`)
})