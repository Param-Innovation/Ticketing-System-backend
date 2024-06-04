import Razorpay from "razorpay";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
// import crypto from "crypto";
// import Ticket from "../../models/ticketModel.js"; // Adjust the path to your Ticket model
import User from "../../models/userModel.js";
import GuestUser from "../../models/guestUserModel.js";

dotenv.config();

// console.log(process.env.RZP_KEY_ID)

const razorpay = new Razorpay({
  key_id: process.env.RZP_KEY_ID,
  key_secret: process.env.RZP_KEY_SECRET,
});

//@Body Params
// {
//   "amount": 500, // Amount in INR
//   "currency": "INR",
//   "receipt": "order_rcptid_11",
//   "email": "user@example.com", // For guest user
//   "phoneNumber": "1234567890", // For guest user
//   "bookingDate": "2024-06-25",
//   "timeSlot": "10:00",
//   "ticketTypes": [
//     { "type": "adult", "numberOfTickets": 2 },
//     { "type": "child", "numberOfTickets": 1 }
//   ],
//   "specialEventId": "event_id_here",
//   "appliedCoupon": "coupon_id_here"
// }
export const createOrder = async (req, res) => {
  const {
    amount,
    currency,
    receipt,
    email,
    phoneNumber,
    bookingDate,
    timeSlot,
    ticketTypes,
    specialEventId,
    appliedCoupon,
  } = req.body;
  const token = req.headers.authorization?.split(" ")[1]; // Assumes "Bearer <token>"

  try {
    let userId;
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      userId = decoded.userId;
    } else if (email || phoneNumber) {
      let user;
      if (email) {
        user = await User.findOne({ email });
      } else if (phoneNumber) {
        user = await User.findOne({ phone_number: phoneNumber });
      }

      if (user) {
        userId = user._id;
      } else {
        // Handle guest user case
        let guestUser =
          (await GuestUser.findOne({ email })) ||
          (await GuestUser.findOne({ phoneNumber }));
        if (!guestUser) {
          guestUser = new GuestUser({ email, phoneNumber });
          await guestUser.save();
        }
        userId = guestUser._id;
      }
    } else {
      return res.status(400).json({ message: "Insufficient data provided" });
    }

    const options = {
      amount: amount, // Amount in paise
      currency: currency || "INR",
      receipt: "TXN" + Date.now(),
      payment_capture: 1, // Auto capture
    };

    const order = await razorpay.orders.create(options);

    // Save the order details in your database if necessary
    // const newOrder = new Order({
    //   userId,
    //   orderId: order.id,
    //   amount: amount,
    //   currency: currency || "INR",
    //   receipt,
    //   status: "created",
    //   // Other details as necessary
    // });
    // await newOrder.save();

    res.status(201).json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
    });
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
