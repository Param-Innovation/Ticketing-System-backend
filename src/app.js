const express = require('express');
const connectDB = require('./Database/dbConnect');
const userRoutes = require('./routes/userRoutes');

const app = express();
app.use(express.json()); // Middleware to parse JSON request bodies
app.use(express.urlencoded({ extended: true }));  // For parsing application/x-www-form-urlencoded

connectDB();

app.use('/api/users', userRoutes);

module.exports = app;
