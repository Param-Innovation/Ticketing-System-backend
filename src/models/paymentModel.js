import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    ticketId: { type: mongoose.Schema.Types.ObjectId, ref: "Ticket" },
    orderId: { type: String, index: true }, // Added indexing
    paymentId: { type: String, index: true },
    signature: String,
    status: {
      type: String,
      enum: ["initiated", "paid", "refunded", "cancelled", "failed"],
    },
    amount: Number,
    currency: String,
  },
  { timestamps: true }
); // Enabling automatic handling of createdAt and updatedAt

const Payment = mongoose.model("Payment", paymentSchema);
export default Payment;
