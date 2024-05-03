import dotenv from 'dotenv';
import { configDotenv } from 'dotenv';
import app from './src/app.js';

dotenv.config();
const port = process.env.PORT || 3000;

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
