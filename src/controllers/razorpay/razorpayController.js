import Razorpay from "razorpay";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import User from "../../models/userModel.js";
import GuestUser from "../../models/guestUserModel.js";
import Payment from "../../models/paymentModel.js";

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
    let userEntry;
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      userEntry = await User.findById(decoded.userId);
      if (!userEntry) {
        return res.status(404).json({ message: "User not found" });
      }
    } else if (email || phoneNumber) {
      userEntry =
        (await GuestUser.findOne({ email })) ||
        (await GuestUser.findOne({ phone_number: phoneNumber }));
      if (!userEntry) {
        const atIndex = email.indexOf("@");
        const name = email.slice(0, atIndex);
        userEntry = new GuestUser({ name: name, email, phoneNumber });
        await userEntry.save();
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

    // Save the order details in your database
    const newPayment = new Payment({
      userId: userEntry._id,
      orderId: order.id,
      amount: amount,
      currency: currency || "INR",
      status: "initiated",
      receipt: order.receipt,
    });
    await newPayment.save();

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

export const initiateRefund = async (paymentId, amount, receipt) => {
  try {
    const refund = await razorpay.payments.refund(paymentId, {
      amount: amount * 100, // Amount in smallest currency unit (paise)
      speed: "optimum",
      receipt: receipt,
    });
    console.log(refund)
    return refund;
  } catch (error) {
    console.error("Error initiating refund:", error);
    throw new Error("Failed to initiate refund. Please try again later.");
  }
};
