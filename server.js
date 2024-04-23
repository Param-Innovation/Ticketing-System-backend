require('dotenv').config();
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const db = require('./Database/dbConnect');

// Connect to MongoDB
db();

// Define a simple route to check if the server is running
app.get('/', (req, res) => {
  res.send('Hello, your server is running and connected to MongoDB!');
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
