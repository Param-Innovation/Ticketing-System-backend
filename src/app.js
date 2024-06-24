import express from "express";
import cors from "cors";
import connectDB from "./Database/connectDB.js";
import userRoutes from "./routes/user/userRoutes.js";
import slotRoutes from "./routes/user/slotRoutes.js";
import ticketRoutes from "./routes/user/ticketRoutes.js";
import adminRoutes from "./routes/admin/adminRoutesUrls.js";
import razorpayRoutes from "./routes/razorpay/razorpayRoutes.js";
import passport from "passport";
import passportSetup from "./passport/passport.js";
import cookieSession from "cookie-session";

const app = express();

const allowedOrigins = [
  "http://localhost:3001", // Local development frontend
  "http://paramticketingsystem.s3-website.ap-south-1.amazonaws.com", // AWS S3 hosted frontend
  "https://paramticketingsystem.s3-website.ap-south-1.amazonaws.com", // If using HTTPS
  // Add more origins as needed
];

app.use(cookieSession({ 
  name: 'google-auth-session', 
  keys: ['key1', 'key2'] 
})); 
app.use(passport.initialize()); 
app.use(passport.session()); 
app.use(
  cors((req, callback) => {
    const origin = req.header("Origin");
    // Check if the incoming origin is in the allowedOrigins array
    // If it is, set the origin value in the options to allow that origin
    // If not, use false to deny the request
    const corsOptions = {
      origin: allowedOrigins.includes(origin) ? origin : false,
      methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
      credentials: true, // Reflect the request's origin in the CORS response headers (important for credentials)
      optionsSuccessStatus: 204,
    };
    callback(null, corsOptions); // Callback expects two parameters: error and options
  })
);
app.use(express.json()); // Middleware to parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded

connectDB();

// ADMIN side APIs
// Mount pricing routes at /admin/
app.use("/api/admin", adminRoutes);

// USER side APIs
// Mount user routes at /api/users
app.use("/api/users", userRoutes);

// Mount slot routes at /api/slots
app.use("/api/slots", slotRoutes);

// Mount ticket routes at /api/tickets
app.use("/api/tickets", ticketRoutes);

// Mount payment routes at /api/razorpay
app.use("/api/razorpay", razorpayRoutes);

export default app;
