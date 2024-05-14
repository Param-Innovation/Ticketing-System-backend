import mongoose from "mongoose";

const canceledTicketSchema = new mongoose.Schema({
  ticketId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Ticket",
  },
  userId: { type: mongoose.Schema.Types.ObjectId, required: true }, // Reference to either User or GuestUser
  userType: { type: String, required: true, enum: ["Registered", "Guest"] }, // Indicates type of user
  bookingDate: { type: Date, required: true },
  canceledDate: { type: Date, default: Date.now },
  reason: { type: String },
  totalAmountRefunded: { type: Number, required: true },
  ticketDetails: [
    {
      type: {
        type: String,
        enum: ["adult", "child", "student", "senior"],
        required: true,
      },
      numberOfTickets: { type: Number, required: true },
    },
  ],
});

const CanceledTicket = mongoose.model("CanceledTicket", canceledTicketSchema);

export default CanceledTicket;
