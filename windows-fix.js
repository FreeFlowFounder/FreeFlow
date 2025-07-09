// Simple Windows server fix
import express from 'express';

const app = express();
const port = 5000;

app.get('/', (req, res) => {
  res.send('Server running on Windows!');
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});