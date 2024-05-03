import express from 'express';
import connectDB from './Database/connectDB.js';
import userRoutes from './routes/user/userRoutes.js';
import slotRoutes from './routes/user/slotRoutes.js';
import ticketRoutes from './routes/user/ticketRoutes.js'

const app = express();
app.use(express.json()); // Middleware to parse JSON request bodies
app.use(express.urlencoded({ extended: true }));  // For parsing application/x-www-form-urlencoded

connectDB();

// Mount user routes at /api/users
app.use('/api/users', userRoutes);

// Mount slot routes at /api/slots
app.use('/api/slots', slotRoutes);

// Mount ticket routes at /api/tickets
app.use('/api/tickets', ticketRoutes);

export default app;
