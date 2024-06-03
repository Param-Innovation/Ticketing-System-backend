import express from "express";
import { createOrder } from "../../controllers/razorpay/razorpayController.js"; // Adjust the path as necessary

const router = express.Router();

router.post("/create-order", createOrder);

export default router;
