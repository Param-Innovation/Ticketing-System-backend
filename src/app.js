import express from "express";
import cors from "cors";
import connectDB from "./Database/connectDB.js";
import userRoutes from "./routes/user/userRoutes.js";
import slotRoutes from "./routes/user/slotRoutes.js";
import ticketRoutes from "./routes/user/ticketRoutes.js";
import adminRoutes from "./routes/admin/adminRoutesUrls.js";
import razorpayRoutes from "./routes/razorpay/razorpayRoutes.js";
import authRoutes from "./routes/auth/auth.js";
import passport from "./passport/passport.js";
import "./passport/passport.js";
import session from "express-session";
import enhanceUserContext from "./middleware/enhanceUserContext.js";

const app = express();

const allowedOrigins = [
  "http://localhost:3001", // Local development frontend
  "http://paramticketingsystem.s3-website.ap-south-1.amazonaws.com", // AWS S3 hosted frontend
  "https://paramticketingsystem.s3-website.ap-south-1.amazonaws.com", // If using HTTPS
  // Add more origins as needed
];

// Setup CORS
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json()); // Middleware to parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded

// app.use(
//   cookieSession({
//     name: "session",
//     keys: ["key1", "key2"],
//   })
// );
app.use(session({
  secret:process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true
}))
app.use(passport.initialize());
app.use(passport.session());

connectDB();

// ADMIN side APIs
// Mount pricing routes at /admin/
app.use("/api/admin", adminRoutes);

// USER side APIs

// Mount auth routes at /auth
app.use("/api/auth", authRoutes);

// Mount slot routes at /api/slots
app.use("/api/slots", slotRoutes);

// Mount user routes at /api/users
app.use("/api/users", enhanceUserContext, userRoutes);

// Mount ticket routes at /api/tickets
app.use("/api/tickets", enhanceUserContext, ticketRoutes);

// Mount payment routes at /api/razorpay
app.use("/api/razorpay", enhanceUserContext, razorpayRoutes);

export default app;
