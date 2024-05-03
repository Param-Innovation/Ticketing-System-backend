import mongoose from "mongoose";

const ticketSchema = new mongoose.Schema({
    userId : {  type : mongoose.Schema.Types.ObjectId, ref : 'User', required : false   },
    guestUserId : { type : mongoose.Schema.Types.ObjectId, ref : 'GuestUser', required : false},
    userType : {    type : String , enum : ['Registered', 'Guest'], required : true},
    bookingDate: { type: Date, required: true },
    timeSlot: { type: String, required: true },
    numberOfTickets: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now }
})

const Ticket = mongoose.model('Ticket', ticketSchema);

export default Ticket;