import express from 'express';
import cors from 'cors';
import connectDB from './Database/connectDB.js';
import userRoutes from './routes/user/userRoutes.js';
import slotRoutes from './routes/user/slotRoutes.js';
import ticketRoutes from './routes/user/ticketRoutes.js';
import adminRoutes from './routes/admin/adminRoutesUrls.js';
import razorpayRoutes from './routes/razorpay/razorpayRoutes.js';

const app = express();

// const corsOptions = {
//     origin: 'http://localhost:3000', // Replace with your frontend's origin
//     methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
//     credentials: true,
//     optionsSuccessStatus: 204
// };

app.use(cors());
app.use(express.json()); // Middleware to parse JSON request bodies
app.use(express.urlencoded({ extended: true }));  // For parsing application/x-www-form-urlencoded

connectDB();

// ADMIN side APIs
// Mount pricing routes at /admin/
app.use('/api/admin', adminRoutes);



// USER side APIs
// Mount user routes at /api/users
app.use('/api/users', userRoutes);

// Mount slot routes at /api/slots
app.use('/api/slots', slotRoutes);

// Mount ticket routes at /api/tickets
app.use('/api/tickets', ticketRoutes);

// Mount payment routes at /api/razorpay
app.use('/api/razorpay', razorpayRoutes);

export default app;
