const express = require('express');
const connectDB = require('./Database/dbConnect');
const userRoutes = require('./routes/userRoutes');
const slotRoutes = require('./routes/slotRoutes');

const app = express();
app.use(express.json()); // Middleware to parse JSON request bodies
app.use(express.urlencoded({ extended: true }));  // For parsing application/x-www-form-urlencoded

connectDB();

// Mount user routes at /api/users
app.use('/api/users', userRoutes);
// Mount slot routes at /api/slots shivam
app.use('/api/slots', slotRoutes);

module.exports = app;
