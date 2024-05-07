import mongoose from "mongoose";

const ticketTypeSchema = new mongoose.Schema({
    type: { type: String, enum: ['adult', 'child', 'student', 'senior'], required: true },
    numberOfTickets: { type: Number, required: true }
});

const ticketSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    guestUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'GuestUser', required: false },
    userType: { type: String, enum: ['Registered', 'Guest'], required: true },
    bookingDate: { type: Date, required: true },
    timeSlot: { type: String, required: true },
    ticketTypes: [ticketTypeSchema],
    createdAt: { type: Date, default: Date.now }
});

const Ticket = mongoose.model('Ticket', ticketSchema);

export default Ticket;